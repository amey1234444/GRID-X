# 13 — IMS integration

How GRID-X connects to the OSWAR IMS **directly over its PostgreSQL database**: what it
reads, what it writes, how the schema is mapped, how to bring it up on a real IMS, and
what to do when it breaks.

Section 10 of the blueprint sets the rule this whole document serves:

> IMS manages internal inventory and manufacturing.
> GRID-X manages external distributed manufacturing.
> GRID-X should not duplicate inventory, purchase order or customer data already
> available in the IMS.

---

## 1. Shape of the integration

```
┌────────────────────────────┐
│        GRID-X API          │
│                            │
│  ImsService                │  the meaning of the boundary
│   ├─ what is persisted     │  (3 entities) vs read-through (8)
│   ├─ watermarks            │  SystemSetting: ims:cursor:<entity>
│   ├─ retry + backoff       │  ImsSyncLog, 8 attempts, 1 min → 6 h
│   └─ audit                 │  IMS_PULL / IMS_PUSH
│            │               │
│      ImsGateway            │  the transport
│      ├─ DatabaseImsDriver ─┼──── read  ──▶ SELECT … READ ONLY
│      ├─ HttpImsDriver      │              (mapped IMS tables)
│      └─ DisabledImsDriver ─┼──── write ──▶ INSERT … ON CONFLICT
└────────────────────────────┘              gridx.ims_outbound_fact
                                                     │
                                        ┌────────────▼────────────┐
                                        │   OSWAR IMS PostgreSQL  │
                                        │   Company · Item ·      │
                                        │   Product · Warehouse · │
                                        │   StockBalance · …      │
                                        │                         │
                                        │   gridx.ims_outbound_   │
                                        │        fact  (ours)     │
                                        └─────────────────────────┘
```

Two rules hold the design up:

1. **GRID-X reads IMS tables; it never writes to one.** Reads run inside a `READ ONLY`
   transaction, so this is enforced by PostgreSQL rather than by good intentions. Every
   outbound fact goes into `gridx.ims_outbound_fact`, a table GRID-X owns in a schema
   GRID-X owns.
2. **The IMS schema is configuration, not code.** Table and column names live in a
   *mapping*, defaulted by profile and overridable per entity without a code change.

### Why an outbox rather than writing into IMS tables

GRID-X does not know the IMS's invariants: which columns are computed, which triggers
fire, which rows a nightly job expects to own, which statuses are legal transitions. A
foreign system inserting rows into those tables is how integrations become outages. The
outbox keeps the blast radius at zero, gives the IMS a queue it can drain in its own
transaction with its own validation, and gives both sides a durable record of exactly
what was claimed and when.

### Why a direct connection rather than the REST API

It removes a moving part (an API that must be deployed, versioned and kept up), removes a
round trip, and gives incremental reads that are actually incremental — a `WHERE
"updatedAt" >= $1` against an indexed column, rather than hoping the IMS honours a `since`
query parameter. It costs coupling: if the IMS renames a column, GRID-X notices. Section 5
is how that is made survivable.

Both transports are kept. `IMS_DRIVER=http` is a one-variable rollback.

---

## 2. What crosses the boundary

### Inbound — eleven entities

| Entity | Treatment | Where it lands |
| --- | --- | --- |
| `companies` | **Persisted** | `Company`, upserted on `code` |
| `items` | **Persisted** | `Item`, upserted on `code` |
| `products` | **Persisted** | `Product`, upserted on `(companyId, code)` |
| `sales-orders` | Read-through | `GET /api/ims/orders`, job creation |
| `work-orders` | Read-through | `GET /api/ims/orders`, job creation |
| `stock` | Read-through | `GET /api/ims/stock`, material issue |
| `warehouses` | Read-through | — |
| `suppliers` | Read-through | — |
| `material-transactions` | Read-through | — |
| `users` | Read-through | — |
| `purchase-orders` | Read-through | — |

Only three are copied, because only three are genuinely needed locally: a job references
a component that references an item, and none of that can be resolved per-request against
a foreign database. Everything else is read live and logged with *"Read-through entity:
IMS remains the system of record"*.

A product whose company has not been pulled yet is **skipped, not invented** — creating a
placeholder company would put a record into GRID-X that IMS never sent. Pull `companies`
first; the default `IMS_SYNC_ENTITIES` order does exactly that.

### Outbound — seven facts

| Fact | Raised when | Payload highlights |
| --- | --- | --- |
| `outsourced-work-order-status` | Job closed | status, quantity, dispatched, received, due date |
| `actual-completion-dates` | Job closed | production started, completed, closed |
| `material-issued` | Challan issued | challan number, per-item quantity, uom, weight |
| `finished-components-received` | Inspection reaches `QUALITY_ACCEPTED` | received and accepted quantity |
| `rejected-quantities` | Inspection rejects any quantity | rejected, rework |
| `conversion-cost` | Invoice finance-approved | rate × **accepted** quantity |
| `partner-invoices` | Invoice finance-approved | invoice number, amounts, deductions, line items |

Every fact carries `jobNumber`, `sourceRef` (the IMS order it came from), `componentCode`
and the partner code and name, so the IMS can reconcile without a second lookup.

Each is raised through `pushInBackground()`, which never throws — an IMS outage delays the
sync, it does not block closing a job or approving an invoice.

---

## 3. Connecting

### Minimum configuration

```dotenv
IMS_ENABLED=true
IMS_DATABASE_URL="postgresql://gridx_ims:••••@ims-db.internal:5432/ims?sslmode=require"
```

That is enough. `IMS_DRIVER` defaults to `auto`, which sees a database URL and picks the
direct driver; `IMS_WRITE_MODE` defaults to `outbox`; the scheduled inbound sync turns
itself on.

### Everything else

| Variable | Default | What it does |
| --- | --- | --- |
| `IMS_ENABLED` | `false` | Master switch. Nothing else has any effect while false |
| `IMS_DRIVER` | `auto` | `database`, `http`, `disabled`, or infer from what is set |
| `IMS_DATABASE_URL` | — | The IMS PostgreSQL connection string |
| `IMS_DATABASE_SCHEMA` | `public` | Schema the IMS tables live in |
| `IMS_DB_POOL_MAX` | `5` | Connection cap. Deliberately low |
| `IMS_DB_CONNECTION_TIMEOUT_MS` | `10000` | Give up waiting for a connection |
| `IMS_DB_STATEMENT_TIMEOUT_MS` | `15000` | Server-side per-statement ceiling |
| `IMS_DB_IDLE_TIMEOUT_MS` | `30000` | Close an idle pooled connection |
| `IMS_DB_SSL` | `require` | `require` verifies the certificate, `no-verify` accepts self-signed, `disable` turns TLS off |
| `IMS_DB_APPLICATION_NAME` | `gridx-ims` | Shows in the IMS `pg_stat_activity` |
| `IMS_MAPPING_PROFILE` | `prisma` | `prisma` (PascalCase/camelCase) or `snake` |
| `IMS_MAPPING_FILE` | — | JSON file of per-entity overrides |
| `IMS_MAPPING_JSON` | — | The same as inline JSON, for Render/Vercel |
| `IMS_WRITE_MODE` | `outbox` | `outbox`, `http`, or `none` |
| `IMS_OUTBOX_SCHEMA` | `gridx` | Schema for GRID-X's outbox |
| `IMS_OUTBOX_TABLE` | `ims_outbound_fact` | Table for GRID-X's outbox |
| `IMS_OUTBOX_AUTO_CREATE` | `true` | Create the outbox on first push |
| `IMS_SYNC_INBOUND_ENABLED` | on when a database URL is set | Scheduled inbound sweep |
| `IMS_SYNC_ENTITIES` | `companies,items,products` | Entities the sweep pulls, in order |
| `IMS_SYNC_BATCH_SIZE` | `500` | Rows per entity per sweep |
| `IMS_BASE_URL` / `IMS_API_KEY` / `IMS_TIMEOUT_MS` | — / — / `15000` | The REST transport |

Managed Postgres providers (Neon, Render, Supabase, RDS) hand out certificates Node will
not verify against its bundled root store. Set `IMS_DB_SSL=no-verify` there — the
connection is still encrypted; only the certificate chain is not checked. Prefer
`require` wherever the IMS certificate chains to a public root or you can pin a CA.

### Least-privilege database role

GRID-X needs SELECT on the masters it reads and full rights on one table. Nothing else.

```sql
CREATE ROLE gridx_ims LOGIN PASSWORD '••••';

GRANT CONNECT ON DATABASE ims TO gridx_ims;
GRANT USAGE   ON SCHEMA public TO gridx_ims;

-- Narrow is better: grant only the tables the mapping actually names, so an accidental
-- mapping override cannot read payroll.
GRANT SELECT ON "Company", "Item", "Product", "Warehouse", "StockBalance",
                "SalesOrder", "WorkOrder", "Supplier", "StockMovement",
                "PurchaseOrder", "User"
  TO gridx_ims;

-- The outbox. Either let GRID-X create it (needs CREATE on the database) …
GRANT CREATE ON DATABASE ims TO gridx_ims;
-- … or create it yourself with packages/db/prisma/ims/001_gridx_outbox.sql and grant:
GRANT USAGE ON SCHEMA gridx TO gridx_ims;
GRANT SELECT, INSERT, UPDATE ON "gridx"."ims_outbound_fact" TO gridx_ims;
GRANT USAGE, SELECT ON SEQUENCE "gridx"."ims_outbound_fact_id_seq" TO gridx_ims;
```

With the outbox pre-created, deploy GRID-X with `IMS_OUTBOX_AUTO_CREATE=false`.

---

## 4. The schema mapping

The IMS database is not ours. Its tables were designed by the IMS team and will be
renamed without telling us, so nothing about its shape is hardcoded. For each entity the
mapping says which table it lives in and which column carries each canonical field:

```jsonc
{
  "items": {
    "table": "Item",
    "columns": {
      "code": "code",
      "name": "name",
      "uom": "uom",
      "materialGrade": "material_grade",     // a plain column
      "unitWeightKg": "=t.\"weight_g\" / 1000.0", // a computed expression
      "imsRef": "id"
    },
    "searchColumns": ["code", "name"],
    "changeColumn": "updated_at",
    "where": "t.\"deleted_at\" IS NULL"
  },
  "products": {
    "table": "Product",
    "joins": [
      { "table": "Company", "alias": "c", "on": "c.\"id\" = t.\"companyId\"", "type": "LEFT" }
    ],
    "columns": { "companyCode": "c.code", "code": "code", "name": "name" }
  }
}
```

A column value is one of:

| Form | Meaning |
| --- | --- |
| `code` | A column on the base table, aliased `t` |
| `c.code` | A column on join alias `c` — the alias must be declared in `joins` |
| `=<sql>` | A raw expression, for a computed or converted value |

Other keys: `schema` (per-entity schema override), `where` (a static filter),
`searchColumns` (what free-text search matches), `changeColumn` (what makes incremental
sync possible), `orderBy`.

### Safety

Mappings are configuration, not user input — but configuration is edited under pressure,
and a typo that becomes a second statement is not a typo any more. So:

* identifiers must match `^[A-Za-z_][A-Za-z0-9_$]*$` and are quoted;
* free-form fragments (`where`, join `on`, `=` expressions) are rejected if they carry
  `;`, `--` or `/*`;
* every value — search terms, watermarks, limits — is bound as a parameter, never
  concatenated;
* the row limit is clamped to 10 000 whatever the caller asks for.

### Profiles and overrides

Two built-in profiles cover the plausible shapes:

* **`prisma`** (default) — PascalCase tables, camelCase columns. What Prisma generates
  without `@@map`, which is how the sibling Autix products are built.
* **`snake`** — plural snake_case tables and columns.

Both are *informed guesses*. Override what they got wrong with `IMS_MAPPING_FILE` (a JSON
file) or `IMS_MAPPING_JSON` (inline). Overrides merge per entity and per column, so
correcting one awkward table does not mean restating the other ten. A malformed override
is warned about and ignored — a bad override must not stop the API booting.

---

## 5. Bringing it up on a real IMS

```bash
# 1. Point .env at the IMS and see what is actually there.
pnpm ims:introspect

# 2. Save a candidate mapping generated from the real schema.
pnpm ims:introspect --write     # writes ims-mapping.generated.json

# 3. Review it, fill in the joins it could not infer, then wire it up.
#    IMS_MAPPING_FILE="/abs/path/to/ims-mapping.json"

# 4. Create the outbox (only if GRID-X's role may not create schemas).
pnpm ims:outbox                 # or --check to look without changing anything

# 5. Start the API and confirm the boundary from Control.
pnpm dev:api
```

Then, in Control at `/app/ims`, or over the API:

| Check | Endpoint | What good looks like |
| --- | --- | --- |
| Can we connect? | `GET /api/ims/health` | `reachable: true`, a latency, a server version |
| Does the mapping fit? | `GET /api/ims/introspect` | every entity `ok`; `degraded` reads but is missing columns; `broken` cannot read at all |
| Do the rows look right? | `GET /api/ims/preview?entity=items` | ten real rows, nothing persisted |
| Pull for real | `POST /api/ims/sync` | created/updated counts per entity |

`introspect` is the one that turns "the sync returns nothing" into "the mapping expects
`Item.materialGrade` and the table has `material_grade`". It lists, per entity: whether
the table exists, which mapped columns are missing, and which columns the table has that
the mapping does not use.

---

## 6. The outbox

```sql
CREATE TABLE "gridx"."ims_outbound_fact" (
  id            bigserial   PRIMARY KEY,
  entity        text        NOT NULL,   -- one of the seven outbound facts
  record_ref    text        NOT NULL,   -- the GRID-X job or invoice id
  payload       jsonb       NOT NULL,
  source        text        NOT NULL DEFAULT 'grid-x',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  consumed_at   timestamptz,            -- set by the IMS
  consumer_note text,
  UNIQUE (entity, record_ref)
);
```

The DDL is checked in at `packages/db/prisma/ims/001_gridx_outbox.sql` and is idempotent.

### How the IMS consumes it

```sql
BEGIN;
SELECT id, entity, record_ref, payload
  FROM gridx.ims_outbound_fact
 WHERE consumed_at IS NULL
 ORDER BY created_at
   FOR UPDATE SKIP LOCKED
 LIMIT 100;
-- … apply each fact …
UPDATE gridx.ims_outbound_fact SET consumed_at = now() WHERE id = ANY($1);
COMMIT;
```

`FOR UPDATE SKIP LOCKED` lets several IMS workers drain in parallel.

**A fact is current truth, not an event.** GRID-X may rewrite a row between consumptions —
a job reopened after being closed — which clears `consumed_at`. The consumer must apply
the payload as the latest state of that record, not append it to a history.

---

## 7. Delivery, retry and abandonment

Every call, inbound or outbound, writes an `ImsSyncLog` row with the payload, so the
boundary stays auditable even when the IMS is unreachable.

A failed outbound row is a delivery still owed. `ims-outbound-retry` runs every ten
minutes and:

* selects `OUTBOUND` rows that failed, are not abandoned, are under
  `MAX_PUSH_ATTEMPTS = 8`, and are due (`nextAttemptAt` null or past);
* replays the stored payload, up to 50 per sweep, oldest first;
* on success marks it delivered and records which attempt succeeded;
* on failure records the reason and schedules the next attempt with exponential
  backoff — `backoffFrom()` doubles from one minute to a six-hour ceiling;
* after eight attempts stamps `abandonedAt` and logs an error for an operator.

Eight attempts with that backoff spans roughly four hours of outage before anything is
abandoned, and an abandoned fact is never silently lost — it is a log row, a Control
failure count, and a server error line.

Both schedulers claim a `SchedulerLock` first, so two API instances cannot hand the IMS
the same fact twice or burn the retry budget at double rate.

---

## 8. Security

* **Credentials.** `IMS_DATABASE_URL` is a secret; it is never logged and never returned
  by an endpoint. `GET /api/ims/status` returns the connection string with the password
  replaced by `***`, so an operator can confirm which IMS they are pointed at without
  being able to read it.
* **Least privilege.** The role needs SELECT on the mapped tables and rights on one
  table. Grant table-by-table, not `ALL TABLES`.
* **Read-only enforcement.** Reads run in a `READ ONLY` transaction. A mapping override
  that somehow produced a mutating statement is rejected by PostgreSQL.
* **Blast radius.** `IMS_DB_POOL_MAX` caps GRID-X's share of the IMS's connections;
  `statement_timeout` and `idle_in_transaction_session_timeout` cap how long any one of
  them can be held.
* **Permissions.** Every `/ims` endpoint is behind `ims:sync`, which only a Group Admin
  holds by default — except `GET /api/ims/orders` (`job:create`) and `GET /api/ims/stock`
  (`material:read`), which are operational reads rather than integration controls.
* **Audit.** Every pull and push writes an `AuditLog` row (`IMS_PULL` / `IMS_PUSH`) with
  the actor, or `SYSTEM` when the scheduler raised it.

---

## 9. Troubleshooting

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| `/ims/health` says `reachable: false` with `ECONNREFUSED` | Network path or host/port | Check the IMS is reachable from the API host; on Render, check the IMS allows the outbound IP |
| `self signed certificate in certificate chain` | Managed Postgres certificate | Set `IMS_DB_SSL=no-verify` |
| `password authentication failed` | Wrong credential, or the role lacks CONNECT | Re-issue; check `GRANT CONNECT` |
| `permission denied for table "Item"` | Missing SELECT grant | Grant SELECT on the mapped tables |
| `introspect` shows an entity `broken` | Mapped table does not exist | `pnpm ims:introspect --write`, correct the table name, set `IMS_MAPPING_FILE` |
| `introspect` shows an entity `degraded` | A mapped column does not exist | Same, per column. `unmappedColumns` usually contains the real name |
| Sync reports `received: N, skipped: N` | Rows read, but none matched the contract | A required field is mapped to the wrong column — `GET /api/ims/preview?entity=…` shows what actually came back |
| `products` always skipped | Companies not pulled yet | Pull `companies` first; check `IMS_SYNC_ENTITIES` order |
| Sync returns nothing after the first run | The watermark has moved past the rows | `POST /api/ims/cursors/reset` with the entity, or pull from Control (which ignores the watermark) |
| `statement timeout` in the log | The change column is not indexed in IMS | Ask the IMS team for an index, raise `IMS_DB_STATEMENT_TIMEOUT_MS`, or lower `IMS_SYNC_BATCH_SIZE` |
| Outbound failures climbing | The outbox is missing or not writable | `pnpm ims:outbox --check`; check INSERT/UPDATE grants |
| Facts delivered but IMS has not acted | The IMS consumer is not draining | `SELECT count(*) FROM gridx.ims_outbound_fact WHERE consumed_at IS NULL` |

Rolling back to the REST transport is one variable: `IMS_DRIVER=http`. Turning the whole
boundary off without losing anything is `IMS_ENABLED=false` — facts still accumulate in
`ImsSyncLog` as owed, and replay when it comes back.

---

## 10. Files

| Path | What it is |
| --- | --- |
| `apps/api/src/ims/ims.contract.ts` | The boundary: entity lists, record shapes, `ImsGateway` |
| `apps/api/src/ims/ims.mapping.ts` | Mapping types, built-in profiles, SQL builder, validation |
| `apps/api/src/ims/ims-database.service.ts` | The `pg` pool, read-only reads, outbox DDL, introspection |
| `apps/api/src/ims/drivers/database.driver.ts` | The direct transport |
| `apps/api/src/ims/drivers/http.driver.ts` | The REST transport |
| `apps/api/src/ims/drivers/disabled.driver.ts` | The no-transport transport |
| `apps/api/src/ims/ims.service.ts` | The meaning of the boundary |
| `apps/api/src/ims/ims.scheduler.ts` | Inbound sweep and outbound retry |
| `apps/api/src/ims/ims.controller.ts` | `/api/ims/*` |
| `packages/db/prisma/ims/001_gridx_outbox.sql` | The outbox DDL, for a DBA to run |
| `scripts/ims-introspect.mjs` | `pnpm ims:introspect` |
| `scripts/ims-outbox.mjs` | `pnpm ims:outbox` |
| `apps/web/src/app/(control)/app/ims/page.tsx` | The Control screen |
