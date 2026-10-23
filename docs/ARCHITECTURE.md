# Architecture

> Status: **Phases 1–3 implemented**: users, projects, memberships, tasks, comments, optimistic concurrency, permission policies, cookie-based JWT authentication and Admin user management.

## Overview

```
┌──────────────────────┐   HTTP/JSON    ┌──────────────────────┐   Prisma Client   ┌──────────────────────┐
│ React + Vite client  │ ─────────────▶ │ Express API (Node)   │ ────────────────▶ │ PostgreSQL 16 (local)│
│ localhost:5173       │ ◀───────────── │ localhost:4000/api   │ ◀──────────────── │ localhost:5433       │
└──────────────────────┘                └──────────────────────┘                   └──────────────────────┘
```

## 1. Frontend responsibilities (`client/`)

- Render the UI and handle routing (React Router, `BrowserRouter` in `main.jsx`, routes in `App.jsx`).
- Call the backend over HTTP through `src/services/api.js` (one Axios instance whose base URL comes from `VITE_API_BASE_URL`).
- Hold UI state, including the signed-in user (`context/AuthContext.jsx`, restored on start-up from `GET /api/auth/me`).
- **Does not** hold secrets, talk to the database, or make final security decisions.

Implemented now: `/login` (public), a `RequireAuth` route guard around every other page, `AppLayout` (sidebar, header with name/role and **Sign out**, read-only banner for Viewers), `/profile`, Admin user management on `/users`, and pages for the dashboard (with open/assigned tasks), project list, create/edit, project details with tasks and team management, task create (`/projects/:id/tasks/new`), task details with edit form, status change and comments (`/tasks/:id`), and users. Data loading goes through `services/*.js` and the `useApi` hook. `utils/permissions.js` decides which buttons to show, as UX only; the API's `permissions` object and 403 responses are authoritative.

## 2. Backend responsibilities (`server/`)

- Expose a JSON REST API under `/api`.
- Validate input, authenticate users, enforce authorization, apply business rules.
- Be the only component that talks to PostgreSQL (through Prisma).
- Return consistent JSON success and error shapes.

Implemented now: health routes, `/api/projects` (+ members, + tasks), `/api/tasks` (+ comments), `/api/users` (directory + Admin create/read/update/deactivate), `/api/auth` (login, me, logout), `requireAuth` + origin-check middleware, Zod validation middleware, permission policies, central error handler (maps Prisma errors to safe 4xx responses).

## 3. Database responsibilities

- Durable storage for users, projects, memberships, tasks and comments.
- Enforce integrity: primary/foreign keys, unique constraints, cascade rules.
- Local PostgreSQL 16 on port 5433, database `neostats_project_manager`.

Implemented now (migrations `20261023080509_init_users_projects_members`, `20261023090030_add_tasks_comments`, `20261023101615_add_auth_fields`):

```
users ──1───────────< projects.managerId (nullable, ON DELETE SET NULL)
  │
  ├──1──< project_members >──1── projects
  │       (projectId, userId) UNIQUE; ON DELETE CASCADE on both FKs
  │       role: MEMBER | VIEWER (project-level)
  │
  ├──1──< tasks.assigneeId (nullable, ON DELETE SET NULL)
  │       tasks >──1── projects (ON DELETE CASCADE)
  │       status TODO|IN_PROGRESS|DONE, priority LOW|MEDIUM|HIGH, dueDate DATE?, version INT default 1
  │
  └──1──< comments.authorId (ON DELETE CASCADE)
          comments >──1── tasks (ON DELETE CASCADE)
```

- Deleting a project deletes its tasks, which deletes their comments (no orphans). Users are never hard-deleted.
- A task's assignee must be an active `TEAM_MEMBER` with project role `MEMBER` in that project. This is checked in `task.service.js` (a cross-table rule a foreign key cannot express). Removing a member or making them read-only unassigns their tasks in the same transaction.

- `users.role` is the global role enum (`ADMIN`, `PROJECT_MANAGER`, `TEAM_MEMBER`, `VIEWER`). `users.email` is unique and stored lowercase. `isActive` supports soft deactivation. `users.passwordHash` (nullable bcrypt hash) and `users.tokenVersion` (int, default 0) support authentication.
- The manager lives **only** in `projects.managerId` and must be a `PROJECT_MANAGER`. Members must be `TEAM_MEMBER`s. The two can never contradict each other.
- `projects.status` (`ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED`) + `archivedAt` implement archiving. Deleting a project cascades to its memberships.

## 4. Request flow

Example: `GET /api/health`

1. Browser: `HomePage` calls `getHealth()` → Axios `GET {VITE_API_BASE_URL}/health`.
2. Express: `cors()` checks the origin → `express.json()` → `/api` router (`routes/index.js`) → `routes/health.routes.js`.
3. Controller `health.controller.js#getHealth` sends `{ success: true, data: {...} }`.
4. If no route matches → `middleware/notFound.js` creates an `ApiError(404)` → `middleware/errorHandler.js` formats it.

Flow for a protected feature route:

```
request → cors(credentials) → checkOrigin → json → router → requireAuth → validate(zod) → controller → service ─┬─ policy check (403)
                                                         (cookie → JWT → user from DB)                         └─ prisma → PostgreSQL
                                                                                       ↓ (throw ApiError)
                                                                                 errorHandler → JSON error
```

## 5. Why the frontend must not connect directly to PostgreSQL

- Database credentials would have to ship to every browser, where anyone can read them.
- Users could run any query, bypassing validation, authorization and business rules.
- Browsers cannot open raw PostgreSQL connections anyway; a server is always needed.
- One API layer keeps rules (roles, concurrency checks) in a single trusted place.

## 6. How Prisma interacts with PostgreSQL

- `prisma/schema.prisma` declares the datasource (`DATABASE_URL`) and, later, the models.
- `prisma migrate dev` turns schema changes into SQL migration files in `prisma/migrations/` and applies them to the dev database.
- `prisma generate` builds the Prisma Client (`@prisma/client`) from the schema.
- The server uses one shared client (`src/config/prisma.js`). It connects lazily on the first query and manages a connection pool.
- `GET /api/health/db` uses `prisma.$queryRaw\`SELECT 1\`` to prove connectivity.

## 7. Environment variable separation

| Side | File | Content | Visibility |
|---|---|---|---|
| Client | `client/.env` | `VITE_API_BASE_URL` only | **Public**: Vite inlines `VITE_*` values into browser JavaScript |
| Server | `server/.env` | `PORT`, `NODE_ENV`, `CLIENT_ORIGIN`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_ROUNDS`, `SEED_DEMO_PASSWORD` (dev only) | Private, stays on the server |

The server reads variables only in `src/config/env.js` (`dotenv/config`). Both `.env` files are git-ignored; `.env.example` templates are committed.

## 8. Layer separation

| Layer | Folder | Responsibility |
|---|---|---|
| Routes | `src/routes/` | Map method + path to middleware and a controller. No logic. |
| Middleware | `src/middleware/` | Cross-cutting concerns: authentication (`auth.js#requireAuth`, `checkOrigin`), validation, 404, errors. |
| Policies | `src/policies/` | Pure permission rules `(actor, resource) → boolean`. |
| Validators | `src/validators/` | Zod schemas for body / params / query. |
| Controllers | `src/controllers/` | Read the request, call a service, send the response. No Prisma. |
| Services | `src/services/` | Business rules, policy checks and Prisma queries. No `req`/`res`. |
| Utils | `src/utils/` | Small shared helpers (`ApiError`, `pagination`, `password` (bcrypt), `authToken` (JWT + cookie)). |

## 9. Authorization (implemented)

- **Authentication and authorization are separate.** `requireAuth` only establishes *who* is calling and sets `req.actor` (loaded from the database). *What* they may do is decided in the services by the pure policy functions in `policies/project.policy.js`, `policies/task.policy.js` and `policies/user.policy.js`.
- Policies combine the **global role** with **project relationships**: a PM only manages projects whose `managerId` is theirs; a Team Member only sees projects they are a member of and edits only tasks assigned to them; Viewers read everything and write nothing. The visibility rule is also applied as a Prisma `where` filter, so lists only ever contain permitted rows.
- Task rules (`task.policy.js`): reading follows project visibility; only the project's manager creates, deletes and assigns tasks; the assignee (project role `MEMBER`) may change only `status` and `description`; comments can be added by the manager and working members and deleted by their author, the manager or an Admin. Archived projects are read-only (409).
- User rules (`user.policy.js`): only Admins create, edit, deactivate users and reset passwords; an Admin cannot change their own role or deactivate themselves. Admin is read-only for tasks (the brief gives Admins project and user management, not task management) apart from comment moderation.
- Identity never comes from the client: author ids, roles, and user ids in headers or query strings are ignored or rejected by strict Zod schemas.
- Frontend role checks (`utils/permissions.js`, the API's `permissions` objects) only decide which buttons to show; **the backend is the security boundary.**

## 10. Authentication (implemented, Phase 3)

**Strategy: a JWT in an HttpOnly cookie, with a database-backed token version.** Chosen over `Authorization: Bearer` tokens because the browser keeps an HttpOnly cookie where JavaScript (and therefore XSS) cannot read it, and the client needs no token storage code.

- **Passwords:** `bcryptjs`, cost `BCRYPT_ROUNDS` (default 12, minimum 10). Policy: 8+ characters, a letter and a digit, at most 72 bytes (bcrypt ignores later bytes, so longer inputs are rejected). Hashes are never selected for responses or logged.
- **Login** (`POST /api/auth/login`): normalize the email, load the user, run `bcrypt.compare` (against a dummy hash when the user is unknown or has no password, so the timing does not reveal accounts), answer a generic 401 `INVALID_CREDENTIALS` on failure, 403 `ACCOUNT_DEACTIVATED` for inactive accounts (only after a correct password), then sign `{ sub, ver }` with HS256 and `JWT_SECRET` (default lifetime 8h).
- **Cookie:** `neostats_session`, `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` in production, `Max-Age` = token lifetime. The token is never in a response body.
- **`requireAuth`:** cookie → `jwt.verify` (algorithm pinned to HS256, expiry checked) → `prisma.user.findUnique` → 401 if the user is missing, inactive, or `tokenVersion` differs → `req.actor` with safe fields. Role and active status are read **fresh from the database on every request**, so role changes and deactivation take effect immediately.
- **Logout / invalidation:** `POST /api/auth/logout` increments `users.tokenVersion` (only if the presented token is still current) and clears the cookie with identical attributes. Because all of a user's tokens carry the same version, logout ends **all of that user's sessions**. Deactivation and Admin password resets increment it too. No session table is needed.
- **Secret handling:** `JWT_SECRET` must be at least 32 characters and not the placeholder. The server exits at start-up otherwise, and signing/verifying refuses to run without it (no fallback secret). Tests generate a random secret per run.
- **CSRF:** `SameSite=Strict` (the cookie is never sent on cross-site requests), CORS restricted to `CLIENT_ORIGIN` with `credentials: true`, and `checkOrigin` rejects any non-GET request whose `Origin` header is not `CLIENT_ORIGIN` (403 `FORBIDDEN_ORIGIN`). Frontend and API must be on the same site (`localhost` for both).
- **Frontend:** Axios `withCredentials: true`; `AuthContext` restores the session via `/api/auth/me`; `RequireAuth` redirects anonymous users to `/login` (and back after login); a response interceptor turns any 401 into "Your session has ended" and a redirect to login.
- **Removed:** the Phase 1–2 development user switcher (`X-Dev-User-Id` header, `/api/dev/users`, `DevUserContext`).
- **Limitations:** no login rate limiting/lockout, no self-service password change or reset, logout is "sign out everywhere".

## 11. Concurrent task updates (implemented, Phase 2)

Optimistic concurrency control (`server/src/services/task.service.js#updateTask`):

1. `tasks.version` is an integer column (default 1), returned with every task.
2. `PATCH /api/tasks/:id` requires the `version` the client last loaded.
3. After the permission checks, the service updates atomically, only if the version still matches:
   ```js
   const result = await prisma.task.updateMany({
     where: { id: taskId, version },
     data: { ...changes, version: { increment: 1 } },
   })
   if (result.count === 0) throw new ApiError(409, '…', 'VERSION_CONFLICT', undefined, { currentVersion, currentTask })
   ```
   This is a single `UPDATE … WHERE id = $1 AND version = $2` statement. PostgreSQL row locking means two concurrent requests with the same version cannot both match: the second sees the incremented version and updates 0 rows. There is no separate "read, compare, then write" step.
4. On **409 `VERSION_CONFLICT`** the UI shows "This task changed since you opened it. Your changes were not saved." with a **Reload the latest version** button. It never retries or overwrites automatically.

Because a matching version also means the task (including its assignee) is unchanged since the permission check read it, a concurrent reassignment cannot slip past the check. Unassigning tasks when a member leaves also bumps `version`.

This avoids long-held locks and needs no server-side state besides the `version` column.
