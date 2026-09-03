# 07 — Background jobs, notifications and the IMS boundary

---

## 1. Scheduled work

Four cron jobs run on `@nestjs/schedule`. Nest's scheduler fires on **every** instance
that is running, so the moment the API is scaled past one the same work would be done
two or three times over — duplicate scorecards, partners alerted repeatedly, IMS handed
the same fact twice. Every job therefore claims a named lock first.

| Job | Schedule | Lease | Work |
| --- | --- | --- | --- |
| `hourly-alerts` | Every hour | 600 s | Pending job acceptance, unacknowledged material, delayed inspections |
| `daily-alerts` | 07:00 daily | 900 s | Overdue milestones, expiring documents, calibration due, pending reconciliation, tools not returned, damaged tools, unauthorised tool custody, corrective actions due |
| `monthly-partner-scorecards` | 02:00 on the 1st | 1800 s | Computes and publishes the closed month's scorecard for every allocatable partner |
| `ims-outbound-retry` | Every 10 minutes | 540 s | Replays outbound facts IMS has not accepted |
| `ims-inbound-sync` | Every 30 minutes | 1740 s | Pulls `IMS_SYNC_ENTITIES` incrementally from IMS |

### `SchedulerLockService`

`runExclusively(name, leaseSeconds, work)`:

1. Claim the `SchedulerLock` row with a **single conditional UPDATE** — two instances
   racing cannot both win.
2. The claim carries an expiry, so an instance that dies mid-run releases the lock
   instead of blocking that job forever.
3. On completion the lease is released early, so a retry is not made to wait it out.
4. The row records the holder (`RENDER_INSTANCE_ID` where available), so a stuck lock
   names the instance holding it.

Each job also swallows its own exceptions and logs them: a failed month must never take
the API down, and the run can be repeated from the UI.

The monthly scorecard run is **idempotent** — scores are upserted on
(partner, year, month) — so a manual re-run after late data entry corrects rather than
duplicates. The lock exists because a second run would still publish a second
notification to every partner.

---

## 2. The alert catalogue

`AlertsService` implements every alert of blueprint Section 13, plus the Module 9 tooling
escalations.

| Alert | Trigger | Who is told |
| --- | --- | --- |
| Job acceptance pending | `AWAITING_PARTNER_ACCEPTANCE` for more than 24 hours | The partner |
| Material receipt not acknowledged | Challan `ISSUED` more than 24 hours ago | The partner, and stores internally |
| Job milestone overdue | Past its due date and not yet accepted for quality | The partner, and operations |
| Inspection delayed | `REQUESTED`/`ASSIGNED` for more than 48 hours | Quality inspectors and operations |
| Compliance document expiring | Expiry within 30 days | Procurement and the GRID-X Head |
| Fixture calibration due | `nextCalibrationDue` within 30 days | Stores and quality |
| Material not reconciled | Job closed or accepted more than 7 days ago with a pending reconciliation | Stores and finance |
| Tool not returned | Past its expected return date | Stores internally, and the partner holding it |
| Tool damaged | Condition `DAMAGED` or `SCRAPPED` | Stores and the GRID-X Head |
| Unauthorised tool custody | A tool records a current partner but has no open issue to them | Stores and the GRID-X Head |
| Corrective action due | Not closed and due within 3 days, or already overdue | The owner and quality |

Event-driven notifications (raised inline by the services rather than by cron) cover the
rest of the 31 `NotificationEvent` values: new job assigned, job accepted/declined, delay
reported, clarification raised and answered, job closed, material issued and
acknowledged, inspection requested and completed, rework issued, drawing revision
changed, drawing access granted, shipment dispatched and received, invoice submitted,
approved, held, payment released, partner status changed, scorecard published, partner
rating reduced.

---

## 3. Notification delivery

`NotificationsService.notify(input)` takes an event, a title, a body, an optional deep
link, the entity it concerns, and an audience.

**Audience resolution** — any combination of:
* `userIds` — specific people (an assigned inspector);
* `partnerId` — every active user of that partner;
* `roleCodes` — every active holder of those roles.

Only `ACTIVE` users are ever selected.

**Channels** — `IN_APP` (default), `EMAIL`, `WHATSAPP`, `SMS`. A `Notification` row is
written for every recipient × channel, so the platform always has a record even when a
channel is unconfigured or fails:

* In-app is written as `SENT` immediately.
* Email goes through `nodemailer` when `NOTIFY_EMAIL_ENABLED` and an SMTP host are set;
  otherwise the row is marked `FAILED` with `"Email channel not configured"`.
* WhatsApp/SMS posts to `WHATSAPP_API_URL` with a bearer token; the same failure
  recording applies, and any error is stored on the row.

**Critical approvals never happen over WhatsApp** — the message carries a deep link into
the app, exactly as the blueprint requires. The one message that is not a notification is
the login OTP: `sendDirectMessage()` sends it straight to the phone without recording a
row, because a credential does not belong in an inbox.

Partner-facing events that matter — new job, drawing revision changed, material issued,
inspection completed, rating reduced, payment released, status changed — are sent on
`IN_APP` **and** `WHATSAPP`, since that is where partners actually are.

---

## 4. The IMS boundary (Section 10)

The principle: **IMS manages internal inventory and manufacturing; GRID-X manages
external distributed manufacturing.** GRID-X must not duplicate inventory, purchase-order
or customer data.

The full treatment — connecting to the IMS database, the schema mapping, introspection,
the outbox, least-privilege grants, the runbook and troubleshooting — is
[13 — IMS integration](13-ims-integration.md). This section is the summary.

### Transports

The *meaning* of the boundary (what is persisted, what is read-through, how a failed
delivery is retried, what is audited) lives in `ImsService`. The *transport* is an
`ImsGateway`, chosen by `IMS_DRIVER`:

| Driver | Reads | Writes |
| --- | --- | --- |
| `database` | `SELECT` against the IMS's own tables over `IMS_DATABASE_URL`, inside a `READ ONLY` transaction | Upsert into GRID-X's own outbox table inside the IMS database |
| `http` | `GET {IMS_BASE_URL}/{entity}` | `POST {IMS_BASE_URL}/{entity}` |
| `disabled` | Fails loudly | Records the fact as owed, in the sync log |

Left unset, the driver is inferred: a database URL wins, then a base URL, else disabled.
Outbound facts can take a different road from inbound reads — `IMS_WRITE_MODE=http`
reads the database directly but posts facts to the API.

The direct driver never writes to a table the IMS owns. It does not know the IMS's
invariants — which columns are computed, which triggers fire, which rows a nightly job
expects to own — so facts go into `gridx.ims_outbound_fact`, a queue GRID-X owns and IMS
drains at its own pace.

### Inbound

Eleven entities are recognised:

```
companies · products · items · sales-orders · work-orders · suppliers
stock · warehouses · material-transactions · users · purchase-orders
```

Only three are **persisted**, because only three are genuinely needed locally:
`companies`, `items` and `products` — each validated with a zod schema, upserted on its
natural key, and counted as created/updated/skipped. Everything else is logged as a
**read-through**, with the message *"Read-through entity: IMS remains the system of
record"*, so GRID-X never becomes a second source of truth.

`GET /api/ims/orders` reads sales orders and work orders **live** for job creation. The
planner picks an order, and only its reference is stored on the job. `GET /api/ims/stock`
does the same for warehouse balances, so a stores user can see whether a job's material
exists before raising an issue — read-through, never stored.

The three persisted entities are pulled **incrementally**. Each carries a mapped change
column; after a sweep the highest value seen is stored as a watermark in `SystemSetting`
under `ims:cursor:<entity>`, and the next sweep reads only rows at or after it. An entity
with no change column falls back to a full read and says so, rather than silently
returning everything as if it were new. A manual pull from Control ignores the watermark —
an operator pulling by hand is usually correcting something the sweep got wrong, and a
watermark would hide exactly the rows they want.

### Outbound

Seven facts flow back:

| Fact | Raised when |
| --- | --- |
| `outsourced-work-order-status` | A job is closed |
| `actual-completion-dates` | A job is closed |
| `material-issued` | A challan is issued |
| `finished-components-received` | An inspection takes the job to `QUALITY_ACCEPTED` |
| `rejected-quantities` | An inspection rejects any quantity |
| `conversion-cost` | An invoice is finance-approved |
| `partner-invoices` | An invoice is finance-approved |

Each is raised through `pushInBackground()`, which never throws — an IMS outage delays
the sync, it does not block closing a job or approving an invoice.

### Delivery, retry and abandonment

Every call, inbound or outbound, writes an `ImsSyncLog` row with the payload, so the
boundary stays auditable even when the endpoint is unavailable.

A failed outbound row is a delivery still owed. The retry worker:

* selects `OUTBOUND` rows that failed, are not abandoned, are under
  `MAX_PUSH_ATTEMPTS = 8`, and are due (`nextAttemptAt` null or past);
* replays the stored payload, up to 50 per sweep, oldest first;
* on success marks it delivered and records which attempt succeeded;
* on failure records the reason and schedules the next attempt with exponential
  backoff — `backoffFrom()` doubles from one minute to a six-hour ceiling;
* after eight attempts stamps `abandonedAt` and logs an error for an operator.

Delivery is at-least-once, and both transports make that safe. The outbox is keyed
`UNIQUE (entity, record_ref)` and upserts, so a job reopened and re-closed overwrites its
own fact rather than queueing a second, contradictory one. An HTTP IMS is expected to do
the same, which it must anyway for the same reason.

Timeouts are per transport. HTTP calls carry an `AbortController` timeout
(`IMS_TIMEOUT_MS`, default 15 s) and an optional bearer token, and accept either a bare
array or `{ data: [...] }` as the response. Database reads carry a server-side
`statement_timeout` (`IMS_DB_STATEMENT_TIMEOUT_MS`, default 15 s) and an
`idle_in_transaction_session_timeout` of twice that, so a query against an unindexed
column gives up instead of holding an IMS connection open. The pool is capped at
`IMS_DB_POOL_MAX` (default 5) — GRID-X must never be able to exhaust the IMS's connection
budget.

### Operating it

`/app/ims` in Control shows the transport in force, a live connection probe with latency
and server version, the schema mapping checked against the real IMS tables, the
incremental watermarks, the entity catalogues, buttons to sync/pull/push/retry, and the
sync log with attempt counts and next-attempt times — all behind `ims:sync`, which only a
Group Admin holds by default. `GET /api/ims/stock` is behind `material:read` instead,
because it is a stores question rather than an integration one.
