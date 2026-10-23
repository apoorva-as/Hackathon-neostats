# NEOSTATS Project Management Platform

A Collaborative Project Management Platform for the **NEOSTATS Full Stack Engineering Hackathon**.

> **Current status: Phase 3 complete (authentication, authorization & user management)** on top of Phase 2 (tasks, comments, concurrent-edit detection) and Phase 1 (projects & team management). Users sign in with email + password. The session is an HttpOnly cookie, and every API permission is checked on the server against the user's role **from the database**. Admins manage users and projects and assign project managers. Project managers manage their teams and tasks. Team members update the status and description of tasks assigned to them and comment. Viewers read everything. Stale task edits are rejected with **HTTP 409** instead of overwriting. All data is stored in local PostgreSQL.

---

## Technology Stack

| Part | Technologies |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7, Axios |
| Backend | Node.js, Express 5 (ES modules), CORS, dotenv, Nodemon |
| Database | Local PostgreSQL 16, Prisma ORM 6.19 |
| Validation | Zod |
| Authentication | jsonwebtoken (JWT in an HttpOnly cookie), bcryptjs (password hashing) |
| Testing | Node's built-in test runner + Supertest |
| Tools | npm, VS Code, PowerShell, Git/GitHub, Postman |

## Prerequisites

- **Node.js 20.19+ or 22.12+** (tested with 22.20.0) and npm (tested with 10.9.3)
- **PostgreSQL 16** running locally. On this machine it listens on **port 5433**; a separate PostgreSQL 18 uses 5432.
- Git

Check your versions:
```powershell
node -v
npm -v
```

## Folder Structure

```
Hackathon-neostats/
├── client/          React + Vite frontend (src/pages, src/services, …)
├── server/          Express API (src/routes, src/controllers, src/middleware, prisma/, tests/)
├── docs/            ARCHITECTURE.md, API.md
├── package.json     Root scripts to run everything
├── CLAUDE.md        Project guide for Claude Code sessions
└── README.md
```

See [CLAUDE.md](CLAUDE.md) for a full folder-by-folder explanation.

---

## Setup

All commands below run in **PowerShell** from the **repository root** (`Hackathon-neostats`) unless noted.

### 1. Install dependencies

```powershell
npm run install:all
```

This installs the root tools, then `client/` and `server/` dependencies.

### 2. Create the environment files

```powershell
Copy-Item client\.env.example client\.env
Copy-Item server\.env.example server\.env
```

(If the files already exist, skip this step; don't overwrite your filled-in values.)

`client/.env` needs no changes. **`server/.env` needs your real values** (next steps).

### 3. Prepare the local PostgreSQL database

Create an empty database named `neostats_project_manager` on **PostgreSQL 16 (port 5433)**. psql asks for your password in the terminal:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -p 5433 -c "CREATE DATABASE neostats_project_manager;"
```

Using pgAdmin instead: open the **PostgreSQL 16** server → right-click **Databases** → **Create → Database…** → name it `neostats_project_manager` → Save.

### 4. Fill in your secrets in `server/.env`

Open `server/.env` in VS Code and edit these two lines. **Never paste these values into chat, issues or commits.**

**a) `DATABASE_URL`**: your PostgreSQL 16 username (usually `postgres`) and password:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/neostats_project_manager?schema=public"
```
If your password contains special characters, URL-encode them: `@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`, `?` → `%3F`, `%` → `%25`.

**b) `JWT_SECRET`**: generate a random value and paste it in:
```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
```
JWT_SECRET=<the long string printed above>
```

The server **refuses to start** if `JWT_SECRET` is missing, still the placeholder, or shorter than 32 characters (there is no fallback secret).

The other values (`PORT=4000`, `NODE_ENV=development`, `CLIENT_ORIGIN=http://localhost:5173`, `JWT_EXPIRES_IN=8h`, `BCRYPT_ROUNDS=12`) can stay as they are. `SEED_DEMO_PASSWORD` is optional (see step 7).

### 5. Create the tables (apply migrations)

```powershell
npm run prisma:migrate:deploy
```

This applies the committed migrations in `server/prisma/migrations/`. It never deletes data and also works on a brand-new empty database.

### 6. Generate the Prisma Client

```powershell
npm run prisma:generate
```

If you get `EPERM: operation not permitted, rename … query_engine-windows.dll.node`, a running backend has the file locked: stop `npm run dev` first, then run the command again.

### 7. Load the demo data

```powershell
npm run db:seed
```

Creates 9 users (every role + one deactivated account), 5 projects, 7 memberships, 5 tasks and 3 comments. Safe to run again: it only adds what is missing and never overwrites existing rows.

Every demo account gets the **development-only demo password `Neostats@123`** (or the value of `SEED_DEMO_PASSWORD` in `server/.env`). Only a bcrypt hash is stored. A password is set only on accounts that **have none yet** (e.g. users created before Phase 3), so existing passwords and roles are never overwritten. The seed refuses to run when `NODE_ENV=production`.

---

## Running the App

| What | Command (from repo root) | URL |
|---|---|---|
| Backend only (auto-restart with nodemon) | `npm run dev:server` | http://localhost:4000 |
| Frontend only | `npm run dev:client` | http://localhost:5173 |
| **Both together** | `npm run dev` | both |

Stop with `Ctrl + C`.

Expected backend output:
```
NEOSTATS API running on http://localhost:4000 (development)
Health check: http://localhost:4000/api/health
```

## Health Checks

```powershell
# Backend is running (does not check the database)
Invoke-RestMethod http://localhost:4000/api/health

# Real database check (SELECT 1 through Prisma)
Invoke-RestMethod http://localhost:4000/api/health/db
```

- `/api/health` → `200` with `"status": "ok"` and `"database": "not_checked"`.
- `/api/health/db` → `200` with `"database": "connected"`, or `503` with `DATABASE_UNREACHABLE` if credentials or the database are wrong.

In Postman: create a `GET` request to `http://localhost:4000/api/health`.

(The setup-phase "Check backend health" page was replaced by the real app in Phase 1.)

Full details: [docs/API.md](docs/API.md).

## Using the App

Open http://localhost:5173 and sign in. (Use `localhost`, not `127.0.0.1`: the session cookie is `SameSite=Strict`, and the frontend and API must be on the same site.)

### Demo accounts (development only)

All demo accounts use the password **`Neostats@123`**. In development the login page's **Account** field is a searchable dropdown of all active accounts (name, email, role), loaded from `GET /api/auth/demo-accounts`. Pick one, type the password, sign in. The yellow box also offers one quick pick per role. In production that endpoint is disabled (404) and the page shows a normal email field. **Never use these accounts or this password outside local development.**

| Role | Name | Email | What to try |
|---|---|---|---|
| Admin | Ada Admin | admin@neostats.local | Create a project, assign a manager to **Customer Portal**, edit, archive, delete, browse **Users**; read all tasks, delete (moderate) comments |
| Project Manager | Priya Sharma | priya.pm@neostats.local | Sees *Website Redesign* and *Mobile App Launch* only; manage the team; **New task**, assign/reassign, edit, delete tasks |
| Project Manager | Marcus Lee | marcus.pm@neostats.local | Manages *Data Warehouse Migration* and the archived *Legacy CRM Sunset* (read-only) |
| Team Member | Aisha Khan | aisha@neostats.local | Dashboard shows *her* open tasks; on her task: change status/description, comment |
| Team Member | Ben Carter / Chloe Martin / Diego Ramos | ben@ / chloe@ / diego@neostats.local | Diego is a *read-only* member of Data Warehouse Migration (can read, not comment) |
| Viewer | Vera Viewer | viewer@neostats.local | Sees all projects, tasks and comments read-only (blue "Read-only access" banner, no action buttons) |
| *(deactivated)* | Ivan Inactive | inactive@neostats.local | Login is refused: "This account has been deactivated" |

Admins manage accounts on **Users**: create (name, email, role, password), edit, reset a password, deactivate / reactivate. Deactivating a user or resetting their password signs them out everywhere immediately. An Admin cannot change their own role or deactivate themselves. A role change is refused (409) while the user still manages projects or belongs to teams, because managers must be Project Managers and team members must be Team Members.

**Try the conflict check:** sign in as Priya in a normal window and open *Design new homepage hero* in edit mode. Sign in as Aisha in a **private/incognito window** (a separate cookie jar) and change that task's status. Back in Priya's window, save: you get *"This task changed since you opened it"* and a **Reload the latest version** button. Nothing is overwritten.

### Authentication in short

- `POST /api/auth/login` checks the bcrypt hash and sets an **HttpOnly, SameSite=Strict** cookie (`Secure` in production) holding a signed JWT (HS256, 8 h). The token is never in the response body or in `localStorage`.
- On every protected request the server verifies the token, then **loads the user from the database**. Deleted or deactivated users, and tokens whose version no longer matches, get **401**. The role used for permissions always comes from the database, never from the token or the client.
- `POST /api/auth/logout` increments the user's `tokenVersion`. This **invalidates all of that user's sessions** (every browser/device), not only the current one. Deactivation and admin password resets do the same.
- Writes from a foreign `Origin` are rejected (403) as CSRF defence in depth; CORS allows credentials only from `CLIENT_ORIGIN`.
- The old "Viewing as" development user switcher (`X-Dev-User-Id`) has been **removed**. The header is ignored.

### Who can do what (enforced by the server)

| Action | Admin | Project Manager | Team Member | Viewer |
|---|---|---|---|---|
| See projects | all | projects they manage | projects they belong to | all, read-only |
| Create / delete projects | ✅ | ❌ | ❌ | ❌ |
| Edit name, description, status | ✅ | own projects | ❌ | ❌ |
| Assign project manager | ✅ | ❌ | ❌ | ❌ |
| Add / remove members, change member role | ✅ | own projects | ❌ | ❌ |
| Create / edit / deactivate users, reset passwords | ✅ | ❌ | ❌ | ❌ |

| See tasks and comments | all | own projects | own projects | all, read-only |
| Create / delete / assign tasks | ❌ | own projects | ❌ | ❌ |
| Edit tasks | ❌ | all fields, own projects | status + description of tasks **assigned to them** | ❌ |
| Add comments | ❌ | own projects | projects they work on | ❌ |
| Delete comments | any (moderation) | own projects | their own | ❌ |

Only users with the global **Project Manager** role can be assigned as managers. Only **Team Members** can be added to teams. Removing a member deletes the membership, not the user. Deleting a project also deletes its memberships. An archived project's team, tasks and comments are frozen until the project is un-archived. Tasks can only be assigned to active Team Members who work on that project (not read-only members); removing a member unassigns their tasks.

API reference: [docs/API.md](docs/API.md).

## Tests

```powershell
npm test               # backend: 147 API + database tests (auth, authorization matrix, 409 conflicts)
npm run test:client    # frontend: 27 unit tests (form validation, task payloads, role navigation, login/user forms)
npm run test:all       # both
npm run lint:client    # linter
npm run build:client   # production build
```

The backend tests need PostgreSQL running, but they **never touch your development data**. Each run uses a fresh random `JWT_SECRET`, and every request goes through the real cookie authentication. They use a separate database, `neostats_project_manager_test`, on the same server. `npm test` creates it automatically if it is missing and applies the migrations to it. The tests empty that database between runs, and the helper refuses to run against any database whose name does not end in `_test`. To use a different test database, set `TEST_DATABASE_URL` in `server/.env`.

## Prisma and Migrations

| Task | Command (repo root) |
|---|---|
| Apply committed migrations (safe, no data loss) | `npm run prisma:migrate:deploy` |
| Seed demo data (idempotent) | `npm run db:seed` |
| Validate schema | `npm run prisma:validate` |
| Format schema | `npm run prisma:format` |
| Generate client | `npm run prisma:generate` |
| Check migration status (read-only) | `npm run prisma:migrate:status` |
| Create + apply a migration (development) | `npm run prisma:migrate:dev -- --name <short_name>` |
| Browse data | `npm run prisma:studio` |

The schema (`server/prisma/schema.prisma`) defines `User`, `Project`, `ProjectMember`, `Task` and `Comment`. Migrations: `20261023080509_init_users_projects_members`, `20261023090030_add_tasks_comments` (additive: two new tables and enums), `20261023101615_add_auth_fields` (additive: nullable `users.passwordHash`, `users.tokenVersion` default 0).

To change the schema later:

1. Edit `server/prisma/schema.prisma`.
2. Confirm the DB is reachable: `/api/health/db` returns `connected`.
3. Run `npm run prisma:migrate:dev -- --name <short_name>` (creates a new folder in `server/prisma/migrations/` and applies it).
4. Commit the schema **and** the migrations folder together.

⚠️ `prisma migrate reset` and `prisma db push` can delete data. Do not run them without a deliberate decision.

---

## Troubleshooting

| Problem | Likely cause / fix |
|---|---|
| `/api/health/db` returns 503 | Wrong password, wrong port, or database not created. Check `DATABASE_URL` uses **5433** and the DB exists. |
| Prisma error `P1000` (authentication failed) | Wrong username/password in `DATABASE_URL`, or special characters not URL-encoded. |
| Prisma error `P1001` (can't reach server) | PostgreSQL 16 service stopped. Run `Get-Service postgresql-x64-16` and start it from Services if needed. |
| Prisma error `P1003` (database does not exist) | Run step 3 to create `neostats_project_manager`. |
| Connected to the wrong server | Port **5432 is PostgreSQL 18**. Use **5433** for this project. |
| `Port 4000 is already in use` | Another server is running. Stop it or change `PORT` in `server/.env` (and `VITE_API_BASE_URL` in `client/.env`). |
| Vite: `Port 5173 is in use` | `strictPort` is on. Stop the other Vite process (the backend's CORS expects 5173). |
| Browser CORS error | `CLIENT_ORIGIN` in `server/.env` must exactly match the frontend URL (`http://localhost:5173`). |
| Frontend calls `undefined/health` | `client/.env` missing. Copy it from `.env.example` and restart Vite. |
| Login says "Invalid email or password" for a demo account | Run `npm run db:seed` (it adds missing passwords). If you set `SEED_DEMO_PASSWORD`, use that value. |
| Signed in, but every page sends you back to login | Open the app at `http://localhost:5173` (not `127.0.0.1`) so the cookie is sent; check `CLIENT_ORIGIN`. |
| Backend exits with `JWT_SECRET is missing or too short` | Set a long random `JWT_SECRET` in `server/.env` (step 4). |
| App says "Cannot reach the API server" | Start the backend (`npm run dev` or `npm run dev:server`). |
| `npm test` fails with "Could not prepare neostats_project_manager_test" | PostgreSQL 16 is not running, or the `DATABASE_URL` user is not allowed to create databases. |
| `prisma generate` fails with `EPERM … rename` | Stop the running backend (it locks the engine file), then retry. |
| Changed `.env` but nothing happened | Restart the dev server (Vite only reads `.env` at startup). |
| `npm audit` reports high severity issues | They come from dev-only tools (nodemon → chokidar/braces, Prisma CLI → deepmerge-ts), not the running API. `npm audit fix --force` would downgrade nodemon / upgrade Prisma to 7, so don't run it. |

---

## Implementation Status

| Item | Status |
|---|---|
| Setup: install, build, dev servers, health checks, CORS, `.env` handling | ✅ Verified |
| Database `neostats_project_manager` exists, `/api/health/db` returns `connected` | ✅ Verified |
| Models User / Project / ProjectMember + first migration | ✅ Verified |
| Seed data for all four roles (idempotent) | ✅ Verified |
| Projects API: list (filters + pagination), view, create, update, archive, delete | ✅ Verified (tests + manual) |
| Project manager assignment (Project Manager role only) | ✅ Verified |
| Team API: list, add, change project role, remove; duplicates rejected | ✅ Verified |
| Server-side permission checks per role | ✅ Verified (tests) |
| React UI: dashboard, projects, create/edit, details, team management | ✅ Builds and lints. Not yet clicked through in a browser: please check manually |
| Tasks: create, list (filters + pagination), view, edit, assign, status, delete | ✅ Verified (tests + manual API checks) |
| Comments: list, add, delete with role rules | ✅ Verified (tests) |
| Concurrent-edit detection (`version`, HTTP 409) incl. simultaneous requests | ✅ Verified (tests + manual API check) |
| Task UI: project task list, create, details/edit, status change, comments, conflict prompt, dashboard tasks | ✅ Builds and lints. Not yet clicked through in a browser: please check manually |
| Login, logout, session restore (`/api/auth/me`), HttpOnly cookie JWT, bcrypt passwords | ✅ Verified (tests + manual curl against the dev API) |
| Session invalidation (logout, deactivation, password reset) | ✅ Verified (tests + manual) |
| Admin user management: create, edit, reset password, deactivate/reactivate | ✅ API verified (tests); UI builds and lints, not clicked through in a browser |
| Login page, protected routes, sign-out, profile page, read-only banner for Viewers | ✅ Builds and lints. Not yet clicked through in a browser: please check manually |
| Backend tests (147) and frontend unit tests (27) | ✅ Passing |

**Known limitations:** no login rate limiting / lockout; logout signs the user out of all sessions (by design of the token-version approach); users cannot change their own password (an Admin resets it); no "forgot password" flow.

Architecture details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
