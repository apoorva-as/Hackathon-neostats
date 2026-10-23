# API Reference

Base URL (local development): `http://localhost:4000/api`

All responses are JSON:

- Success: `{ "success": true, "data": { ... } }`. List endpoints also return `"meta": { "page", "limit", "total", "totalPages" }`.
- Error: `{ "success": false, "error": { "code": "UPPER_SNAKE_CASE", "message": "...", "details": [ ... ] } }` (`details` only for validation errors)

Stack traces and SQL errors are never sent to the client; they are logged on the server only.

---

## Current user (TEMPORARY, Phase 1 only)

There is no login yet. Every `/projects` and `/users` request must send the id of a seeded user:

```
X-Dev-User-Id: 1
```

The server loads that user **from the database** and uses its real role for all permission checks. The client never sends a role. **This is a development demo mechanism, not authentication.** It is disabled when `NODE_ENV=production`. Phase 3 replaces it with `Authorization: Bearer <JWT>`.

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Header missing, not a positive integer, or user does not exist |
| 403 | `USER_INACTIVE` | The user is deactivated |

Permission failures on individual routes return **403 `FORBIDDEN`**.

---

## Projects

A project object:

```json
{
  "id": 1,
  "name": "Website Redesign",
  "description": "Refresh the public marketing site…",
  "status": "ACTIVE",
  "archivedAt": null,
  "createdAt": "2026-10-23T08:10:00.000Z",
  "updatedAt": "2026-10-23T08:10:00.000Z",
  "managerId": 2,
  "manager": { "id": 2, "name": "Priya Sharma", "email": "priya.pm@neostats.local" },
  "memberCount": 2
}
```

`status` is one of `ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED`. Setting `ARCHIVED` sets `archivedAt`; any other status clears it.

### GET `/api/projects`

Lists the projects the current user may see: **Admin and Viewer** see all, a **Project Manager** sees the projects they manage, a **Team Member** sees the projects they belong to.

| Query | Type | Default | Notes |
|---|---|---|---|
| `page` | int ≥ 1 | 1 | |
| `limit` | int 1–100 | 20 | |
| `status` | enum | | Filter by status |
| `search` | string ≤ 100 | | Case-insensitive match on name or description |
| `managerId` | int | | Filter by manager |

Sorted by most recently updated. **200** `{ data: Project[], meta }`. **400** for invalid query values.

### GET `/api/projects/:id`

**200** project plus `permissions` for the current user (computed by the server policy, for UI hints):

```json
{ "...": "...", "permissions": { "canEdit": true, "canDelete": false, "canAssignManager": false, "canManageMembers": true } }
```

**400** non-numeric id · **403** not visible to this user · **404** `PROJECT_NOT_FOUND`.

### POST `/api/projects` (Admin)

```json
{ "name": "Customer Portal", "description": "optional", "status": "ACTIVE", "managerId": 3 }
```

- `name` required, trimmed, 1–120 chars. `description` ≤ 2000 chars (default `""`). `status` default `ACTIVE`. `managerId` optional (`null` = no manager).
- Unknown fields are rejected.
- The manager must be an existing, active user whose role is `PROJECT_MANAGER`.

**201** created project · **400** `VALIDATION_ERROR` / `INVALID_MANAGER` · **403** not an Admin.

### PATCH `/api/projects/:id`

Any subset of `name`, `description`, `status`, `managerId` (at least one field). `managerId: null` unassigns the manager.

- **Admin:** any project, any field.
- **Project Manager:** projects they manage; `name`, `description`, `status` only. Changing `managerId` → 403.

**200** updated project · **400** · **403** · **404**.

### DELETE `/api/projects/:id` (Admin)

Deletes the project. Its memberships are removed by the `ON DELETE CASCADE` foreign key in the same statement. User accounts are never touched. To keep history instead, archive the project with `PATCH { "status": "ARCHIVED" }`.

**200** `{ "id": 6 }` · **403** · **404**.

---

## Project members

A membership object:

```json
{
  "id": 8,
  "role": "MEMBER",
  "createdAt": "2026-10-23T08:17:41.045Z",
  "user": { "id": 7, "name": "Diego Ramos", "email": "diego@neostats.local", "role": "TEAM_MEMBER", "isActive": true }
}
```

`role` is the **project-level** role: `MEMBER` (works on the project) or `VIEWER` (read-only in this project). It is separate from the user's global `role`. The project manager is not a membership; it is `project.manager`.

### GET `/api/projects/:id/members`

Anyone who can see the project. **200** `Membership[]` (oldest first) · **403** · **404**.

### POST `/api/projects/:id/members` (Admin, or the project's manager)

```json
{ "userId": 7, "role": "MEMBER" }
```

`role` defaults to `MEMBER`. The user must exist, be active, and have the global role `TEAM_MEMBER`.

**201** membership · **400** `VALIDATION_ERROR` / `INVALID_MEMBER` · **403** · **404** project · **409** `ALREADY_MEMBER` (guaranteed by a unique `(projectId, userId)` constraint) · **409** `PROJECT_ARCHIVED`.

### PATCH `/api/projects/:id/members/:userId` (Admin, or the project's manager)

```json
{ "role": "VIEWER" }
```

**200** membership · **400** · **403** · **404** `MEMBER_NOT_FOUND` · **409** `PROJECT_ARCHIVED`.

### DELETE `/api/projects/:id/members/:userId` (Admin, or the project's manager)

Removes the membership only; the user account stays.

**200** `{ "projectId": 6, "userId": 7 }` · **403** · **404** `MEMBER_NOT_FOUND` · **409** `PROJECT_ARCHIVED`.

---

## Users

### GET `/api/users` (Admin, Project Manager)

Directory used to pick project managers and team members. Returns only `id`, `name`, `email`, `role`, `isActive`.

| Query | Type | Default |
|---|---|---|
| `role` | `ADMIN` \| `PROJECT_MANAGER` \| `TEAM_MEMBER` \| `VIEWER` | |
| `isActive` | `true` \| `false` | |
| `search` | string (name or email) | |
| `page`, `limit` | int | 1, 20 (max 100) |

**200** `{ data: User[], meta }` · **400** · **403** Team Member / Viewer.

### GET `/api/dev/users` (TEMPORARY)

Active users for the development user switcher. Needs no header. Returns **404** when `NODE_ENV=production`. Removed in Phase 3.

---

## Health

### GET `/api/health`

Reports that the **API process** is running. It does **not** check PostgreSQL (`database` is always `"not_checked"`).

**200 OK**
```json
{
  "success": true,
  "data": { "status": "ok", "service": "neostats-api", "database": "not_checked", "timestamp": "2026-10-23T07:02:52.353Z" }
}
```

### GET `/api/health/db`

Runs a real `SELECT 1` query through Prisma against the database configured in `DATABASE_URL`.

**200 OK**: `{ "success": true, "data": { "database": "connected", "timestamp": "…" } }`

**503 Service Unavailable**: `{ "success": false, "error": { "code": "DATABASE_UNREACHABLE", "message": "Could not connect to the database. Check DATABASE_URL in server/.env." } }`

---

## Common error responses (all routes)

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_JSON` | Request body is not valid JSON |
| 400 | `VALIDATION_ERROR` | Params / query / body failed validation. `details: [{ location, path, message }]` |
| 400 | `INVALID_REFERENCE` | A referenced record does not exist (database foreign key) |
| 401 | `UNAUTHENTICATED` | No current user (see above) |
| 403 | `FORBIDDEN` | The current user's role / project relationship does not allow this |
| 404 | `NOT_FOUND` | No route matches, or a record is missing |
| 409 | `CONFLICT` | A unique constraint was violated |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error (generic message; details only in the server log) |

---

## Planned endpoints (NOT implemented)

| Area | Planned routes |
|---|---|
| Auth (Phase 3) | `POST /api/auth/login`, `GET /api/auth/me` |
| Users (Phase 3) | `POST /api/users`, `PATCH /api/users/:id` (incl. deactivate) |
| Tasks (Phase 2) | `GET /api/projects/:id/tasks`, `POST /api/projects/:id/tasks`, `GET /api/tasks/:id`, `PATCH /api/tasks/:id` (requires `version`, 409 on conflict), `DELETE /api/tasks/:id` |
| Comments (Phase 2) | `GET /api/tasks/:id/comments`, `POST /api/tasks/:id/comments`, `DELETE /api/comments/:id` |
