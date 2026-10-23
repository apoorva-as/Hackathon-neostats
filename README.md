# NEOSTATS Project Management Platform

A Collaborative Project Management Platform for the **NEOSTATS Full Stack Engineering Hackathon**.

> **Current status: setup phase only.** This repository contains the project foundation: a React frontend, an Express backend, Prisma configuration and documentation. **No application features (login, projects, tasks, comments, …) exist yet.**

---

## Technology Stack

| Part | Technologies |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7, Axios |
| Backend | Node.js, Express 5 (ES modules), CORS, dotenv, Nodemon |
| Database | Local PostgreSQL 16, Prisma ORM 6.19 |
| Prepared for later | jsonwebtoken (JWT), bcryptjs (password hashing), Zod (validation) |
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

### 5. Generate the Prisma Client

```powershell
npm run prisma:generate
```

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

In the browser: open http://localhost:5173 and click **Check backend health**.

Full details: [docs/API.md](docs/API.md).

## Tests

```powershell
npm test
```

Runs the backend tests in `server/tests/` (health endpoint, 404 handler, invalid JSON, CORS). These do not need the database.

## Prisma and Migrations

| Task | Command (repo root) |
|---|---|
| Validate schema | `npm run prisma:validate` |
| Format schema | `npm run prisma:format` |
| Generate client | `npm run prisma:generate` |
| Check migration status (read-only) | `npm run prisma:migrate:status` |
| Create + apply a migration (development) | `npm run prisma:migrate:dev -- --name <short_name>` |
| Browse data | `npm run prisma:studio` |

The schema (`server/prisma/schema.prisma`) has **no models yet**, so no migration has been created. When models are added:

1. Edit `server/prisma/schema.prisma`.
2. Confirm the DB is reachable: `/api/health/db` returns `connected`.
3. Run `npm run prisma:migrate:dev -- --name init` (creates `server/prisma/migrations/…` and applies it).
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
| Changed `.env` but nothing happened | Restart the dev server (Vite only reads `.env` at startup). |
| `npm audit` reports high severity issues | They come from dev-only tools (nodemon → chokidar/braces, Prisma CLI → deepmerge-ts), not the running API. `npm audit fix --force` would downgrade nodemon / upgrade Prisma to 7, so don't run it. |

---

## Implementation Status

| Item | Status |
|---|---|
| Dependencies install (root, client, server) | ✅ Verified |
| Frontend production build | ✅ Verified |
| Frontend dev server serves the placeholder page (HTTP 200) | ✅ Verified |
| Backend starts and logs its port | ✅ Verified |
| `GET /api/health` returns 200 | ✅ Verified |
| 404 JSON for unknown routes | ✅ Verified |
| CORS allows `http://localhost:5173` | ✅ Verified |
| Backend tests (4) | ✅ Verified |
| `npm run dev` runs both apps | ✅ Verified |
| Prisma schema valid, client generated | ✅ Verified |
| `.env` files ignored by Git | ✅ Verified |
| Database `neostats_project_manager` exists | ⏳ Manual step (README step 3) |
| `GET /api/health/db` returns `connected` | ⏳ Unverified (needs your credentials) |
| "Check backend health" button clicked in a real browser | ⏳ Unverified |
| Authentication, users, projects, membership, tasks, comments, conflict detection, seed data | ❌ Not implemented (future phases) |

Architecture details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
