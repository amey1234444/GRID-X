# GRID-X

GRID-X is OSWAR's operating system for distributed manufacturing: partner onboarding,
job allocation, controlled drawings, material issue and reconciliation, production
milestones, inspection, logistics, partner invoices and payment approvals. It connects
OSWAR with its network of MSME manufacturing partners through one controlled flow:

**Job issued → Material issued → Production tracked → Quality verified → Material reconciled → Payment approved**

## Architecture

The platform is a pnpm monorepo:

| Path | Purpose |
| --- | --- |
| `packages/db` | Prisma schema, migrations and seed data (PostgreSQL) |
| `packages/shared` | Enums, zod schemas, permissions and domain logic shared by API and web |
| `apps/api` | NestJS REST API with JWT auth, RBAC, structured request logging and Swagger |
| `apps/web` | Next.js 14 web app: marketing site, GRID-X Control, Partner PWA and Inspector |
| `apps/mobile` | React Native (Expo) app for Inspectors and Partners, driven entirely by the API |

```
┌─────────────┐   ┌──────────────┐   ┌───────────────┐
│  apps/web   │   │ apps/mobile  │   │  Swagger UI   │
│  Next.js 14 │   │ Expo / RN    │   │  /api/docs    │
└──────┬──────┘   └──────┬───────┘   └───────┬───────┘
       │  HTTPS + JWT    │                   │
       └────────┬────────┴───────────────────┘
                ▼
        ┌───────────────┐      ┌──────────────┐
        │   apps/api    │─────▶│  PostgreSQL  │
        │  NestJS + RBAC│Prisma│              │
        └───────────────┘      └──────────────┘
```

All clients — web, mobile and Swagger — speak to the same REST API. No business logic
lives in a client; the mobile app is a pure presentation layer over the API.

## Design system

The web app uses a **dark-only, premium industrial theme**:

- Design tokens are centralised in `apps/web/src/app/globals.css` (HSL CSS variables)
  and mapped through `apps/web/tailwind.config.ts`: layered surfaces (`background` →
  `surface` → `surface-elevated` → `surface-hover` → `surface-active`), hairline
  borders (`border`, `border-subtle`), semantic colors (`success`, `warning`,
  `destructive`, `info`) and a five-color chart palette.
- Components are shadcn/ui-style primitives under `apps/web/src/components/ui/`
  (Radix UI + class-variance-authority), customised for the dark theme: pressed-state
  scaling on buttons, sheen and elevation on cards, shimmer skeletons.
- Motion is built on Framer Motion via `apps/web/src/components/motion.tsx`:
  `Reveal` (scroll-into-view fade/slide), `StaggerGroup`/`StaggerItem` (list
  staggering), `PageTransition` (route-level entrance) and `HoverLift` — all of which
  respect `prefers-reduced-motion`.
- The mobile app mirrors the same palette through `apps/mobile/src/theme.ts` so both
  surfaces feel like one product.

There is intentionally **no light theme and no theme toggle**.

## Getting started

```bash
pnpm install
cp .env.example .env            # defaults match the bundled Postgres container
docker compose up -d --wait     # PostgreSQL 16 on localhost:5432
pnpm --filter @gridx/db generate
pnpm --filter @gridx/db migrate # applies prisma/migrations to the database
pnpm --filter @gridx/db seed
pnpm dev                        # API on :4000, web on :3000
```

If you already run PostgreSQL yourself, skip `docker compose` and point
`DATABASE_URL` at your own instance instead.

API docs are served at `http://localhost:4000/api/docs`, and the health check
used by Render is at `http://localhost:4000/api/health`.

### Web (`apps/web`)

```bash
pnpm dev:web        # Next.js dev server on :3000
```

Routes: `/` (marketing site), `/login` (internal Control users), `/partner/login`
(partner users), `/app/*` (GRID-X Control), `/partner/*` (Partner PWA),
`/inspector/*` (Inspector workspace). Sessions are httpOnly cookies managed by the
Next.js server; the browser never holds raw tokens.

### Mobile (`apps/mobile`)

The Expo app is deliberately **outside** the pnpm workspace (Metro does not tolerate
pnpm's symlinked `node_modules`) and manages its own dependencies with npm:

```bash
cd apps/mobile
npm install
npm start           # Expo dev server; press a for Android, i for iOS
```

- Point the app at your API by editing `expo.extra.apiBaseUrl` in `app.json`
  (defaults to `http://10.0.2.2:4000/api`, the Android-emulator alias for the host's
  `localhost`; use your machine's LAN IP for a physical device).
- Tokens are stored with `expo-secure-store`; the API layer
  (`src/lib/api.ts`) centralises auth headers, request IDs, timeouts, single-flight
  refresh-token rotation and error normalisation.
- Signing in with a partner account opens the Partner experience (dashboard, jobs,
  invoices); any other account opens the Inspector experience (inspection queue,
  rework). Role detection is `user.partnerId` from the API — no roles are duplicated
  client-side.

### Building the Android APK

`.github/workflows/mobile-apk.yml` builds an installable APK. Run it from the Actions tab
("Mobile APK" → *Run workflow*), or push a `mobile-v*` tag. Inputs:

- `api_url` — baked into the build as `EXPO_PUBLIC_API_URL` (e.g.
  `https://api.example.com/api`). Leave empty to keep the emulator default.
- `variant` — `release` (default) or `debug`.

The APK is uploaded as the `gridx-field-apk` artifact. Recipients do not need a rebuild to
change servers: **Profile → Server** in the app persists a runtime API URL in secure
storage, which takes precedence over the build-time value.

Locally the same build is:

```bash
cd apps/mobile
npm ci
npx expo prebuild --platform android --no-install
cd android && ./gradlew assembleRelease
# android/app/build/outputs/apk/release/app-release.apk
```

`android/` and `ios/` are generated by prebuild and git-ignored.

### Logging

- **API** — `RequestLoggerMiddleware` logs one structured JSON line per request:
  requestId (honouring an incoming `x-request-id`, echoed back in the response),
  method, path, status, duration, and userId/role when authenticated. Error responses
  include the requestId so a user-visible failure can be matched to a server log line.
- **Web** — `apps/web/src/lib/logger.ts` is a levelled JSON logger; the server-side
  (`session.ts`) and client-side (`client-api.ts`) API layers attach an
  `x-request-id` to every call and log failures with it.
- **Mobile** — `apps/mobile/src/lib/logger.ts` mirrors the same format; every API
  request is logged with its requestId, status and duration.

No logger ever records passwords, tokens, refresh tokens or authorization headers.

## Authentication and roles

- Internal users sign in with email at `/login`; partners with phone at
  `/partner/login`. Both flows return an access token + rotating refresh token.
- RBAC is enforced server-side by `JwtAuthGuard` and `PermissionsGuard`; role
  definitions and permission codes live in `packages/shared`.
- **Control** (`/app`) is the internal operations workspace, **Partner** (`/partner`)
  is a PWA with offline support for MSME units, and **Inspector** (`/inspector`) is a
  focused quality workspace. The mobile app serves Inspectors and Partners.

## Checks

```bash
pnpm typecheck   # every package
pnpm lint
pnpm test        # API unit tests (jest)
pnpm build       # shared → db → api → web

cd apps/mobile && npm run typecheck   # mobile app
```

CI runs the same three commands on every push and pull request, and separately
replays the Prisma migrations against a throwaway PostgreSQL 16 service to catch
a `schema.prisma` edited without a matching migration — see
`.github/workflows/ci.yml`.

## File uploads

Drawings, photographs, partner documents and invoice copies are uploaded through
`POST /api/files/upload` and referenced by id. In development files land on local
disk under `STORAGE_LOCAL_DIR`; in production set `STORAGE_DRIVER=s3` with the
`S3_*` variables, because Render disks are per-instance and not shared. Drawings
are only ever served through short-lived signed URLs, and every view is written
to the drawing access log.

Useful database commands, all of which read `.env` at the repository root:

| Command | What it does |
| --- | --- |
| `pnpm db:migrate` | Create and apply a migration after editing `schema.prisma` |
| `pnpm db:seed` | Load roles, partners, components, drawings and a sample job lifecycle |
| `pnpm db:reset` | Drop everything, re-apply migrations and re-seed |
| `pnpm db:studio` | Browse the data in Prisma Studio |

## Documentation

Full platform documentation lives in [docs/](docs/README.md) — architecture, the data
model, security and RBAC, every functional module in depth, the API reference, the web
applications, background jobs and the IMS boundary, dashboards and reports, blueprint
coverage, and operations.

## UI/UX principles

- Dark, layered surfaces over flat black; restrained borders and shadows.
- Motion is deliberate and sparse: entrance reveals, staggered lists, page
  transitions, press feedback — never decorative for its own sake, and always
  disabled for users who prefer reduced motion.
- Data-dense screens (jobs, inspections, invoices) favour tables on desktop and
  card lists on mobile; every list has loading, empty and error/retry states.

## Known limitations & future work

- The mobile app is read-focused: recording inspection results, milestone updates
  and evidence upload remain web-first, and are the natural next step for mobile.
- Push notifications are not yet wired to the mobile app.
- Log lines go to stdout; shipping them to a central collector (e.g. Loki,
  CloudWatch) is deployment configuration, not code.
