# CLAUDE.md — NEOSTATS Project Management Platform

Persistent guide for Claude Code sessions working in this repository. **Read this whole file before making changes.**

---

## A. Project Overview

- **Project:** NEOSTATS Project Management Platform (repo: `Hackathon-neostats`, remote `origin` = `https://github.com/apoorva-as/Hackathon-neostats.git`, branch `main`).
- **Objective:** Build a Collaborative Project Management Platform for the NEOSTATS Full Stack Engineering Hackathon. It covers four roles (Admin, Project Manager, Team Member, Viewer), authentication, authorization, projects, membership, tasks, comments, and detection of concurrent task updates.
- **Current phase: Phase 3 complete (authentication, authorization, user management)** on top of Phase 2 (tasks, comments, concurrent-edit detection) and Phase 1 (projects & team management). See sections N, O and P.
- **Authentication:** email + password login, JWT in an HttpOnly SameSite=Strict cookie, `tokenVersion` invalidation (section P). The Phase 1–2 dev user switcher has been **removed**.
- **Hackathon constraints (from the NeoStats brief):**
  - Time limit: **3 hours**. Core flows first (login, projects, tasks, role permissions), polish later.
  - **Local only:** no cloud database or backend-as-a-service (Firebase, Supabase, …). No deployment needed.
  - **The latest pushed commit is what gets evaluated.** The final push must run correctly.
  - AI tools are allowed, but the user must be able to explain every line and decision, and may be asked to modify/debug/extend it live. Keep code simple, readable and explainable; avoid clever abstractions.
- **Stack decision:** JavaScript + React/Vite was chosen over the brief's *preferred* TypeScript + Next.js. Both are explicitly allowed by the brief.

---

## B. Mandatory Technology Stack

Package manager: **npm**. Each app has its own `package.json` and `package-lock.json`. The root `package.json` only holds orchestration scripts and `concurrently`. Versions are pinned exactly (`--save-exact`).

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 22.20.0 on dev machine (`>=20.19` required by Vite 8) |
| Frontend | React / React DOM | 19.3.1 |
| | Vite + @vitejs/plugin-react | 8.3.5 / 6.1.2 |
| | Tailwind CSS + @tailwindcss/vite (v4, CSS-first config, no `tailwind.config.js`) | 4.3.3 |
| | React Router (`react-router` package, v7; v8 needs Node ≥22.22) | 7.18.4 |
| | Axios | 1.20.0 |
| | oxlint (linter shipped by the Vite template) | 1.89.0 |
| Backend | Express (v5, ES modules) | 5.3.0 |
| | cors / dotenv | 2.8.6 / 18.0.9 |
| | nodemon (dev) | 3.1.14 |
| Database | PostgreSQL 16, local, **port 5433** | 16 |
| ORM | Prisma CLI + @prisma/client (6.x line; npm `latest` tag is an 8.0 RC, so always pin) | 6.19.3 |
| Auth (used since Phase 3) | jsonwebtoken / bcryptjs | 9.0.3 / 3.0.3 |
| Validation (used since Phase 1) | zod | 4.6.7 |
| Tests | Node built-in test runner (`node --test`) + supertest (server); `node --test` for pure client helpers | Node 22 / 7.3.1 |
| Root | concurrently | 10.0.6 |

JavaScript only (no TypeScript). Do **not** use MongoDB, Mongoose, Next.js or Docker.

---

## C. Architecture

```
React + Vite (client, :5173)
   │  HTTP/JSON via Axios (VITE_API_BASE_URL)
   ▼
Express API (server, :4000, /api/*)
   │  Prisma Client (singleton in server/src/config/prisma.js)
   ▼
Local PostgreSQL 16 (:5433, database neostats_project_manager)
```

- `client/`: browser UI only. No secrets, no database access.
- `server/`: all business logic, validation, authorization and database access.

See `docs/ARCHITECTURE.md` for details.

---

## D. Repository Structure

```
Hackathon-neostats/
├── client/                 React + Vite frontend
│   ├── public/             Static files served as-is (favicon)
│   ├── src/
│   │   ├── components/     UI pieces: Button, Badges, Feedback (Spinner/Alert/EmptyState/NotAllowed), ConfirmDialog,
│   │   │                   FormField, PageHeader/Card, Icon, AccountPicker, RoleSelector, ProjectForm, ProjectList, TeamSection, RequireAuth (route guard),
│   │   │                   ProjectTasksSection, TaskList, TaskForm, CommentsSection
│   │   ├── layouts/        AppLayout.jsx (sidebar, header with Sign out, Viewer read-only banner, <Outlet/>)
│   │   ├── pages/          Login, Dashboard, Projects, ProjectCreate, ProjectEdit, ProjectDetails, TaskCreate, TaskDetails, Users (Admin management), Profile, NotFound
│   │   ├── services/       api.js (Axios instance withCredentials, 401 handler, error helpers, isVersionConflict), auth.js, projects.js, tasks.js, users.js
│   │   ├── hooks/          useApi.js (fetch + loading/error/reload)
│   │   ├── context/        AuthContext.jsx (signed-in user, login/logout, session restore via /auth/me)
│   │   ├── utils/          labels.js, permissions.js (UX-only role checks), projectForm.js, taskForm.js, authForm.js (+ *.test.js)
│   │   ├── App.jsx         Route table
│   │   ├── main.jsx        Entry: BrowserRouter + App
│   │   └── index.css       Tailwind import
│   ├── .env.example        VITE_API_BASE_URL template
│   ├── .oxlintrc.json      Linter config (from Vite template)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js      React + Tailwind plugins, port 5173 (strictPort)
├── server/                 Express API
│   ├── prisma/
│   │   ├── schema.prisma   User, Project, ProjectMember, Task, Comment + enums
│   │   ├── migrations/     20261023080509_init_users_projects_members, 20261023090030_add_tasks_comments, 20261023101615_add_auth_fields
│   │   └── seed.js         Idempotent dev seed incl. demo passwords (exports runSeed for tests; refuses in production)
│   ├── scripts/            testDatabase.js (derives *_test DB URL), setup-test-db.js (npm pretest)
│   ├── src/
│   │   ├── config/         env.js (only reader of process.env), prisma.js (PrismaClient singleton)
│   │   ├── controllers/    health, auth, project (incl. members), task (incl. comments), user
│   │   ├── middleware/     auth (requireAuth, checkOrigin), notFound, errorHandler (maps Prisma errors), validate (Zod)
│   │   ├── policies/       project.policy.js, task.policy.js, user.policy.js: every permission rule in one place
│   │   ├── routes/         index.js mounts /health, /auth, /users, /projects (+ /:id/tasks), /tasks
│   │   ├── services/       auth, project, member, task, comment, user (business rules + Prisma)
│   │   ├── validators/     common, auth, project, task, user (Zod schemas)
│   │   ├── utils/          ApiError.js, pagination.js, password.js (bcrypt), authToken.js (JWT + cookie)
│   │   ├── app.js          Builds the Express app (no listen; imported by tests)
│   │   └── server.js       Starts the HTTP server
│   ├── tests/              health, auth, authorization, projects, members, tasks, comments, users, database (+ helpers/)
│   ├── .env.example
│   ├── nodemon.json        Watches src/ and .env
│   └── package.json        "type": "module"
├── docs/ARCHITECTURE.md, docs/API.md
├── .gitignore
├── package.json            Root orchestration scripts
├── CLAUDE.md
└── README.md
```

Note: the repo folder is `Hackathon-neostats` (the GitHub clone name), not `neostats-project-manager`. Empty folders contain `.gitkeep` so Git tracks them.

---

## E. Development Commands

Run from the **repository root** (`Hackathon-neostats/`) unless stated otherwise.

| Purpose | Command |
|---|---|
| Install everything (root, client, server) | `npm run install:all` |
| Start frontend only (http://localhost:5173) | `npm run dev:client` |
| Start backend only with nodemon (http://localhost:4000) | `npm run dev:server` |
| Start both together | `npm run dev` |
| Build frontend | `npm run build:client` |
| Lint frontend | `npm run lint:client` |
| Run backend tests (creates/migrates `neostats_project_manager_test` first) | `npm test` |
| Run frontend unit tests | `npm run test:client` |
| Run both test suites | `npm run test:all` |
| Seed development data (idempotent) | `npm run db:seed` |
| Apply committed migrations (no new ones) | `npm run prisma:migrate:deploy` |
| Health check (backend only) | `Invoke-RestMethod http://localhost:4000/api/health` |
| Health check (real DB `SELECT 1`) | `Invoke-RestMethod http://localhost:4000/api/health/db` |
| Validate Prisma schema | `npm run prisma:validate` |
| Format Prisma schema | `npm run prisma:format` |
| Generate Prisma Client | `npm run prisma:generate` |
| Create + apply a dev migration (needs DB, only with permission) | `npm run prisma:migrate:dev -- --name <name>` |
| Show migration status (read-only) | `npm run prisma:migrate:status` |
| Open Prisma Studio | `npm run prisma:studio` |

Inside `server/` the same Prisma scripts exist without the prefix (`npm run prisma:generate`, …), plus `npm run prisma:migrate:deploy` and `npm start` (no nodemon). Inside `client/`: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`.

Migrations never run automatically on startup.

---

## F. Environment Variables

| Variable | File | Used by | Secret? | Notes |
|---|---|---|---|---|
| `VITE_API_BASE_URL` | `client/.env` | client (`services/api.js`) | No | e.g. `http://localhost:4000/api`. Everything `VITE_*` is public. |
| `PORT` | `server/.env` | server | No | Default 4000 |
| `NODE_ENV` | `server/.env` | server | No | `development` / `production` / `test` |
| `CLIENT_ORIGIN` | `server/.env` | server (CORS) | No | `http://localhost:5173` |
| `DATABASE_URL` | `server/.env` | Prisma | **Yes** | `postgresql://USER:PASSWORD@localhost:5433/neostats_project_manager?schema=public` |
| `TEST_DATABASE_URL` | `server/.env` (optional) | tests | **Yes** | Defaults to `DATABASE_URL` with the DB name + `_test`. Name must end in `_test`. |
| `JWT_SECRET` | `server/.env` | server (auth) | **Yes** | Required, ≥ 32 chars, not the placeholder; the server exits at start-up otherwise (no fallback). Tests use a random one per run. |
| `JWT_EXPIRES_IN` | `server/.env` | server (auth) | No | Token + cookie lifetime, default `8h` |
| `BCRYPT_ROUNDS` | `server/.env` | server (passwords) | No | Default 12, clamped to 10–15 (tests use 10) |
| `SEED_DEMO_PASSWORD` | `server/.env` | seed (dev only) | Dev only | Optional; default demo password is `Neostats@123` (documented in README) |

Templates: `client/.env.example`, `server/.env.example`. Real `.env` files are git-ignored. **Never ask the user to paste passwords or secrets into chat.** They edit `server/.env` locally.

---

## G. Coding Conventions

- **ES modules everywhere** (`import`/`export`). Include the `.js` extension in relative server imports.
- **File naming:** React components and pages `PascalCase.jsx`; hooks `useThing.js`; server files `feature.layer.js` (e.g. `task.routes.js`, `task.controller.js`, `task.service.js`, `task.validator.js`); classes `PascalCase.js`.
- **Layering (server):** route (path + middleware) → controller (read `req`, call service, send response) → service (business rules + Prisma). Controllers must not contain Prisma queries; services must not touch `req`/`res`.
- **Validation:** Zod schemas in `src/validators/`, applied by `validate({ params, query, body })` (`src/middleware/validate.js`) before the controller. Parsed values are on `req.valid.params|query|body`; controllers read those, never raw `req.body`. Failures → 400 `VALIDATION_ERROR` with `details: [{ location, path, message }]`. Body schemas use `z.strictObject` (unknown fields → 400).
- **Permissions:** rules live in `src/policies/*.policy.js` as pure functions of `(actor, resource)`. Services call them and throw `ApiError(403, …, 'FORBIDDEN')`. `req.actor` is set by `requireAuth` (`src/middleware/auth.js`) from the database; never trust ids/roles from the client.
- **Error handling:** throw `ApiError(status, message, code)` for expected errors. Express 5 forwards rejected promises, so no try/catch boilerplate is needed just to call `next(err)`. The central `errorHandler` formats every error.
- **Async:** use `async/await`, not `.then` chains.
- **Environment:** read config only through `import { env } from './config/env.js'`. Never use `process.env` elsewhere.
- **Prisma:** import the singleton `prisma` from `src/config/prisma.js`. Never `new PrismaClient()` elsewhere.
- **API responses:**
  - Success: `{ "success": true, "data": ... }` (list endpoints add `"meta": { page, limit, total, totalPages }`)
  - Error: `{ "success": false, "error": { "code": "UPPER_SNAKE", "message": "...", "details"?: [...] } }`. No stack traces or SQL are ever sent to the client (they are logged on the server).
- **Frontend HTTP:** all calls go through `client/src/services/`. Components do not call axios directly.

---

## H. Security Rules

- Never commit `.env` files; only `.env.example` with placeholders.
- Never expose database credentials or JWT secrets to React. Only `VITE_*` variables reach the browser, and they must be non-secret.
- Validate all incoming data on the backend (Zod).
- Enforce authentication and authorization on the backend for every protected route. **Frontend role checks are UX only, never a security control.**
- Hash passwords with bcryptjs (cost ≥ 10). Never store or log plaintext passwords.
- Never log secrets, tokens, passwords or `DATABASE_URL`.
- Use Prisma's query API or tagged `$queryRaw` templates; never build SQL by string concatenation (`$queryRawUnsafe` is forbidden with user input).
- Do not return password hashes or internal fields in API responses.

---

## I. Database Rules

- PostgreSQL is **local** (PostgreSQL 16 service `postgresql-x64-16`, **port 5433**). A separate PostgreSQL 18 runs on 5432; do not use it.
- Database name: `neostats_project_manager`.
- Prisma is the only ORM. All schema changes go through `prisma/schema.prisma` + `prisma migrate dev`.
- Commit `prisma/migrations/` together with schema changes. Never edit applied migrations.
- **Never** run `prisma migrate reset`, `prisma db push`, `DROP DATABASE`, or delete data without explicit user permission.
- Never apply migrations to a database that has not been verified (check `GET /api/health/db` and `npm run prisma:migrate:status` first).
- Do not touch the separate `hello-stack` practice project or its database.
- **Tests use a separate database** `neostats_project_manager_test` (same server). `npm test` runs `scripts/setup-test-db.js` first (creates it if missing, `prisma migrate deploy`), and `tests/helpers/useTestDatabase.js` points Prisma at it before any app code loads. `resetDatabase()` TRUNCATEs tables and refuses to run unless the current DB name ends in `_test`. Never run tests against the dev DB.

---

## J. Hackathon Requirements (Phases 1–2 implemented; rest planned)

Source: *NeoStats Full Stack Engineering Hackathon* brief (Part 1 Challenge Brief + Part 2 Guidelines). This section is the spec; designs below marked "suggested" are finalised in their own phase.

### J1. Roles and permissions

| Role | Allowed |
|---|---|
| **Admin** | Manage users; create/delete projects; assign project managers; view all projects. |
| **Project Manager** | Manage *assigned* projects; add/remove team members; create/update/delete tasks; assign tasks; change task status. |
| **Team Member** | View projects they belong to; view assigned tasks; update *their* tasks; add comments; change task status. |
| **Viewer** | Read-only access to projects and tasks. |

- **Authorization is the key requirement.** Every rule is enforced on the server. A user calling an API directly (Postman/curl) without permission must be rejected (401 unauthenticated, 403 forbidden). Hiding buttons in the UI is UX only.
- Checks combine the user's role **and** project membership (e.g. a PM only manages projects they are assigned to; a Team Member only sees projects they belong to).

### J2. CRUD scope

- [x] **Users:** create, read, update, **deactivate** (soft; no hard delete). Deactivated users cannot log in and their sessions end immediately.
- [x] **Projects:** create, read, update, **archive** (status `ARCHIVED` sets `archivedAt`), Admin delete.
- [x] **Team members:** add, remove, **change project-level role** (`MEMBER` / `VIEWER`).
- [x] **Tasks:** create, read, update, delete, assign, change status.
- [x] **Comments:** create, read, delete.
- [x] **Authentication:** login (JWT in HttpOnly cookie) + `requireAuth` middleware + logout + `/auth/me`.

### J3. Concurrent updates (required)

- [x] Tasks have an integer `version` column. *(Implemented: error code is `VERSION_CONFLICT`, body includes `currentVersion` + `currentTask`; see O4.)*
- Client sends the `version` it last read with every update.
- Server updates only `WHERE id = :id AND version = :version` and increments `version` in the same statement. If no row matched → **HTTP 409** `{ code: "CONFLICT" }`, including the latest task state.
- UI shows a clear conflict message and lets the user review/reload the latest version instead of silently overwriting.
- Example from brief: version 7 → User A saves → 8. User B saves based on 7 → 409.

### J4. Data model (suggested; schema is ours to design)

`users` (global role, active flag, password hash), `projects` (status incl. archived), `project_members` (user ↔ project + project-level role), `tasks` (project, assignee, status, priority, due date, `version`), `comments` (task, author). A separate `roles` table is optional; an enum is acceptable.

### J5. API design expectations

Graded on: resource naming, correct HTTP verbs and status codes, input validation (Zod), authorization, consistent error handling (shape in section G), **pagination and filtering** on list endpoints (e.g. `?page=&limit=&status=&assigneeId=`), overall consistency. Document the contract in `docs/API.md`.

### J6. Suggested pages (UI/IA is our choice)

`/login`, `/dashboard`, `/projects`, `/projects/:id`, `/projects/:id/tasks`, `/projects/:id/team`, `/tasks/:id`, `/users` (Admin), `/profile`.

### J7. Deliverables

- [x] Seed script: one sample user per role (Admin, PM, Team Member, Viewer) + a deactivated user + projects, tasks, comments; demo password `Neostats@123` (dev only).
- [x] Prisma migrations: schema reproducible from scratch with documented commands (`npm run prisma:migrate:deploy`).
- [x] README: setup steps, env vars, migrate + seed commands, starting both apps, sample login credentials.
- [x] Short architecture note (`docs/ARCHITECTURE.md`): data model, how authorization works, how concurrent updates are handled.
- [x] Tests for critical logic (permissions, 409 conflict detection).
- [ ] Graceful errors: meaningful status codes on the server, clear messages in the UI.
- [x] `.env` never committed; `.env.example` kept up to date.

---

## K. Current Progress

Setup phase (verified on 2026-10-23 unless noted):

- [x] Repository inspected (empty clone, remote intact, no commits)
- [x] Client scaffolded (Vite React template) and dependencies installed
- [x] Tailwind v4, React Router 7, Axios configured; `npm run build:client` succeeds
- [x] Placeholder HomePage + NotFoundPage; client served at http://localhost:5173 (HTTP 200)
- [x] Server scaffolded (Express 5, ESM, CORS, JSON parsing, 404 + error handler)
- [x] `GET /api/health` returns 200 (manually and in tests)
- [x] CORS returns `Access-Control-Allow-Origin: http://localhost:5173`
- [x] Backend tests pass (`npm test`, 4/4)
- [x] `prisma validate` and `prisma generate` succeed (Prisma 6.19.3)
- [x] `npm run dev` starts both apps together
- [x] `.env` files ignored by Git; no credentials in trackable files
- [x] Real credentials in `server/.env`: verified 2026-10-23. User `postgres` authenticates against PostgreSQL 16 on port 5433. The placeholder username `USER` was corrected to `postgres`; the password was set by the user and never printed.
- [x] Database `neostats_project_manager` exists (PostgreSQL 16.15, port 5433), verified 2026-10-23
- [x] `GET /api/health/db` returns `connected` (verified 2026-10-23)
- [ ] Clicking "Check backend health" in the browser: not tested in a real browser (server-side checks only)
- [x] First commit exists: `b13dea4 chore: initialize NEOSTATS project foundation` (push to `origin` not verified)
- [ ] Cleanup (later phase, not urgent): `client/package.json` and `server/package.json` both list `"neostats-project-manager": "file:.."` as a dependency. Likely added by accident; remove when convenient.
Phase 1: Admin, projects & team management (verified 2026-10-23):

- [x] Prisma models User / Project / ProjectMember + enums; migration `20261023080509_init_users_projects_members` applied to dev DB (additive, DB was empty; no reset)
- [x] Seed: `npm run db:seed` → 8 users, 5 projects, 7 memberships; a second run creates 0
- [x] API: projects CRUD, members list/add/change role/remove, users list, dev users list
- [x] Backend tests: 63/63 pass against `neostats_project_manager_test` (health, projects, members, users, database/seed)
- [x] Frontend: dashboard, projects list (search/filter/pagination), create/edit form, details with manager assignment + team management, users page, dev user switcher
- [x] Frontend unit tests 11/11 (`npm run test:client`), `npm run lint:client` clean, `npm run build:client` succeeds
- [x] Manual API checks with curl against the dev DB (role visibility, 403s, 409 duplicate, CORS preflight with `X-Dev-User-Id`)
- [ ] UI clicked through in a real browser: not verified by Claude (no browser available in the session); only the Vite server response (200) was checked

Phase 2: tasks, comments & concurrent-edit detection (verified 2026-10-23):

- [x] Task + Comment models; migration `20261023090030_add_tasks_comments` created with `--create-only`, reviewed (purely additive), applied with `migrate deploy`; `migrate status` up to date; no reset
- [x] Seed: 5 tasks + 3 comments added to the dev DB; second run creates 0
- [x] Backend tests 101/101 (Phase 1 tests still green; one expectation updated for the new `canManageTasks` permission)
- [x] Frontend unit tests 19/19, `npm run lint:client` clean, `npm run build:client` succeeds
- [x] Manual API checks against the dev DB: visibility, 403s, 401, 409 `VERSION_CONFLICT` with a stale version (non-mutating)
- [ ] Task UI clicked through in a real browser: not verified by Claude

Phase 3: authentication, authorization & user management (verified 2026-10-23):

- [x] Migration `20261023101615_add_auth_fields` (nullable `passwordHash`, `tokenVersion` default 0) created with `--create-only`, reviewed (purely additive), applied with `migrate deploy`; `migrate status` up to date; no reset
- [x] Seed: filled missing password hashes for the 8 existing demo users and added the deactivated `inactive@neostats.local`; second run changes nothing; existing projects/tasks/comments untouched
- [x] Backend tests 147/147 (incl. 3 for the dev-only login account picker; Phase 1–2 tests still green, now authenticated through the real cookie middleware; + `auth.test.js`, `authorization.test.js`, Admin user tests). Mutation check: disabling the token-version check makes 4 auth tests fail
- [x] Frontend unit tests 30/30 (incl. role-filtered login picker helpers), `npm run build:client` succeeds, lint shows only 2 pre-existing warnings (`ProjectDetailsPage` unused `counter`); demo credentials absent from the production bundle
- [x] Manual curl against the dev API: 401 without cookie / with `X-Dev-User-Id`, generic invalid-credentials message, deactivated login refused, login sets HttpOnly cookie, Viewer 403 on write, replaying a logged-out cookie → 401, CORS credentials only for `CLIENT_ORIGIN`; server exits with a weak `JWT_SECRET`
- [ ] Login/users/profile UI clicked through in a real browser: not verified by Claude

---

## L. Instructions for Future Claude Code Sessions

1. Read `CLAUDE.md` before making changes.
2. Run `git status` and inspect the current state.
3. Read relevant files before editing them.
4. Preserve existing work; never delete or overwrite without understanding it.
5. Implement **only** the feature currently requested. Do not start the next phase automatically.
6. Test changes (`npm test`, `npm run build:client`, manual health checks) and report actual results.
7. Update `CLAUDE.md` after meaningful architectural or workflow changes.
8. Keep the progress checklist (section K) accurate. Tick items only when verified.
9. Explain important changes and any remaining manual steps.
10. **Never commit, push, or deploy without explicit permission.** Never run destructive database commands without permission. Never ask for secrets in chat.
11. At the end of each phase, remind the user to commit and push (the latest pushed commit is what gets graded).

---

## M. Phase Roadmap (proposed)

Work moves phase by phase. Start a phase **only when the user asks for it**; do not jump ahead.

0. [x] Setup and scaffolding
1. [x] **Phase 1:** users/projects/memberships schema, projects + members API, policy layer, seed, role-aware UI, tests (section N)
2. [x] **Phase 2:** Task + Comment models, tasks API with `version` → 409, comments API, task UI with conflict handling (section O)
3. [x] **Phase 3:** authentication (`passwordHash`, bcrypt, login, cookie JWT `requireAuth`, `tokenVersion` logout), user admin (create/update/deactivate), login page, dev switcher removed (section P)
4. [ ] Final: dashboard polish, README credentials, architecture note, final push

---

## N. Phase 1 Reference: Admin, Projects & Team Management

### N1. Data model (`server/prisma/schema.prisma`)

| Model (table) | Key fields | Notes |
|---|---|---|
| `User` (`users`) | `id` Int, `name`, `email` **unique**, `role UserRole` (default `TEAM_MEMBER`), `isActive` (default true), timestamps | Email always stored trimmed + lowercase. No password yet; Phase 3 adds `passwordHash`. Index on `role`. |
| `Project` (`projects`) | `id`, `name`, `description` (default ""), `status ProjectStatus` (default `ACTIVE`), `managerId` → User (nullable, `ON DELETE SET NULL`), `archivedAt`, timestamps | `archivedAt` is set when status becomes `ARCHIVED` and cleared when it leaves. Indexes on `managerId`, `status`. |
| `ProjectMember` (`project_members`) | `id`, `projectId` → Project (`ON DELETE CASCADE`), `userId` → User (`CASCADE`), `role ProjectRole` (default `MEMBER`), `createdAt` | `@@unique([projectId, userId])` blocks duplicates at DB level. Index on `userId`. |

Enums: `UserRole { ADMIN, PROJECT_MANAGER, TEAM_MEMBER, VIEWER }` (global), `ProjectStatus { ACTIVE, ON_HOLD, COMPLETED, ARCHIVED }`, `ProjectRole { MEMBER, VIEWER }` (role *inside one project*, separate from the global role).

**Manager vs. membership (no contradictions by design):** the manager is stored **only** in `Project.managerId` and must be an active `PROJECT_MANAGER`. Membership rows are only for active `TEAM_MEMBER` users. Because the two sets of global roles never overlap, a project's manager can never also appear as a member with a conflicting role. Deleting a project removes its memberships through the cascade foreign key in the same statement, so no orphans remain and user rows are never touched.

### N2. Permission rules (`server/src/policies/project.policy.js`)

| Action | Admin | Project Manager | Team Member | Viewer |
|---|---|---|---|---|
| List / view projects | all | projects they manage | projects they belong to | all (read-only) |
| Create / delete project | ✅ | ❌ | ❌ | ❌ |
| Edit name/description/status | ✅ any | ✅ own projects | ❌ | ❌ |
| Assign / change manager | ✅ | ❌ | ❌ | ❌ |
| Add / remove member, change project role | ✅ | ✅ own projects | ❌ | ❌ |
| List users (`GET /api/users`) | ✅ | ✅ (to pick members) | ❌ | ❌ |

A project the actor cannot see → 403. Team changes on an `ARCHIVED` project → 409 `PROJECT_ARCHIVED`. `GET /api/projects/:id` returns `permissions { canEdit, canDelete, canAssignManager, canManageMembers }` computed by the same policy, so the UI shows only allowed actions (UX only).

### N3. API (all under `/api`, details in `docs/API.md`)

| Method | Path | Success | Notable errors |
|---|---|---|---|
| GET | `/projects?page&limit&status&search&managerId` | 200 + `meta` | 400 bad filter |
| POST | `/projects` `{ name, description?, status?, managerId? }` | 201 | 400 `VALIDATION_ERROR` / `INVALID_MANAGER`, 403 |
| GET | `/projects/:id` | 200 (+ `permissions`) | 400, 403, 404 `PROJECT_NOT_FOUND` |
| PATCH | `/projects/:id` (any subset; `managerId: null` unassigns) | 200 | 400, 403, 404 |
| DELETE | `/projects/:id` (Admin) | 200 `{ id }` | 403, 404 |
| GET | `/projects/:id/members` | 200 | 403, 404 |
| POST | `/projects/:id/members` `{ userId, role? }` | 201 | 400 `INVALID_MEMBER`, 403, 409 `ALREADY_MEMBER` / `PROJECT_ARCHIVED` |
| PATCH | `/projects/:id/members/:userId` `{ role }` | 200 | 404 `MEMBER_NOT_FOUND` |
| DELETE | `/projects/:id/members/:userId` | 200 `{ projectId, userId }` | 404 `MEMBER_NOT_FOUND` |
| GET | `/users?role&isActive&search&page&limit` | 200 + `meta` | 403 |

Every `/projects`, `/tasks` and `/users` request needs a valid session cookie (401 `UNAUTHENTICATED` otherwise, including deactivated users; see section P). Prisma errors are mapped centrally: P2002 → 409, P2025 → 404, P2003 → 400.

### N4. Development user switcher: REMOVED in Phase 3

Phases 1–2 used a temporary `X-Dev-User-Id` header + "Viewing as" dropdown. It was deleted in Phase 3 (`devActor.js`, `dev.routes.js`, `DevUserContext.jsx`, `DevUserSwitcher.jsx`, the Axios interceptor). The header is ignored and `/api/dev/users` returns 404. Do not reintroduce it.

### N5. Workflows

- **Admin:** Dashboard → Projects → *New project* (name, description, status, manager picked from active PMs) → details page. On the details page: *Edit*, *Delete* (confirm dialog; memberships cascade), inline *Assign* of the manager in the Details card, team management. Users page = read-only directory with role filter.
- **Project Manager:** sees only projects they manage. Details page → Team card: pick an active Team Member who is not on the team yet, choose project role, *Add*; change role inline; trash icon → confirm → membership removed (user kept). Can edit name/description/status, cannot delete or reassign the manager.
- **Team Member:** "My projects" = projects they belong to; details and teammates are read-only. Tasks: see section O.
- **Viewer:** all projects, details and teams read-only ("Read-only" badge, no action buttons).

### N6. Seed (`server/prisma/seed.js`, `npm run db:seed`)

Idempotent: users matched by email, projects by name, memberships by `(projectId, userId)`. Existing rows are never updated, except that a **missing** `passwordHash` is filled with the demo password hash (Phase 3). Demo password: `Neostats@123` (or `SEED_DEMO_PASSWORD`). Refuses to run with `NODE_ENV=production`.

| Role | Name | Email |
|---|---|---|
| ADMIN | Ada Admin | admin@neostats.local |
| PROJECT_MANAGER | Priya Sharma | priya.pm@neostats.local |
| PROJECT_MANAGER | Marcus Lee | marcus.pm@neostats.local |
| TEAM_MEMBER | Aisha Khan / Ben Carter / Chloe Martin / Diego Ramos | aisha@ / ben@ / chloe@ / diego@neostats.local |
| VIEWER | Vera Viewer | viewer@neostats.local |
| TEAM_MEMBER (deactivated) | Ivan Inactive | inactive@neostats.local |

Projects: Website Redesign (Priya; Aisha, Ben), Mobile App Launch (Priya, on hold; Ben, Chloe), Data Warehouse Migration (Marcus; Chloe, Diego as read-only), Customer Portal (no manager, for the assignment demo), Legacy CRM Sunset (Marcus, archived; Aisha).

### N7. Tests

- `npm test` (server, 63 tests): `health`, `projects` (visibility per role, CRUD, validation, invalid managers, 403s, cascade delete), `members` (list/add/role/remove, duplicates 409, only TEAM_MEMBER, user survives removal, archived 409), `users` (directory permissions, public fields only), `database` (`prisma validate`, relations, unique constraint, seed idempotency).
- `npm run test:client` (11 tests): pure helpers `utils/projectForm.js` (form validation + payload) and `utils/permissions.js` (role navigation). No component-rendering framework is installed on purpose.

### N8. Explicitly deferred

(Done in Phase 3: login, passwords, sessions/logout, protected routes, user management.) Still deferred: signup, self-service password change/reset, analytics dashboard, notifications.

---

## O. Phase 2 Reference: Tasks, Comments & Concurrent-Edit Detection

### O1. Data model (migration `20261023090030_add_tasks_comments`, additive)

| Model (table) | Key fields | Notes |
|---|---|---|
| `Task` (`tasks`) | `id`, `projectId` → Project (`CASCADE`), `title` (≤200), `description` (default "", ≤5000), `status TaskStatus` (default `TODO`), `priority TaskPriority` (default `MEDIUM`), `dueDate` (`DATE`, nullable), `assigneeId` → User (nullable, `SET NULL`), `version` Int default 1, timestamps | Indexes `(projectId, status)`, `assigneeId`. API returns `dueDate` as `"YYYY-MM-DD"`. |
| `Comment` (`comments`) | `id`, `taskId` → Task (`CASCADE`), `authorId` → User (`CASCADE`), `body` (≤2000), `createdAt` | No editing (no `updatedAt`). Indexes `(taskId, createdAt)`, `authorId`. |

Enums: `TaskStatus { TODO, IN_PROGRESS, DONE }`, `TaskPriority { LOW, MEDIUM, HIGH }`. Project delete → tasks → comments cascade.

**Assignment rule (server-side, `task.service.js#assertValidAssignee`):** assignee must exist, be active, have global role `TEAM_MEMBER`, and be a member of the task's project with project role `MEMBER`. Otherwise 400 `INVALID_ASSIGNEE`. Removing a member, or changing them to project role `VIEWER`, unassigns their tasks in that project in the same transaction and bumps those tasks' `version` (`member.service.js`).

### O2. Permission rules (`server/src/policies/task.policy.js`)

| Action | Admin | Project Manager | Team Member | Viewer |
|---|---|---|---|---|
| Read tasks / comments | all | projects they manage | projects they belong to (MEMBER or VIEWER role) | all |
| Create / delete / assign tasks | ❌ | ✅ own projects | ❌ | ❌ |
| Edit task | ❌ | ✅ all fields | ✅ `status`, `description` of tasks assigned to them, only with project role `MEMBER` | ❌ |
| Add comment | ❌ | ✅ own projects | ✅ project role `MEMBER` (any task in the project) | ❌ |
| Delete comment | ✅ (moderation) | ✅ own projects | ✅ own comments | ❌ |

Decision: the brief gives Admins project/user management, not task management, so Admin is read-only for tasks (plus comment moderation). Archived project → all task/comment writes 409 `PROJECT_ARCHIVED`. A PATCH containing any field the actor may not edit → 403 and nothing changes. `GET /api/tasks/:id` returns `permissions { editableFields, canEdit, canAssign, canDelete, canComment }`; comments carry `canDelete`; project `permissions` gained `canManageTasks`.

### O3. API (details in `docs/API.md`)

| Method | Path | Success | Notable errors |
|---|---|---|---|
| GET | `/projects/:id/tasks?page&limit&status&priority&assigneeId&search` | 200 + `meta` | 403, 404 |
| POST | `/projects/:id/tasks` `{ title, description?, status?, priority?, dueDate?, assigneeId? }` | 201 | 400 `INVALID_ASSIGNEE`, 403, 409 `PROJECT_ARCHIVED` |
| GET | `/tasks?…&projectId` (all visible projects; `assigneeId` = "my tasks") | 200 + `meta` | 400 |
| GET | `/tasks/:taskId` | 200 (+ `permissions`) | 403, 404 `TASK_NOT_FOUND` |
| PATCH | `/tasks/:taskId` `{ version, …fields }` | 200 (version + 1) | 400, 403, 404, **409 `VERSION_CONFLICT`** |
| DELETE | `/tasks/:taskId` | 200 `{ id }` | 403, 404 |
| GET | `/tasks/:taskId/comments?page&limit` | 200 + `meta` | 403, 404 |
| POST | `/tasks/:taskId/comments` `{ body }` | 201 | 400, 403 |
| DELETE | `/tasks/:taskId/comments/:commentId` | 200 `{ id, taskId }` | 403, 404 `COMMENT_NOT_FOUND` |

### O4. Optimistic concurrency (HTTP 409)

`updateTask` checks permissions, then runs `prisma.task.updateMany({ where: { id, version }, data: { ...changes, version: { increment: 1 } } })`: one atomic `UPDATE … WHERE id AND version`. `count === 0` → re-read: missing → 404, else 409 `VERSION_CONFLICT` with `error.currentVersion` and `error.currentTask` (added via the new optional 5th `extra` argument of `ApiError`, merged into the error body by `errorHandler`). Two simultaneous PATCHes with the same version: exactly one succeeds (tested with three parallel requests). UI: `TaskForm` and the quick status select show "This task changed since you opened it. Your changes were not saved." + **Reload the latest version**; never auto-retries.

### O5. Frontend

- Routes: `/projects/:id/tasks/new` (`TaskCreatePage`, PM only), `/tasks/:id` (`TaskDetailsPage`: details, quick status select, edit/update form, delete, comments).
- Components: `ProjectTasksSection` (on project details: status filters, "Assigned to me" for Team Members, pagination, New task), `TaskList`, `TaskForm` (disables fields not in `editableFields`), `CommentsSection`; badges `TaskStatusBadge`, `PriorityBadge`.
- Dashboard: "My open tasks" (Team Member, `assigneeId` = self) or "Open tasks" (others).
- Helpers: `services/tasks.js`, `utils/taskForm.js` (validation, create/update payloads that send only changed editable fields + `version`, `eligibleAssignees`), `isVersionConflict` in `services/api.js`, `formatDueDate`/`isOverdue` in `utils/labels.js` (UTC so dates don't shift).

### O6. Seed & tests

- Seed adds 5 tasks (Website Redesign ×3, Mobile App Launch, Data Warehouse Migration) and 3 comments; tasks matched by (project, title), comments by (task, author, body). `runSeed` now also returns `tasksCreated`, `commentsCreated`.
- `npm test`: 101 tests (Phase 1's 63, still green, + `tasks.test.js`, `comments.test.js`): CRUD, filters/pagination, assignment validation (outsider, read-only member, Viewer, PM, Admin, inactive, missing), role restrictions, project boundaries, archived 409, stale version 409 with no overwrite, simultaneous updates (one 200, rest 409), member removal unassigns, cascades, comment permissions/validation/cross-task 404.
- `npm run test:client`: 19 tests (adds `utils/taskForm.test.js`).

### O7. Remaining limitations

- Task deletion is not version-checked (only updates are).
- Comments cannot be edited; no notifications, no task activity history.
- UI not clicked through in a real browser by Claude (no browser in the session).

---

## P. Phase 3 Reference: Authentication, Authorization & User Management

### P1. Strategy (one mechanism only)

JWT (HS256, `{ sub: userId, ver: tokenVersion }`, lifetime `JWT_EXPIRES_IN` default 8h) in the cookie **`neostats_session`**: `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` when `NODE_ENV=production`. Never in a response body, never in `localStorage`. `Authorization: Bearer` is **not** accepted. Client: Axios `withCredentials: true`; server: `cors({ origin: CLIENT_ORIGIN, credentials: true })`. Frontend and API must be on the same site (`localhost`, not `127.0.0.1`).

### P2. Files

| File | Purpose |
|---|---|
| `server/src/utils/password.js` | `hashPassword` (bcrypt, `BCRYPT_ROUNDS`), `verifyPassword` (dummy-hash compare for unknown users / no password / > 72 bytes) |
| `server/src/utils/authToken.js` | `signAuthToken`, `verifyAuthToken` (algorithm pinned), `setAuthCookie`/`clearAuthCookie` (same options), `readAuthCookie` |
| `server/src/middleware/auth.js` | `requireAuth` (cookie → verify → user from DB → active + version match → `req.actor`), `checkOrigin` (403 `FORBIDDEN_ORIGIN` for non-GET from a foreign Origin) |
| `server/src/config/env.js` | `assertAuthConfig()` (secret ≥ 32 chars, not placeholder; called by `server.js` at start-up and before every sign/verify) |
| `server/src/services/auth.service.js` | `login` (generic 401 `INVALID_CREDENTIALS`; 403 `ACCOUNT_DEACTIVATED` only after a correct password), `logout(token)` (`updateMany where { id, tokenVersion }` → increment) |
| `server/src/services/user.service.js` | directory + Admin `getUser`/`createUser`/`updateUser`; `authUserSelect` = safe fields |
| `server/src/policies/user.policy.js` | `canManageUsers` (Admin), `selfChangeViolation` (no own role change / self-deactivation) |
| `client/src/context/AuthContext.jsx` | `useAuth()` → `{ currentUser, status, error, notice, login, logout, retry }` |
| `client/src/components/RequireAuth.jsx` | Route guard → `/login` with `state.from` |
| `client/src/pages/LoginPage.jsx` | Order: role cards (`RoleSelector`) → role-filtered searchable `AccountPicker` → password → Sign in. Accounts come from `GET /auth/demo-accounts` (dev only); changing the role clears the chosen account; the picker is disabled until a role is chosen and opens only on click/typing/Arrow Down (never on page load). The role is UI filtering only and is **never sent**: login posts email + password and the server reads the real role from the DB. Falls back to a plain email input (no role cards) when the list returns 404 (production) or fails. Yellow demo panel (password + quick picks: every account of the selected role, or one per role; clicking also selects the role) only when `import.meta.env.DEV` (stripped from production builds) |
| `client/src/components/AccountPicker.jsx`, `client/src/components/RoleSelector.jsx`, `client/src/utils/accountSearch.js` | ARIA combobox (search name/email, keyboard + mouse, custom empty message), four role toggle cards (`aria-pressed`), pure helpers `filterAccounts` / `accountsForRole` / `firstAccountPerRole` (+ tests) |

### P3. Invalidation

`users.tokenVersion` increments on **logout (all sessions of that user)**, **deactivation**, and **Admin password reset**. Every request compares it, so old tokens die immediately, even after reactivation. Role changes need no bump because roles are re-read from the DB on every request.

### P4. API (details in `docs/API.md`)

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | 200 + cookie; 400; 401 `INVALID_CREDENTIALS`; 403 `ACCOUNT_DEACTIVATED` |
| GET | `/auth/me` | signed in | safe fields `{ id, name, email, role, isActive, createdAt }` |
| POST | `/auth/logout` | public (acts only on a valid cookie) | always 200 + cookie cleared |
| GET | `/auth/demo-accounts` | public, **development only** (`devOnly(demoAccountsEnabled)` → 404 when `NODE_ENV=production`) | `{ id, name, email, role }` of active users that have a password, for the login picker. Picking an account only fills the email; the password is still verified and the role comes from the DB. Lists accounts to anonymous visitors (enumeration), which is why it is dev-only |
| GET | `/users` | Admin, PM | unchanged directory (public fields only) |
| GET | `/users/:id` | Admin | 404 `USER_NOT_FOUND` |
| POST | `/users` | Admin | `{ name, email, password, role }`; 409 `EMAIL_TAKEN` |
| PATCH | `/users/:id` | Admin | `{ name?, email?, role?, isActive?, password? }`; 403 self role/deactivate; 409 `USER_HAS_ASSIGNMENTS` when a PM still manages projects or a Team Member still has memberships |

No DELETE for users (deactivation only). Password policy: 8+ chars, a letter and a digit, ≤ 72 bytes (server Zod + `client/src/utils/authForm.js`).

### P5. Tests

- `tests/helpers/useTestDatabase.js` sets a random `JWT_SECRET` and `BCRYPT_ROUNDS=10` per run. `tests/helpers/db.js#as(user)` returns a `Cookie` header with a real signed token, so **all** tests pass through `requireAuth`. `createUserWithPassword(role, password)` creates a user who can log in.
- `auth.test.js`: login success/cookie flags, email normalization, generic 401s, no-password account, deactivated account, malformed input, > 72-byte guard, `/me` safe fields + live role, tampered / wrong-secret / `none` / expired / stripped-signature tokens, deleted user, Bearer header rejected, logout invalidation + replay, all-sessions logout, old token cannot log out the new session, deactivation/reactivation/password reset invalidation, CSRF origin check, CORS credentials, demo-accounts list (active + has password only, public fields, no hash, 404 when disabled, client role rejected).
- `authorization.test.js`: PM own vs unrelated projects and Admin-only operations; Team Member visibility, own-task fields only, no PM operations, spoofed `authorId`; Viewer reads all and every write is 403 with no change; ids in query/headers ignored; 401 without session.
- `users.test.js`: Admin create (hash format, login works), duplicate email, validation, non-admin 403 for all user management, no self-promotion, Admin self-protection, deactivate (row kept, no DELETE route), role change 409, 404/400.

### P6. Remaining limitations

- No login rate limiting or lockout (would need extra infrastructure; acceptable for a local hackathon app).
- Logout signs the user out of all sessions (design of the token-version approach).
- No self-service password change / forgot-password flow; an Admin resets passwords.
- Deactivating a user does not unassign their tasks or managed projects; Admin/PM reassign manually (new assignments already reject inactive users).
- Login/Users/Profile UI not clicked through in a real browser by Claude.
