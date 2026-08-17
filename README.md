# GRID-X

GRID-X is OSWAR's operating system for distributed manufacturing: partner onboarding,
job allocation, controlled drawings, material issue and reconciliation, production
milestones, inspection, logistics, partner invoices and payment approvals.

The platform is a pnpm monorepo:

| Path | Purpose |
| --- | --- |
| `packages/db` | Prisma schema, migrations and seed data (PostgreSQL) |
| `packages/shared` | Enums, zod schemas, permissions and domain logic shared by API and web |
| `apps/api` | NestJS REST API with JWT auth, RBAC and Swagger |
| `apps/web` | Next.js 14 web app: marketing site, GRID-X Control, Partner PWA and Inspector |

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

Useful database commands, all of which read `.env` at the repository root:

| Command | What it does |
| --- | --- |
| `pnpm db:migrate` | Create and apply a migration after editing `schema.prisma` |
| `pnpm db:seed` | Load roles, partners, components, drawings and a sample job lifecycle |
| `pnpm db:reset` | Drop everything, re-apply migrations and re-seed |
| `pnpm db:studio` | Browse the data in Prisma Studio |
