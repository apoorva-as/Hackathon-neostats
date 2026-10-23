# API Reference

Base URL (local development): `http://localhost:4000/api`

All responses are JSON:

- Success: `{ "success": true, "data": { ... } }`
- Error: `{ "success": false, "error": { "code": "UPPER_SNAKE_CASE", "message": "..." } }`

---

## Implemented endpoints

### GET `/api/health`

Reports that the **API process** is running. It does **not** check PostgreSQL (`database` is always `"not_checked"`).

```
GET http://localhost:4000/api/health
```

**200 OK**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "neostats-api",
    "database": "not_checked",
    "timestamp": "2026-10-23T07:02:52.353Z"
  }
}
```

| Status | Meaning |
|---|---|
| 200 | API is running |

---

### GET `/api/health/db`

Runs a real `SELECT 1` query through Prisma against the database configured in `DATABASE_URL`.

```
GET http://localhost:4000/api/health/db
```

**200 OK** (database reachable)
```json
{
  "success": true,
  "data": { "database": "connected", "timestamp": "2026-10-23T07:05:00.000Z" }
}
```

**503 Service Unavailable** (database unreachable, wrong credentials, or database missing)
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_UNREACHABLE",
    "message": "Could not connect to the database. Check DATABASE_URL in server/.env."
  }
}
```

| Status | Meaning |
|---|---|
| 200 | PostgreSQL answered `SELECT 1` |
| 503 | Prisma could not connect or run the query |

---

### Common error responses (all routes)

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_JSON` | Request body is not valid JSON |
| 404 | `NOT_FOUND` | No route matches, e.g. `{"success":false,"error":{"code":"NOT_FOUND","message":"Route not found: GET /api/unknown"}}` |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error (stack trace included only when `NODE_ENV` is not `production`) |

---

## Planned endpoints (NOT implemented)

The routes below are a design sketch for later phases. **None of them exist yet**, and names may change.

| Area | Planned routes |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Users (Admin) | `GET /api/users`, `PATCH /api/users/:id`, `DELETE /api/users/:id` |
| Projects | `GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`, `PATCH /api/projects/:id`, `DELETE /api/projects/:id` |
| Membership | `GET /api/projects/:id/members`, `POST /api/projects/:id/members`, `PATCH /api/projects/:id/members/:userId`, `DELETE /api/projects/:id/members/:userId` |
| Tasks | `GET /api/projects/:id/tasks`, `POST /api/projects/:id/tasks`, `GET /api/tasks/:id`, `PATCH /api/tasks/:id` (requires `version`, 409 on conflict), `DELETE /api/tasks/:id` |
| Comments | `GET /api/tasks/:id/comments`, `POST /api/tasks/:id/comments`, `DELETE /api/comments/:id` |
