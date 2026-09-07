-- ---------------------------------------------------------------------------
-- GRID-X outbox, inside the OSWAR IMS database
-- ---------------------------------------------------------------------------
--
-- Run this against the *IMS* database, not the GRID-X one. It is the only object GRID-X ever
-- creates there, and it lives in its own schema so it cannot collide with an IMS table.
--
-- Why an outbox rather than writing straight into IMS tables: GRID-X does not know the IMS's
-- invariants — which columns are computed, which triggers fire, which rows a nightly job expects
-- to own. Inserting into a queue GRID-X owns keeps the blast radius at zero and lets the IMS
-- consume at its own pace, in its own transaction, with its own validation.
--
-- GRID-X creates this automatically on first push when IMS_OUTBOX_AUTO_CREATE=true (the default).
-- Where the IMS database user may not create schemas, a DBA runs this file once and GRID-X is
-- deployed with IMS_OUTBOX_AUTO_CREATE=false.
--
-- Everything here is idempotent: running it twice is a no-op.

CREATE SCHEMA IF NOT EXISTS "gridx";

CREATE TABLE IF NOT EXISTS "gridx"."ims_outbound_fact" (
  id            bigserial   PRIMARY KEY,
  -- One of: outsourced-work-order-status, material-issued, finished-components-received,
  -- rejected-quantities, conversion-cost, partner-invoices, actual-completion-dates.
  entity        text        NOT NULL,
  -- The GRID-X record the fact is about (a job id, or a partner invoice id).
  record_ref    text        NOT NULL,
  -- The fact itself. Shapes are documented in docs/07-background-jobs-notifications.md.
  payload       jsonb       NOT NULL,
  source        text        NOT NULL DEFAULT 'grid-x',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Set by the IMS when it has taken the row. GRID-X only ever clears it, by rewriting the fact.
  consumed_at   timestamptz,
  consumer_note text,
  -- One row per (entity, record) — a job that is reopened and re-closed overwrites its own fact
  -- rather than queueing a second, contradictory one. This is what makes GRID-X's at-least-once
  -- delivery safe.
  CONSTRAINT "ims_outbound_fact_entity_record_uniq" UNIQUE (entity, record_ref)
);

-- The IMS consumer's query: unconsumed rows, oldest first.
CREATE INDEX IF NOT EXISTS "ims_outbound_fact_unconsumed_idx"
  ON "gridx"."ims_outbound_fact" (created_at)
  WHERE consumed_at IS NULL;

COMMENT ON TABLE "gridx"."ims_outbound_fact" IS
  'Outsourcing facts written by GRID-X for the IMS to consume. Owned by GRID-X; the IMS marks rows consumed.';

-- ---------------------------------------------------------------------------
-- Least-privilege grants
-- ---------------------------------------------------------------------------
-- GRID-X needs SELECT on the IMS masters it reads and full rights on this one table. It needs
-- nothing else. Replace `gridx_reader` with the role the IMS DBA issues, then run:
--
--   GRANT USAGE ON SCHEMA public TO gridx_reader;
--   GRANT SELECT ON ALL TABLES IN SCHEMA public TO gridx_reader;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO gridx_reader;
--   GRANT USAGE, CREATE ON SCHEMA gridx TO gridx_reader;
--   GRANT SELECT, INSERT, UPDATE ON "gridx"."ims_outbound_fact" TO gridx_reader;
--   GRANT USAGE, SELECT ON SEQUENCE "gridx"."ims_outbound_fact_id_seq" TO gridx_reader;
--
-- Narrower still, and better: grant SELECT only on the tables the mapping actually names, so an
-- accidental mapping override cannot read payroll.

-- ---------------------------------------------------------------------------
-- How the IMS consumes it
-- ---------------------------------------------------------------------------
--   BEGIN;
--   SELECT id, entity, record_ref, payload
--     FROM gridx.ims_outbound_fact
--    WHERE consumed_at IS NULL
--    ORDER BY created_at
--    FOR UPDATE SKIP LOCKED
--    LIMIT 100;
--   -- ... apply each fact to the IMS ...
--   UPDATE gridx.ims_outbound_fact SET consumed_at = now() WHERE id = ANY($1);
--   COMMIT;
--
-- `FOR UPDATE SKIP LOCKED` lets several IMS workers drain the queue in parallel. GRID-X may
-- rewrite a row between reads (a job reopened after being closed), which clears `consumed_at` —
-- so the consumer must treat a fact as the current truth for that record, not as an event.
