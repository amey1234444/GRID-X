# 12 — Partners and Engineering in depth

Two sidebar sections, examined field by field and rule by rule.

These two sections are the **master data** of GRID-X. Neither produces a job on its own, but no
job can exist without both: Engineering defines *what may be made and to what standard*, Partners
defines *who is allowed to make it*. Section 3 of this document covers the single table that
joins them, which is where most of the real gatekeeping happens.

For the wider flow these feed into, see [11 — Application flow](11-application-flow.md).

---

# Part 1 — Partners

> Sidebar: **Partners** → All partners · Capabilities · Machines · Audits · Scorecards
> Permission to see the section: `PARTNER_READ` (Scorecards needs `SCORECARD_READ`)
> Code: [`apps/api/src/partners/partners.service.ts`](../apps/api/src/partners/partners.service.ts)

## 1.1 What this section is for

A partner is an external manufacturing business. The section exists to answer three questions,
in this order:

1. **Are they legitimate?** — documents, GST, Udyam, bank details
2. **Can they actually make things?** — capabilities, machines, a passed audit
3. **Are they any good?** — scorecards, KPIs, audit history

Only a partner that has cleared all three can receive work. The gate is enforced in code, not by
convention.

## 1.2 The Partner record

`Partner` is a wide table. The fields group into five purposes:

**Identity and contact**
`partnerCode` (unique), `businessName`, `ownerName`, `phone`, `altPhone`, `email`

**Location**
`addressLine1/2`, `city`, `state`, `pincode`, `latitude`, `longitude`, `distanceKm`

A partner may have several `PartnerLocation` rows — a separate office and workshop, or two
units — one of which is `isPrimary`.

**Compliance identifiers**
`udyamNumber`, `gstNumber`, `panNumber`, plus banking: `bankName`, `bankAccountName`,
`bankAccountNo`, `bankIfsc`

**Classification**
`category` (`PartnerCategory`, A–D or SUSPENDED — *earned*, set by the scorecard),
`level` (`PartnerLevel`: `L1_MICRO`, `L2_SMALL`, `L3_MEDIUM`, `L4_STRATEGIC` — *assigned*,
describing size), `approvalStatus`, `auditStatus`

Category and level are easy to confuse. **Level is what they are; category is how they are
doing.** Level is set by a human when the partner is onboarded and rarely changes. Category is
recomputed every month by the scorecard job and directly changes how much work they get.

**Operational limits**
`paymentTermsDays` (default 30), `maxCapacityHours`, `maxOpenJobs` (default 10),
`isActive`, `suspendedReason`, `currentScore`

`maxOpenJobs` is a hard blocker in allocation — a partner at their limit is excluded regardless
of how well they score.

### `maxCapacityHours` is derived, not typed in

This trips people up. `refreshCapacityCeiling`
([`partners.service.ts:718`](../apps/api/src/partners/partners.service.ts#L718)) recomputes it as
the **sum of `monthlyCapacityHours` across all capabilities where `isCapable` is true**, and
rewrites the partner row every time a capability is added, changed or removed. Editing it
directly on the partner is pointless — the next capability change overwrites it.

Note the filter is `isCapable`, not `isApproved`. The ceiling reflects what the partner *can*
physically do; approval is a separate commercial decision.

### Distance is computed, with a fudge factor

When a partner is created or updated with usable coordinates, `resolveDistanceKm`
([`partners.service.ts:344`](../apps/api/src/partners/partners.service.ts#L344)) computes the
straight-line haversine distance from the company's plant coordinates and multiplies by
`ROAD_DISTANCE_FACTOR = 1.3`
([`allocation.ts:218`](../packages/shared/src/allocation.ts#L218)) to approximate road distance.

If either the plant or the partner lacks coordinates, the manually supplied `distanceKm` is kept.
This is worth knowing because distance is 8% of the allocation score, and a partner with no
coordinates and no manual figure scores as distance zero — i.e. *maximum* distance penalty.

## 1.3 All partners — the onboarding state machine

`PartnerApprovalStatus` is a governed state machine, enforced by `assertTransition` against
`PARTNER_APPROVAL_TRANSITIONS`
([`enums.ts:90`](../packages/shared/src/enums.ts#L90)):

```
DRAFT ──> DOCUMENT_REVIEW ──> CAPABILITY_AUDIT ──> TRIAL_APPROVED ──> APPROVED
                                                                        │
                                                              CERTIFIED ─┴─> STRATEGIC
```

| From | Allowed next |
| --- | --- |
| `DRAFT` | `DOCUMENT_REVIEW`, `SUSPENDED` |
| `DOCUMENT_REVIEW` | `CAPABILITY_AUDIT`, `DRAFT`, `SUSPENDED` |
| `CAPABILITY_AUDIT` | `TRIAL_APPROVED`, `DOCUMENT_REVIEW`, `SUSPENDED` |
| `TRIAL_APPROVED` | `APPROVED`, `CAPABILITY_AUDIT`, `SUSPENDED` |
| `APPROVED` | `CERTIFIED`, `SUSPENDED` |
| `CERTIFIED` | `STRATEGIC`, `APPROVED`, `SUSPENDED` |
| `STRATEGIC` | `CERTIFIED`, `SUSPENDED` |
| `SUSPENDED` | `DOCUMENT_REVIEW`, `APPROVED` |

Every stage can fall back one step, and every stage can be suspended. Suspension is recoverable —
a suspended partner returns via `DOCUMENT_REVIEW` (start again) or straight to `APPROVED` (the
issue was administrative).

### The two hard gates

`changeStatus` ([`partners.service.ts:443`](../apps/api/src/partners/partners.service.ts#L443))
refuses two transitions unless preconditions are met:

**Entering `CAPABILITY_AUDIT`** requires at least one `PartnerDocument` with `verified: true`.
> *"Verify at least one compliance document before the audit"*

**Entering `TRIAL_APPROVED` or `APPROVED`** requires both:
- at least one `PartnerAudit` with status `PASSED` — *"A passed capability audit is required"*
- at least one `PartnerCapability` with `isApproved: true` — *"Approve at least one process capability"*

So the sequence *documents → audit → capability approval → work* cannot be short-circuited.

### What a status change triggers

A single `changeStatus` call fans out to four things:

1. The partner row updates; `isActive` is forced to `toStatus !== 'SUSPENDED'`
2. A `PartnerStatusHistory` row records from, to, reason and who — the permanent audit trail
3. **Two** notifications: one to the partner (`IN_APP` + `WHATSAPP`), one to
   `GRIDX_HEAD`, `PROCUREMENT_USER`, `OPERATIONS_HEAD` internally
4. An `AuditLog` entry with before/after

### Which statuses can receive work

`ALLOCATABLE_PARTNER_STATUSES` = `TRIAL_APPROVED`, `APPROVED`, `CERTIFIED`, `STRATEGIC`.
Anything earlier, or `SUSPENDED`, is blocked in allocation with *"Partner is not approved for
allocation"*.

> ⚠️ **Discrepancy worth knowing.** The comment above that constant in
> [`enums.ts:101`](../packages/shared/src/enums.ts#L101) reads *"Partner must be at or beyond
> APPROVED to receive a job"*, but the array includes `TRIAL_APPROVED`, which is one stage
> earlier. The **array is what executes** — trial partners do get jobs, which is the point of a
> trial. The comment is stale. Don't rely on it when reasoning about who can be allocated.

## 1.4 Capabilities

`PartnerCapability` is unique on `(partnerId, process)` — one row per process per partner.

| Field | Meaning |
| --- | --- |
| `process` | One of the 12 `ProcessType` values |
| `isCapable` | They physically can do it — feeds `maxCapacityHours` |
| `isApproved` | OSWAR permits it — worth **20 points**, the largest allocation weight |
| `maxSizeMm`, `maxWeightKg`, `toleranceMm` | Physical envelope |
| `monthlyCapacityHours` | Declared throughput |

The twelve processes: `CUTTING`, `BENDING`, `WELDING`, `FABRICATION`, `MACHINING`, `DRILLING`,
`GRINDING`, `PAINTING`, `ASSEMBLY`, `PACKING`, `ELECTRICAL_WIRING`, `TRANSPORT`.

**The `isCapable` / `isApproved` split is the whole point of this screen.** A partner can weld
(capable) without being permitted to weld for OSWAR (not approved). Only `isApproved` opens the
gate — both for the status transition above and for component approval in Part 3.

The **capability matrix** view (`capabilityMatrix`,
[`partners.service.ts:155`](../apps/api/src/partners/partners.service.ts#L155)) pivots partners
against processes. Each partner row carries `allocatable` plus a
`capabilities: Record<process, { approved, capacityHours }>` map, and the response also returns a
`coverage` array giving, per process, the count of `approvedPartners` and `allocatablePartners`.

That second count is the useful one: it answers *"if I need welding tomorrow, how many partners
can actually take it today?"* A process where `allocatablePartners` is 1 is a single point of
failure in the supply base.

Partner users calling this endpoint see only their own row — the service narrows the query to
`actor.partnerId`.

## 1.5 Machines

`PartnerMachine` is the declared equipment list: `machineType`, `make`, `model`, `size`,
`capacity`, `accuracy`, `quantity`, `lastServicedAt`, and a `photoFileId`.

Two enums qualify it:
- `MachineCondition` — `EXCELLENT`, `GOOD`, `FAIR`, `POOR`, `UNDER_REPAIR`
- `OwnershipStatus` — `OWNED`, `RENTED`, `LEASED`

Ownership matters for risk: a partner whose critical capability runs on rented equipment can
lose it at short notice. Machines are evidence for the audit rather than a runtime constraint —
nothing in allocation reads this table directly.

## 1.6 Audits

`PartnerAudit` records a physical visit: `auditDate`, `auditType` (default `"CAPABILITY"`),
`auditorId`, `score`, `findings`, `reportFileId`, and `nextAuditDate`.

`PartnerAuditStatus` runs `NOT_AUDITED` → `SCHEDULED` → `IN_PROGRESS` → `PASSED` / `FAILED`.

The audit is the gate described in 1.3: **at least one `PASSED` audit** before a partner can be
trial-approved or approved. `nextAuditDate` drives re-audit scheduling; `reportFileId` keeps the
signed report attached to the record.

Note `auditType` is a free-text `String` defaulting to `"CAPABILITY"`, not an enum — so audit
types are not constrained by the schema.

## 1.7 Scorecards

Computed monthly by the `monthly-partner-scorecards` cron (02:00 on the 1st). Seven weighted
KPIs, stored as `PartnerKPI` rows and rolled into a `PartnerScore`:

| KPI | Weight |
| --- | --- |
| `FIRST_PASS_QUALITY` | 30 |
| `ON_TIME_IN_FULL_DELIVERY` | 25 |
| `MATERIAL_UTILISATION` | 15 |
| `REWORK_RESPONSE` | 10 |
| `CAPACITY_RELIABILITY` | 10 |
| `DOCUMENTATION_DISCIPLINE` | 5 |
| `SAFETY_AND_COMPLIANCE` | 5 |

Each KPI is clamped to 0–100, weighted, and summed:

| Total | Category | Recommendation |
| --- | --- | --- |
| ≥ 90 | A | `INCREASE_ALLOCATION` |
| ≥ 80 | B | `MAINTAIN_ALLOCATION` |
| ≥ 70 | C | `DEVELOPMENT_PLAN` |
| < 70 | D | `REDUCE_ALLOCATION` |
| — | `SUSPENDED` | `SUSPEND_PARTNER` |

Two overrides sit on top of the arithmetic
([`scorecard.ts`](../packages/shared/src/scorecard.ts)):

- **Critical violation short-circuits everything.** `categoryForScore(score, criticalViolation)`
  returns `SUSPENDED` immediately, whatever the score. A safety breach is not averageable.
- **An insufficient-data floor** prevents a partner with almost no activity being graded A on a
  handful of data points. It applies only when evidence is supplied — scoring a hypothetical
  does not trigger it.

The output writes back to `Partner.currentScore` and `Partner.category`, which are read directly
by allocation (15 points for rating, 7 for first-pass quality). **This is the feedback loop:
performance → score → category → allocation → performance.**

## 1.8 Documents and their expiry

`PartnerDocument` types: `UDYAM_CERTIFICATE`, `GST_CERTIFICATE`, `PAN_CARD`, `BANK_PROOF`,
`ISO_CERTIFICATE`, `INSURANCE`, `SAFETY_COMPLIANCE`, `FACTORY_LICENSE`, `NDA`, `AGREEMENT`,
`OTHER`.

Each carries `documentNo`, `fileId`, `issueDate`, `expiryDate`, and a `verified` flag with
`verifiedAt`. The table is indexed on `expiryDate` because the `COMPLIANCE_DOCUMENT_EXPIRING`
alert sweeps it on a schedule — an expiring insurance certificate surfaces before it lapses,
not after.

---

# Part 2 — Engineering

> Sidebar: **Engineering** → Components · Drawings · Inspection plans · Masters
> Permission: `COMPONENT_READ` (Drawings `DRAWING_READ`, Inspection plans `INSPECTION_READ`)
> Code: [`masters.service.ts`](../apps/api/src/masters/masters.service.ts),
> [`drawings.service.ts`](../apps/api/src/drawings/drawings.service.ts)

## 2.1 The master hierarchy

```
Product  ──< Component >── ComponentProcess >── Process
                  │
                  ├──< ComponentItem >── Item        (bill of material)
                  ├──< Drawing >── DrawingRevision
                  ├──< InspectionPlan >── InspectionCharacteristic
                  └──< ApprovedPartnerComponent >── Partner
```

- **Product** — a saleable end product. Scoped per company, unique on `(companyId, code)`.
- **Component** — the part that actually gets made. The centre of gravity of this section.
- **Item** — raw material, mirrored from IMS via `imsRef`. Globally unique `code`, with `uom`,
  `materialGrade`, `unitWeightKg`, `standardRate`.
- **Process** — one row per `ProcessType`, carrying `standardRatePerHour`.

## 2.2 Components

Unique on `(companyId, componentCode)`. The fields that matter downstream:

| Field | Why it matters |
| --- | --- |
| `primaryProcess` | Matched against partner capability — decides who may be approved |
| `criticality` | `CriticalityClass` — decides whether it may be outsourced at all |
| `inspectionLevel` | `InspectionLevel` — decides how hard it is inspected |
| `standardCycleTimeMinutes` | Feeds the capacity/hours estimate used in allocation |
| `standardConversionRate` | The baseline commercial rate |
| `scrapAllowancePercent` | Default 5 — the tolerance in material reconciliation |
| `outsourcingEligibilityScore` | Default 50 — a **hard gate** on job creation, see below |
| `theoreticalWeightKg` | Used to sanity-check material issue and scrap |

### Outsourcing eligibility — a second, independent gate

This field is easy to mistake for a soft advisory number. It is not. `assertOutsourcingEligible`
([`jobs.service.ts:442`](../apps/api/src/jobs/jobs.service.ts#L442)) runs on **every** job
creation, against `MIN_OUTSOURCING_ELIGIBILITY = 40`
([`allocation.ts:147`](../packages/shared/src/allocation.ts#L147)):

| Score | Behaviour |
| --- | --- |
| `null` / not a finite number | **Eligible.** An unscored component has not been judged unsuitable — it has not been judged at all, and the code is explicit that an unmade judgement must not read as a refusal |
| ≥ 40 | Eligible, no friction |
| < 40 | Blocked, unless a documented reason is supplied **and** the actor holds `JOB_CLASS_A_OVERRIDE` |

Without a reason you get a `BadRequestException`; with a reason but without the permission you
get a `ForbiddenException` telling you to *"ask the GRID-X Head or a Group Admin to authorise
this job."*

This runs **alongside** the Class A check, not instead of it — they are two independent gates on
the same call, and a component can trip either. Both are applied per line on multi-component
jobs, so, as the code comment puts it, *"a Class A part cannot ride into the network as a line
item on a job about something else."*

### Criticality — the outsourcing gate

| Class | Meaning |
| --- | --- |
| `CLASS_A` | Critical — retain in-house |
| `CLASS_B` | Controlled outsourcing |
| `CLASS_C` | Standard outsourcing (default) |
| `CLASS_D` | Cottage or micro-unit suitable |

Class A is not a hard prohibition — it is a **named-accountability gate**. `GridJob` carries
`classAOverrideById` and `classAOverrideReason`, so a Class A part can go out, but only with a
person and a reason attached to the job forever.

**Criticality changes are versioned.** Every component gets a `ComponentCriticality` row on
creation (`reason: 'Initial classification'`), and `updateComponent`
([`masters.service.ts:145`](../apps/api/src/masters/masters.service.ts#L145)) appends a new row
whenever criticality changes, with `effectiveFrom`. You can always reconstruct what class a part
was on the day a job was raised — which is exactly what an auditor asks.

### Inspection level

`LEVEL_1_VISUAL`, `LEVEL_2_SAMPLING` (default), `LEVEL_3_FULL_DIMENSIONAL`,
`LEVEL_4_CRITICAL_100_PERCENT`.

### The derived rule: does this part need a first article?

Criticality and inspection level combine in `requiresFirstArticle`
([`enums.ts:404`](../packages/shared/src/enums.ts#L404)):

```ts
if (criticality === 'CLASS_A' || criticality === 'CLASS_B') return true;
return inspectionLevel !== 'LEVEL_1_VISUAL';
```

Read plainly: **everything needs a first article except Class C/D parts inspected visually only.**
This is a deliberately wide net. When it returns true, the partner cannot report any
batch-progress milestone until a `FIRST_ARTICLE` inspection is `ACCEPTED` or
`ACCEPTED_WITH_DEVIATION` — see [11 §3](11-application-flow.md).

### Routing and bill of material

`ComponentProcess` is the routing: `sequence`, `cycleTimeMinutes`, and `isOutsourced`
(default true). Unique on `(componentId, processId, sequence)`, so the same process can appear
twice at different sequence numbers — grind, weld, grind again.

`ComponentItem` is the BOM: `quantityPerUnit` and `uom` per item. This is what turns "make 500
brackets" into a material issue quantity, and what reconciliation measures actual consumption
against.

## 2.3 Drawings — controlled documents, not file storage

This is the most security-conscious part of the platform. A drawing is OSWAR's intellectual
property sitting on someone else's premises.

### Structure

A `Drawing` is the stable identity — unique on `(companyId, drawingNumber)`, optionally linked
to a component. `DrawingRevision` rows hang off it, unique on `(drawingId, revisionCode)`, each
with a `revisionCode` (A, B, C… or 01, 02), a `revisionNo`, a file, and a status.
`Drawing.currentRevisionId` points at the live one.

### Revision state machine

`DRAWING_STATUS_TRANSITIONS` ([`enums.ts:236`](../packages/shared/src/enums.ts#L236)):

| From | Allowed next |
| --- | --- |
| `DRAFT` | `UNDER_REVIEW`, `ARCHIVED` |
| `UNDER_REVIEW` | `APPROVED`, `DRAFT`, `ARCHIVED` |
| `APPROVED` | `RELEASED`, `UNDER_REVIEW`, `ARCHIVED` |
| `RELEASED` | `SUPERSEDED`, `ARCHIVED` |
| `SUPERSEDED` | `ARCHIVED` |
| `ARCHIVED` | *(terminal)* |

Note `APPROVED` can go back to `UNDER_REVIEW`, but `RELEASED` cannot — once it is in partners'
hands the only way forward is to supersede it with a newer revision.

### Releasing a revision does five things atomically

`releaseRevision` ([`drawings.service.ts:237`](../apps/api/src/drawings/drawings.service.ts#L237))
is the most consequential method in the module. In one transaction:

1. **Supersedes** every other `RELEASED` revision of the same drawing, stamping `supersededAt`
2. **Promotes** this revision to `RELEASED` with `releasedAt`, `issueDate`, `expiryDate`
3. **Repoints** `Drawing.currentRevisionId`
4. **Carries every live access grant across** to the new revision — preserving each grant's
   `mode` and `jobId` — then revokes the old grants, writing a `GRANTED` log entry for each
5. **Rolls open jobs** (anything not `CLOSED`/`CANCELLED`/`RECEIVED`) onto the new revision

Steps 4 and 5 exist because of a specific failure they prevent, documented in the code: without
them a partner keeps a grant on a superseded revision, the viewer refuses it, and the partner is
locked out of their own live job with no explanation.

### Access control

`DrawingAccess` grants one partner access to one revision, optionally scoped to one job, in mode
`VIEW_ONLY` or `VIEW_AND_DOWNLOAD`, with `grantedBy`/`grantedAt`, `revokedBy`/`revokedAt` and an
`expiresAt`.

Every interaction writes a `DrawingAccessLog` row — `GRANTED`, `REVOKED`, `VIEWED` or
`DOWNLOADED` — capturing `ipAddress` and `userAgent`. This exists to satisfy the security
requirement that you can prove who saw which revision, when, and from where.

### Watermarking — and a deliberate hard failure

When a partner views a drawing, they never receive the original file. `watermarkedUrl`
([`drawings.service.ts:683`](../apps/api/src/drawings/drawings.service.ts#L683)) stamps a copy
with the partner's business name, the job number, the drawing and revision code, and an
**obsolete marker if the revision is not `RELEASED`**.

Stamped copies are cached under a key fingerprinted from the file checksum *plus* the watermark
caption — so each partner/job combination reuses one object, different partners get different
objects, and re-uploading the drawing invalidates all of them.

The important behaviour is the failure mode. If the file cannot be watermarked, the service
throws rather than serving the clean original:

> *"This drawing cannot be watermarked for partner viewing. Ask engineering to re-upload it as a PDF."*

The code comment is explicit that this is intentional: *"an unstampable format is a controlled-
document failure, not a reason to hand out an unmarked drawing."*

### Acknowledgement

`DrawingAcknowledgement` is unique on `(revisionId, partnerId)` — the partner confirming they
have read this specific revision. `assertRevisionAcknowledged`
([`drawings.service.ts:446`](../apps/api/src/drawings/drawings.service.ts#L446)) is what turns
"please acknowledge" from a request into a rule, and it is enforced in **two** places:

- [`jobs.service.ts:1002`](../apps/api/src/jobs/jobs.service.ts#L1002) — blocks production
  milestones against an unacknowledged revision
- [`quality.service.ts:258`](../apps/api/src/quality/quality.service.ts#L258) — blocks the
  inspection path too

So a partner cannot report progress *or* have work inspected against a drawing revision they
have never confirmed reading.

### Engineering changes

`EngineeringChange` carries a unique `ecNumber`, links to a drawing and/or revision, and runs
`RAISED` → `UNDER_REVIEW` → `APPROVED` → `IMPLEMENTED`, or `REJECTED`. It records `impact`,
`decisionNote`, who raised and who approved. Approval fires `DRAWING_REVISION_CHANGED` to
affected partners.

## 2.4 Inspection plans

An `InspectionPlan` belongs to a component, has an `inspectionType` (default `FINAL`), a
`version`, and a set of `InspectionCharacteristic` rows.

Each characteristic is one measurable thing: `characteristic`, `specification`, `nominalValue`,
`upperTolerance`, `lowerTolerance`, `unit`, `measuringInstrument`, `sequence`, and `isCritical`.
These become the `InspectionResult` rows an inspector fills in, each with a `PASS` / `FAIL` /
`NOT_APPLICABLE` verdict.

### Sampling — a fix worth understanding

The schema comments here document a real problem that was corrected:

- `samplingPlan` is free text (e.g. `"IS 2500 Level II"`). On its own it was *"a sentence nobody
  could enforce"* — an inspector could measure one piece of a 500-piece batch and the record
  looked complete.
- `samplePercent` was added to make it enforceable: how much of the lot must actually be
  measured. Null falls back to the component's `inspectionLevel`.
- `minSampleSize` is the floor, *"so a 4-piece batch at 10% still gets more than nothing
  measured."*

---

# Part 3 — The bridge: `ApprovedPartnerComponent`

This one small table is where Parts 1 and 2 meet, and it is the real gatekeeper of the whole
platform.

```prisma
model ApprovedPartnerComponent {
  componentId      String
  partnerId        String
  firstArticleDone Boolean   @default(false)
  firstArticleDate DateTime?
  isActive         Boolean   @default(true)
  approvedBy       String?
  remarks          String?
  @@unique([componentId, partnerId])
}
```

**Allocation reads only this table.** `JobsService.recommendations` builds its candidate list
exclusively from `ApprovedPartnerComponent` rows where `isActive` is true. A partner who is
`STRATEGIC`, scores 98, and has idle capacity is *not a candidate* for a component they have not
been approved for. They will not appear in the ranking at all — not ranked low, simply absent.

## The approval check

`approvePartnerForComponent`
([`masters.service.ts:250`](../apps/api/src/masters/masters.service.ts#L250)) enforces one rule
before writing the row:

```ts
const capable = partner.capabilities.some(
  (c) => c.process === component.primaryProcess && c.isApproved,
);
if (!capable) throw new BadRequestException(
  `${partner.businessName} has no approved ${component.primaryProcess} capability`,
);
```

The partner must hold an **approved capability** (not merely `isCapable`) for the component's
**primary process**. Both company scopes are asserted first, so you cannot approve a partner from
one company against another company's component.

The operation is an upsert — re-approving a previously revoked pairing sets `isActive: true`
again rather than failing. Revocation sets `isActive: false`, preserving the history.

## The full chain

Before any of this matters, the **job has to be creatable at all**. Two component-level gates
run first, both described in Part 2: the Class A authorisation check and the outsourcing
eligibility threshold. Fail either and there is no job to allocate.

Once the job exists, here is everything that must be true before a partner can be recommended
for it:

1. Partner has verified compliance documents → could enter `CAPABILITY_AUDIT`
2. Partner has a `PASSED` audit → could enter `TRIAL_APPROVED`/`APPROVED`
3. Partner has `PartnerCapability.isApproved` for the process → same gate, and required below
4. Partner's `approvalStatus` is in `ALLOCATABLE_PARTNER_STATUSES`
5. Component exists with a `primaryProcess` matching that approved capability
6. An active `ApprovedPartnerComponent` row joins the two
7. Partner is under `maxOpenJobs`
8. Partner has declared capacity covering the job window
9. Partner holds under 25% of network value

Steps 1–3 are Part 1. Step 5 is Part 2. Step 6 is Part 3. Steps 7–9 are runtime allocation
checks described in [11 §3](11-application-flow.md).

That is nine independent conditions, and each one is a line of code that will refuse you with a
specific message. When someone asks *"why isn't this partner showing up for this job?"*, walk
this list in order.
