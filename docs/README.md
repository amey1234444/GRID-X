# GRID-X Documentation

GRID-X is OSWAR's operating system for distributed manufacturing. It controls the
transaction between OSWAR and its manufacturing partners end to end:

```
Job issued → material issued → production started → first article approved →
batch completed → quality accepted → material reconciled → payment approved
```

This folder documents what has been built, how each part works, and how the code
maps back to the *GRID-X Software Product Blueprint*.

## Contents

| Document | What it covers |
| --- | --- |
| [01 — Architecture](01-architecture.md) | Monorepo layout, technology stack, runtime topology, request lifecycle, cross-cutting infrastructure |
| [02 — Data model](02-data-model.md) | All 78 Prisma models grouped by domain, every enum, the state machines, sequences and migrations |
| [03 — Security, auth and RBAC](03-security-rbac.md) | Password/OTP/2FA login, token rotation, the permission matrix, company scoping, partner isolation, audit logging, rate limiting |
| [04 — Functional modules](04-modules.md) | The twelve blueprint modules in depth — rules, algorithms, transitions and side effects |
| [05 — API reference](05-api-reference.md) | Every REST endpoint, its permission and its behaviour |
| [06 — Web application](06-web-application.md) | GRID-X Control, the Partner PWA, the Inspector interface, the marketing site, offline support and i18n |
| [07 — Background jobs, notifications and IMS](07-background-jobs-notifications.md) | Cron schedules, the alert catalogue, notification delivery, the IMS boundary and retry worker |
| [08 — Dashboards and reports](08-dashboards-reports.md) | The five dashboards and the seventeen reports, with their formulas |
| [09 — Blueprint coverage](09-blueprint-coverage.md) | Section-by-section traceability from the blueprint to the code |
| [10 — Operations](10-operations.md) | Local setup, environment variables, testing, CI, seeding and Render deployment |
| [11 — Application flow and navigation](11-application-flow.md) | Section-by-section walkthrough of the sidebar, the job lifecycle end to end, and a worked example |
| [12 — Partners and Engineering](12-partners-and-engineering.md) | The two master-data sections field by field: partner onboarding gates, capabilities, scorecards, components, criticality, drawing revision control and watermarking |
| [Deployment on Render](deployment-render.md) | The original step-by-step Render runbook |

## Quick orientation

| I want to… | Read |
| --- | --- |
| Understand how a job moves from creation to payment | [11 — Application flow](11-application-flow.md) |
| Know what a sidebar section does | [11 — Application flow](11-application-flow.md) |
| Understand partner onboarding or component/drawing control | [12 — Partners and Engineering](12-partners-and-engineering.md) |
| Find the endpoint for something | [05 — API reference](05-api-reference.md) |
| Know what a role is allowed to do | [03 — Security, auth and RBAC](03-security-rbac.md) |
| Add a field or a table | [02 — Data model](02-data-model.md) |
| Run the platform locally | [10 — Operations](10-operations.md) |
| Check whether a blueprint requirement is built | [09 — Blueprint coverage](09-blueprint-coverage.md) |

## Status at a glance

| Area | State |
| --- | --- |
| Blueprint MVP scope (Section 14, 15 items) | Complete |
| Blueprint Modules 1–12 | Complete |
| Management, operations, quality, finance and partner dashboards | Complete |
| Section 21 reports (17) | Complete, with CSV export |
| IMS integration (Section 10) | Complete — inbound pull, outbound push, retry worker |
| Notifications (Section 13) | Complete — in-app always, email and WhatsApp when configured |
| Offline/low-connectivity partner PWA (Section 19) | Complete for milestones, acknowledgements and photographs |
| Section 20 AI features | Deliberately not built — later phase |
