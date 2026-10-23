# Architecture

> Status: **Phases 1–2 implemented** (users, projects, memberships, tasks, comments, optimistic concurrency, permission policies, temporary dev user switcher). Sections marked **(planned)** are not implemented yet.

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
- Hold UI state (currently the selected development user in `DevUserContext`; later the logged-in user).
- **Does not** hold secrets, talk to the database, or make final security decisions.

Implemented now: `AppLayout` (sidebar, header, user switcher) and pages for the dashboard (with open/assigned tasks), project list, create/edit, project details with tasks and team management, task create (`/projects/:id/tasks/new`), task details with edit form, status change and comments (`/tasks/:id`), and users. Data loading goes through `services/*.js` and the `useApi` hook. `utils/permissions.js` decides which buttons to show, as UX only; the API's `permissions` object and 403 responses are authoritative.

## 2. Backend responsibilities (`server/`)

- Expose a JSON REST API under `/api`.
- Validate input, authenticate users, enforce authorization, apply business rules.
- Be the only component that talks to PostgreSQL (through Prisma).
- Return consistent JSON success and error shapes.

Implemented now: health routes, `/api/projects` (+ members, + tasks), `/api/tasks` (+ comments), `/api/users`, `/api/dev/users`, Zod validation middleware, permission policy, central error handler (maps Prisma errors to safe 4xx responses).

## 3. Database responsibilities

- Durable storage for users, projects, memberships, tasks and comments.
- Enforce integrity: primary/foreign keys, unique constraints, cascade rules.
- Local PostgreSQL 16 on port 5433, database `neostats_project_manager`.

Implemented now (migrations `20261023080509_init_users_projects_members`, `20261023090030_add_tasks_comments`):

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

- `users.role` is the global role enum (`ADMIN`, `PROJECT_MANAGER`, `TEAM_MEMBER`, `VIEWER`). `users.email` is unique and stored lowercase. `isActive` supports soft deactivation.
- The manager lives **only** in `projects.managerId` and must be a `PROJECT_MANAGER`. Members must be `TEAM_MEMBER`s. The two can never contradict each other.
- `projects.status` (`ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED`) + `archivedAt` implement archiving. Deleting a project cascades to its memberships.

## 4. Request flow

Example: `GET /api/health`

1. Browser: `HomePage` calls `getHealth()` → Axios `GET {VITE_API_BASE_URL}/health`.
2. Express: `cors()` checks the origin → `express.json()` → `/api` router (`routes/index.js`) → `routes/health.routes.js`.
3. Controller `health.controller.js#getHealth` sends `{ success: true, data: {...} }`.
4. If no route matches → `middleware/notFound.js` creates an `ApiError(404)` → `middleware/errorHandler.js` formats it.

Planned flow for a feature route:

```
request → cors → json → router → authenticate → authorize(role) → validate(zod) → controller → service → prisma → PostgreSQL
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
| Server | `server/.env` | `PORT`, `NODE_ENV`, `CLIENT_ORIGIN`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` | Private, stays on the server |

The server reads variables only in `src/config/env.js` (`dotenv/config`). Both `.env` files are git-ignored; `.env.example` templates are committed.

## 8. Layer separation

| Layer | Folder | Responsibility |
|---|---|---|
| Routes | `src/routes/` | Map method + path to middleware and a controller. No logic. |
| Middleware | `src/middleware/` | Cross-cutting concerns: current user (`devActor`, later auth), validation, 404, errors. |
| Policies | `src/policies/` | Pure permission rules `(actor, resource) → boolean`. |
| Validators | `src/validators/` | Zod schemas for body / params / query. |
| Controllers | `src/controllers/` | Read the request, call a service, send the response. No Prisma. |
| Services | `src/services/` | Business rules, policy checks and Prisma queries. No `req`/`res`. |
| Utils | `src/utils/` | Small shared helpers (`ApiError`). |

## 9. Authorization in Phase 1 (implemented) and the temporary user switcher

```
request → cors → json → /api router → requireDevActor → validate(zod) → controller → service ─┬─ policy check (403)
                                        (req.actor from DB)                                      └─ prisma → PostgreSQL
```

- `requireDevActor` reads `X-Dev-User-Id`, loads the user from PostgreSQL and sets `req.actor`. **It is not authentication:** any id can be chosen, so it is for local demos only, and it is disabled in production. The role comes from the database, never from the client.
- Services pass `req.actor` to `policies/project.policy.js` and `policies/task.policy.js` (`visibleProjectsWhere`, `canViewProject`, `canEditProject`, `canManageMembers`, `canAssignManager`, …). The visibility rule is also applied as a Prisma `where` filter, so lists only ever contain permitted rows.
- Task rules (`task.policy.js`): reading follows project visibility; only the project's manager creates, deletes and assigns tasks; the assignee (project role `MEMBER`) may change only `status` and `description`; comments can be added by the manager and working members and deleted by their author, the manager or an Admin. Archived projects are read-only (409).
- Phase 3 swaps `requireDevActor` for a JWT `requireAuth` that sets the same `req.actor`. Policies and services do not change.

## 10. Authentication (planned, Phase 3)

- **Passwords:** hashed with `bcryptjs` before storage; never returned by the API.
- **Login:** verify the hash, then sign a JWT (`jsonwebtoken`) with `{ sub: userId, role }`, using `JWT_SECRET` and `JWT_EXPIRES_IN`.
- **Transport:** client sends `Authorization: Bearer <token>`; an Axios interceptor in `services/api.js` will add it.
- **`authenticate` middleware:** verifies the token and loads the user into `req.user`; returns 401 on failure.
- Role and project checks reuse the Phase 1 policy module.
- Frontend role checks only hide buttons; **the backend is the security boundary.**

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

This avoids long-held locks and works with the stateless JWT API planned for Phase 3.
