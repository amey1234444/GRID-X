# 05 — API reference

Base URL: `http://localhost:4000/api` in development.
Interactive Swagger: **`/api/docs`** — generated from the controllers, always current.

Every route except those marked *Public* requires `Authorization: Bearer <accessToken>`.
The permission column is the code checked by `PermissionsGuard`; see
[03 — Security](03-security-rbac.md#22-the-role-matrix) for which roles hold it.

## Conventions

**Pagination.** Any list endpoint marked *paginated* accepts:

| Param | Default | Notes |
| --- | --- | --- |
| `page` | 1 | 1-based |
| `pageSize` | 25 | max 200 |
| `search` | — | Free text, matched against the natural key of the resource |
| `sortBy` | resource default | |
| `sortDir` | `desc` | `asc` / `desc` |

and returns `{ data, page, pageSize, total, totalPages }`.

**Errors.** `400` validation or rule violation (with a plain-language message), `401`
unauthenticated or expired, `403` permission or scope violation, `404` unknown or out of
scope, `429` rate-limited.

**Scoping.** Every list is automatically narrowed to the caller's companies, and to the
caller's own partner for partner users. A `companyId` filter may only narrow within what
the caller may already see.

---

## Authentication — `/auth`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public, rate-limited | Email + password (+ `twoFactorCode` when enrolled). Returns access token, refresh token and the user profile |
| POST | `/auth/otp/request` | Public, rate-limited | Sends a six-digit OTP to a partner phone. Always answers identically, whether or not the number exists |
| POST | `/auth/otp/verify` | Public, rate-limited | Exchanges phone + code for a session |
| POST | `/auth/partner/login` | Public, rate-limited | Partner phone + password |
| POST | `/auth/refresh` | Public | Rotates the refresh token; reuse revokes the whole family |
| POST | `/auth/logout` | Authenticated | Revokes the session family |
| GET | `/auth/me` | Authenticated | Profile, role, permissions, companies, partner, language, 2FA state |
| POST | `/auth/change-password` | Authenticated | Verifies the current password, then revokes all other sessions |
| POST | `/auth/2fa/enrol` | Authenticated | Returns a new secret and the `otpauth://` URI |
| POST | `/auth/2fa/confirm` | Authenticated | Verifies a live code; returns the recovery codes **once** |
| POST | `/auth/2fa/disable` | Authenticated | Requires a TOTP or recovery code |

---

## Partners — `/partners`

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/partners` | `partner:read` | Paginated list; filters for approval status, category, process capability, city |
| GET | `/partners/capability-matrix` | `partner:read` | The whole network pivoted as partner × process |
| GET | `/partners/machines` | `partner:read` | Machine register across the network, paginated |
| GET | `/partners/audits` | `partner:read` | Audit register, paginated |
| GET | `/partners/:id` | `partner:read` | Full profile with locations, documents, capabilities, machines, employees, audits, status history and approved components |
| POST | `/partners` | `partner:create` | Creates in `DRAFT` with a `GXP-…` code; road distance computed from the plant |
| PATCH | `/partners/:id` | `partner:update` | Updates the master; distance recomputed when coordinates change |
| POST | `/partners/:id/status` | `partner:approve` | Guarded approval transition with its document and audit gates |
| POST | `/partners/:id/suspend` | `partner:suspend` | Suspends with a reason; the partner's users lose access |
| POST | `/partners/:id/capabilities` | `partner_capability:manage` | Upserts a process capability |
| DELETE | `/partners/:id/capabilities/:capabilityId` | `partner_capability:manage` | |
| POST | `/partners/:id/machines` | `partner_machine:manage` | |
| DELETE | `/partners/machines/:machineId` | `partner_machine:manage` | |
| POST | `/partners/:id/documents` | `partner_document:manage` | Attaches a compliance document with issue and expiry dates |
| POST | `/partners/documents/:documentId/verify` | `partner_document:manage` | Marks it verified — required before a capability audit |
| POST | `/partners/:id/employees` | `partner:read` | |
| DELETE | `/partners/employees/:employeeId` | `partner:read` | |
| POST | `/partners/:id/audits` | `partner:audit` | Records a capability audit with score, findings and next due date |

---

## Component and process masters

Mounted at the API root (no group prefix).

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/components` | `component:read` | Paginated; filters for criticality, primary process, product, company |
| GET | `/components/:id` | `component:read` | With routing, BOM, criticality history, approved partners, drawings, inspection plans and active rates |
| POST | `/components` | `component:manage` | |
| PATCH | `/components/:id` | `component:manage` | |
| POST | `/components/:id/processes` | `component:manage` | Adds a routing step |
| DELETE | `/components/processes/:id` | `component:manage` | |
| POST | `/components/:id/items` | `component:manage` | Adds a BOM line |
| DELETE | `/components/items/:id` | `component:manage` | |
| POST | `/components/:id/approved-partners` | `component:manage` | Adds a partner to the approved list |
| DELETE | `/components/approved-partners/:id` | `component:manage` | |
| GET · POST | `/items` | `item:read` · `item:manage` | Raw material master |
| GET · POST | `/products` | `component:read` · `component:manage` | |
| GET | `/processes` | `component:read` | The twelve process types with their standard hourly rates |
| PATCH | `/processes/:id` | `process:manage` | Updates a standard rate |

---

## Drawings — `/drawings`

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/drawings` | `drawing:read` | Paginated; for partners, only revisions actually shared with them |
| GET | `/drawings/:id` | `drawing:read` | Drawing with every revision and its access grants |
| POST | `/drawings` | `drawing:manage` | |
| POST | `/drawings/:id/revisions` | `drawing:manage` | Creates a `DRAFT` revision with its file |
| POST | `/drawings/revisions/:revisionId/submit` | `drawing:manage` | → `UNDER_REVIEW` |
| POST | `/drawings/revisions/:revisionId/approve` | `drawing:approve` | → `APPROVED` |
| POST | `/drawings/revisions/:revisionId/release` | `drawing:release` | → `RELEASED`. Supersedes the previous revision, carries access grants across, rolls open jobs forward, notifies affected partners |
| POST | `/drawings/revisions/:revisionId/obsolete` | `drawing:release` | → `ARCHIVED`, revoking every grant |
| POST | `/drawings/revisions/:revisionId/access` | `drawing_access:manage` | Grants a partner access to a **released** revision, `VIEW_ONLY` or `VIEW_AND_DOWNLOAD`, optionally job-scoped and time-limited |
| POST | `/drawings/access/:accessId/revoke` | `drawing_access:manage` | |
| GET | `/drawings/revisions/:revisionId/view` | `drawing:read` | Returns a short-lived signed URL. Partners receive a **watermarked** copy and the access is logged |
| POST | `/drawings/revisions/:revisionId/acknowledge` | `drawing:acknowledge` | Partner acknowledgement of a revision |
| GET | `/drawings/revisions/:revisionId/access-log` | `drawing_audit:read` | Full grant/revoke/view/download history |
| GET · POST | `/drawings/engineering-changes` | `drawing:read` · `drawing:manage` | |
| POST | `/drawings/engineering-changes/:id/decision` | `drawing:approve` | Approve, reject or mark implemented |

---

## Jobs — `/jobs`

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/jobs` | `job:read` | Paginated; filters `status`, `partnerId`, `componentId`, `priority`, `companyId`, `overdue` |
| GET | `/jobs/delays` | `job:read` | The delay register: reason, responsibility, days, reporter, resolution. Filters `partnerId`, `reason`, `responsibility`, `openOnly` |
| POST | `/jobs/delays/:delayId/resolve` | `job:update` | Closes a delay once the job has recovered |
| GET | `/jobs/clarifications` | `job:read` | Open questions with days waiting; filters `status`, `partnerId` |
| GET | `/jobs/:id` | `job:read` | Full detail: component, partner, drawing revision, milestones, status history, delays, clarifications, material, inspections and photographs |
| POST | `/jobs` | `job:create` | Creates in `DRAFT`. Enforces Class A authorisation and the outsourcing eligibility score |
| PATCH | `/jobs/:id` | `job:update` | Refuses on closed or cancelled jobs |
| GET | `/jobs/:id/recommendations` | `job:allocate` | Ranked partners with the nine-factor breakdown and any blockers |
| POST | `/jobs/:id/allocate` | `job:allocate` | Re-validates approval, the approved list, the open-job limit and Class A; reserves capacity; optionally grants drawing access |
| POST | `/jobs/:id/respond` | `job:respond` | Partner accept or decline (a decline requires a reason and releases capacity) |
| POST | `/jobs/:id/milestones` | `job_milestone:update` | Milestone update. Enforces photograph evidence and the first-article gate; idempotent on `clientRequestId` |
| POST | `/jobs/:id/delays` | `job_milestone:update` | Reports a delay; responsibility is derived, not self-assigned |
| POST | `/jobs/:id/clarifications` | `job_clarification:raise` | Partner question |
| POST | `/jobs/clarifications/:clarificationId/answer` | `job_clarification:answer` | |
| POST | `/jobs/:id/close` | `job:close` | Refuses while material is unreconciled; releases capacity; pushes status and completion date to IMS |
| POST | `/jobs/:id/cancel` | `job:update` | Requires a reason; releases capacity |

---

## Capacity — `/capacity`

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/capacity/declarations` | `capacity:read` | Declarations in a window; filters `partnerId`, `processCode` |
| POST | `/capacity/declarations` | `capacity:declare` | Upserts a declaration; partners may only declare their own |
| GET | `/capacity/heatmap` | `capacity:read` | Available / committed / free hours and utilisation per partner × process × period |

---

## Materials — `/materials`

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/materials/issues` | `material:read` | Paginated challans; filters `status`, `jobId`, `partnerId` |
| GET | `/materials/issues/:id` | `material:read` | Challan with lines, acknowledgements and photographs |
| GET | `/materials/partner-stock` | `material:read` | What each partner is holding: issued, consumed, scrap returned, balance, oldest issue date and days held, with network totals |
| GET | `/materials/scrap` | `material:read` | The scrap register |
| POST | `/materials/issues` | `material:issue` | Issues against a challan; advances the job to `MATERIAL_ISSUED`; pushes to IMS |
| POST | `/materials/issues/:id/acknowledge` | `material:acknowledge` | Partner receipt with weights, damage, signature and photographs. Idempotent on `clientRequestId` |
| POST | `/materials/jobs/:jobId/consumption` | `material_consumption:update` | Theoretical vs actual, variance computed |
| POST | `/materials/jobs/:jobId/scrap` | `material_consumption:update` | Scrap generated and returned, percentage computed |
| POST | `/materials/jobs/:jobId/reconcile` | `material:reconcile` | Closes the loop; a shortage raises a deduction automatically |
| GET | `/materials/jobs/:jobId/reconciliation` | `material:read` | Per-item summary of issued, consumed, scrap, returned and balance |

---

## Quality — `/quality`

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET · POST | `/quality/plans` | `inspection:read` · `inspection_plan:manage` | Inspection plans, filterable by component |
| POST | `/quality/plans/:id/characteristics` | `inspection_plan:manage` | Adds a measured characteristic |
| DELETE | `/quality/plans/characteristics/:characteristicId` | `inspection_plan:manage` | |
| GET | `/quality/inspections` | `inspection:read` | The inspection queue, paginated; filters `status`, `type`, `jobId`, `partnerId` |
| GET | `/quality/inspections/:id` | `inspection:read` | With the plan, results, non-conformances and photographs |
| POST | `/quality/inspections` | `inspection:request` | Partner offers a quantity; the job moves to `INSPECTION_REQUESTED` |
| POST | `/quality/inspections/:id/assign` | `inspection_plan:manage` | Assigns an inspector and a due date |
| POST | `/quality/inspections/:id/start` | `inspection:perform` | → `IN_PROGRESS` |
| POST | `/quality/inspections/:id/results` | `inspection:perform` | Records measured characteristics and evidence |
| POST | `/quality/inspections/:id/complete` | `inspection:perform` | The decision and disposition. Raises non-conformance, corrective action, rework order and deviation as applicable; recomputes job totals; transitions the job; pushes to IMS |
| GET | `/quality/non-conformances` | `inspection:read` | |
| GET · POST | `/quality/rework` | `inspection:read` · `rework:manage` | |
| PATCH | `/quality/rework/:id` | `rework:manage` | Status and actuals; a completed chargeable rework raises a deduction |
| GET · POST | `/quality/corrective-actions` | `inspection:read` · `corrective_action:manage` | |
| PATCH | `/quality/corrective-actions/:id` | `corrective_action:manage` | Advances a stage; closing requires verification evidence |
| GET | `/quality/deviations` | `inspection:read` | |
| PATCH | `/quality/deviations/:id` | `deviation:approve` | Engineering decision with a note |

---

## Tooling — `/tooling`

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/tooling/tools` | `tool:read` | Paginated; filters `category`, `partnerId`, `calibrationDue` |
| POST | `/tooling/tools` | `tool:manage` | Creates with a `GXT-…` code |
| POST | `/tooling/tools/:id/issue` | `tool:manage` | Refuses if already issued |
| POST | `/tooling/issues/:id/return` | `tool:manage` | Damaged or scrapped closes as `DAMAGED` |
| POST | `/tooling/tools/:id/calibrations` | `tool:manage` | Records calibration and computes the next due date |

---

## Logistics — `/logistics`

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/logistics/shipments` | `shipment:read` | Paginated; filters `status`, `statuses` (comma-separated), `direction`, `partnerId`, `pickupOverdue`, `deliveryOverdue` |
| GET | `/logistics/shipments/:id` | `shipment:read` | With items, vehicle and proof of delivery |
| POST | `/logistics/shipments` | `shipment:manage` | Creates with a `GXS-…` number |
| PATCH | `/logistics/shipments/:id/status` | `shipment:manage` | Pickup, transit and delivery; delivery advances the linked job to `RECEIVED` |
| POST | `/logistics/shipments/:id/proof-of-delivery` | `shipment:manage` | Receiver, signature and photograph |
| GET · POST | `/logistics/vehicles` | `shipment:read` · `shipment:manage` | Vehicle master |

---

## Commercials — `/commercials`

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET · POST | `/commercials/rates` | `rate:read` · `rate:manage` | Rate contracts; a new rate carries the previous one forward as history |
| GET | `/commercials/invoices` | `invoice:read` | Paginated; filters `status`, `partnerId` |
| GET | `/commercials/invoices/invoiceable-jobs` | `invoice:read` | Accepted, uninvoiced jobs with their computed value |
| GET | `/commercials/invoices/:id` | `invoice:read` | With lines, approvals, payments and adjustments |
| POST | `/commercials/invoices` | `invoice:submit` | Computes basic, earned incentives, deductions, tax and net; writes the ledger lines |
| POST | `/commercials/invoices/:id/verify-quantity` | `invoice:verify_quantity` | |
| POST | `/commercials/invoices/:id/verify-quality` | `invoice:verify_quality` | |
| POST | `/commercials/invoices/:id/verify-material` | `invoice:verify_quantity` | **Hard gate**: refuses while an `OSWAR_SUPPLIED` job is unreconciled |
| POST | `/commercials/invoices/:id/approve` | `invoice:approve` | Finance approval; pushes the invoice and conversion cost to IMS |
| POST | `/commercials/invoices/:id/hold` | `invoice:approve` | Holds with a reason the partner can see |
| POST | `/commercials/invoices/:id/schedule` | `invoice:approve` | Sets the payment date |
| POST | `/commercials/invoices/:id/payments` | `payment:record` | Records a payment; refuses overpayment; supports partials |
| POST | `/commercials/adjustments` | `invoice:approve` | Manual incentive or deduction |
| GET | `/commercials/approvals` | `invoice:read` | The approval queue across invoices |
| GET · POST | `/commercials/incentive-rules` | `rate:read` · `rate:manage` | Rules with their performance thresholds |

---

## Scorecards — `/scorecards`

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/scorecards` | `scorecard:read` | Scores for a period |
| GET | `/scorecards/leaderboard` | `scorecard:read` | Ranking and category mix |
| GET | `/scorecards/partners/:partnerId` | `scorecard:read` | A partner's history with the KPI breakdown |
| POST | `/scorecards/compute` | `scorecard:compute` | Recomputes a period, for one partner or all. Idempotent |

---

## Dashboards — `/dashboards`

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/dashboards/management` | `dashboard:management` |
| GET | `/dashboards/operations` | `dashboard:operations` |
| GET | `/dashboards/quality` | `dashboard:quality` |
| GET | `/dashboards/finance` | `dashboard:finance` |
| GET | `/dashboards/partner` | `dashboard:partner` |

Contents are described in [08 — Dashboards and reports](08-dashboards-reports.md).

---

## Reports — `/reports`

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/reports` | `report:read` | The catalogue of 17 reports |
| GET | `/reports/:key` | `report:read` | Runs one; filters `from`, `to`, `partnerId`, `componentId` |
| GET | `/reports/:key/export` | `report:read` | The same result as CSV, correctly quoted |

---

## Files — `/files`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/files/upload` | Authenticated | Multipart upload, `?category=` one of the eight `FileCategory` values. Max 25 MB, MIME allow-list, SHA-256 checksum, PDF preview generated. Returns the id, a signed URL and a preview URL |
| GET | `/files/:id/url` | Authenticated | A fresh signed URL |
| GET | `/files/raw/:key` | Public | Local development delivery only; production uses signed object-storage URLs |

---

## Notifications — `/notifications`

| Method | Path | Description |
| --- | --- | --- |
| GET | `/notifications` | The caller's notifications, paginated, with an unread count; filters `status`, `event` |
| POST | `/notifications/:id/read` | Marks one read |
| POST | `/notifications/read-all` | Marks everything read |

---

## IMS integration — `/ims`

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/ims/status` | `ims:sync` | Transport in force, write mode, mapping profile, sync settings. The connection string comes back with its password redacted |
| GET | `/ims/health` | `ims:sync` | Live probe: reachable, latency, server version |
| GET | `/ims/entities` | `ims:sync` | The inbound and outbound entity catalogues, and which inbound ones are persisted |
| GET | `/ims/mapping` | `ims:sync` | The effective table/column mapping the direct driver reads through |
| GET | `/ims/introspect` | `ims:sync` | The mapping checked against the live IMS schema: missing tables, missing columns, unmapped columns. Direct driver only |
| GET | `/ims/preview` | `ims:sync` | Reads rows for one entity without persisting anything |
| GET | `/ims/logs` | `ims:sync` | The sync log, newest first |
| GET | `/ims/cursors` | `ims:sync` | Per-entity incremental watermarks |
| POST | `/ims/cursors/reset` | `ims:sync` | Clears one watermark so the next sync reads in full |
| POST | `/ims/pull` | `ims:sync` | Pulls one master entity (companies, items, products persisted; the rest read-through). `incremental` honours the watermark; `records` accepts a payload posted directly |
| POST | `/ims/sync` | `ims:sync` | Pulls every entity in `IMS_SYNC_ENTITIES` incrementally, the sweep the scheduler runs |
| POST | `/ims/push` | `ims:sync` | Pushes one outbound fact by record reference |
| POST | `/ims/retry` | `ims:sync` | Replays failed outbound deliveries now |
| GET | `/ims/orders` | `job:create` | Live sales-order or work-order lookup for job creation |
| GET | `/ims/stock` | `material:read` | Live IMS warehouse balances, read-through, for material issue |

Full treatment of the boundary — connection, mapping, outbox, runbook — is
[13 — IMS integration](13-ims-integration.md).

---

## Imports — `/imports`

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/imports/entities` | `component:read` | The three importable entities and their columns |
| GET | `/imports/:entity/template` | `component:read` | A CSV template |
| POST | `/imports/:entity` | `component:manage` | Imports parsed rows; `commit: false` validates only |
| POST | `/imports/:entity/upload` | `component:manage` | Uploads a CSV file directly |

---

## Administration

Mounted at the API root.

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/users` | `user:read` | Scoped: a partner owner sees only their unit; an internal user sees their companies' users and the partner users beneath them |
| POST · PATCH | `/users`, `/users/:id` | `user:manage` | Create and update, including role, companies and status |
| POST | `/users/:id/suspend` | `user:manage` | |
| GET | `/roles` | `user:read` | The role catalogue with labels, descriptions and current permissions |
| PATCH | `/roles/:code` | `role:manage` | Adjusts a role's permission set |
| GET | `/companies` | Authenticated | The companies the caller may see |
| POST | `/companies` | `company:manage` | |
| GET | `/audit-logs` | `audit_log:read` | Filterable by entity type, entity id, user and action |
| GET | `/settings` | `setting:manage` | |
| PATCH | `/settings/:key` | `setting:manage` | |

---

## Health — `/health`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/health` | Public | `{ status, database, uptimeSeconds }` — the Render probe |
| POST | `/health/client-error` | Public | Relays a browser React-boundary error to Sentry; fields are length-capped since this is unvalidated public input |
