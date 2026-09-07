# 06 — The web application

One Next.js 14 deployment serves four audiences through five App Router route groups.
Blueprint Section 3 allows exactly this: *"these can initially be different role-based
screens inside one application rather than three separate codebases."*

---

## 1. Rendering and data model

**Server-first.** Pages are React server components. They call the API directly through
`apiGet()` / `apiFetch()` in `src/lib/session.ts`, which reads the `httpOnly` session
cookies, attaches the bearer token server-side, and refreshes once transparently on a
401. No API token ever reaches the browser.

**Writes are server actions.** `src/app/actions/control.ts` (1,822 lines) holds roughly
85 actions, one per operation. Each parses `FormData`, coerces types, calls the API,
maps an error to a readable `ActionState`, and calls `revalidatePath()` so the page
re-renders with the new data.

```ts
export async function allocateJobAction(_state: ActionState, data: FormData) {
  const result = await apiFetch(`/jobs/${data.get('jobId')}/allocate`, { … });
  if (result.error) return { error: result.error };
  revalidatePath(`/app/production/jobs/${jobId}`);
  return { error: null, message: 'Job allocated' };
}
```

**Two route handlers** cover what actions cannot: `/api/gridx/[...path]` proxies
client-side fetches (the offline replay queue and the notification bell), and
`/api/reports/[key]/export` streams a CSV download with the right
`content-disposition`. `/api/imports/[entity]/template` serves import templates.

**Client components** are used only where interaction demands them: the offline
milestone form, the file uploader, the drawing viewer, the notification bell, dialogs,
the theme toggle and the report filters.

---

## 2. GRID-X Control — `/app/**`

For OSWAR employees — 50 screens. The layout (`(control)/app/layout.tsx`) resolves the session,
redirects to `/login` when there is none and to `/partner` when the user is a partner,
then renders `ControlShell` with the sidebar filtered by the user's permissions from
`CONTROL_NAVIGATION`.

Navigation follows blueprint Section 24 exactly:

| Section | Screens |
| --- | --- |
| **Dashboard** | `/app` — role-aware: management, operations, quality and finance panels |
| **Partners** | All partners · partner profile · capabilities matrix · machines · audits · scorecards |
| **Engineering** | Components · component detail · drawings · drawing detail · inspection plans · masters (items, products, processes) |
| **Production** | Jobs · new job · job detail · planning board · capacity · delays · clarifications |
| **Materials** | Material issues · issue detail · partner stock · scrap · reconciliation |
| **Quality** | Inspection queue · inspection detail · non-conformances · rework · corrective actions |
| **Logistics** | Pickups · shipments · shipment detail · deliveries · vehicles |
| **Tooling** | Tools, issues and calibration |
| **Commercial** | Rates · invoices · invoice detail · approvals · payments · incentives and deductions |
| **Reports** | All 17 reports with filters and CSV export |
| **Notifications** | Full notification history |
| **IMS integration** | Transport and connection probe, schema-mapping health, incremental watermarks, entity catalogue, sync/pull/push/retry, sync log |
| **Administration** | Users · roles · companies · settings · audit log |

### The job detail screen

The densest screen in the product, and a fair illustration of how the whole app works.
It loads the job, the partner list, item options and inspector options in parallel, then
renders:

* A header with the job number, component, quantity and due date, plus edit, close and
  cancel dialogs.
* Stat cards for quantity, accepted, rejected and rework.
* **Partner recommendations** when the job is unallocated — the ranked table with each
  partner's score, rating, free capacity, open jobs, on-time and quality percentages,
  rate, network share and any blockers, with allocation one click away.
* Tabs for milestones, material, inspections, delays, clarifications, drawing access,
  status history and photographs.
* A Class A authorisation field that appears **only** when the component is Class A
  **and** the signed-in user holds `job:class_a_override` — the permission check is done
  server-side and the field is simply not rendered otherwise.
* Milestone options filtered to those not already reported.

### Shared building blocks — `src/components/app/`

| Component | Purpose |
| --- | --- |
| `control-shell.tsx` | Sidebar, header, company switcher, user menu, notification bell |
| `data-table.tsx` | Generic typed table with column renderers, optional row links and an empty state |
| `action-dialog.tsx` / `action-form.tsx` | Declarative form rendering from a `FieldDefinition[]`, wired to a server action with pending and error states. Every create/edit form in Control is built from these |
| `field-control.tsx` | Text, number, date, select, textarea, switch, checkbox and file fields |
| `repeatable-rows.tsx` | Add/remove line items — challan lines, BOM, inspection characteristics |
| `search-filters.tsx` · `pagination-controls.tsx` | URL-driven filtering and paging, so any view is linkable |
| `stat-card.tsx` · `status-badge.tsx` · `timeline.tsx` · `detail-list.tsx` · `empty-state.tsx` | Presentation primitives; `StatusBadge` colours every enum from the shared label maps |
| `charts.tsx` | Hand-built SVG bar, line and donut charts — no charting dependency |
| `file-upload.tsx` | Uploads to `/api/gridx/files/upload`, shows progress and previews, returns file ids to the form |
| `drawing-viewer.tsx` | Fetches a signed URL, renders the watermarked PDF or image, and logs the view |
| `drawing-access-log.tsx` | The per-revision audit trail |
| `import-panel.tsx` | CSV import: template download, dry-run validation with row-level issues, then commit |
| `notification-bell.tsx` / `notification-list.tsx` | Unread count, dropdown, mark read / mark all read |

`src/components/ui/` holds 19 shadcn/ui-style primitives (button, card, dialog, table,
tabs, select, sheet, tooltip, …) on Radix, styled with Tailwind and theme-aware.

---

## 3. GRID-X Partner — `/partner/**`

A mobile-first PWA. The layout redirects non-partner users to `/app` and renders
`PartnerShell`: a bottom tab bar for the five most-used destinations
(`PARTNER_TABS`), a full menu (`PARTNER_NAVIGATION`), the offline banner and the service
worker registration.

| Screen | What the partner does |
| --- | --- |
| `/partner` | Dashboard: new jobs, active jobs, material to acknowledge, inspections pending, rework open, payments due, score and category, plus jobs by due date |
| `/partner/jobs` | Job list |
| `/partner/jobs/[id]` | Accept or decline, view the drawing, confirm material, update milestones with photographs, request inspection, ask a question, see rework instructions |
| `/partner/drawings` | Drawings shared with them, with acknowledgement |
| `/partner/material` | Challans awaiting acknowledgement and material history |
| `/partner/inspections` | Inspection requests and outcomes |
| `/partner/rework` | Rework instructions and progress |
| `/partner/invoices` | Submit an invoice against accepted jobs; track its stage and **the exact reason if it is held** |
| `/partner/scorecard` | Score, category, KPI breakdown and the recommendation |
| `/partner/support` | Clarification requests |

### Offline and low-connectivity design (Section 19)

Four cooperating pieces:

**1. Service worker** (`public/sw.js`) — network-first with a cache fallback for
`/partner` and `/_next`, so previously opened jobs stay readable with no connection.

**2. Write queue** (`src/lib/offline.ts`) — milestone updates and acknowledgements are
queued in `localStorage` when a request cannot go out. Every entry carries a
`clientRequestId`, so replays are idempotent on the server. The queue drains
automatically when connectivity returns, and `queueSize()` drives the banner.

**3. Photograph queue** (`src/lib/offline-photos.ts`) — photographs are too large for
`localStorage`, so they are written to IndexedDB alongside the entry that references
them. On replay the photographs are **uploaded first** and their file ids merged into
the body, so a milestone never arrives citing evidence the server does not have. If an
upload is retryable the whole entry stays queued; if the server will never accept the
file it is discarded rather than blocking the milestone forever.

**4. Offline banner** (`components/partner/offline-banner.tsx`) — shows connection state
and how many updates are waiting.

`MilestoneForm` is the component that ties them together: it knows which milestones
require a photograph (`MILESTONES_REQUIRING_PHOTO`), captures deferred photos when
offline, and reports back one of three outcomes — sent, queued, or rejected.

### Hindi and English

`src/lib/i18n.ts` holds a Hindi/English string table for the partner application, keyed
by the user's `language` preference on their profile. Labels, milestone names, statuses
and calls to action are all translated.

### PWA installability

`app/manifest.ts` declares the name, icons (192 and 512), theme colour, `standalone`
display and `/partner` as the start URL, so the partner app installs to a phone home
screen.

---

## 4. GRID-X Inspector — `/inspector/**`

A focused mobile interface for quality and supplier-development engineers.

| Screen | Purpose |
| --- | --- |
| `/inspector` | The queue — batches offered by partners, with counts for awaiting start, in progress and first articles |
| `/inspector/[id]` | The inspection form: the plan's characteristics with specification, tolerance and instrument; measured values; photographs; then accept, reject or issue rework with the defect type, probable cause, responsibility, costs and rework instructions |
| `/inspector/non-conformances` | Open non-conformances and their corrective actions |
| `/inspector/rework` | Rework orders and their status |

`InspectionResultsForm` renders the plan's characteristics as a repeatable measurement
grid, defaulting the verdict from the tolerance where a numeric value is entered.

---

## 5. Authentication screens

| Route | Flow |
| --- | --- |
| `/login` | Internal email and password; a two-factor field appears when the account requires one |
| `/partner/login` | Phone number → OTP, with a password fallback |
| `/account` | Change password, and enrol/disable two-factor with a QR code and one-time recovery codes |

`TwoFactorSetup` walks enrolment: show the QR and the secret, confirm with a live code,
then display the recovery codes once with a copy button and a clear warning that they
will not be shown again.

---

## 6. Marketing site — `/`

A public site describing the platform: capabilities, the partner proposition, pricing
and a security page. Built from `components/marketing/` (nav, footer, section headings,
an animated app preview) and shares the design system with the product, so the
screenshots are the real components.

---

## 7. Presentation details

* **Theme** — light and dark via `next-themes`, with a toggle in both shells.
* **Formatting** — `src/lib/format.ts` centralises currency (INR), numbers, dates,
  date-times, relative days and the `humanise()` helper that turns `MATERIAL_ISSUED`
  into "Material issued".
* **Options** — `src/lib/options.ts` turns any shared enum array into select options
  with its label map; `src/lib/reference.ts` fetches partner, item, component and
  inspector option lists for forms.
* **Types** — `src/lib/types.ts` (959 lines) mirrors every API response the web app
  consumes, with `empty*()` builders so a failed fetch renders an empty state rather
  than crashing.
* **Errors** — route-group `error.tsx` boundaries plus a `global-error.tsx`, all
  reporting to the API's client-error endpoint so browser failures reach Sentry.
