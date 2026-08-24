# 03 — Security, authentication and access control

Blueprint Section 18 asks for role-based permissions, partner isolation, drawing access
logging, encrypted file storage, signed URLs, audit logs, secure password storage,
refresh-token rotation, two-factor authentication for admins and automatic session
expiry. This document describes how each is implemented.

---

## 1. Authentication

Three sign-in routes, all rate-limited, all issuing the same session shape.

### 1.1 Internal users — email and password

`POST /api/auth/login` (`AuthService.login`)

1. Look up the user by lower-cased email, including role, partner and companies.
2. Reject unless `passwordHash` exists and `status === 'ACTIVE'`.
3. Verify with `argon2.verify` (argon2id).
4. If `twoFactorEnabled && twoFactorConfirmedAt`, require and verify a second factor.
   A half-finished enrolment never locks anyone out.
5. Issue the session.

### 1.2 Partner users — OTP

`POST /api/auth/otp/request` then `POST /api/auth/otp/verify`.

* A six-digit code from `randomInt`, stored only as a SHA-256 hash, with a configurable
  TTL (`OTP_TTL_MINUTES`, default 10).
* **The request endpoint always answers identically**, whether or not the phone belongs
  to an active user, so it cannot be used to enumerate partner numbers.
* Delivery is through the WhatsApp/SMS channel. When no provider is configured the code
  is logged with a warning — development only; production sets
  `NOTIFY_WHATSAPP_ENABLED` so codes never reach the logs.
* Verification: at most five attempts per code, single use (`consumedAt`), and expiry
  enforced in the query.

`POST /api/auth/partner/login` offers phone + password for partners who prefer it.

### 1.3 Two-factor authentication

Implemented from first principles in `apps/api/src/auth/totp.ts` — RFC 6238, base32
secrets, any authenticator app can enrol from the QR code. Fourteen unit tests cover
base32 round-tripping, code generation, window tolerance, the otpauth URI and recovery
codes.

| Endpoint | Behaviour |
| --- | --- |
| `POST /api/auth/2fa/enrol` | Generates a fresh secret and the `otpauth://` URI. Nothing is enforced yet |
| `POST /api/auth/2fa/confirm` | Verifies a live code, then returns the recovery codes **once** — only argon2 hashes are kept |
| `POST /api/auth/2fa/disable` | Requires a current TOTP code or an unused recovery code, so a stolen session cannot turn it off |

`assertSecondFactor()` accepts either a TOTP code or one recovery code; a recovery code
is consumed on use and the use is audited with the number remaining.

### 1.4 Sessions and token rotation

* **Access token** — JWT, `{ sub, typ: 'access' }`, signed with `JWT_ACCESS_SECRET`,
  default TTL 15 minutes.
* **Refresh token** — 48 random bytes, base64url; only its SHA-256 hash is stored.
  Default TTL 30 days. Each token carries a `familyId`.
* **Rotation** — every refresh issues a new token, revokes the old one and records
  `replacedBy`.
* **Reuse detection** — presenting a revoked or expired refresh token revokes the entire
  family, so a stolen token cannot outlive its detection.
* **Logout** revokes the whole family (or all of a user's tokens when no token is given).
* **Password change** rehashes with argon2id, stamps `passwordUpdatedAt` and revokes
  every other session.

On the web side the tokens live in `httpOnly`, `sameSite=lax`, `secure`-in-production
cookies. The browser never sees them; `apiFetch()` attaches them server-side and
refreshes once transparently on a 401.

### 1.5 Rate limiting

`RateLimitGuard` runs **before** JWT parsing, so credential stuffing is rejected before
any database work.

* Fixed windows declared per route with `@RateLimit(limit, windowMs)`.
* The bucket key is `IP | phone-or-email`, because behind a proxy `request.ip` reflects
  `X-Forwarded-For`, which the client controls — mixing in the subject means spoofing the
  header does not hand an attacker a fresh bucket per attempt.
* Counters are held **both** in process memory and in the shared `RateLimitCounter`
  table. The row id embeds the window start, so each window is a new row, increments
  cannot be lost to a race, and old rows simply expire. If the database is unreachable
  the in-memory limit still applies — degraded, never open.
* Responses carry `429` and a `Retry-After` figure in the message.

---

## 2. Authorisation

Three layers apply in order, and all three must pass.

### 2.1 Permission codes

`shared/permissions.ts` defines 73 codes of the form `<resource>:<action>`, grouped by
domain: partners, components, drawings, jobs, capacity, materials, quality, tooling,
logistics, commercials, performance, dashboards/reports, administration.

Every route declares what it needs:

```ts
@Post(':id/allocate')
@RequirePermissions(PERMISSIONS.JOB_ALLOCATE)
allocate(...) { … }
```

`PermissionsGuard` compares the requirement against the permissions resolved from the
user's role and rejects with a message naming exactly what is missing.

### 2.2 The role matrix

| Role | Scope of what it can do |
| --- | --- |
| **GROUP_ADMIN** | Everything, across every group company |
| **GRIDX_HEAD** | The partner network end to end: partner CRUD, approval, suspension, audits, capabilities, documents and machines; component management; drawing access and its audit; job creation, allocation, **Class A override**, closure; non-conformance, rework and corrective actions; tooling; scorecard compute; all four dashboards; user management; audit log |
| **OPERATIONS_HEAD** | Read partners, components and drawings; create, update, allocate and close jobs; answer clarifications; request inspections; manage shipments; operations and quality dashboards; reports |
| **ENGINEERING_USER** | Component and process masters; the full drawing lifecycle (manage, approve, release, grant access, read the access audit); inspection plans; deviation approval; answer clarifications |
| **PROCUREMENT_USER** | Create and update partners and their documents; item master; rates; read invoices and scorecards; finance dashboard |
| **QUALITY_INSPECTOR** | Perform inspections; manage inspection plans, non-conformances, rework and corrective actions; conduct partner audits; quality dashboard |
| **STORES_USER** | Issue material, record consumption, reconcile; manage tooling; read jobs and shipments |
| **FINANCE_USER** | Verify quantity and quality on invoices, approve, hold, schedule and record payments; finance dashboard |
| **LOGISTICS_COORDINATOR** | Read partners, jobs and material; create and update shipments |
| **MANAGEMENT_VIEWER** | Read-only across partners, components, drawings, jobs, capacity, material, inspections, tooling, shipments, rates, invoices, scorecards, all dashboards and reports |
| **PARTNER_OWNER** | Their own unit only: jobs (respond, milestones, clarifications), drawings (read and acknowledge), material acknowledgement, request inspection, declare capacity, submit invoices, read scorecard and shipments, and manage their own users |
| **PARTNER_SUPERVISOR** | As the owner, without invoice submission, tooling or user management |
| **PARTNER_WORKER** | Read jobs and drawings; update milestones. Nothing else |

Roles are seeded into `Role`/`RolePermission` from this same matrix, and
`PATCH /api/roles/:code` lets a Group Admin adjust a role's permissions at runtime.

### 2.3 Company isolation

`common/company-scope.ts` implements the group-company boundary of Section 4.

| Helper | Use |
| --- | --- |
| `seesAllCompanies(actor)` | True only for `GROUP_ADMIN` |
| `isCompanyScoped(actor)` | Internal, non-Group-Admin users |
| `allowedCompanyIds(actor, requested?)` | The ids this actor may read. A `requested` filter narrows the set, and is **rejected outright** if it falls outside — an explicit filter can never be used to reach across the group. An internal user linked to no company is refused rather than shown everything |
| `companyWhere(actor, requested?)` | `where` fragment for models carrying `companyId` |
| `nestedCompanyWhere(actor, relation)` | The same, one relation deep (an inspection through its job) |
| `assertCompanyScope(actor, companyId, label)` | Guards a record already loaded by id — detail reads and writes bypass list filters, so every primary-key lookup is checked separately |
| `assertCanWriteToCompany(actor, companyId)` | Guards a write. A missing company id is an error here: you cannot create a record without saying who owns it |

Fifteen unit tests in `common/company-scope.spec.ts` cover the fail-closed behaviour.

### 2.4 Partner isolation

Partner users are not company-scoped; their boundary is `partnerId`, enforced per
service:

* `JobsService.scopeWhere()` adds `partnerId: actor.partnerId ?? ''` for partner users —
  an empty string rather than a missing clause, so a malformed session matches nothing.
* `MaterialsService.acknowledge()`, `QualityService.request()`,
  `LogisticsService.findOne()` and the invoice reads each reject a record belonging to
  another partner with a plain-language 403.
* `ReportsService.run()` forces `partnerId` onto the filters for partner callers, so
  every report is automatically their own slice.
* `AdminService.userScope()` limits a partner owner to their own unit's users.
* `JwtAuthGuard` refuses the session outright if the user's partner is inactive.

---

## 3. Controlled documents

Drawing security is the strictest part of the platform.

1. **Access must be granted.** A partner may only open a revision that has a live
   `DrawingAccess` row — not revoked, not expired.
2. **Only released revisions.** Even with a grant, a revision that is not `RELEASED` is
   refused: *"This revision is no longer valid for production."*
3. **Download is a separate right.** `VIEW_ONLY` grants cannot download.
4. **Everything is logged.** Grants, revocations, views and downloads are written to
   `DrawingAccessLog` with IP address and user agent.
5. **Partners never receive the clean file.** `viewRevision()` returns a copy watermarked
   with partner name, job number, drawing number and revision, composited into the PDF
   (three diagonal passes per page plus a footer) or the image by `WatermarkService`.
   Superseded revisions are stamped `OBSOLETE — DO NOT USE` in red.
6. **No unstampable fallback.** If a format cannot be watermarked the request fails with
   an instruction to re-upload as PDF, rather than serving an unmarked drawing.
7. **Watermarked copies are cached** under a key derived from the original checksum plus
   the watermark text, so the same partner and job reuse one object, a different partner
   gets their own, and re-uploading the drawing invalidates both.
8. **Releasing a revision withdraws the old one everywhere** — see
   [Module 3](04-modules.md#module-3--drawing-and-revision-control).

---

## 4. File storage

* Local disk in development (`STORAGE_LOCAL_DIR`), S3-compatible object storage in
  production (`STORAGE_DRIVER=s3` — AWS S3, Cloudflare R2, Supabase, GCS).
* Objects are always reached through **short-lived signed URLs**
  (`STORAGE_SIGNED_URL_TTL_SECONDS`, default 300).
* Uploads are capped at 25 MB and restricted to an allow-list of MIME types.
* Every object stores a SHA-256 checksum.
* Large PDFs get a generated preview so a partner on a slow connection is not made to
  download an A0 sheet; single-page files under 2 MB are served as-is rather than
  duplicated.
* `GET /api/files/raw/:key` is public and exists only for local development; production
  never uses it because signed object-storage URLs are used instead.

---

## 5. Audit logging

`AuditService.record()` writes an `AuditLog` row for every create, update and status
change: actor id and a readable `actorLabel` (`"Name (ROLE)"`, or `SYSTEM` for scheduled
work), the action, the entity type and id, the owning company, and `before`/`after` JSON
snapshots. Authentication events (`PASSWORD_LOGIN`, `OTP_LOGIN`, `TWO_FACTOR_ENABLED`,
`TWO_FACTOR_RECOVERY_CODE_USED`) carry IP address and user agent.

`GET /api/audit-logs` exposes it, filterable by entity type, entity id, user and action,
behind `AUDIT_LOG_READ` — held only by Group Admin and the GRID-X Head.

Financial and quality records are never deleted; they are superseded, and the log is the
history.

---

## 6. Transport and application hardening

| Control | Implementation |
| --- | --- |
| Security headers | `helmet()` in `main.ts` |
| CORS | Explicit allow-list from `CORS_ORIGINS`, credentials enabled |
| Body validation | Every route body and query string parsed by a zod schema before the service sees it |
| Error shape | `AllExceptionsFilter` returns a consistent JSON error and reports to Sentry |
| Client errors | `POST /api/health/client-error` relays browser React-boundary errors to Sentry, with the message, digest, stack and path trimmed to hard limits since it is unvalidated public input |
| Session expiry | `SESSION_IDLE_TIMEOUT_MINUTES` plus a 15-minute access-token TTL |
| Secrets | Generated by Render in production; the defaults in `.env.example` are development placeholders |
