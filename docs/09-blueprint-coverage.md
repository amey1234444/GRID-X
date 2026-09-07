# 09 — Blueprint coverage

A section-by-section trace from the *GRID-X Software Product Blueprint* to the code that
implements it. Status is one of **Built**, **Built (partial)** or **Deferred by design**
— the last meaning the blueprint itself puts it in a later phase.

---

## Section 1 — Product purpose

| Requirement | Status | Where |
| --- | --- | --- |
| Partner onboarding | Built | `partners/` — approval workflow with document and audit gates |
| Partner capabilities | Built | `PartnerCapability`, capability matrix endpoint and screen |
| Job allocation | Built | `jobs/` — nine-factor recommendation engine, planner decides |
| Drawings and revisions | Built | `drawings/` — full lifecycle, watermarking, access log |
| Raw-material movement | Built | `materials/` — challan, acknowledgement, consumption, scrap, reconciliation |
| Production progress | Built | Eight milestones with photographic evidence |
| Quality inspection | Built | `quality/` — plans, characteristics, results, decisions |
| Rework and rejection | Built | `ReworkOrder`, `NonConformance`, `CorrectiveAction` |
| Logistics | Built | `logistics/` — shipments, pickups, deliveries, proof of delivery |
| Partner performance | Built | `scorecards/` — seven weighted KPIs, monthly |
| Invoices and payments | Built | `commercials/` — four-stage approval, payment records |
| Network capacity | Built | `capacity/` — declarations, reservations, heatmap |
| **The five management questions** | Built | See [08 — Dashboards](08-dashboards-reports.md) |

## Section 2 — Core operating principle

The tracked chain — job issued → material issued → production started → first article
approved → batch completed → quality accepted → material reconciled → payment approved —
is the `JobStatus` machine, and each arrow is a guarded transition. **Built.**

The first-article link is enforced, not merely modelled: batch milestones are refused
until a first-article inspection is accepted (`assertFirstArticleCleared`).

Partners use a simple mobile interface, employees a detailed web dashboard. **Built.**

## Section 3 — Platform structure

| Application | Status |
| --- | --- |
| GRID-X Control | Built — `/app/**`, 50 screens |
| GRID-X Partner | Built — `/partner/**`, mobile-first PWA with offline support |
| GRID-X Inspector | Built — `/inspector/**` |

Delivered as role-based route groups inside one codebase, exactly as the blueprint
permits.

## Section 4 — User roles

All ten management roles and all three partner roles exist as `RoleCode` values with a
complete permission set each; see the [role matrix](03-security-rbac.md#22-the-role-matrix).
Group-company isolation is enforced for every internal role and partner isolation for
every partner role. **Built.**

## Section 5 — Product modules

| Module | Status | Notes |
| --- | --- | --- |
| 1 Partner management | Built | Every master field, capability profile, machine master and the eight-stage approval workflow |
| 2 Component and process master | Built | Every component field including the outsourcing eligibility score, which is enforced rather than merely stored; Class A allocation is blocked without senior authorisation |
| 3 Drawing and revision control | Built | All twelve required features, including watermarking composited into the file and automatic withdrawal of superseded revisions with access and jobs carried forward |
| 4 Demand and job planning | Built | All five job sources, every job-card field, the full status workflow and all nine allocation factors |
| 5 Capacity management | Built | Weekly and monthly declarations, real reservation against jobs, and the full management output |
| 6 Material management | Built | All eight process steps, all ten transaction types, and every required control including batch/heat numbers and dispatch/receipt photographs |
| 7 Production tracking | Built | All eight milestones, progress evidence, all nine delay reasons with automatic responsibility attribution |
| 8 Quality management | Built | All six inspection types, every inspection field, all five decisions, the complete rejection record and the corrective-action workflow |
| 9 Tooling, fixtures and gauges | Built | Full tool master and all four notification triggers |
| 10 Logistics | Built | Every shipment field and the full dashboard. Milk-run optimisation is explicitly "later" |
| 11 Commercials and payments | Built | Commercial master with rate history, the exact payment formula, and the seven-step invoice workflow with the hold reason shown to partners |
| 12 Partner scorecard | Built | The exact KPI weights and category bands, with an added minimum-evidence floor so an unproven partner is not rated A |

## Section 6 — Management dashboards

All four dashboards are built with every listed indicator, plus a partner dashboard.
See [08 — Dashboards and reports](08-dashboards-reports.md). **Built.**

## Section 7 — Key application screens

**OSWAR employee screens (20/20)** — login, management dashboard, partner list, partner
profile, capability matrix, component master, drawing library, job planning board, job
detail, capacity board, material issue, inspection queue, inspection form, rework and
rejection, logistics board, invoice approval, partner scorecard, reports, users and
permissions, system settings.

**Partner screens (15/15)** — dashboard, new jobs, active jobs, job detail, drawing
viewer, material receipt confirmation, production update, photograph upload, request
inspection, rework instructions, dispatch confirmation, invoice submission, payment
status, scorecard, support and clarification requests.

## Section 8 — Technical architecture

| Recommended | Built |
| --- | --- |
| Next.js + TypeScript, responsive, PWA for partners, Tailwind, role-based dashboards | Yes, all five |
| NestJS + TypeScript, REST, background job processing | Yes. WebSockets are the blueprint's "later" |
| PostgreSQL + Prisma, managed provider, org isolation | Yes — `companyId` scoping throughout |
| Object storage for files, never large files in Postgres | Yes — S3-compatible with signed URLs |
| Email/password internal, OTP or password for partners, JWT access + refresh, RBAC, optional 2FA | Yes, all five — 2FA is fully implemented, not optional-in-name |
| Vercel/Render/Neon deployment, Sentry monitoring | Yes — `render.yaml` provisions Postgres, API and web; Sentry is wired |

## Section 9 — System architecture

The diagrammed topology is what runs: web application → GRID-X API → PostgreSQL, file
storage and notification service, with the IMS alongside. **Built.**

## Section 10 — IMS integration

All eleven inbound entities are recognised; the three GRID-X genuinely needs are
persisted and the rest are read-through, so GRID-X never duplicates inventory,
purchase-order or customer data. All seven outbound facts are pushed, with a retry
worker, exponential backoff and abandonment after eight attempts. **Built.**

The blueprint says *"initially, both systems may share the same database"*. GRID-X takes
the middle position: a **direct, read-only PostgreSQL connection** to the IMS database,
through a configurable table/column mapping — the latency and simplicity of a shared
database, without GRID-X owning a migration against a schema it does not control.
Outbound facts go to `gridx.ims_outbound_fact`, a table GRID-X owns inside the IMS
database, so GRID-X never writes to a table the IMS owns. The REST transport is kept and
is one variable away (`IMS_DRIVER=http`). See
[13 — IMS integration](13-ims-integration.md).

## Section 11 — Core database entities

Every entity named in the blueprint exists, plus the supporting infrastructure it
implies. **Built** — 78 models against the ~60 named.

Additions beyond the list: `ComponentItem` (BOM), `Photograph`, `StoredFile`, `AuditLog`,
`RefreshToken`, `OtpCode`, `Notification`, `ImsSyncLog`, `SystemSetting`,
`NumberSequence`, `SchedulerLock`, `RateLimitCounter`, `DrawingAccessLog`,
`JobStatusHistory`, `PartnerStatusHistory`.

## Section 12 — Essential APIs

Every named API exists, and the code goes further where the workflow demanded it.

| Blueprint group | Status |
| --- | --- |
| Partner APIs (8) | All built |
| Job APIs (8) | All built, plus recommendations, delays, clarifications and cancel |
| Drawing APIs (6) | All built, plus submit, approve, obsolete and the access log |
| Material APIs (5) | All built, plus partner stock and the scrap register |
| Quality APIs (6) | All built, plus assign, start, deviation decisions and rework status |
| Finance APIs (5) | All built, plus the four verification stages, hold and schedule |

## Section 13 — Notification system

All fifteen listed alerts are implemented, sixteen more lifecycle events are added, and
the three MVP channels (in-app, email, WhatsApp) are delivered. Critical approvals never
happen over WhatsApp — messages carry a deep link into the app. **Built.**

## Section 14 — MVP scope

| MVP module | Status |
| --- | --- |
| 1 User and role management | Built |
| 2 Partner management | Built |
| 3 Partner capabilities | Built |
| 4 Component master | Built |
| 5 Drawing revision control | Built |
| 6 Job creation and assignment | Built |
| 7 Partner job acceptance | Built |
| 8 Material issue and acknowledgement | Built |
| 9 Production milestone updates | Built |
| 10 Inspection and acceptance | Built |
| 11 Rework and rejection | Built |
| 12 Job closure | Built |
| 13 Basic invoice and payment status | Built — beyond "basic": the full four-stage workflow |
| 14 Partner scorecard | Built |
| 15 Management dashboard | Built |

**Correctly excluded** (the blueprint's "do not include in the first release"): AI partner
allocation, automated route optimisation, supply-chain finance, native mobile apps,
predictive quality, machine IoT, advanced costing, government scheme integration and an
external customer marketplace. None are present.

## Section 15 — MVP user journeys

| Journey | Status |
| --- | --- |
| OSWAR planner (9 steps) | Built end to end |
| Partner (12 steps) | Built end to end — including step 10, dispatch, which a partner can drive themselves |
| Inspector (6 steps) | Built end to end |

## Section 16 — Development phases

Phase 1 (product definition) and Phase 2 (core MVP, sprints 1–7) are complete: every
sprint's deliverables exist in the code. Phase 3 (pilot deployment) is an operational
step — the platform is deployable and seeded for it. **Much of Phase 4 is already
built**: capacity, logistics, corrective actions, partner audits, tooling, rate contracts
and IMS integration are all in place ahead of schedule.

## Section 17 — Team structure

Organisational, not software. Not applicable.

## Section 18 — Non-functional requirements

| Requirement | Status |
| --- | --- |
| Role-based permissions | Built — 73 codes, guard-enforced per route |
| Partner isolation | Built — enforced per service, not just in queries |
| Drawing access logging | Built — grant, revoke, view and download, with IP and user agent |
| Encrypted file storage | Built — provider-side encryption; bucket configuration documented |
| Signed file URLs | Built — short-lived, always |
| Audit logs | Built — every write, with before/after snapshots |
| Secure password storage | Built — argon2id |
| Refresh-token rotation | Built — with family revocation on reuse |
| Two-factor authentication for admins | Built — RFC 6238 TOTP with recovery codes |
| Automatic session expiry | Built — 15-minute access tokens, configurable idle timeout |
| Dashboards load in a few seconds | Built — parallel queries, aggregates rather than row scans, indexed hot paths |
| Image uploads compressed | Built — `sharp` |
| Drawing previews | Built — generated for large PDFs |
| Low-bandwidth partner app | Built — service worker, offline queue, compressed previews |
| Daily backups, restore procedure | Operational — documented for Render |
| File-storage versioning | Operational — bucket versioning documented |
| Error monitoring | Built — Sentry on both server and browser errors |
| No deletion of financial or quality records without audit history | Built — records are superseded, never hard-deleted |
| Scalability: multiple companies, plants, hundreds of partners, thousands of jobs | Built — company scoping, pagination everywhere, shared rate-limit counters and scheduler locks so the API can run multi-instance |

## Section 19 — Offline and low-connectivity design

| Requirement | Status |
| --- | --- |
| Previously opened jobs remain visible | Built — service worker cache |
| Photographs queue for upload | Built — IndexedDB, uploaded ahead of the milestone that cites them |
| Milestone updates save locally | Built — `localStorage` queue |
| Automatic sync when internet returns | Built — idempotent replay on `clientRequestId` |
| Compressed drawing previews | Built |
| Hindi and English interfaces | Built — `lib/i18n.ts` |

## Section 20 — AI features

**Deferred by design.** The blueprint places these after enough operational data exists.
Nothing AI-driven is present, and the rule *"AI should assist decision-making, it should
not automatically approve quality-critical components"* is honoured in advance: the
allocation engine only ever recommends, and the planner decides.

## Section 21 — Reports

All seventeen reports built, with CSV export. See
[08 — Dashboards and reports](08-dashboards-reports.md).

## Section 22 — Pilot success criteria

| Criterion | Supported by |
| --- | --- |
| All pilot jobs issued digitally | Job creation, allocation and acceptance |
| Partners can use the app without continuous help | Mobile-first PWA, Hindi/English, offline queue, plain-language errors |
| Current drawings are controlled | Revision control with automatic withdrawal, watermarking and acknowledgement |
| Material can be reconciled | Reconciliation with automatic shortage deduction, gating job closure and payment |
| Job status is visible | Status machine, history, dashboards, delay register |
| Inspections are recorded | Plans, characteristics, measured results, decisions, evidence |
| Accepted quantity drives payment | Invoicing reads `acceptedQuantity` and nothing else |
| Scorecards calculated automatically | Monthly cron with locking and idempotency |
| Management identifies delays without calling every workshop | The delay register with reason and responsibility, plus the operations dashboard |
| No critical information depends on WhatsApp or individuals | Everything is a record; WhatsApp carries links, never approvals |

## Section 23 — Product roadmap

| Release | Status |
| --- | --- |
| **GRID-X 1.0 — Control** (partners, jobs, drawings, material, quality, payment tracking) | **Complete** |
| **GRID-X 2.0 — Scale** (capacity planning, logistics, audits, advanced scorecards, IMS integration, tooling) | **Complete** — delivered ahead of the roadmap |
| GRID-X 3.0 — Intelligence | Not started, by design |
| GRID-X 4.0 — Network | Not started, by design |

## Section 24 — Navigation structure

Implemented verbatim in `shared/navigation.ts` and rendered permission-filtered in the
Control shell. **Built.**

## Section 25 — Final execution recommendation

Steps 1–7 (workflow, partners, components, masters, prototype, validation, MVP) are
delivered. Step 4 — "create the component and drawing master" — is supported by the CSV
importers, which exist precisely because entering 15–25 components one form at a time is
the main reason a pilot slips. Steps 8–10 (run real jobs, correct the workflow, scale)
are the pilot itself.

---

## Summary

| | |
| --- | --- |
| Blueprint modules 1–12 | **12 / 12 built** |
| MVP scope items | **15 / 15 built** |
| Employee screens | **20 / 20** |
| Partner screens | **15 / 15** |
| Section 21 reports | **17 / 17** |
| Section 13 alerts | **15 / 15**, plus 16 additional lifecycle events |
| Named database entities | **All present**, plus 15 supporting models |
| Non-functional requirements | All software requirements built; backup and restore are operational tasks documented for Render |
| Roadmap position | **GRID-X 1.0 and 2.0 complete** |
