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
cp .env.example .env            # point DATABASE_URL at your PostgreSQL instance
pnpm --filter @gridx/db generate
pnpm --filter @gridx/db push
pnpm --filter @gridx/db seed
pnpm dev                        # API on :4000, web on :3000
```

API docs are served at `http://localhost:4000/docs`.
