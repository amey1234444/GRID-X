# 01 — Architecture

## 1. Repository layout

GRID-X is a pnpm workspace (`pnpm-workspace.yaml` includes `apps/*` and `packages/*`)
with four packages. Dependencies flow strictly in one direction: `shared` → `db` →
`api` → `web`, so domain rules are defined once and consumed everywhere.

```
grid-x/
├── packages/
│   ├── shared/          @gridx/shared — enums, state machines, zod schemas,
│   │                    permissions, allocation/payment/scorecard maths, navigation
│   └── db/              @gridx/db     — Prisma schema, migrations, generated client, seed
├── apps/
│   ├── api/             @gridx/api    — NestJS REST API (25 modules)
│   └── web/             @gridx/web    — Next.js 14 App Router (5 route groups)
├── docs/                this documentation
├── .github/workflows/   CI: lint + typecheck + test, and migration replay
├── render.yaml          Render blueprint (Postgres + API + web)
├── docker-compose.yml   local PostgreSQL 16
└── .env / .env.example  one env file read by both apps
```

### `packages/shared` — the domain language

The single source of truth for anything both the API and the web app must agree on.
Nothing in here touches the database or the network; it is pure TypeScript, which is
why it can be unit-tested in isolation and imported into React server components.

| File | Contents |
| --- | --- |
| `enums.ts` (851 lines) | Every enumerated value in the product, its human label, and the **state-machine transition tables** (`PARTNER_APPROVAL_TRANSITIONS`, `DRAWING_STATUS_TRANSITIONS`, `JOB_STATUS_TRANSITIONS`, `CORRECTIVE_ACTION_TRANSITIONS`, `INVOICE_STATUS_TRANSITIONS`), plus derived rules such as `responsibilityForDelay()` and `requiresFirstArticle()` |
| `schemas.ts` (821 lines) | 80 zod schemas — every API request body, shared by the Nest validation pipe and the Next.js server actions |
| `permissions.ts` | The 73 permission codes and the `ROLE_PERMISSIONS` matrix for all 13 roles |
| `allocation.ts` | The nine-factor partner recommendation engine, outsourcing eligibility, haversine road distance |
| `payment.ts` | The Module 11 payment formula, incentive earning and performance measurement |
| `scorecard.ts` | KPI weights, category bands, allocation recommendations, the minimum-evidence floor |
| `navigation.ts` | Section 24 navigation trees for Control, Partner and Inspector |
| `types.ts` | Shared response shapes (dashboards, job summaries, pagination, recommendations) |
| `format.ts` | Shared formatting helpers |

### `packages/db` — persistence

* `prisma/schema.prisma` (2,284 lines) — **78 models, 52 enums**.
* `prisma/migrations/` — four migrations: `0_init` plus three incremental ones
  (`rework_actuals`, `scorecard_evidence_totp_ims_retry`,
  `incentives_scheduler_locks_distance`).
* `prisma/seed.ts` (1,276 lines) — a complete demo network: permissions, roles, two
  companies, ten internal users, five partners with their users, 15 components with
  routings and BOM, drawings and revisions, rates, capacity declarations, and ten jobs
  spread across the lifecycle so every screen has meaningful data on first run.
* `src/index.ts` — re-exports `PrismaClient` and the generated types under `@gridx/db`.

### `apps/api` — NestJS REST API

25 feature modules, all mounted under the `/api` global prefix, with Swagger at
`/api/docs` and a health probe at `/api/health`.

```
admin  audit  auth  capacity  commercials  common  config  dashboards  drawings
files  health  imports  ims  jobs  logistics  masters  materials  notifications
partners  prisma  quality  reports  scorecards  tooling
```

Each feature follows the same shape: `*.module.ts` wires it, `*.controller.ts` declares
routes with the permission each requires, `*.service.ts` holds the business rules.
Services call each other directly (for example `QualityService` calls
`JobsService.transition()`), which keeps one guarded status machine rather than several.

### `apps/web` — Next.js 14 App Router

Five route groups, one deployment:

| Group | URL prefix | Audience |
| --- | --- | --- |
| `(marketing)` | `/` | Public site — platform, partners, pricing, security |
| `(auth)` | `/login`, `/partner/login` | Internal email+password (+2FA) and partner phone/OTP |
| `(control)` | `/app/**` | GRID-X Control — OSWAR employees, 50 screens |
| `(partner)` | `/partner/**` | GRID-X Partner PWA — mobile-first, offline-capable |
| `(inspector)` | `/inspector/**` | GRID-X Inspector — quality engineers on the shop floor |
| `(account)` | `/account` | Password change and two-factor enrolment for any signed-in user |

Rendering is server-first: pages are React server components that call the API with the
session cookie, and all writes go through server actions in
`src/app/actions/control.ts` (1,822 lines, ~85 actions).

## 2. Technology stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Frontend | Next.js 14 (App Router), React 18, TypeScript | Server components by default; client components only where interaction demands it |
| Styling | Tailwind CSS plus a shadcn/ui-style component set in `components/ui` | Light/dark via `next-themes` |
| Charts | Custom SVG components in `components/app/charts.tsx` | No charting library dependency |
| PWA | `public/sw.js` and `app/manifest.ts` | Network-first caching for `/partner` and `/_next` |
| Backend | NestJS 10, TypeScript | Global guards, Swagger, `@nestjs/schedule` cron |
| Validation | zod, via a custom `zodBody` / `zodQuery` pipe | The same schemas the web forms use |
| ORM | Prisma | PostgreSQL 16 |
| Auth | JWT access token + opaque rotating refresh token, argon2id hashes | RFC 6238 TOTP implemented in-house (`auth/totp.ts`) |
| Files | Local disk in development, S3-compatible object storage in production | Always served through short-lived signed URLs |
| Image/PDF | `sharp` and `pdf-lib` | Previews and drawing watermarking |
| Mail | `nodemailer` | Optional |
| Monitoring | Sentry (optional DSN) plus structured logs | Web client errors are relayed through `POST /api/health/client-error` |

## 3. Runtime topology

```
                         ┌──────────────────────────┐
  OSWAR employees ─────► │  GRID-X Control (/app)   │
  Partners ────────────► │  Partner PWA (/partner)  │  Next.js 14
  Inspectors ──────────► │  Inspector (/inspector)  │  (server components
                         └────────────┬─────────────┘   + server actions)
                                      │  httpOnly cookies carry the session;
                                      │  every API call is made server-side
                         ┌────────────▼─────────────┐
                         │      GRID-X API          │  NestJS
                         │  /api/**  ·  /api/docs   │  RateLimit → JWT → Permissions
                         └───┬────────┬────────┬────┘
                             │        │        │
              ┌──────────────▼─┐ ┌────▼─────┐ ┌▼────────────────┐
              │  PostgreSQL 16 │ │  Object  │ │  Notifications  │
              │  (Prisma)      │ │  storage │ │  email/WhatsApp │
              └────────────────┘ └──────────┘ └─────────────────┘
                             │
                   ┌─────────▼──────────┐
                   │  OSWAR IMS (HTTP)  │  masters in, outsourcing facts out
                   └────────────────────┘
```

The browser never holds a bearer token. Access and refresh tokens live in `httpOnly`
cookies (`gridx_session`, `gridx_refresh`); `apps/web/src/lib/session.ts` attaches them
server-side and transparently refreshes on a 401. Two thin route handlers exist for the
cases a server action cannot cover — `/api/gridx/[...path]` proxies client-side fetches
(used by the offline replay queue and the notification bell) and
`/api/reports/[key]/export` streams CSV downloads.

## 4. Request lifecycle

A write from GRID-X Control travels:

1. **Form submit** → a server action in `app/actions/control.ts`.
2. The action parses `FormData`, coerces types and calls `apiFetch()`.
3. `apiFetch()` reads the session cookies, calls the API, and on a 401 exchanges the
   refresh token once and retries.
4. **API guards**: `RateLimitGuard` → `JwtAuthGuard` (loads the user, role and companies
   onto the request) → `PermissionsGuard` (checks `@RequirePermissions`).
5. **Controller** validates the body with `zodBody(schema)`.
6. **Service** applies the domain rules: company scope, partner isolation, workflow
   transition, evidence requirements.
7. Side effects run: audit record, notification, capacity reservation, IMS push.
8. The action calls `revalidatePath()` and returns an `ActionState`; Next re-renders.

Every write ends in `AuditService.record()`, so the audit log is the history of the
system rather than an afterthought.

## 5. Cross-cutting infrastructure

| Concern | Implementation |
| --- | --- |
| **Company isolation** | `common/company-scope.ts` — `companyWhere()`, `nestedCompanyWhere()`, `assertCompanyScope()`, `assertCanWriteToCompany()`. Only `GROUP_ADMIN` sees the whole group; every other internal user is confined to their `UserCompany` links; partner users are bounded by `partnerId` instead |
| **Workflow safety** | `common/workflow.ts` — `assertTransition()` validates every status change against the shared transition table, so no record can skip a stage |
| **Evidence** | `common/evidence.ts` — enforces the Module 7 photograph requirement server-side, not just in the form |
| **Pagination** | `common/pagination.ts` — `paginate()` / `paginationArgs()`, uniform `{ data, total, page, pageSize, pageCount }` |
| **Rate limiting** | `common/rate-limit.guard.ts` — fixed window, counted both in process memory and in a shared `RateLimitCounter` table so the limit holds when the API is scaled out |
| **Scheduler locking** | `common/scheduler-lock.service.ts` — a conditional UPDATE on `SchedulerLock` so each cron job runs on exactly one instance |
| **Document numbers** | `audit/sequence.service.ts` — transactional `NumberSequence` rows producing `GXJ-00001`, `GXC-…`, `GXINV-…` and so on |
| **Errors** | `common/all-exceptions.filter.ts` and `common/sentry.service.ts` |
| **Config** | `config/configuration.ts` — one typed `AppConfig` read from the root `.env` |

## 6. Design decisions worth knowing

* **The state machine lives in `shared` and is enforced in the API.** The same
  transition tables drive the actions the UI offers and the server's guard, so the two
  cannot drift.
* **Nothing is trusted from the client.** Photograph requirements, first-article gates,
  Class A authorisation, delay responsibility and partner isolation are all re-checked in
  the service layer, because the PWA, the offline replay path and a raw HTTP call all
  reach the same endpoint.
* **Absence of evidence never scores as success.** The scorecard has a minimum-jobs
  floor, incentives return `null` rather than 100% when nothing was measured, and a
  partner's standing category only moves on a period that can actually judge them.
* **IMS is a boundary, not a copy.** Only masters GRID-X genuinely needs (companies,
  items, products) are persisted. Stock, purchase orders and sales orders are read
  through, so GRID-X never becomes a second source of truth.
* **Documents that leave the system stay traceable.** A partner never receives the clean
  original of a drawing — only a copy watermarked with their name, the job number and the
  revision, composited into the file itself.
