# 08 — Dashboards and reports

Blueprint Section 1 asks the system to give management one answer to five questions.
The dashboards answer them:

| Question | Answered by |
| --- | --- |
| What is being manufactured? | Jobs by status, jobs in progress, today's due jobs |
| Who is manufacturing it? | Active partners, partner workload, top and bottom performers |
| Where is the material? | Material under partner custody (kg and value), partner stock, pending reconciliation |
| Is the job on time and within quality? | On-time delivery rate, quality acceptance rate, jobs at risk, delayed jobs, rejection rate |
| What should be paid to the partner? | Accepted value, invoices pending, payments due, deductions, partner outstanding |

Every dashboard is company-scoped through `DashboardScope`, which supplies three `where`
fragments: `own` (models carrying `companyId`), `viaPartner` and `viaJob` (one relation
deep). Group Admin sees the whole group; a partner user sees only their own board.

---

## 1. Management dashboard — `GET /api/dashboards/management`

Blueprint Section 6, chairman and management view.

| Metric | How it is derived |
| --- | --- |
| Active partners | Partners at an allocatable approval status |
| Jobs in progress | Jobs in any open status |
| Jobs at risk | Open jobs due within 48 hours |
| Total outsourced value | Σ (quantity × rate) over open jobs |
| Cost savings | Σ max(0, component standard conversion rate − partner rate) × accepted quantity. Components without a standard rate contribute **nothing**, rather than a guessed number |
| Avoided capex | Declared network capacity hours × ₹1,200 notional hourly capital cost |
| Quality acceptance rate | accepted ÷ (accepted + rejected + rework) over completed jobs |
| On-time delivery rate | Jobs completed by their due date ÷ jobs completed |
| Total network capacity | Σ declared available hours for periods not yet ended |
| Capacity utilisation | committed ÷ available, where committed is the higher of declared commitment and live allocations |
| Top / bottom partners | Latest score per partner, deduplicated, ranked |
| Material under partner custody | Balance in kg from pending reconciliations, and its value from issued weight × item standard rate over open jobs |
| Overdue payments | Approved or scheduled invoices whose payment date has passed |
| Estimated additional capacity | available − committed hours |
| Jobs by status | Grouped counts across the whole board |
| Monthly trend | Six months of outsourced value, acceptance rate and on-time delivery |

---

## 2. Operations dashboard — `GET /api/dashboards/operations`

* **Today's due jobs** — open jobs due today, highest priority first.
* **Delayed jobs** — open jobs past their due date, oldest first.
* **Jobs awaiting inspection** — `INSPECTION_REQUESTED` and `UNDER_INSPECTION`.
* **Material pending** — jobs waiting on a challan or its acknowledgement.
* **Partner workload** — per partner: open jobs, committed hours, available hours,
  utilisation percent.
* **Capacity bottlenecks** — per process: available, committed, utilisation.
* **Escalations** — jobs needing intervention (critical priority or badly overdue).

---

## 3. Quality dashboard — `GET /api/dashboards/quality`

* First articles pending
* Rejection rate across the network
* Rework ageing, bucketed by days open
* Repeat defects — defect type with its count and how many partners it spans
* Partner quality trends — first-pass quality per partner
* Open corrective actions
* Inspection workload per inspector

---

## 4. Finance dashboard — `GET /api/dashboards/finance`

* Invoices pending, and their value
* Accepted value awaiting invoicing
* Payments due
* Deductions raised
* Material reconciliation pending
* Partner outstanding — per partner
* Cost savings by criticality class
* Invoice ageing buckets, by count and value

---

## 5. Partner dashboard — `GET /api/dashboards/partner`

The partner's own board: new jobs awaiting acceptance, active jobs, material to
acknowledge, inspections pending, rework open, invoices pending, payments due, their
score and category, and their jobs ordered by due date. A planner may open any partner's
board, but only inside their own companies.

---

## 6. Reports — Section 21

All seventeen reports the blueprint requires are implemented in `ReportsService`
(1,001 lines). Each returns typed columns (`text` / `number` / `date` / `currency`) and
rows, so one UI renders all of them and `toCsv()` exports any of them with correct
quoting and escaping.

Filters: `from`, `to`, `partnerId`, `componentId`. Scoping is applied in `run()` before
any builder sees the filters — a partner caller has `partnerId` forced to their own, and
an internal caller has `companyIds` narrowed to their links.

| Key | Report | Contents |
| --- | --- | --- |
| `jobs-by-status` | Jobs by status | Jobs, quantity, accepted and rejected per status |
| `jobs-by-partner` | Jobs by partner | Jobs, quantity, accepted, rejected, conversion value and on-time percent per partner |
| `overdue-jobs` | Overdue jobs | Every open job past its due date with partner, component, status, priority, days late and pending quantity |
| `partner-rejection` | Partner-wise rejection | Quantity, rejected, rework and rejection percent per partner |
| `component-rejection` | Component-wise rejection | The same per component, with its criticality — separating a difficult part from a weak partner |
| `material-reconciliation` | Material reconciliation | Per job and item: issued, consumed, scrap returned, unused returned, shortage, excess and the deduction raised |
| `partner-capacity` | Partner capacity | Per partner, process and period: available, committed and free hours, utilisation, workers and machines |
| `partner-scorecard` | Partner scorecard | Per partner and period: jobs completed, total score, category, recommendation and all seven KPI values |
| `invoice-ageing` | Invoice ageing | Every open invoice (not draft, paid or rejected) with its age in days, its ageing bucket (0–15, 16–30, 31–45, 46–60, 60+) and any hold reason |
| `payment-ageing` | Payment ageing | Paid invoices with the days taken to pay, from invoice date to payment date, in the same buckets |
| `outsourcing-vs-internal` | Outsourcing cost versus internal cost | Per job: outsourced cost against the component's internal standard cost, with the saving and saving percent |
| `logistics-cost` | Logistics cost | Per shipment: direction, route, status, weight, transport cost, cost per kg and planned pickup |
| `rework-cost` | Rework cost | Per rework order: job, partner, component, defect, responsibility, quantity, rework cost, material loss and whether it was charged to the partner |
| `avoided-capex` | Avoided capex | Per process: declarations, available and committed hours, the standard hourly rate, and hours × rate as the capex avoided |
| `capacity-added` | Production capacity added | The machine register across the network — partner, partner status, machine type, make/model, capacity, condition, ownership and count |
| `partner-concentration` | Partner concentration | Per partner: jobs, distinct components, outsourced value and share of network value — the concentration risk of Section 3 |
| `drawing-access-audit` | Drawing-access audit | Every grant, revoke, view and download with the timestamp, drawing, revision, event, partner, user and IP address |

### Using them

* `GET /api/reports` — the catalogue.
* `GET /api/reports/:key` — the result as JSON.
* `GET /api/reports/:key/export` — the same result as CSV.
* In Control, `/app/reports` renders the catalogue, the filter bar
  (`report-filters.tsx`) and the result table, with a download button that goes through
  `/api/reports/[key]/export` so the browser gets a proper filename.
