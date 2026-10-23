# Architecture

> Status: **setup phase.** Sections marked **(planned)** describe intended designs that have **not** been implemented.

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
- Hold UI state (later, the logged-in user in a React context).
- **Does not** hold secrets, talk to the database, or make final security decisions.

Implemented now: a placeholder `HomePage` with a "Check backend health" button, and a `NotFoundPage`.

## 2. Backend responsibilities (`server/`)

- Expose a JSON REST API under `/api`.
- Validate input, authenticate users, enforce authorization, apply business rules.
- Be the only component that talks to PostgreSQL (through Prisma).
- Return consistent JSON success and error shapes.

Implemented now: app setup (`src/app.js`), startup (`src/server.js`), CORS, JSON body parsing, `/api/health`, `/api/health/db`, 404 handler, central error handler.

## 3. Database responsibilities

- Durable storage for users, projects, memberships, tasks and comments **(planned models)**.
- Enforce integrity: primary/foreign keys, unique constraints, cascade rules **(planned)**.
- Local PostgreSQL 16 on port 5433, database `neostats_project_manager`.

Implemented now: datasource and generator in `prisma/schema.prisma` only. No models, no migrations.

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

## 8. Layer separation (convention; only health uses it so far)

| Layer | Folder | Responsibility |
|---|---|---|
| Routes | `src/routes/` | Map method + path to middleware and a controller. No logic. |
| Middleware | `src/middleware/` | Cross-cutting concerns: auth, role checks, validation, 404, errors. |
| Validators | `src/validators/` | Zod schemas for body / params / query **(planned)**. |
| Controllers | `src/controllers/` | Read the request, call a service, send the response. No Prisma. |
| Services | `src/services/` | Business rules and Prisma queries. No `req`/`res`. **(planned)** |
| Utils | `src/utils/` | Small shared helpers (`ApiError`). |

## 9. Authentication and authorization (planned)

- **Passwords:** hashed with `bcryptjs` before storage; never returned by the API.
- **Login:** verify the hash, then sign a JWT (`jsonwebtoken`) with `{ sub: userId, role }`, using `JWT_SECRET` and `JWT_EXPIRES_IN`.
- **Transport:** client sends `Authorization: Bearer <token>`; an Axios interceptor in `services/api.js` will add it.
- **`authenticate` middleware:** verifies the token and loads the user into `req.user`; returns 401 on failure.
- **`authorize(...roles)` middleware:** checks the global role (Admin, Project Manager, Team Member, Viewer); returns 403 on failure.
- **Project-level checks** in services: e.g. only members can see a project's tasks, Viewers are read-only.
- Frontend role checks only hide buttons; **the backend is the security boundary.**

## 10. Concurrent task updates (planned)

Optimistic concurrency control:

1. The `Task` model gets an integer `version` column (default 1).
2. Clients receive `version` with each task and must send it back on update.
3. The service updates atomically, only if the version still matches:
   ```js
   const result = await prisma.task.updateMany({
     where: { id, version: clientVersion },
     data: { ...changes, version: { increment: 1 } },
   })
   if (result.count === 0) throw new ApiError(409, 'Task was modified by someone else', 'CONFLICT')
   ```
4. On **409 Conflict** the client reloads the latest task and asks the user to re-apply their change.

This avoids long-held locks and works with the stateless JWT API.
