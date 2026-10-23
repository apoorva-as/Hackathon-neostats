# API Reference

Base URL (local development): `http://localhost:4000/api`

All responses are JSON:

- Success: `{ "success": true, "data": { ... } }`. List endpoints also return `"meta": { "page", "limit", "total", "totalPages" }`.
- Error: `{ "success": false, "error": { "code": "UPPER_SNAKE_CASE", "message": "...", "details": [ ... ] } }` (`details` only for validation errors)

Stack traces and SQL errors are never sent to the client; they are logged on the server only.

---

## Authentication

Every route except `/api/health*`, `POST /api/auth/login` and `POST /api/auth/logout` needs a signed-in user.

- **Mechanism:** `POST /api/auth/login` sets the cookie `neostats_session` (**HttpOnly**, **SameSite=Strict**, `Path=/`, `Secure` when `NODE_ENV=production`, lifetime = `JWT_EXPIRES_IN`, default 8h). It holds a JWT (HS256) with only `{ sub: userId, ver: tokenVersion }`. Browsers send it automatically (Axios uses `withCredentials: true`). The token is never returned in a response body, and `Authorization: Bearer` headers are **not** accepted (cookie-only, one consistent mechanism).
- **Per request** (`requireAuth`): verify signature + expiry → load the user from PostgreSQL → reject if missing, deactivated, or `tokenVersion` differs → `req.actor = { id, name, email, role, isActive, createdAt }`. Roles always come from the database; ids/roles sent by the client (body, query, headers such as the removed `X-Dev-User-Id`) are ignored.
- **Invalidation:** logout, deactivation and admin password resets increment `users.tokenVersion`, so **all** earlier tokens of that user stop working immediately (all sessions, not only the current one).
- **CSRF:** SameSite=Strict cookie + CORS limited to `CLIENT_ORIGIN` with credentials + any non-GET request carrying a foreign `Origin` header is refused with **403 `FORBIDDEN_ORIGIN`**.

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No cookie; invalid, tampered or expired token; user deleted or deactivated; token invalidated by logout/password reset |
| 403 | `FORBIDDEN` | Signed in, but the role / project relationship does not allow the action |
| 403 | `FORBIDDEN_ORIGIN` | State-changing request from a foreign browser origin |

### POST `/api/auth/login`

Body: `{ "email": "admin@neostats.local", "password": "…" }` (strict; email trimmed + lowercased).

**200** `{ data: { id, name, email, role, isActive, createdAt } }` + `Set-Cookie: neostats_session=…; HttpOnly; SameSite=Strict`
· **400** `VALIDATION_ERROR` (missing/malformed fields, unknown fields)
· **401** `INVALID_CREDENTIALS` "Invalid email or password." (same answer for unknown email, wrong password, or an account without a password; bcrypt runs in every case so timing does not reveal accounts)
· **403** `ACCOUNT_DEACTIVATED` (only after a correct password; no cookie is set).

### GET `/api/auth/me`

**200** `{ data: { id, name, email, role, isActive, createdAt } }` read from the database. **401** without a valid session.

### GET `/api/auth/demo-accounts` (development only)

Public list for the login page's account picker: `{ data: [{ id, name, email, role }] }` for **active** users that **have a password**, ordered by role then name. No password data. Returns **404** when `NODE_ENV=production`, because listing accounts to anonymous visitors reveals who has an account. Choosing an account grants nothing: `POST /api/auth/login` still checks the password, and the role always comes from the database.

### POST `/api/auth/logout`

Invalidates the session if the cookie is still valid (increments `tokenVersion`, which signs the user out of **all** sessions) and always clears the cookie with the same attributes. **200** `{ data: { loggedOut: true } }`, also without a cookie.

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

## Tasks (Phase 2)

A task object:

```json
{
  "id": 1,
  "projectId": 1,
  "title": "Design new homepage hero",
  "description": "Mockups for desktop and mobile…",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "dueDate": "2026-11-15",
  "assigneeId": 4,
  "assignee": { "id": 4, "name": "Aisha Khan", "email": "aisha@neostats.local" },
  "project": { "id": 1, "name": "Website Redesign", "status": "ACTIVE" },
  "version": 3,
  "commentCount": 2,
  "createdAt": "…",
  "updatedAt": "…"
}
```

`status`: `TODO`, `IN_PROGRESS`, `DONE`. `priority`: `LOW`, `MEDIUM`, `HIGH`. `dueDate` is a calendar date `YYYY-MM-DD` or `null`. `assignee` is `null` for unassigned tasks. `version` starts at 1 and increases by one on every change.

### Permissions

| Action | Admin | Project Manager | Team Member | Viewer |
|---|---|---|---|---|
| List / view tasks | all projects | projects they manage | projects they belong to | all projects |
| Create, delete, assign / reassign | ❌ | ✅ own projects | ❌ | ❌ |
| Edit fields | ❌ | ✅ all fields, own projects | ✅ `status` + `description` of tasks **assigned to them** (project role `MEMBER` only) | ❌ |

Tasks of an `ARCHIVED` project are read-only: writes return **409 `PROJECT_ARCHIVED`**.

**Assignment rule:** `assigneeId` must be an existing, **active** user with the global role `TEAM_MEMBER` who is a member of **this** project with project role `MEMBER` (read-only `VIEWER` members cannot be assigned). Otherwise **400 `INVALID_ASSIGNEE`**. When a member is removed from a project, or made read-only, their tasks in that project become unassigned (and their `version` is bumped).

### GET `/api/projects/:id/tasks`

Anyone who can see the project. Query: `page`, `limit` (1–100, default 20), `status`, `priority`, `assigneeId`, `search` (title/description). Sorted by status (To do → Done), priority (High first), due date (earliest first, none last).

**200** `{ data: Task[], meta }` · **400** · **403** · **404** `PROJECT_NOT_FOUND`.

### GET `/api/tasks`

Tasks across **every project the user can see** (same visibility rules). Same query as above plus `projectId`. Example "my tasks": `GET /api/tasks?assigneeId=4`. **200** `{ data: Task[], meta }`.

### POST `/api/projects/:id/tasks` (the project's manager)

```json
{ "title": "Build API", "description": "optional", "status": "TODO", "priority": "MEDIUM", "dueDate": "2026-12-24", "assigneeId": 4 }
```

Only `title` is required (1–200 chars, trimmed). Defaults: `description ""` (max 5000), `status TODO`, `priority MEDIUM`, `dueDate null`, `assigneeId null`. Unknown fields (e.g. `version`, `projectId`) → 400.

**201** task + `permissions` · **400** `VALIDATION_ERROR` / `INVALID_ASSIGNEE` · **403** · **404** · **409** `PROJECT_ARCHIVED`.

### GET `/api/tasks/:id`

**200** task plus `permissions` for the current user (UX hints; the server re-checks every write):

```json
{ "permissions": { "editableFields": ["status", "description"], "canEdit": true, "canAssign": false, "canDelete": false, "canComment": true } }
```

**400** non-numeric id · **403** · **404** `TASK_NOT_FOUND`.

### PATCH `/api/tasks/:id` (versioned, optimistic concurrency)

```json
{ "version": 3, "status": "DONE" }
```

- `version` (integer, **required**) = the version the client last loaded. At least one other field is required.
- Editable fields: `title`, `description`, `status`, `priority`, `dueDate` (`null` clears), `assigneeId` (`null` unassigns). Sending a field you may not edit → **403** (nothing is changed).
- The update runs as one statement `UPDATE … WHERE id = :id AND version = :version` that also sets `version = version + 1`. If the version no longer matches, no row is updated and the API returns:

**409 Conflict**
```json
{
  "success": false,
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "This task was changed by someone else after you opened it. Reload it to see the latest version, then reapply your changes.",
    "currentVersion": 4,
    "currentTask": { "...": "the latest task" }
  }
}
```

Example: version 7 → User A saves → 8. User B saves with version 7 → 409. Two simultaneous requests with the same version: exactly one succeeds.

**200** updated task (new `version`) · **400** · **403** · **404** · **409** `VERSION_CONFLICT` / `PROJECT_ARCHIVED`.

### DELETE `/api/tasks/:id` (the project's manager)

Deletes the task; its comments are removed by `ON DELETE CASCADE`. **200** `{ "id": 5 }` · **403** · **404** · **409** `PROJECT_ARCHIVED`.

---

## Comments (Phase 2)

```json
{
  "id": 9,
  "taskId": 1,
  "authorId": 4,
  "body": "Draft is in Figma.",
  "createdAt": "…",
  "author": { "id": 4, "name": "Aisha Khan", "email": "aisha@neostats.local", "role": "TEAM_MEMBER" },
  "canDelete": true
}
```

| Action | Who |
|---|---|
| Read | anyone who can see the task's project |
| Add | the project's manager; Team Members with project role `MEMBER` (any task in the project) |
| Delete | the comment's author, the project's manager, or an Admin (moderation) |

Viewers (global, or read-only project members) cannot add comments. Comments cannot be edited. Archived projects → 409 `PROJECT_ARCHIVED` for add/delete.

### GET `/api/tasks/:id/comments`

Oldest first. Query `page`, `limit` (default 50, max 100). **200** `{ data: Comment[], meta }` · **403** · **404**.

### POST `/api/tasks/:id/comments`

```json
{ "body": "Looks good!" }
```

`body` trimmed, 1–2000 chars. The author is always the current user; an `authorId` field is rejected (400). **201** comment · **400** · **403** · **404** · **409**.

### DELETE `/api/tasks/:id/comments/:commentId`

The comment must belong to that task (otherwise **404 `COMMENT_NOT_FOUND`**). **200** `{ "id": 9, "taskId": 1 }` · **403** · **404**.

---

## Users

User objects returned by the Admin endpoints below: `{ id, name, email, role, isActive, createdAt }`. `passwordHash` and `tokenVersion` are never returned. There is **no DELETE**: users are deactivated.

### GET `/api/users` (Admin, Project Manager)

Directory used to pick project managers and team members. Returns only `id`, `name`, `email`, `role`, `isActive`.

| Query | Type | Default |
|---|---|---|
| `role` | `ADMIN` \| `PROJECT_MANAGER` \| `TEAM_MEMBER` \| `VIEWER` | |
| `isActive` | `true` \| `false` | |
| `search` | string (name or email) | |
| `page`, `limit` | int | 1, 20 (max 100) |

**200** `{ data: User[], meta }` · **400** · **403** Team Member / Viewer.

### GET `/api/users/:id` (Admin)

**200** · **403** · **404** `USER_NOT_FOUND`.

### POST `/api/users` (Admin)

Body (strict): `{ name (1-100), email, password, role }`. Password policy: 8+ characters, at least one letter and one digit, at most 72 bytes (bcrypt limit). Stored as a bcrypt hash (cost `BCRYPT_ROUNDS`, default 12).

**201** · **400** `VALIDATION_ERROR` · **403** · **409** `EMAIL_TAKEN` (case-insensitive).

### PATCH `/api/users/:id` (Admin)

Body (strict, at least one field): `{ name?, email?, role?, isActive?, password? }`.

- `isActive: false` deactivates (the user is signed out everywhere and cannot log in); `isActive: true` reactivates.
- `password` resets the password and signs the user out everywhere.
- An Admin cannot change **their own** role or deactivate **themselves** (403), so the acting Admin can never lock themselves out. Non-admins get 403 for every change, including their own role (no self-promotion).
- Changing the role of a user who still manages projects (PM) or belongs to teams (Team Member) → **409 `USER_HAS_ASSIGNMENTS`** (managers must be PMs, members must be Team Members).

**200** · **400** · **403** · **404** `USER_NOT_FOUND` · **409** `EMAIL_TAKEN` / `USER_HAS_ASSIGNMENTS`.

### `/api/dev/users`: removed

The Phase 1/2 development user switcher (`GET /api/dev/users`, `X-Dev-User-Id`) was removed in Phase 3. The route returns 404, and the header is ignored.

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
| 401 | `UNAUTHENTICATED` | No valid session (see Authentication) |
| 401 | `INVALID_CREDENTIALS` | Login with a wrong email/password |
| 403 | `ACCOUNT_DEACTIVATED` | Login to a deactivated account (correct password) |
| 403 | `FORBIDDEN_ORIGIN` | Write request from a foreign browser origin |
| 403 | `FORBIDDEN` | The current user's role / project relationship does not allow this |
| 404 | `NOT_FOUND` | No route matches, or a record is missing |
| 409 | `CONFLICT` | A unique constraint was violated |
| 409 | `VERSION_CONFLICT` | Task update with a stale `version` (see PATCH `/api/tasks/:id`) |
| 409 | `PROJECT_ARCHIVED` | Writing to the team, tasks or comments of an archived project |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error (generic message; details only in the server log) |
