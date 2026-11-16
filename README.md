# Audit Platform — Sprint 1 Starter

## Quick start (local development)

Both apps are scaffolded and runnable. The backend uses SQLite by default; switch `DB_*` in `backend/.env` to MySQL when ready.

```bash
# 1. API — http://127.0.0.1:8000
cd backend
composer install                      # first time only
php artisan migrate:fresh --seed      # tenants, roles, permissions + demo content
php artisan serve --host=127.0.0.1 --port=8000

# 2. Website + admin panel — http://localhost:5173
cd frontend
npm install                           # first time only
npm run dev
```

- Public site: `http://localhost:5173/` · University: `/university` · Fieldwork tracker: `/university/internal-audit-fieldwork-testing-tracker`
- Admin panel: `http://localhost:5173/admin` — dev login `owner@example.test` / `ChangeMe-Immediately-123!` (change before any shared deployment)
- Vite proxies `/api` and `/sanctum` to Laravel, so session cookies + CSRF work same-origin. The tenant is resolved from the hostname (`localhost`, `127.0.0.1`, `demo.localhost` are seeded).

### What's built

| Area | Where |
|---|---|
| Home page (hero, workflow, data flow, modules, pricing, CTA) — copy, banner, stats, logos & pricing editable in admin | `frontend/src/site/HomePage.tsx` |
| CMS pages (`/about`, `/security`, …) built from sections: hero, rich text, features, stats, FAQ, CTA — versioned with restore | `frontend/src/admin/PageEditor.tsx`, `backend/app/Http/Controllers/Api/Admin/PageController.php` |
| University hub + resource pages (Markdown body, FAQs, sources, related, share) | `frontend/src/site/University*.tsx` |
| Interactive tools: fieldwork testing tracker (Excel/PDF export), sample size calculator, materiality calculator | `frontend/src/tools/` |
| Contact / demo form → leads (honeypot + rate limit) | `frontend/src/site/ContactPage.tsx` |
| Admin: dashboard, pages, University, leads (status, notes, CSV export), site settings, users & roles, audit log | `frontend/src/admin/` |
| Tenant-scoped RBAC via `permission:` route middleware; audit logging on every write | `backend/app/Http/Middleware/`, `backend/app/Services/AuditLogger.php` |

Permissions: `cms.pages.manage`, `cms.university.manage`, `cms.leads.manage`, `cms.settings.manage`, `users.manage`, `audit_logs.view`. Admin has all; Website Editor has the four `cms.*`.

### Audit workspace (`/app`)

Sign in at `/admin/login`; audit staff land in `/app`. Dev logins (password `ChangeMe-Immediately-123!`): `owner@` (Admin), `manager@` (Manager), `auditor@` and `auditor2@` (Auditors) `example.test`.

| Step | What happens | Where |
|---|---|---|
| I | Choose/create a client, audit type (statutory/internal), frequency (quarterly/annual), fiscal year and period | Engagements → New engagement |
| II | Add processes from the risk & control library and assign a team member (and due date) to each | Engagement page |
| III | The assignee opens the process → risks → controls, ticks the checks, enters population, sample, pass/fail. A fail requires reason, failed samples, management response, closure date and person responsible, and raises a query (Q-0001…) | My work / testing page |
| IV | A process is complete only when every control has a result; once every process is complete, the Word (detailed) and PowerPoint (summary) reports unlock | Engagement page → Reports |

- Dashboard: testing status by process and control for a fiscal year/quarter/client, queries raised, and queries due for retest (closure date passed or within `AUDIT_RETEST_WINDOW_DAYS`, default 7, across all periods).
- Retest: pass closes a query; fail keeps it open with a new closure date. The original result is locked once retested.
- Adding a process copies its risks, controls and checks into the engagement, so later library edits never change past results or reports.
- Fiscal year starts in April by default (`AUDIT_FY_START_MONTH`).
- Reports are built in the browser (`docx`, `pptxgenjs`, lazy-loaded); each download is written to the audit log.
- Permissions: `audit.view`, `audit.test` (only on processes assigned to you), `audit.manage` (clients, library, engagements, assignment, reports). Manager has all three, Auditor has view + test, Partner has view + manage.
- Code: `backend/app/Http/Controllers/Api/Audit/`, `backend/app/Services/AuditWorkflow.php`, `frontend/src/audit/`.

**Still to do from the Sprint 1 list:** MFA (Fortify TOTP) on admin login, automated tests (tenant isolation, role boundaries, audit logging), media uploads, and production config (HTTPS, cookie domain, `SANCTUM_STATEFUL_DOMAINS`, `APP_DEBUG=false`).

---

This starter pack defines the initial multi-tenant foundation for:
- Public React website + custom CMS
- React audit application
- Laravel API
- Tenant-scoped users, roles and permissions
- MFA-ready authentication foundation
- Audit trail foundation

It is a foundation, not a complete production application. Review the tenancy and security notes before deployment.

## Architecture decisions
- Multi-tenancy: shared MySQL database, `tenant_id` on tenant-owned records.
- Tenant isolation: resolve tenant from verified hostname or authenticated tenant membership; never trust a client-supplied tenant ID by itself.
- Authentication: Laravel Sanctum SPA cookie authentication; MFA enforced through Laravel Fortify or an equivalent TOTP implementation.
- RBAC: tenant-scoped roles and permissions. A user can belong to multiple tenants and hold different roles in each.
- CMS: tenant-scoped custom pages and reusable page sections.
- Files: private object storage for audit evidence; public media bucket/path only for approved website assets.

## Backend setup
Use a current supported Laravel release and PHP version supported by that release.

```bash
composer create-project laravel/laravel backend
cd backend
composer require laravel/sanctum laravel/fortify
php artisan install:api
php artisan vendor:publish --provider="Laravel\\Fortify\\FortifyServiceProvider"
```

Copy `backend/database/migrations/*` into the Laravel migrations directory and merge the sample route/middleware snippets into your application. Configure Fortify two-factor authentication and verify the exact configuration against the installed Fortify version.

Configure MySQL, Redis and mail in `.env`, then:

```bash
php artisan migrate
php artisan db:seed
```

## Frontend setup
Requires Node.js LTS.

```bash
mkdir frontend && cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install react-router-dom @tanstack/react-query axios zod
npm install -D tailwindcss @tailwindcss/vite
```

Copy `frontend/src/*` into the Vite app. Configure the API origin in `.env`.

## Suggested domains
- `www.example.com` — public website
- `app.example.com` — audit application
- `api.example.com` — Laravel API

Use HTTPS everywhere. For Sanctum SPA authentication, configure stateful domains, CORS credentials, cookie domain, secure cookies and CSRF correctly for the chosen hostnames.

## Tenant isolation rules
1. Resolve tenant using a trusted hostname/domain mapping or an authenticated tenant membership.
2. Confirm the authenticated user has an active membership in that tenant.
3. Apply tenant scope in policies/services for every tenant-owned query.
4. Include `tenant_id` in unique constraints where values are tenant-local.
5. Add automated cross-tenant access tests before adding business modules.
6. Platform support access must be explicit, time-limited, audited and separate from ordinary tenant roles.

## Sprint 1 implementation sequence
1. Create Laravel and React repositories/apps.
2. Configure local domains or host-based tenant resolver.
3. Add migrations and seed a development tenant + tenant owner.
4. Implement login, CSRF, MFA enrollment/challenge/recovery.
5. Implement tenant selection and tenant membership checks.
6. Implement tenant-scoped RBAC and authorization policies.
7. Implement audit log service and immutable log conventions.
8. Build separate public-site and audit-app shells.
9. Add health endpoint, API versioning, error format and OpenAPI baseline.
10. Add tests for login, MFA, tenant isolation, role boundaries and audit logging.

## Important schema note
The migrations are intentionally limited to Sprint 1 foundations. Audit-specific tables (clients, engagements, RCM, tests, exceptions, observations, ATR and reports) are introduced in later sprints after tenant/RBAC foundations are tested.
