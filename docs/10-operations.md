# 10 — Operations

Everything needed to run, test, deploy and maintain GRID-X.

---

## 1. Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | ≥ 20.11.0 (CI pins 20.18.1) |
| pnpm | 9.15.9 (declared as `packageManager`) |
| PostgreSQL | 16 — the bundled Docker container, or your own |
| Docker | Optional, only for the local database |

---

## 2. Local setup

```bash
pnpm install
cp .env.example .env            # defaults match the bundled Postgres container
docker compose up -d --wait     # PostgreSQL 16 on localhost:5432
pnpm --filter @gridx/db generate
pnpm --filter @gridx/db migrate # applies prisma/migrations
pnpm --filter @gridx/db seed
pnpm dev                        # API on :4000, web on :3000
```

If you already run PostgreSQL yourself, skip `docker compose` and point `DATABASE_URL`
at your own instance.

| URL | What |
| --- | --- |
| http://localhost:3000 | Marketing site |
| http://localhost:3000/login | GRID-X Control |
| http://localhost:3000/partner/login | Partner PWA |
| http://localhost:3000/inspector | Inspector |
| http://localhost:4000/api/docs | Swagger |
| http://localhost:4000/api/health | Health probe |

### Seeded accounts

The seed prints them on completion. Every account uses `SEED_PASSWORD`
(default `GridX@2025!`).

| Who | Sign in with |
| --- | --- |
| Group Admin | `admin@oswar.example` |
| GRID-X Head | `gridx.head@oswar.example` |
| Operations Head | `operations@oswar.example` |
| Engineering, Procurement, Quality, Stores, Finance, Logistics, Viewer | Same `@oswar.example` pattern — see `INTERNAL_USERS` in `prisma/seed.ts` |
| Partner users | Phone `98111000<index>`, with the same password |

The seed builds two companies, ten internal users, five partners with their own users,
fifteen components with routings and BOM, drawings with released revisions, rates,
capacity declarations, and ten jobs spread across the lifecycle — including closed jobs
with accepted and rejected quantities, a late delivery, an open inspection and an issued
material challan — so dashboards, scorecards and reports all have real data.

---

## 3. Workspace scripts

Run from the repository root.

| Command | What it does |
| --- | --- |
| `pnpm dev` | API and web in parallel, both watching |
| `pnpm dev:api` / `pnpm dev:web` | One at a time |
| `pnpm build` | shared → db → api → web, in dependency order |
| `pnpm typecheck` | `tsc --noEmit` across every package |
| `pnpm lint` | ESLint, `--max-warnings 0` |
| `pnpm test` | Jest unit tests |
| `pnpm format` | Prettier |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:migrate` | Create and apply a migration after editing `schema.prisma` |
| `pnpm db:seed` | Load the demo data |
| `pnpm db:reset` | Drop, re-migrate and re-seed |
| `pnpm db:studio` | Browse the data in Prisma Studio |

All `db:*` scripts read the root `.env` through `dotenv-cli`, so there is one env file
for the whole repository.

---

## 4. Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | local Postgres | Prisma connection string |
| `API_PORT` / `PORT` | 4000 | API port |
| `API_GLOBAL_PREFIX` | `api` | Route prefix; must match `NEXT_PUBLIC_API_PREFIX` |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allow-list |
| `WEB_APP_URL` | `http://localhost:3000` | Used in notification links |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | dev placeholders | **Must be set in production** |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `30d` | Token lifetimes |
| `SESSION_IDLE_TIMEOUT_MINUTES` | 60 | Idle expiry |
| `OTP_TTL_MINUTES` | 10 | Partner OTP validity |
| `STORAGE_DRIVER` | `local` | `local` or `s3` |
| `STORAGE_LOCAL_DIR` | `./storage` | Development file root |
| `STORAGE_SIGNED_URL_TTL_SECONDS` | 300 | Signed URL lifetime |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_FORCE_PATH_STYLE` | — | Object storage |
| `NOTIFY_EMAIL_ENABLED` + `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | off | Email notifications |
| `NOTIFY_WHATSAPP_ENABLED` + `WHATSAPP_API_URL` / `WHATSAPP_API_TOKEN` | off | WhatsApp notifications **and OTP delivery** |
| `IMS_ENABLED` | off | Master switch for the IMS boundary; nothing below applies while it is off |
| `IMS_DRIVER` | `auto` | `database`, `http`, `disabled`, or infer from what is set |
| `IMS_DATABASE_URL` | — | Direct PostgreSQL connection to the IMS. Secret |
| `IMS_DATABASE_SCHEMA` | `public` | Schema the IMS tables live in |
| `IMS_DB_POOL_MAX` / `IMS_DB_CONNECTION_TIMEOUT_MS` / `IMS_DB_STATEMENT_TIMEOUT_MS` / `IMS_DB_IDLE_TIMEOUT_MS` | 5 / 10000 / 15000 / 30000 | Connection and statement ceilings, so GRID-X cannot exhaust or pin the IMS |
| `IMS_DB_SSL` | `require` | `require`, `no-verify` (managed providers) or `disable` |
| `IMS_MAPPING_PROFILE` / `IMS_MAPPING_FILE` / `IMS_MAPPING_JSON` | `prisma` / — / — | Which IMS naming convention, plus per-entity overrides |
| `IMS_WRITE_MODE` + `IMS_OUTBOX_SCHEMA` / `IMS_OUTBOX_TABLE` / `IMS_OUTBOX_AUTO_CREATE` | `outbox` / `gridx` / `ims_outbound_fact` / true | Where outbound facts go |
| `IMS_SYNC_INBOUND_ENABLED` / `IMS_SYNC_ENTITIES` / `IMS_SYNC_BATCH_SIZE` | on with a database URL / `companies,items,products` / 500 | The scheduled inbound sweep |
| `IMS_BASE_URL` / `IMS_API_KEY` / `IMS_TIMEOUT_MS` | — / — / 15000 | The REST transport |
| `SENTRY_DSN` | — | Error monitoring; blank disables it |
| `SEED_PASSWORD` | `ChangeMe123!` | Password given to every seeded account |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | Browser-facing API base |
| `NEXT_PUBLIC_API_PREFIX` | `api` | Must match `API_GLOBAL_PREFIX` |
| `API_URL` | falls back to the public URL | Server-side override, for when the browser and the Next server reach the API on different hostnames |

> With WhatsApp disabled, partner OTPs are written to the API log with a warning. That is
> a development convenience only — always set `NOTIFY_WHATSAPP_ENABLED` in production so
> codes never reach the logs.

---

## 5. Testing

`pnpm test` runs the Jest suites in the API package — 11 spec files, ~130 assertions,
covering the parts where a mistake would be expensive:

| Suite | Covers |
| --- | --- |
| `auth/totp.spec.ts` | base32 round-tripping, TOTP generation and verification with window tolerance, the otpauth URI, recovery-code generation and normalisation |
| `common/company-scope.spec.ts` | Who is scoped, how a requested `companyId` narrows or is rejected, fail-closed behaviour for a user with no company, the `where` fragments, and guarding both reads and writes |
| `common/domain-logic.spec.ts` | `calculatePayment`, `computeScorecard`, the minimum-evidence floor, `responsibilityForDelay`, `requiresFirstArticle`, `categoryForScore`, `outsourcingEligibility` |
| `commercials/incentives.spec.ts` | `performanceForJobs` returning null rather than 100 with no evidence, and `earnedIncentives` threshold behaviour |
| `jobs/jobs.service.spec.ts` | Class A authorisation, company isolation, the first-article gate, milestone photograph evidence, capacity release |
| `common/workflow.spec.ts` | `assertTransition` accepts legal moves and refuses illegal ones with a helpful message |
| `common/rate-limit.guard.spec.ts` | Window behaviour, the shared counter, and degrading to local-only when the database is unavailable |
| `common/scheduler-lock.service.spec.ts` | Only one claimant wins, expiry releases a crashed holder |
| `partners/distance.spec.ts` | Haversine accuracy, coordinate validation including the `0,0` case, road-distance scaling |
| `imports/csv.spec.ts` | CSV parsing, quoted fields, header normalisation, row-level issues |
| `files/pdf-preview.spec.ts` | Preview generation and the single-page size threshold |

---

## 6. Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request, with
in-flight runs cancelled when a newer push arrives.

**Job 1 — verify**: install → build `@gridx/shared` → build `@gridx/db` (Prisma's client
is generated, not checked in, so both must be built before anything else typechecks) →
`typecheck` → `lint` → `test`.

**Job 2 — migrations**: spins up PostgreSQL 16, creates a shadow database, then:

* `prisma migrate diff --from-migrations --to-schema-datamodel --exit-code` — fails if
  `schema.prisma` was edited without a matching migration;
* `prisma migrate deploy` — fails if a migration does not apply cleanly to an empty
  database;
* `seed:ci` — fails if the seed no longer matches the schema.

These are the two ways a Render deploy breaks, caught before merge.

---

## 7. Deployment (Render)

`render.yaml` is a Render Blueprint provisioning three resources in **Singapore** —
the region must match across all three, because Render's internal hostnames only resolve
inside one region's private network.

| Resource | Type | Purpose |
| --- | --- | --- |
| `gridx-postgres` | PostgreSQL 16 (`basic-256mb`) | System of record |
| `gridx-api` | Web service (`starter`) | NestJS API, health check `/api/health` |
| `gridx-web` | Web service (`starter`) | Next.js app, health check `/` |

**API build**: install → build shared → build db (generate + compile) → build the Nest
app → `prisma migrate deploy`. **Migrations always run before the new version starts.**

Render wires automatically: `DATABASE_URL`, both JWT secrets (generated), `CORS_ORIGINS`
and `WEB_APP_URL` (from the web service), `NEXT_PUBLIC_API_URL` (from the API service)
and `PORT`.

You supply in the dashboard: the `S3_*` variables (required before any upload works —
Render instances have ephemeral filesystems, so `local` storage would lose uploads on
every deploy), and optionally the SMTP, WhatsApp, IMS and Sentry variables.

**Seeding production**: set `RUN_SEED=true` and redeploy, then set it back to `false`.
The seed upserts, so repeating it is safe — but it also rewrites every `passwordHash`,
so leaving it on would reset passwords on every deploy.

The full runbook is in [deployment-render.md](deployment-render.md).

---

## 8. Operational tasks

| Task | How |
| --- | --- |
| **Backups** | Enable Render's daily PostgreSQL backups. Financial and quality records are never hard-deleted, so a restore recovers a coherent history |
| **File versioning** | Enable versioning and server-side encryption on the storage bucket — drawing revision control and the access audit trail assume objects are never overwritten in place |
| **Health monitoring** | `/api/health` reports database reachability and uptime; Render polls it |
| **Error monitoring** | Set `SENTRY_DSN`. Server exceptions go through `AllExceptionsFilter`; browser errors are relayed via `POST /api/health/client-error` |
| **Scaling out** | Safe. Rate-limit counters and scheduler locks are shared through Postgres, so limits hold and cron work runs exactly once |
| **A stuck cron job** | Check `SchedulerLock` — the row names the holding instance and its `lockedUntil`. An expired lease is reclaimed automatically |
| **IMS backlog** | `/app/ims` shows failed outbound rows with attempt counts and next-attempt times. `POST /api/ims/retry` replays now. After 8 attempts a row is abandoned and logged as an error |
| **Re-running a scorecard month** | `POST /api/scorecards/compute` — idempotent, upserted on (partner, year, month) |

---

## 9. Adding to the codebase

**A new field on an existing entity**

1. Edit `packages/db/prisma/schema.prisma`.
2. `pnpm db:migrate` — creates the migration and regenerates the client.
3. Extend the zod schema in `packages/shared/src/schemas.ts`.
4. Handle it in the service and add the field to the controller's DTO type.
5. Add it to the web type in `apps/web/src/lib/types.ts` and to the form's field list.

**A new enumerated value**

1. Add it to the Prisma enum and migrate.
2. Add it to the `as const` array **and** the `*_LABELS` record in `shared/enums.ts`.
3. If it participates in a workflow, add it to the transition table.
   Dropdowns and badges pick it up automatically.

**A new endpoint**

1. Add the permission code to `shared/permissions.ts` and grant it to the roles that
   should hold it.
2. Add the zod schema.
3. Add the controller route with `@RequirePermissions`, and the service method.
4. Apply company scope and, where relevant, partner scope — detail reads by primary key
   need `assertCompanyScope` explicitly.
5. Record an audit entry for any write.

**A new screen**

1. Add the route under the right group in `apps/web/src/app`.
2. Add it to `shared/navigation.ts` with the permission that reveals it.
3. Fetch server-side with `apiGet`, render with `DataTable` / `PageHeader` /
   `StatCard`, and wire writes through a new server action in `actions/control.ts`.
