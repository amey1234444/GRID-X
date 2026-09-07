# 11 — Application flow and navigation guide

This document explains GRID-X the way you actually use it: section by section down the
left sidebar, and then end to end as the flow of a single job from creation to payment.

Where the other documents in this folder are organised by *architecture* ([01](01-architecture.md)),
by *data* ([02](02-data-model.md)) and by *blueprint module* ([04](04-modules.md)), this one is
organised by *what you see on screen* and *what happens when you click it*. If you are new to
GRID-X, read this first, then go deeper via the cross-references.

---

## 1. What GRID-X actually is

OSWAR does not manufacture everything itself. It sends work out to a network of external
manufacturing partners — small workshops, fabricators, machine shops — and needs to control
that relationship completely: who is allowed to make what, at what price, with whose material,
inspected to what standard, delivered when, and paid how much.

GRID-X is the system of record for that entire transaction. Its central claim is:

> **Nothing moves without a state change, and no state change happens without a record of who
> did it and why.**

Every meaningful noun in the business is a database row with a status field, and every status
field is governed by an explicit transition table. You cannot skip a step. The system is built
around **80 Prisma models** and **52 enums**, of which roughly a dozen are true state machines.

---

## 2. The three surfaces

The same API serves three different front ends. This matters because the sidebar in your
screenshot is only one of them.

| Surface | Who uses it | Where | Navigation source |
| --- | --- | --- | --- |
| **GRID-X Control** | OSWAR internal staff | `apps/web`, routes under `/app` | `CONTROL_NAVIGATION` |
| **Partner PWA** | The external manufacturing partner | `apps/web`, routes under `/partner` | `PARTNER_NAVIGATION`, `PARTNER_TABS` |
| **Mobile app** | Inspectors and Partners in the field | `apps/mobile` (Expo/React Native) | `apps/mobile/src/navigation` |

All three are pure presentation layers. No business rule lives in a client — the API is the
only place a status can change. This is why the mobile app can be a thin read-focused client
without duplicating any logic.

The sidebar is defined in exactly one place: [`packages/shared/src/navigation.ts`](../packages/shared/src/navigation.ts).
Both the sidebar and the command palette (`Ctrl+K`) read from that same constant, which is why
they can never drift apart.

### Why your sidebar may be shorter than a colleague's

Every nav entry carries a `permission`. The shell renders only what your role grants. Two
sections commonly missing from a non-admin sidebar:

- **IMS integration** (`/app/ims`) — needs `IMS_SYNC`
- **Administration** (`/app/admin/*`) — needs `USER_READ`

`Dashboard` and `Notifications` carry no permission, so everyone sees them.

---

## 3. The spine: how a job flows end to end

This is the part most people need. Everything else in the sidebar exists to feed, gate, or
settle this one flow.

```
DRAFT
  └─> AWAITING_PARTNER_ACCEPTANCE     planner allocates to a partner
        └─> ACCEPTED                  partner accepts in the PWA
              ├─> MATERIAL_PENDING    (if OSWAR supplies material)
              │     └─> MATERIAL_ISSUED
              │           └─> IN_PRODUCTION
              └─> IN_PRODUCTION       (if partner supplies its own material)
                    └─> INSPECTION_REQUESTED
                          └─> UNDER_INSPECTION
                                ├─> REWORK ──> back to inspection
                                └─> QUALITY_ACCEPTED
                                      └─> DISPATCHED
                                            └─> RECEIVED
                                                  └─> CLOSED
```

The authoritative table is `JOB_STATUS_TRANSITIONS` in
[`packages/shared/src/enums.ts:301`](../packages/shared/src/enums.ts#L301). Any attempt to move
a job outside these edges is rejected by `assertTransition` in
[`jobs.service.ts:1212`](../apps/api/src/jobs/jobs.service.ts#L1212).

| From | Allowed next |
| --- | --- |
| `DRAFT` | `AWAITING_PARTNER_ACCEPTANCE`, `CANCELLED` |
| `AWAITING_PARTNER_ACCEPTANCE` | `ACCEPTED`, `DRAFT`, `CANCELLED` |
| `ACCEPTED` | `MATERIAL_PENDING`, `IN_PRODUCTION`, `CANCELLED` |
| `MATERIAL_PENDING` | `MATERIAL_ISSUED`, `CANCELLED` |
| `MATERIAL_ISSUED` | `IN_PRODUCTION`, `CANCELLED` |
| `IN_PRODUCTION` | `INSPECTION_REQUESTED`, `CANCELLED` |
| `INSPECTION_REQUESTED` | `UNDER_INSPECTION`, `IN_PRODUCTION` |
| `UNDER_INSPECTION` | `REWORK`, `QUALITY_ACCEPTED`, `IN_PRODUCTION` |
| `REWORK` | `INSPECTION_REQUESTED`, `UNDER_INSPECTION`, `CANCELLED` |
| `QUALITY_ACCEPTED` | `DISPATCHED` |
| `DISPATCHED` | `RECEIVED` |
| `RECEIVED` | `CLOSED` |
| `CLOSED`, `CANCELLED` | *(terminal)* |

Two things worth noticing:

- **Cancellation stops being possible once quality is accepted.** From `QUALITY_ACCEPTED`
  onward the only path is forward. Good parts exist; the commercial obligation is real.
- **`ACCEPTED` branches on material responsibility.** `MaterialResponsibility` is either
  `OSWAR_SUPPLIED` (go via `MATERIAL_PENDING`) or `PARTNER_SUPPLIED` (straight to production).

### Where a job comes from

`JobSource` records why the job exists: `SALES_ORDER`, `WORK_ORDER`, `INTERNAL_PRODUCTION`,
`REPLENISHMENT`, or `MANUAL`. `sourceRef` holds the upstream identifier, which is how a GRID-X
job traces back to an IMS sales order.

### How a job reaches a partner — the allocation algorithm

This is the single most important piece of logic in the platform, and it answers "how does
work get given out".

When a planner opens a `DRAFT` job and asks for recommendations, the system does **not** pick a
partner. It ranks candidates and the planner decides. The code path is
`JobsService.recommendations` at [`jobs.service.ts:594`](../apps/api/src/jobs/jobs.service.ts#L594).

**Step 1 — build the candidate list.** Only partners in `ApprovedPartnerComponent` for this
exact component, with `isActive: true`. A partner who has never been approved for the component
is not a candidate at all, regardless of how good they are.

**Step 2 — score each candidate** using `scorePartnerForJob`
([`packages/shared/src/allocation.ts:78`](../packages/shared/src/allocation.ts#L78)). Nine
weighted factors, totalling 100:

| Factor | Weight | How it scores |
| --- | --- | --- |
| Approved capability | 20 | 100 if approved for the process, else 0 |
| Partner rating | 15 | The partner's current scorecard total |
| Available capacity | 15 | `freeHours / requiredHours × 100`, capped at 100 |
| Delivery performance | 12 | On-time-in-full KPI |
| Current workload | 10 | `100 − (openJobs / maxOpenJobs × 100)` |
| Distance | 8 | Linear decay to zero at 400 km |
| Conversion cost | 8 | `bestRate / thisRate × 100` |
| Quality score | 7 | First-pass-quality KPI |
| Concentration risk | 5 | Decays as the partner's share of network value rises |

**Step 3 — collect blockers.** Separately from the score, hard blockers are listed:

- Not an approved partner for this component
- Declared free capacity is lower than the job requirement
- Partner is at its maximum open-job limit
- Concentration risk — partner already holds more than **25%** of network value
- Partner is not approved for allocation (status not in the allocatable set)
- No capacity declared for this period

Two design decisions here are deliberate and easy to misread:

- **A missing capacity declaration is not treated as unlimited capacity.** If a partner has not
  declared, the system falls back to the capability's monthly figure minus committed hours, then
  to zero. A partner who has said nothing does not outrank a partner who has committed.
- **Concentration risk is measured inside the owning company only**, not across the whole group.

**Step 4 — the planner allocates.** `JobsService.allocate` writes a `JobAssignment` row that
stores both `recommendationScore` and `recommendationDetail` — so months later you can see what
the system advised and whether the human agreed. The job moves to
`AWAITING_PARTNER_ACCEPTANCE` and a `NEW_JOB_ASSIGNED` notification fires.

**Step 5 — the partner responds.** In the PWA the partner accepts or declines
(`JobsService.respond`). Declining records `declinedAt` and `declineReason`; the job returns to
the planner.

### Milestones — how progress is reported

Once in production, the partner reports progress as milestones rather than free text:

`JOB_ACCEPTED` → `MATERIAL_RECEIVED` → `PRODUCTION_STARTED` → `FIRST_PIECE_READY` →
`BATCH_25_PERCENT` → `BATCH_50_PERCENT` → `BATCH_READY_FOR_INSPECTION` → `DISPATCHED`

Three enforcement rules apply to milestone updates
([`jobs.service.ts:985`](../apps/api/src/jobs/jobs.service.ts#L985)):

1. **First-article gating.** For components whose criticality and inspection level demand it,
   batch-progress milestones are refused until a `FIRST_ARTICLE` inspection exists and is
   `ACCEPTED` or `ACCEPTED_WITH_DEVIATION`. The error message differs depending on whether an
   inspection is pending or was never requested.
2. **Drawing acknowledgement.** A partner may not report production against a drawing revision
   they have not acknowledged.
3. **Evidence.** `assertMilestoneEvidence` requires photographs for the milestones that demand
   proof.

Milestone updates carry a `clientRequestId`. If the same ID arrives twice the existing row is
returned unchanged — this is what makes the **offline queue** in the mobile app and PWA safe to
replay after a connectivity drop.

### When things go wrong

- **`JobDelay`** — the partner reports a delay with a `DelayReason` (material shortage, machine
  breakdown, power issue, OSWAR approval pending, and so on) and a `ResponsibleParty`
  (`PARTNER`, `OSWAR`, `SHARED`, `EXTERNAL`). Attributing fault is explicit, because it feeds
  the scorecard.
- **`JobClarification`** — a question against the drawing or spec. `OPEN` → `ANSWERED` →
  `CLOSED`. Raised by the partner, answered by engineering.

---

## 4. The sidebar, section by section

### Dashboard — `/app`

The landing page. Role-aware: management, operations, quality, finance and partner dashboards
each surface different tiles. Detail in [08 — Dashboards and reports](08-dashboards-reports.md).

### Partners

The supply-base master. This section answers "who may we give work to, and are they any good".

| Subsection | Route | What it does |
| --- | --- | --- |
| All partners | `/app/partners` | The partner master and onboarding pipeline |
| Capabilities | `/app/partners/capabilities` | Which processes each partner is approved for |
| Machines | `/app/partners/machines` | Declared machine list, condition, ownership |
| Audits | `/app/partners/audits` | Physical capability audits |
| Scorecards | `/app/partners/scorecards` | Monthly performance grading |

**Onboarding is a state machine.** `PartnerApprovalStatus` runs
`DRAFT` → `DOCUMENT_REVIEW` → `CAPABILITY_AUDIT` → `TRIAL_APPROVED` → `APPROVED` → `CERTIFIED`
→ `STRATEGIC`, with `SUSPENDED` reachable as an exit. Only partners in the allocatable set can
receive jobs, which is what ties this screen to the allocation algorithm above.

**Capabilities** are per `ProcessType` (`CUTTING`, `BENDING`, `WELDING`, `FABRICATION`,
`MACHINING`, `DRILLING`, `GRINDING`, `PAINTING`, `ASSEMBLY`, `PACKING`, `ELECTRICAL_WIRING`,
`TRANSPORT`) and carry `isApproved` plus `monthlyCapacityHours`. That approval flag is worth
20 points — the single largest weight in allocation.

**Scorecards** are computed monthly from seven weighted KPIs
([`packages/shared/src/scorecard.ts`](../packages/shared/src/scorecard.ts)):

| KPI | Weight |
| --- | --- |
| First-pass quality | 30 |
| On-time-in-full delivery | 25 |
| Material utilisation | 15 |
| Rework response | 10 |
| Capacity reliability | 10 |
| Documentation discipline | 5 |
| Safety and compliance | 5 |

The total maps to a grade and a recommended action:

| Score | Category | Recommendation |
| --- | --- | --- |
| ≥ 90 | A | `INCREASE_ALLOCATION` |
| ≥ 80 | B | `MAINTAIN_ALLOCATION` |
| ≥ 70 | C | `DEVELOPMENT_PLAN` |
| < 70 | D | `REDUCE_ALLOCATION` |
| any, with critical violation | `SUSPENDED` | `SUSPEND_PARTNER` |

A critical violation short-circuits the arithmetic entirely. There is also an
"insufficient data" floor so that a partner with almost no activity is not accidentally graded A.

This closes the loop: **scorecard feeds allocation, allocation generates jobs, jobs generate the
next scorecard.**

### Engineering

The product definition. Nothing can be made that is not defined here.

| Subsection | Route | What it does |
| --- | --- | --- |
| Components | `/app/engineering/components` | The part master |
| Drawings | `/app/engineering/drawings` | Controlled drawings and revisions |
| Inspection plans | `/app/engineering/inspection-plans` | What to measure and to what tolerance |
| Masters | `/app/engineering/masters` | Products, items, processes |

**Criticality drives everything downstream.** Each component carries a `CriticalityClass`:

- `CLASS_A` — critical, retain in-house
- `CLASS_B` — controlled outsourcing
- `CLASS_C` — standard outsourcing
- `CLASS_D` — suitable for cottage or micro units

Class A is the gate on outsourcing. `GridJob` carries `classAOverrideById` and
`classAOverrideReason` — you *can* outsource a Class A part, but only by naming who authorised
it and why.

And an `InspectionLevel`: `LEVEL_1_VISUAL`, `LEVEL_2_SAMPLING`, `LEVEL_3_FULL_DIMENSIONAL`,
`LEVEL_4_CRITICAL_100_PERCENT`. Together, criticality and inspection level decide whether the
first-article gate described above applies.

**Drawings are access-controlled, not just stored.** `DrawingStatus` runs `DRAFT` →
`UNDER_REVIEW` → `APPROVED` → `RELEASED` → `SUPERSEDED` → `ARCHIVED`. A partner receives a
`DrawingAccess` grant scoped to a job, in mode `VIEW_ONLY` or `VIEW_AND_DOWNLOAD`, and every
`GRANTED` / `REVOKED` / `VIEWED` / `DOWNLOADED` event is written to `DrawingAccessLog`. The
partner must record a `DrawingAcknowledgement` against the revision before reporting production
against it.

`EngineeringChange` (`RAISED` → `UNDER_REVIEW` → `APPROVED` → `IMPLEMENTED`, or `REJECTED`)
handles revisions to live parts, and fires `DRAWING_REVISION_CHANGED` to affected partners.

### Production

Where jobs are created and watched. This is the operational cockpit for the flow in section 3.

| Subsection | Route | What it does |
| --- | --- | --- |
| Jobs | `/app/production/jobs` | The job list; `/new` to create, `/[id]` for the full detail |
| Planning board | `/app/production/planning-board` | Allocation view — match open jobs to partners |
| Capacity | `/app/production/capacity` | Declared capacity and its commitments |
| Delays | `/app/production/delays` | Every reported delay, with attribution |
| Clarifications | `/app/production/clarifications` | Open questions from partners |

**Capacity** deserves attention because it is the factor most often misunderstood. Partners
declare capacity per process for a period (`WEEKLY` or `MONTHLY`) via `CapacityDeclaration`.
Allocating a job writes a `CapacityAllocation` against that declaration. Free hours are
declared minus committed — which is why declaring a shutdown genuinely removes a partner from
recommendations, rather than the system relying on a static number on the partner master.

### Materials

Tracks OSWAR-owned material while it sits in someone else's workshop. This exists because
material issued to a partner is still OSWAR's asset.

| Subsection | Route | What it does |
| --- | --- | --- |
| Material issues | `/app/materials/issues` | Issue notes against a job |
| Partner stock | `/app/materials/partner-stock` | What each partner currently holds |
| Scrap | `/app/materials/scrap` | Scrap generated and returned |
| Reconciliation | `/app/materials/reconciliation` | Balancing issued against consumed |

`MaterialIssueStatus` runs `DRAFT` → `PREPARED` → `ISSUED` → `ACKNOWLEDGED` →
`PARTIALLY_RECONCILED` → `RECONCILED`, with `CANCELLED` available. The `ACKNOWLEDGED` step is
the partner confirming receipt — until then there is a `MATERIAL_RECEIPT_NOT_ACKNOWLEDGED`
alert hanging over it.

Every movement is a `MaterialTransaction` with an explicit type: `ISSUED_TO_PARTNER`,
`RECEIVED_BY_PARTNER`, `CONSUMED`, `SCRAP_GENERATED`, `SCRAP_RETURNED`,
`UNUSED_MATERIAL_RETURNED`, `SHORTAGE`, `EXCESS`, `REJECTED_MATERIAL`, `REPLACEMENT_MATERIAL`.

Reconciliation lands on one of `PENDING`, `BALANCED`, `SHORTAGE`, `EXCESS`, `DISPUTED` — and
**this result gates payment**, as section 4's Commercial subsection shows.

### Quality

| Subsection | Route | What it does |
| --- | --- | --- |
| Inspection queue | `/app/quality/inspections` | Everything awaiting or under inspection |
| Non-conformances | `/app/quality/non-conformances` | Recorded defects |
| Rework | `/app/quality/rework` | Rework orders and their progress |
| Corrective actions | `/app/quality/corrective-actions` | Systemic fixes, 8D-style |

**Inspections** have a type — `INCOMING_MATERIAL`, `FIRST_ARTICLE`, `IN_PROCESS`, `FINAL`,
`RECEIVING`, `PARTNER_AUDIT` — and run `REQUESTED` → `ASSIGNED` → `IN_PROGRESS` → `COMPLETED`
(or `CANCELLED`). Each records individual `InspectionResult` rows with a verdict of `PASS`,
`FAIL` or `NOT_APPLICABLE` against the characteristics from the inspection plan.

The inspection closes with an `InspectionDecision` — `ACCEPTED`, `ACCEPTED_WITH_DEVIATION`,
`REWORK_REQUIRED`, `REJECTED`, or `HOLD_FOR_ENGINEERING_REVIEW`.

**The decision is recorded, but it is not what moves the job.** This trips people up. The next
job status is derived from *quantities*, at
[`quality.service.ts:543`](../apps/api/src/quality/quality.service.ts#L543):

```
if      reworkQuantity > 0                        → REWORK
else if Σ acceptedQuantity >= job.quantity        → QUALITY_ACCEPTED
else if job is UNDER_INSPECTION / INSPECTION_REQUESTED → IN_PRODUCTION
else                                              → unchanged
```

Note the third branch. If a partial batch is inspected and passes, but the cumulative accepted
quantity still falls short of the ordered quantity, the job goes **back to `IN_PRODUCTION`** to
make the balance — it does not sit waiting. That is precisely why the transition table permits
`UNDER_INSPECTION → IN_PRODUCTION`, which otherwise looks like a backwards edge.

The accepted total is a `SUM` across *all* completed inspections for the job, not just this one,
so a job inspected in several batches accumulates toward its target.

`ACCEPTED_WITH_DEVIATION` additionally creates a `DeviationApproval` in status `REQUESTED` —
but only when a `deviationNote` was supplied. Without a note, no approval record is raised.

`ReworkStatus` runs `ISSUED` → `IN_PROGRESS` → `READY_FOR_REINSPECTION` → `COMPLETED`, or
`SCRAPPED`. `CorrectiveAction` runs the full discipline: `ISSUE_RAISED` → `CONTAINMENT` →
`ROOT_CAUSE` → `CORRECTIVE_ACTION` → `VERIFICATION` → `CLOSED`.

Defects are typed (`DIMENSIONAL`, `WELD_DEFECT`, `SURFACE_FINISH`, `MATERIAL_DEFECT`,
`PAINT_DEFECT`, `ASSEMBLY_ERROR`, `MISSING_OPERATION`, `DAMAGE_IN_TRANSIT`, `DOCUMENTATION`,
`OTHER`) so that recurring failure modes are countable rather than anecdotal.

### Logistics — the section highlighted in your screenshot

Physical movement between OSWAR and partners.

| Subsection | Route | What it does |
| --- | --- | --- |
| Pickups | `/app/logistics/pickups` | Collections due from partners |
| Shipments | `/app/logistics/shipments` | The shipment record; `/[id]` for detail |
| Deliveries | `/app/logistics/deliveries` | Inbound receipt and proof of delivery |
| Vehicles | `/app/logistics/vehicles` | The vehicle master |

A `Shipment` has a `ShipmentDirection` — `OSWAR_TO_PARTNER` (usually material going out),
`PARTNER_TO_OSWAR` (finished goods coming back), or `PARTNER_TO_PARTNER` (a multi-stage route
where one partner's output is another's input).

`ShipmentStatus` moves `PLANNED` → `PICKUP_DUE` → `PICKED_UP` → `IN_TRANSIT` → `DELIVERED`,
with `DELAYED` and `CANCELLED` as off-ramps. `ShipmentItem` rows link the shipment back to the
jobs it carries, and `ProofOfDelivery` captures the signed receipt.

> **Implementation note.** Unlike jobs and invoices, shipment status is **not** governed by a
> shared transition table — there is no `SHIPMENT_STATUS_TRANSITIONS` constant, and
> [`logistics.service.ts:235`](../apps/api/src/logistics/logistics.service.ts#L235) sets
> `DELIVERED` directly. In practice the sequence is enforced by the UI and by which endpoints
> exist, not by a central assertion. If you add shipment endpoints, do not assume the guard that
> protects jobs is protecting you here.

### Tooling — `/app/tooling`

A flat section, no subsections. Tools, fixtures and gauges issued to partners.

`ToolCategory` distinguishes `TOOL` from `FIXTURE` (and further categories); `ToolCondition`
tracks wear; `ToolIssue` tracks which partner holds what, against which job. `CalibrationRecord`
is the one that matters for audit — gauges must be calibrated for inspection results to be
defensible, and `FIXTURE_CALIBRATION_DUE` is a scheduled alert.

### Commercial

How the partner gets paid. Deliberately the most heavily gated flow in the system.

| Subsection | Route | What it does |
| --- | --- | --- |
| Rates | `/app/commercial/rates` | Agreed conversion rates per partner and component |
| Invoices | `/app/commercial/invoices` | Partner invoices; `/[id]` for detail |
| Approvals | `/app/commercial/approvals` | The verification queue |
| Payments | `/app/commercial/payments` | Scheduled and released payments |
| Incentives & deductions | `/app/commercial/incentives` | Rules and one-off adjustments |

**The invoice is a four-way verification.** `InvoiceStatus` runs:

```
DRAFT → RAISED → QUANTITY_VERIFIED → QUALITY_VERIFIED → MATERIAL_RECONCILED
      → FINANCE_APPROVED → PAYMENT_SCHEDULED → PAID
```

From `RAISED` through `MATERIAL_RECONCILED`, every stage can also go to `HELD` or `REJECTED`.
`HELD` is recoverable — it can re-enter at any of the four verification stages or be rejected
outright. `PAID` and `REJECTED` are terminal. The table is
`INVOICE_STATUS_TRANSITIONS` at [`enums.ts:692`](../packages/shared/src/enums.ts#L692).

Read that chain as a sentence: *we agree you made this many* (quantity), *we agree they were
good* (quality), *we agree the material adds up* (reconciliation), *and only then does finance
approve*. The material reconciliation step is why the Materials section is not administrative
housekeeping — an unreconciled shortage stops the money.

Adjustments are typed: `QUALITY_INCENTIVE`, `ON_TIME_DELIVERY_INCENTIVE`, `REWORK_DEDUCTION`,
`MATERIAL_SHORTAGE_DEDUCTION`, `APPROVED_PENALTY`, `OTHER_INCENTIVE`, `OTHER_DEDUCTION`.
Payment modes cover `NEFT`, `RTGS`, `IMPS`, `UPI`, `CHEQUE`, `CASH`.

### Reports — `/app/reports`

Seventeen reports, each with CSV export via `/api/reports/[key]/export`. Formulas are documented
in [08 — Dashboards and reports](08-dashboards-reports.md).

### Notifications — `/app/notifications`

The in-app inbox. See section 6 below for how notifications are generated and delivered.

### IMS integration — `/app/ims` *(permission-gated)*

The boundary to OSWAR's existing IMS. Inbound pull brings in orders; outbound push sends
results back. `ImsSyncLog` records every exchange, and a retry worker re-attempts failures every
10 minutes.

### Administration — `/app/admin/*` *(permission-gated)*

Users, Roles, Companies, Settings, and the Audit log.

---

## 5. Who can do what

Thirteen roles, split into internal and partner user types:

**Internal** — `GROUP_ADMIN`, `GRIDX_HEAD`, `OPERATIONS_HEAD`, `ENGINEERING_USER`,
`PROCUREMENT_USER`, `QUALITY_INSPECTOR`, `STORES_USER`, `FINANCE_USER`,
`LOGISTICS_COORDINATOR`, `MANAGEMENT_VIEWER`

**Partner** — `PARTNER_OWNER`, `PARTNER_SUPERVISOR`, `PARTNER_WORKER`

Two independent guards apply to every request:

1. **Permission** — does your role hold the required permission for this endpoint?
2. **Company scope** — `assertCompanyScope` confirms the record belongs to a company you have
   access to. A partner user is additionally confined to their own partner's records.

The second guard is what makes multi-tenancy real. A `GROUP_ADMIN` of one company cannot read
another company's jobs even though the role name sounds global. Full matrix in
[03 — Security, auth and RBAC](03-security-rbac.md).

---

## 6. What runs on its own

Four scheduled workers:

| Schedule | Job | What it does |
| --- | --- | --- |
| Every hour | `hourly-alerts` | Time-sensitive alerts |
| Daily 07:00 | `daily-alerts` | Digest alerts |
| Monthly, 02:00 on the 1st | `monthly-partner-scorecards` | Computes and publishes scorecards |
| Every 10 minutes | `ims-outbound-retry` | Retries failed IMS pushes |

`SchedulerLock` ensures that with multiple API instances running, only one executes a given
scheduled job.

**Notifications** span 31 events — from `NEW_JOB_ASSIGNED` and `MATERIAL_READY_FOR_PICKUP`
through `JOB_MILESTONE_OVERDUE`, `INVOICE_HELD`, `PAYMENT_RELEASED`, `PARTNER_RATING_REDUCED`,
`COMPLIANCE_DOCUMENT_EXPIRING` and `FIXTURE_CALIBRATION_DUE`. Delivery is over four channels
(`IN_APP`, `EMAIL`, `WHATSAPP`, `SMS`), each tracked `PENDING` → `SENT` → `READ`, or `FAILED`.
In-app always fires; email and WhatsApp only when configured. Detail in
[07 — Background jobs and notifications](07-background-jobs-notifications.md).

---

## 7. Worked example — one job, start to finish

1. **Engineering** defines component `BRKT-4471`, Class B, `LEVEL_3_FULL_DIMENSIONAL`, and
   releases drawing revision `C`.
2. **Production** creates a job from `SALES_ORDER` ref `SO-8823`: 500 units, due in 20 days,
   `OSWAR_SUPPLIED` material. Status `DRAFT`.
3. The planner opens **recommendations**. Six partners are approved for the component. One is
   blocked (open-job limit), one is blocked (no capacity declared for the window). The top
   remaining scores 81.4 — strong on capability and quality, marked down on distance.
4. The planner **allocates**. `JobAssignment` records score 81.4 and the full factor breakdown.
   Status → `AWAITING_PARTNER_ACCEPTANCE`. `NEW_JOB_ASSIGNED` fires.
5. The partner **accepts** in the PWA. Status → `ACCEPTED`, `acceptedAt` stamped. Because
   material is OSWAR-supplied, → `MATERIAL_PENDING`.
6. **Stores** raises a material issue, prepares and issues it. A shipment goes out
   `OSWAR_TO_PARTNER`. The partner **acknowledges** receipt. Status → `MATERIAL_ISSUED`.
7. The partner acknowledges **drawing revision C**, then reports `PRODUCTION_STARTED`.
   Status → `IN_PRODUCTION`.
8. `FIRST_PIECE_READY` is reported. Because the component's inspection level demands it, the
   partner cannot report `BATCH_25_PERCENT` until a **first-article inspection** is accepted.
9. An **inspector** completes the first article: `ACCEPTED`. Batch milestones now unlock.
10. At `BATCH_READY_FOR_INSPECTION` the partner requests final inspection. Status →
    `INSPECTION_REQUESTED` → `UNDER_INSPECTION`.
11. Final inspection finds 12 defective units: 488 accepted, 12 to `REWORK_REQUIRED`. A rework
    order is issued; the job goes to `REWORK`, then back through inspection, and the reworked
    units pass. Status → `QUALITY_ACCEPTED`.
12. **Logistics** ships `PARTNER_TO_OSWAR`. Status → `DISPATCHED` → `RECEIVED` on proof of
    delivery.
13. The partner **raises an invoice**. Quantity verified (500), quality verified (488 first-pass
    plus 12 reworked, with a `REWORK_DEDUCTION`), material reconciled (`BALANCED`), finance
    approves, payment scheduled, `PAID`.
14. Job → `CLOSED`. On the 1st of next month the **scorecard** job recomputes this partner's
    first-pass quality and on-time delivery — which changes their score, which changes their
    ranking in step 3 of the next job.

---

## 8. Where to go next

| I want to… | Read |
| --- | --- |
| See every endpoint and its permission | [05 — API reference](05-api-reference.md) |
| Understand a specific module's rules in depth | [04 — Functional modules](04-modules.md) |
| Add a field or a table | [02 — Data model](02-data-model.md) |
| Know exactly what a role can do | [03 — Security, auth and RBAC](03-security-rbac.md) |
| Run it locally | [10 — Operations](10-operations.md) |
| Check a blueprint requirement | [09 — Blueprint coverage](09-blueprint-coverage.md) |
