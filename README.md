# NEOSTATS Project Management Platform

A Collaborative Project Management Platform for the **NEOSTATS Full Stack Engineering Hackathon**.

> **Current status: Phase 1 complete (Admin, projects & team management).** Admins create, edit, delete and archive projects and assign project managers. Project managers manage their teams. Team members and viewers browse their projects. All data is stored in local PostgreSQL.
>
> **Not built yet:** login and passwords (Phase 3), tasks and comments (Phase 2). Until login exists, a **temporary "Viewing as" user switcher** in the header lets you demo each role. **It is not authentication** (see [Development user switcher](#development-user-switcher-temporary)).

---

## Technology Stack

| Part | Technologies |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7, Axios |
| Backend | Node.js, Express 5 (ES modules), CORS, dotenv, Nodemon |
| Database | Local PostgreSQL 16, Prisma ORM 6.19 |
| Validation | Zod |
| Prepared for later | jsonwebtoken (JWT), bcryptjs (password hashing) |
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

The other values (`PORT=4000`, `NODE_ENV=development`, `CLIENT_ORIGIN=http://localhost:5173`, `JWT_EXPIRES_IN=1d`) can stay as they are.

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

Creates 8 users (every role), 5 projects and 7 memberships. Safe to run again: it only adds what is missing and never overwrites existing rows.

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

Open http://localhost:5173. You land on the dashboard as **Ada Admin**.

### Development user switcher (temporary)

Use the **Viewing as** dropdown in the top-right corner to switch between the seeded users. The app sends the chosen user's id to the API in an `X-Dev-User-Id` header. The server looks the user up in the database and applies **that user's real role** to every permission check.

⚠️ This is a **development-only demo tool, not a login**. Anyone could pick any user, and it is switched off when `NODE_ENV=production`. Phase 3 replaces it with real authentication (passwords + JWT).

| Role | Name | Email (no password yet) | What to try |
|---|---|---|---|
| Admin | Ada Admin | admin@neostats.local | Create a project, assign a manager to **Customer Portal**, edit, archive, delete, browse **Users** |
| Project Manager | Priya Sharma | priya.pm@neostats.local | Sees *Website Redesign* and *Mobile App Launch* only; add/remove team members, change a member's project role |
| Project Manager | Marcus Lee | marcus.pm@neostats.local | Manages *Data Warehouse Migration* and the archived *Legacy CRM Sunset* |
| Team Member | Aisha Khan | aisha@neostats.local | Sees only her projects and teammates (read-only) |
| Team Member | Ben Carter / Chloe Martin / Diego Ramos | ben@ / chloe@ / diego@neostats.local | Diego is a *read-only* member of Data Warehouse Migration |
| Viewer | Vera Viewer | viewer@neostats.local | Sees all projects read-only, with no action buttons |

### Who can do what (enforced by the server)

| Action | Admin | Project Manager | Team Member | Viewer |
|---|---|---|---|---|
| See projects | all | projects they manage | projects they belong to | all, read-only |
| Create / delete projects | ✅ | ❌ | ❌ | ❌ |
| Edit name, description, status | ✅ | own projects | ❌ | ❌ |
| Assign project manager | ✅ | ❌ | ❌ | ❌ |
| Add / remove members, change member role | ✅ | own projects | ❌ | ❌ |

Only users with the global **Project Manager** role can be assigned as managers. Only **Team Members** can be added to teams. Removing a member deletes the membership, not the user. Deleting a project also deletes its memberships. An archived project's team is frozen until the project is un-archived.

API reference: [docs/API.md](docs/API.md).

## Tests

```powershell
npm test               # backend: 63 API + database tests
npm run test:client    # frontend: 11 unit tests (form validation, role navigation)
npm run test:all       # both
npm run lint:client    # linter
npm run build:client   # production build
```

The backend tests need PostgreSQL running, but they **never touch your development data**. They use a separate database, `neostats_project_manager_test`, on the same server. `npm test` creates it automatically if it is missing and applies the migrations to it. The tests empty that database between runs, and the helper refuses to run against any database whose name does not end in `_test`. To use a different test database, set `TEST_DATABASE_URL` in `server/.env`.

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

The schema (`server/prisma/schema.prisma`) defines `User`, `Project` and `ProjectMember`. Current migration: `20261023080509_init_users_projects_members`.

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
| App says "No users in the database" | Run `npm run db:seed`. |
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
| React UI: dashboard, projects, create/edit, details, team management, users list, user switcher | ✅ Builds and lints. Not yet clicked through in a browser: please check manually |
| Backend tests (63) and frontend unit tests (11) | ✅ Passing |
| Login, passwords, JWT (Phase 3) | ❌ Not implemented. A temporary user switcher is used instead |
| User create / edit / deactivate (Phase 3) | ❌ Not implemented (read-only list only) |
| Tasks, comments, concurrent-update conflicts (Phase 2) | ❌ Not implemented |

Architecture details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
