# CLAUDE.md — NEOSTATS Project Management Platform

Persistent guide for Claude Code sessions working in this repository. **Read this whole file before making changes.**

---

## A. Project Overview

- **Project:** NEOSTATS Project Management Platform (repo: `Hackathon-neostats`, remote `origin` = `https://github.com/apoorva-as/Hackathon-neostats.git`, branch `main`).
- **Objective:** Build a Collaborative Project Management Platform for the NEOSTATS Full Stack Engineering Hackathon. It covers four roles (Admin, Project Manager, Team Member, Viewer), authentication, authorization, projects, membership, tasks, comments, and detection of concurrent task updates.
- **Current phase: SETUP ONLY.** The repository contains scaffolding, configuration, a placeholder React page, health-check endpoints and documentation.
- **No application features have been implemented yet:** no auth, no users, no projects, no tasks, no comments, no domain database models.

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
| Auth (prepared, unused) | jsonwebtoken / bcryptjs | 9.0.3 / 3.0.3 |
| Validation (prepared, unused) | zod | 4.6.7 |
| Tests | Node built-in test runner (`node --test`) + supertest | Node 22 / 7.3.1 |
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
│   │   ├── components/     Reusable UI components (empty: .gitkeep)
│   │   ├── layouts/        Page layouts / shells (empty)
│   │   ├── pages/          Route-level pages (HomePage, NotFoundPage placeholders)
│   │   ├── services/       HTTP clients (api.js = Axios instance + getHealth)
│   │   ├── hooks/          Custom React hooks (empty)
│   │   ├── context/        React context providers (empty)
│   │   ├── utils/          Pure helpers (empty)
│   │   ├── App.jsx         Route table
│   │   ├── main.jsx        Entry: BrowserRouter + App
│   │   └── index.css       Tailwind import
│   ├── .env.example        VITE_API_BASE_URL template
│   ├── .oxlintrc.json      Linter config (from Vite template)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js      React + Tailwind plugins, port 5173 (strictPort)
├── server/                 Express API
│   ├── prisma/schema.prisma   Datasource + generator only (no models yet)
│   ├── src/
│   │   ├── config/         env.js (only reader of process.env), prisma.js (PrismaClient singleton)
│   │   ├── controllers/    Request/response handling (health.controller.js)
│   │   ├── middleware/     notFound.js, errorHandler.js
│   │   ├── routes/         index.js mounts routers under /api; health.routes.js
│   │   ├── services/       Business logic + Prisma queries (empty)
│   │   ├── validators/     Zod schemas (empty)
│   │   ├── utils/          ApiError.js
│   │   ├── app.js          Builds the Express app (no listen; imported by tests)
│   │   └── server.js       Starts the HTTP server
│   ├── tests/health.test.js
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
| Run backend tests | `npm test` |
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
| `JWT_SECRET` | `server/.env` | server (future auth) | **Yes** | Long random string; not used yet |
| `JWT_EXPIRES_IN` | `server/.env` | server (future auth) | No | e.g. `1d`; not used yet |

Templates: `client/.env.example`, `server/.env.example`. Real `.env` files are git-ignored. **Never ask the user to paste passwords or secrets into chat.** They edit `server/.env` locally.

---

## G. Coding Conventions

- **ES modules everywhere** (`import`/`export`). Include the `.js` extension in relative server imports.
- **File naming:** React components and pages `PascalCase.jsx`; hooks `useThing.js`; server files `feature.layer.js` (e.g. `task.routes.js`, `task.controller.js`, `task.service.js`, `task.validator.js`); classes `PascalCase.js`.
- **Layering (server):** route (path + middleware) → controller (read `req`, call service, send response) → service (business rules + Prisma). Controllers must not contain Prisma queries; services must not touch `req`/`res`.
- **Validation:** Zod schemas in `src/validators/`, applied by a validation middleware before the controller (planned). Validate body, params and query.
- **Error handling:** throw `ApiError(status, message, code)` for expected errors. Express 5 forwards rejected promises, so no try/catch boilerplate is needed just to call `next(err)`. The central `errorHandler` formats every error.
- **Async:** use `async/await`, not `.then` chains.
- **Environment:** read config only through `import { env } from './config/env.js'`. Never use `process.env` elsewhere.
- **Prisma:** import the singleton `prisma` from `src/config/prisma.js`. Never `new PrismaClient()` elsewhere.
- **API responses:**
  - Success: `{ "success": true, "data": ... }`
  - Error: `{ "success": false, "error": { "code": "UPPER_SNAKE", "message": "..." } }`
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

---

## J. Hackathon Requirements (ALL PLANNED, none implemented)

- [ ] Four roles: Admin, Project Manager, Team Member, Viewer
- [ ] Authentication (register/login, JWT) and role-based authorization
- [ ] User management (Admin)
- [ ] Project management (create/update/archive)
- [ ] Project membership (add/remove members, project-level roles)
- [ ] Task management (CRUD, status, assignee, priority, due date)
- [ ] Comments on tasks
- [ ] Concurrent-update conflict detection for tasks (optimistic locking with a `version` column → HTTP 409)
- [ ] Seed data
- [ ] Documentation and clean Git workflow

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
- [ ] **Database `neostats_project_manager` created**: NOT yet. Verified 2026-10-23 that it does not exist ("Database `neostats_project_manager` does not exist"). Manual step for the user (README step 3).
- [ ] **`GET /api/health/db` returns `connected`**: currently 503 `DATABASE_UNREACHABLE` because the database does not exist
- [ ] Clicking "Check backend health" in the browser: not tested in a real browser (server-side checks only)
- [ ] First commit / push: waiting for user permission
- [ ] Domain Prisma models + first migration (next phase)
- [ ] All features in section J

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
