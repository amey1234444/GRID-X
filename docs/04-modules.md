# 04 — Functional modules in depth

This is the working heart of the documentation: what each blueprint module does, the
rules it enforces, the algorithms behind it, and the side effects a write triggers.

Contents:

1. [Partner management](#module-1--partner-management)
2. [Component and process master](#module-2--component-and-process-master)
3. [Drawing and revision control](#module-3--drawing-and-revision-control)
4. [Demand and job planning](#module-4--demand-and-job-planning)
5. [Capacity management](#module-5--capacity-management)
6. [Material management](#module-6--material-management)
7. [Production tracking](#module-7--production-tracking)
8. [Quality management](#module-8--quality-management)
9. [Tooling, fixtures and gauges](#module-9--tooling-fixtures-and-gauges)
10. [Logistics](#module-10--logistics)
11. [Commercials and payments](#module-11--commercials-and-payments)
12. [Partner scorecard](#module-12--partner-scorecard)

---

## Module 1 — Partner management

**Code**: `apps/api/src/partners/` · **Screens**: `/app/partners/**`

### The partner record

A partner carries identity, address with coordinates, statutory identifiers (Udyam, GST,
PAN), bank details, commercial terms (`paymentTermsDays`, `maxCapacityHours`,
`maxOpenJobs`), and the four status axes that govern what it may do: `approvalStatus`,
`auditStatus`, `category` (A–D) and `isActive`.

Around it hang locations, documents, capabilities, machines, employees, audits and the
status history.

### Distance is computed, not typed

`distanceKm` used to be hand-entered while the coordinates sat unused. A hand-entered
figure is easy to get wrong and can be understated to make a partner rank better, so
`shared/allocation.ts` computes it: `haversineKm()` for the great-circle distance between
the plant (`Company.latitude/longitude`) and the partner, scaled by
`ROAD_DISTANCE_FACTOR = 1.3` because roads are not straight. `isUsableCoordinate()`
rejects nulls, out-of-range values and the `0,0` default that was never filled in. When
either end lacks usable coordinates the hand-entered value is kept. Nine unit tests in
`partners/distance.spec.ts` cover it.

### The approval workflow, with gates

`PartnerService.changeStatus()` calls `assertTransition()` against
`PARTNER_APPROVAL_TRANSITIONS` and then applies substantive gates:

| Moving to | Requires |
| --- | --- |
| `CAPABILITY_AUDIT` | At least one **verified** compliance document |
| `TRIAL_APPROVED` or `APPROVED` | A **passed** capability audit **and** at least one approved process capability |
| `SUSPENDED` | Sets `isActive: false` and stores `suspendedReason`; the partner's users are refused at the JWT guard |

Every move writes a `PartnerStatusHistory` row and notifies twice — the partner learns
where they stand (in-app plus WhatsApp), and `GRIDX_HEAD`, `PROCUREMENT_USER` and
`OPERATIONS_HEAD` learn that the pool of allocatable partners has changed.

### Capabilities and machines

`PartnerCapability` is one row per `ProcessType` with `isCapable` (they say they can) and
`isApproved` (OSWAR agrees they can), plus size, weight and tolerance limits and monthly
capacity hours. **Only `isApproved` counts for allocation.** The capability matrix
endpoint pivots the whole network into a partner × process grid.

`PartnerMachine` records the machine master of the blueprint — type, make, model, size,
capacity, accuracy, condition, ownership, quantity and a photograph.

### Documents and audits

`PartnerDocument` carries an issue and expiry date and a `verified` flag; the daily alert
sweep raises `COMPLIANCE_DOCUMENT_EXPIRING` before an expiry bites. `PartnerAudit` records
capability audits with score, findings, a report file and the next audit date, and the
result feeds both the approval gate above and the `SAFETY_AND_COMPLIANCE` KPI.

---

## Module 2 — Component and process master

**Code**: `apps/api/src/masters/` · **Screens**: `/app/engineering/components`, `/app/engineering/masters`

Every outsourced component exists in a controlled master with the full blueprint field
set. Around it: the process routing (`ComponentProcess`, sequenced, each step flagged
`isOutsourced`), the bill of material (`ComponentItem`), the criticality history, and the
approved-partner list.

### Two independent gates on outsourcing

**Criticality (`CriticalityClass`).** A `CLASS_A` component may not be outsourced without
senior management authorisation. `JobsService.assertClassAAuthorised()`:

* No reason given, no existing authorisation → `400`, *"Outsourcing a Class A component
  requires a documented authorisation reason."*
* A reason given but the actor lacks `job:class_a_override` → `403`, *"Ask the GRID-X
  Head or a Group Admin to authorise this job."*
* An authorisation already recorded on the job **stands**: whoever recorded it had to
  hold the permission at the time, so a planner may act on it without holding it
  themselves.

**Outsourcing eligibility score.** A separate engineering judgement: a Class C part with
a score of 15 is still a part nobody outside should be making.
`outsourcingEligibility()` treats anything below `MIN_OUTSOURCING_ELIGIBILITY = 40` as
ineligible, and overriding it takes the same senior authorisation. An *unscored*
component is treated as eligible — an unmade judgement must not read as a refusal.

Both gates are applied on job creation and again on allocation.

### CSV import for pilot setup

Blueprint Section 25 step 4 asks for the component and drawing master to be created
before the pilot. Entering 15–25 components one form at a time is days of work, so
`imports/` provides three CSV importers — `components`, `partner-rates` and
`approved-partners`.

* Templates are downloadable (`GET /api/imports/:entity/template`).
* Every row is validated in full **before anything is written**, and `commit: false`
  returns the validation report alone — a bad spreadsheet is a report, never a
  half-loaded master.
* Issues carry the 1-based row number as the person sees it in their spreadsheet, plus
  the offending field.
* Blank optional cells are coerced to absent rather than to empty strings.

---

## Module 3 — Drawing and revision control

**Code**: `apps/api/src/drawings/` · **Screens**: `/app/engineering/drawings`, `/partner/drawings`

The blueprint calls this one of the most important modules and states the rule plainly:
*a partner should never see a superseded drawing after a new revision is released.*

### The revision lifecycle

```
createRevision → submitRevisionForReview → approveRevision → releaseRevision
                                                     └──► obsoleteRevision (ARCHIVED)
```

Each step calls `assertTransition()` against `DRAWING_STATUS_TRANSITIONS`, so a revision
cannot be released without approval.

### What `releaseRevision()` actually does

This is the most consequential single operation in the platform. In one transaction:

1. Every other `RELEASED` revision of the drawing is marked `SUPERSEDED` with a timestamp.
2. The new revision becomes `RELEASED`, with `releasedAt`, `issueDate` and optional
   `expiryDate`, and `Drawing.currentRevisionId` is repointed at it.
3. **Every live access grant is carried across.** For each partner holding the old
   revision, an equivalent grant is created (or un-revoked) on the new one, preserving
   the access mode, and logged as `GRANTED`. The old grants are then revoked in the same
   breath. Without this a partner would be left holding a revision the viewer refuses.
4. **Open jobs are rolled forward.** Every job not `CLOSED`, `CANCELLED` or `RECEIVED`
   that pointed at a superseded revision is repointed at the new one. Without this the
   partner's next drawing open is refused with no explanation.

After the transaction, notifications go out: every affected partner is told which
revision is superseded, which of their jobs are affected, the change note, and that they
must acknowledge the new revision before continuing production (in-app plus WhatsApp).
Engineering and operations are told how many jobs were moved. The audit record captures
the superseded revision codes, the jobs rolled forward and the partner count.

### Access control and the viewer

See [Security §3](03-security-rbac.md#3-controlled-documents) for the full rules. In
short: a grant is required, only `RELEASED` revisions open, downloading is a separate
right, everything is logged with IP and user agent, and a partner only ever receives a
watermarked copy — never the controlled original.

Acknowledgement is a first-class record (`DrawingAcknowledgement`, unique per revision
and partner), and `GET /api/drawings/revisions/:id/access-log` exposes the full audit
trail behind `drawing_audit:read`.

### Engineering change notices

`EngineeringChange` records a numbered EC (`GXEC-…`) with title, description, impact and
a decision note, moving through `RAISED → UNDER_REVIEW → APPROVED → IMPLEMENTED` or
`REJECTED`, tied to the drawing and revision it concerns.

---

## Module 4 — Demand and job planning

**Code**: `apps/api/src/jobs/` (1,126 lines) · **Screens**: `/app/production/jobs`, `/app/production/planning-board`

### Creating a job

A job may originate from a sales order, a work order, an internal production
requirement, a replenishment request or a manual requirement. For the first two, the
planner can look up live orders from IMS (`GET /api/ims/orders`) and only the reference
is stored on the job — IMS stays the system of record for the order itself, exactly as
Section 10 requires.

On create: company write scope is checked, the component is loaded and checked, both
outsourcing gates are applied, a `GXJ-…` number is drawn from the sequence, and the job
opens in `DRAFT` with its first `JobStatusHistory` row.

### The recommendation engine

`GET /api/jobs/:id/recommendations` ranks every approved partner for the component. The
scoring lives in `shared/allocation.ts` and is deliberately transparent — the planner is
shown the full breakdown, and **the system never auto-allocates**.

| Factor | Weight | Scored as |
| --- | ---: | --- |
| Approved capability | 20 | 100 if approved for the component *and* the process, else 0 |
| Partner rating | 15 | The partner's current scorecard total |
| Available capacity | 15 | free hours ÷ hours the job needs, capped at 100 |
| Delivery performance | 12 | The `ON_TIME_IN_FULL_DELIVERY` KPI |
| Distance | 8 | Linear decay to 0 at 400 km |
| Current workload | 10 | 100 − (open jobs ÷ `maxOpenJobs`) × 100 |
| Conversion cost | 8 | best candidate rate ÷ this partner's rate × 100 (50 when unknown) |
| Quality score | 7 | The `FIRST_PASS_QUALITY` KPI |
| Concentration risk | 5 | Decays to 0 as the partner's share of network value reaches 50% |

Alongside the score, **blockers** are listed in plain language: not on the approved
partner list, declared free capacity below the requirement, at the open-job limit,
concentration above 25% of network value, or not approved for allocation. Required hours
come from the component routing (`CapacityService.estimatedHours()`), and network share
is computed from the value of all non-cancelled jobs.

### Allocation

`POST /api/jobs/:id/allocate` re-validates everything rather than trusting the
recommendation: the partner must be active and at an allocatable approval status, must be
on the approved-partner list for this component, and must be under its open-job limit.
Class A authorisation is re-checked.

In one transaction the previous assignment is deactivated, a new `JobAssignment` is
written **with the score and the full breakdown JSON** (so an allocation decision can be
explained months later), the job moves to `AWAITING_PARTNER_ACCEPTANCE`, drawing access
is granted for the job's revision if asked for, and capacity hours are reserved. The
partner is notified in-app and over WhatsApp.

### Partner response

`POST /api/jobs/:id/respond`. Accepting stamps `acceptedAt` and moves to `ACCEPTED`.
Declining requires a reason, returns the job to `DRAFT`, clears `partnerId`, **releases
the reserved capacity**, and notifies operations. Either way `JobAssignment` records the
response.

### Closure

`POST /api/jobs/:id/close` refuses while material is outstanding: for an
`OSWAR_SUPPLIED` job, reconciliation rows must exist and all must be `BALANCED`. On
success the job moves to `CLOSED`, capacity is released, and two facts are queued to IMS
— the outsourced work-order status and the actual completion date.

### Delays and clarifications

`JobDelay` records the reason and **who owns it**. The reason decides the owner, not who
reported it (`responsibilityForDelay()`), and a `MATERIAL_SHORTAGE` resolves against the
job's material responsibility — material OSWAR undertook to supply is OSWAR's problem,
material the partner procures is theirs. A partner may never assign responsibility; only
an internal reviewer can override the default. `GET /api/jobs/delays` makes the whole
picture readable in aggregate, filterable by reason, responsibility, partner and
open-only, which is what lets management identify delays without calling every workshop.

`JobClarification` is a threaded question from the partner, notified to engineering and
operations, answered back to the partner, with the days-open figure computed for the
queue.

### The single guarded transition

Every module that advances a job calls `JobsService.transition()`, which loads the job,
runs `assertTransition()` against `JOB_STATUS_TRANSITIONS`, and writes the new status
together with its history row. There is exactly one way for a job's status to change.

---

## Module 5 — Capacity management

**Code**: `apps/api/src/capacity/` · **Screens**: `/app/production/capacity`

Partners declare capacity per process per period (weekly or monthly): available hours,
workers and machines, maintenance shutdown hours and the expected bottleneck.
`availableHours` is stored **net of shutdown**, and the declaration is upserted on
(partner, process, periodStart) so a correction replaces rather than duplicates. A
partner may only declare their own capacity.

### Reservation is real, not notional

* `estimatedHours(componentId, quantity)` sums the routing's cycle times, falling back to
  the component's standard cycle time.
* `processForComponent()` picks the first outsourced routing step, falling back to the
  component's primary process.
* `reserve()` writes a `CapacityAllocation` keyed on the job — re-allocating a job to a
  different partner **replaces** the hold rather than stacking a second one, and it runs
  inside the caller's transaction so the reservation and the allocation commit together.
* `release()` gives the hours back when a job is closed, cancelled or declined. Capacity
  held by a job nobody is working on would quietly shrink the network's free capacity
  forever.

### The heatmap

`GET /api/capacity/heatmap` returns, per partner × process × period: available,
committed and free hours, utilisation percent and the declared bottleneck. Committed
hours are the declared figure plus live allocations, and only allocations belonging to
open jobs are counted — the board stays honest even if a release is ever missed.

---

## Module 6 — Material management

**Code**: `apps/api/src/materials/` · **Screens**: `/app/materials/**`, `/partner/material`

The blueprint's eight-step flow is implemented as: job approved → requirement calculated
→ challan prepared → issued → partner acknowledges → consumption recorded → scrap and
finished parts returned → reconciled.

### Issue

`POST /api/materials/issues` refuses unless the job is allocated, is on
`OSWAR_SUPPLIED` material, and has reached at least `ACCEPTED`. It draws a `GXC-…`
challan number, records the line items with **batch and heat numbers** and theoretical
quantities, advances the job through `MATERIAL_PENDING` to `MATERIAL_ISSUED`, attaches
dispatch photographs, notifies the partner (in-app plus WhatsApp) and stores/finance
internally, and queues `material-issued` to IMS.

### Acknowledgement

`POST /api/materials/issues/:id/acknowledge` is partner-scoped and **offline-safe**: a
`clientRequestId` already seen returns the existing acknowledgement rather than creating
a second one. It captures received weight, shortage weight, damage remarks, a signature
name and receipt photographs, and moves the challan to `ACKNOWLEDGED`.

### Consumption, scrap and reconciliation

`MaterialConsumption` stores theoretical against actual with the variance percent
computed server-side. `ScrapReturn` stores scrap generated and returned, with the scrap
percent computed against the issued weight.

`reconcile()` closes the loop per (job, item):

```
difference = issued − (consumed + scrapReturned + unusedReturned)
difference > 0 → SHORTAGE ;  difference < 0 → EXCESS ;  0 → BALANCED
deduction     = shortageKg × Item.standardRate
```

A shortage automatically writes a `MATERIAL_SHORTAGE_DEDUCTION` against the partner, so
the money follows the material without anyone remembering to raise it. The
reconciliation is upserted, so a re-run corrects rather than duplicates.

Reconciliation is a hard gate in two places: a job cannot be closed and an invoice
cannot pass its material stage while an `OSWAR_SUPPLIED` job is unbalanced.

### Partner stock — what is out there right now

`GET /api/materials/partner-stock` answers *"where is the material?"*. It aggregates
issued weight per (job, item) for challans that have actually gone out, subtracts
recorded consumption and returned scrap, and reports the balance with the **oldest issue
date and days held**, sorted heaviest first. Totals give issued weight, outstanding
balance and the number of partners holding stock.

---

## Module 7 — Production tracking

**Code**: `apps/api/src/jobs/jobs.service.ts` (`updateMilestone`) · **Screens**: `/partner/jobs/[id]`

Partners report eight milestones only — job accepted, material received, production
started, first piece ready, batch 25%, batch 50%, batch ready for inspection,
dispatched. No daily data entry is demanded of a small workshop.

### Three rules enforced server-side

**1. Photographic evidence.** `MILESTONES_REQUIRING_PHOTO` covers material received,
first piece ready, batch ready for inspection and dispatched. The web form hides the
submit button without one, but that is a courtesy, not a control: the PWA, the offline
replay path and any direct API call reach the same endpoint, so
`assertMilestoneEvidence()` enforces it in the service.

**2. The first-article gate.** `MILESTONES_REQUIRING_FIRST_ARTICLE` covers batch 25%,
batch 50%, batch ready for inspection and dispatched. Before any of these,
`assertFirstArticleCleared()` requires a completed first-article inspection with an
`ACCEPTED` or `ACCEPTED_WITH_DEVIATION` decision. The message distinguishes the two
cases — *"still under inspection"* versus *"request one and have it accepted"*.
`requiresFirstArticle()` waves through `LEVEL_1_VISUAL` work (a first article on a
visual-only characteristic tells nobody anything) but gates everything measured and every
Class A or B component regardless of level.

**3. Idempotent replay.** A `clientRequestId` already recorded returns the existing
milestone untouched, so a milestone legitimately accepted while online is never re-judged
when its retry arrives from the offline queue.

### Automatic consequences

* `PRODUCTION_STARTED` moves the job to `IN_PRODUCTION`.
* `DISPATCHED` on a `QUALITY_ACCEPTED` job moves it to `DISPATCHED` and alerts stores,
  logistics and operations — a partner who sends the accepted quantity with their own
  courier moves the board, rather than leaving the job sitting with nobody looking at it.
* A delay reason submitted with a milestone creates a `JobDelay` with the responsibility
  the reason implies.

---

## Module 8 — Quality management

**Code**: `apps/api/src/quality/` (902 lines) · **Screens**: `/app/quality/**`, `/inspector/**`

Quality is built around inspection plans, not free text.

### Plans

`InspectionPlan` per component, versioned, with a sampling plan and a list of
`InspectionCharacteristic` rows: characteristic, specification, nominal value, upper and
lower tolerance, unit, measuring instrument and whether it is critical.

### The inspection lifecycle

```
request → assign → start → saveResults (repeatable) → complete
REQUESTED → ASSIGNED → IN_PROGRESS → COMPLETED
```

**Request** is partner-scoped, refuses an offered quantity above the job quantity, draws
a `GXI-…` number, moves the job to `INSPECTION_REQUESTED`, and alerts quality inspectors
and operations. **Assign** sets the inspector and a due date and notifies them directly.
**Save results** writes measured characteristics with verdicts and evidence photographs,
and refuses to touch a closed inspection.

### Completion — the pivot of the whole platform

`complete()` validates that the disposition (accepted + rejected + rework) is positive
and does not exceed the offered quantity, then:

1. Stamps the inspection with its decision and quantities.
2. **Raises a non-conformance** if a defect type is given with any rejected or rework
   quantity — capturing defect type, quantity affected, probable cause, responsibility,
   rework cost, material loss and customer impact — and opens a corrective action at
   `ISSUE_RAISED` automatically.
3. **Raises a rework order** (`GXRW-…`) when rework is instructed, with `chargeToPartner`
   set from the responsibility.
4. **Records a deviation approval** when the decision is `ACCEPTED_WITH_DEVIATION`.
5. **Recomputes job totals** by aggregating every completed inspection on the job, then
   transitions it: rework → `REWORK`; accepted quantity ≥ job quantity →
   `QUALITY_ACCEPTED`; otherwise back to `IN_PRODUCTION` for the remainder.
6. Notifies the partner and the internal team (in-app plus WhatsApp).
7. Queues rejected quantities and, on quality acceptance, finished components received,
   to IMS.

**Accepted quantity is what drives payment** — nothing else does.

### Rework, corrective action and deviation

`updateReworkStatus()` records completed and scrapped quantities and the actual cost;
when a rework charged to the partner completes with a real cost, a `REWORK_DEDUCTION` is
raised automatically — once, guarded against duplication by the rework number.

`advanceCorrectiveAction()` steps through the blueprint workflow and **refuses to close
without verification evidence**; closing the action closes the non-conformance.
`decideDeviation()` records the engineering decision with a note and the decider.

---

## Module 9 — Tooling, fixtures and gauges

**Code**: `apps/api/src/tooling/` · **Screens**: `/app/tooling`

`Tool` covers tools, fixtures and gauges with a `GXT-…` code, owner, current custodian,
condition, calibration requirement and frequency, next due date and replacement value.

* `issue()` refuses to issue a tool that is already out, records the condition on issue,
  and sets the current partner.
* `returnTool()` records the condition on return; `DAMAGED` or `SCRAPPED` closes the
  issue as `DAMAGED` rather than `RETURNED`, and clears the custodian.
* `recordCalibration()` writes the agency, certificate number and result, and computes
  the next due date from the frequency when one is not given.

All four blueprint alerts are implemented in the daily sweep: calibration due, fixture
not returned, tool damaged, and **tool in the custody of a partner with no open job for
it** — the unauthorised-custody case.

---

## Module 10 — Logistics

**Code**: `apps/api/src/logistics/` · **Screens**: `/app/logistics/**`

`Shipment` (`GXS-…`) covers all three directions — OSWAR to partner, partner to OSWAR,
partner to partner — with pickup and delivery locations, material type, weight, vehicle,
driver, planned and actual pickup, expected and actual delivery, status and transport
cost. `ShipmentItem` ties lines to jobs and material challans; `ProofOfDelivery` records
the receiver, a signature file and a photograph.

The list endpoint supports the boards the blueprint asks for: `pickupOverdue` (planned
pickup passed, nothing collected), `deliveryOverdue` (expected delivery passed, nothing
signed for), status groups, direction and partner. Delivering a shipment moves the linked
job to `RECEIVED` through the guarded transition.

Milk-run route optimisation is deliberately out of scope — Section 14 excludes it from
the first release.

---

## Module 11 — Commercials and payments

**Code**: `apps/api/src/commercials/` · **Screens**: `/app/commercial/**`, `/partner/invoices`

### Rates

`PartnerRate` per (company, partner, component) with an effective-from date, a minimum
batch, and `previousRate` plus `revisionNote` carried forward on each revision — the rate
revision history the blueprint asks for.

### The payment formula

Implemented in `shared/payment.ts`:

```
Payment = Σ (accepted quantity × conversion rate)          → basicAmount
        + quality incentive + on-time delivery incentive   → incentiveAmount
        − rework deduction − material shortage deduction − approved penalty
                                                           → deductionAmount
        + tax on (basic + incentives − deductions)         → taxAmount
        = netAmount
```

### Incentives are earned, not assumed

`PartnerIncentiveRule` carries a `thresholdPercent` — the performance the partner must
reach over the invoiced jobs before the rule pays. `earnedIncentives()` awards a rule
only when its metric can be **measured** and reaches the threshold:

* `performanceForJobs()` returns `firstPassQualityPercent` and `onTimeDeliveryPercent`
  as **`null`, not 100**, when there is nothing to measure. A partner with no inspected
  work earns nothing rather than earning by default.
* A rule with both a percentage and a fixed amount pays the sum, which is how
  procurement expresses "2% plus a flat bonus".
* A rule configured for a specific partner wins over the network-wide default of the
  same type.

The label records what was achieved against what was required —
*"Quality bonus — 97.3% against 95% required"* — so the partner can see why.

### Invoice submission

`POST /api/commercials/invoices` verifies that every job belongs to this partner, has an
accepted quantity, and is not already invoiced. It computes the basic amount, judges the
incentive rules against it, sweeps in pending deductions, calculates the total and writes
the invoice at `RAISED` with its per-job lines. Earned incentives are written into the
adjustment ledger line by line, already attached to this invoice so the deduction sweep
cannot pick them up twice.

`GET /api/commercials/invoices/invoiceable-jobs` shows a partner exactly what they may
bill: jobs at `QUALITY_ACCEPTED` or beyond, with an accepted quantity, not yet on an
invoice.

### The four-stage approval

```
RAISED → QUANTITY_VERIFIED → QUALITY_VERIFIED → MATERIAL_RECONCILED → FINANCE_APPROVED
       → PAYMENT_SCHEDULED → PAID
```

Every stage writes a `PaymentApproval` row with the approver and remarks, and stamps its
own timestamp on the invoice. Declining any stage moves the invoice to `HELD` with the
reason recorded — *"the system should show partners the exact reason when an invoice is
held"* — and the partner is notified. The **material stage is a hard gate**: for any
`OSWAR_SUPPLIED` job on the invoice, reconciliation must exist and be balanced.

`recordPayment()` refuses to overpay (`alreadyPaid + amount > netAmount`), supports
partial payments, and marks the invoice `PAID` only when the full net amount is covered.
Finance approval queues the invoice and the conversion cost to IMS.

---

## Module 12 — Partner scorecard

**Code**: `apps/api/src/scorecards/` · **Screens**: `/app/partners/scorecards`, `/partner/scorecard`

Computed monthly (cron, 02:00 on the 1st) or on demand, per partner per period.

| KPI | Weight | Computed as |
| --- | ---: | --- |
| First-pass quality | 30% | accepted ÷ (accepted + rejected + rework) |
| On-time-in-full delivery | 25% | jobs completed on or before the due date ÷ jobs completed |
| Material utilisation | 15% | (issued − shortage) ÷ issued, from reconciliations |
| Rework response | 10% | rework orders closed by their due date ÷ rework orders issued |
| Capacity reliability | 10% | jobs completed ÷ (completed + declined), multiplied by 0.8 if no capacity was declared |
| Documentation discipline | 5% | milestones reported ÷ (4 × jobs completed), capped at 100 |
| Safety and compliance | 5% | verified, unexpired documents ÷ documents held |

Bands: **A** 90–100 · **B** 80–89 · **C** 70–79 · **D** below 70 · **Suspended** on a
critical violation (more than two open non-conformances with customer impact in the
period). Recommendations follow: increase, maintain, development plan, reduce, suspend.

### The minimum-evidence floor

Every KPI falls back to 100 when there is nothing to measure — no rejections means
perfect quality, no late jobs means perfect delivery. Without a floor a brand-new partner
scores 100, lands in category A, and is recommended for *more* work on the strength of
having done none.

`MIN_JOBS_FOR_RATING = 3` and a positive offered quantity are required before a score is
a verdict. Below that the score is still computed and stored so the history is unbroken,
but `hasSufficientData` is false, a plain-language reason is stored and shown instead of a
category, the recommendation is forced to `MAINTAIN_ALLOCATION`, and — critically — the
partner's standing `category` and `currentScore` are **not** updated, so a 100 earned by
doing nothing never reaches the allocation engine. A critical violation still suspends on
its own merits and is never waved through for want of volume.

### Publication

Computation is idempotent — the score is upserted on (partner, year, month), so a re-run
after late data entry overwrites rather than duplicating. Each publication notifies the
partner, and a **fall** in category (measured with `categoryDropped()` against the last
period that had sufficient data) raises `PARTNER_RATING_REDUCED` to both the partner and
the GRID-X Head, operations and quality.
