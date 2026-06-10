# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

Three packages, no workspace hoisting — install and run each independently:

```
backend/    Next.js 14 route-handler API         → port 3002
frontend/   Next.js 14 React UI                  → port 3001
shared/     TypeScript library (no build step)   → path-aliased into both
```

`shared/` is consumed via `tsconfig.json` path aliases (`@shared/*` → `../shared/src/*`) — there is no build or publish step.

## Commands

### Backend (`cd backend`)
```bash
npm run dev           # Start API server on :3002
npm run build         # Production build
npm run type-check    # tsc --noEmit
npm run lint          # ESLint

npm run db:push       # Apply schema changes to dev.db (SQLite)
npm run db:seed       # Seed core data (org, branches, roles, staff)
npm run db:seed-all   # Full seed: core + showcase + system-users + HR + products
npm run db:reset-all  # Force-wipe DB then db:seed-all
npm run db:studio     # Open Prisma Studio GUI
```

### Frontend (`cd frontend`)
```bash
npm run dev           # Start UI on :3001
npm run build         # Production build (also runs locally before sync to server)
npm run type-check
npm run lint
```

### Deploy (from repo root, requires `sshpass`)
```bash
bash sync-to-welona.sh            # Sync + deploy to live (welona.vabinformatics.com)
bash sync-to-welona.sh --backend  # Backend only
bash sync-to-welona.sh --seed     # Add --seed to also run db:seed-all on server
bash sync-to-dev.sh               # Sync + seed to dev (dev.welona.vabinformatics.com)
bash sync-to-dev.sh --reset-db    # Wipe dev DB first, then seed
```

There are no automated tests in this project.

## Environment Setup

**`backend/.env`** (copy from `.env.example`):
```
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=<openssl rand -base64 64>
JWT_REFRESH_SECRET=<openssl rand -base64 64>
JWT_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d
CORS_ALLOWED_ORIGIN=http://localhost:3001
```

**`frontend/.env.local`**:
```
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
```

The frontend `next.config.mjs` rewrites `/api/*` → `http://localhost:3002/api/*` so the browser never needs the raw backend port.

## Seeded Login Credentials (password: `Welona@123`)

| Email | Role |
|---|---|
| `superadmin@welona.com` | Admin panel (`/admin/login`) |
| `admin@welona.com` | Super Admin staff |
| `ho@welona.com` | HO Manager |
| `manager.cp@welona.com` | Branch Manager |
| Branch login: `rohit.sharma` | System user (`welona@123`) |

## Architecture

### API Route Pattern (backend)

Every route handler wraps `route()` from `src/lib/api/handler.ts`, which provides uniform error catching. The standard call sequence inside every handler:

```typescript
export const GET = route(async (req) => {
  const claims = requireAuth(req);                    // or requireAdminAuth(req)
  requirePermission(claims, 'customers:read');        // RBAC check
  const query = parseQuery(req, listQuerySchema);     // Zod-validated
  const where = { orgId: claims.orgId, ...filters }; // multi-tenant filter
  const data = await db.model.findMany({ where });
  return ok(data, buildMeta(page, limit, total));     // envelope response
});
```

Helpers live in `backend/src/lib/api/`:
- `handler.ts` — `route()` wrapper, `parseBody()`, `parseQuery()`
- `response.ts` — `ok()`, `created()`, `buildMeta()`
- `errors.ts` — `Errors.notFound()`, `Errors.badRequest()`, `Errors.conflict()`

### Two Auth Pools

Staff and Admin are completely separate identity pools with separate JWT `type` discriminators (`'staff'` vs `'admin'`), separate refresh token tables, and separate login endpoints:

- Staff: `/api/v1/auth/login` → `requireAuth()` → `StaffAuthClaims`
- Admin: `/api/v1/auth/admin/login` → `requireAdminAuth()` → `AdminAuthClaims`

Sessions use two cookies: `welona_token` (1 h access) + `welona_refresh` (7 d, httpOnly). The frontend `api-client.ts` transparently retries once on 401 to refresh, routing to the correct pool based on the current page path (`/admin/*` = admin pool).

### Multi-Tenancy + Branch Scoping

`Organization` is the tenant root. Every data model carries `orgId`. Branch-scoped roles (`branch_manager`, `receptionist`, etc.) carry `branchIds` in their JWT claims, and route handlers apply an additional filter:

```typescript
const staffBranchId = claims.branchIds[0] ?? null;
if (staffBranchId) where.branchId = staffBranchId;
```

Org-wide roles (`super_admin`, `ho_manager`) see all branches.

### RBAC

`backend/src/lib/rbac.ts` defines 8 system roles. Permissions are `module:action` strings (e.g., `sales:read`, `customers:create`), stored as a JSON array in `Role.permissions` and loaded into the JWT at login. The frontend reads `claims.permissions` from the auth store to gate UI controls with `hasPermission()`.

### Frontend Data Flow

- **API calls**: `frontend/src/lib/api-client.ts` — typed `api.get/post/patch/delete` wrappers
- **Server state**: React Query hooks in `frontend/src/hooks/` — one file per domain (e.g., `useAdminBranches.ts`). Query keys always prefixed by domain. Mutations call `queryClient.invalidateQueries` on success.
- **Client state**: Zustand — `authStore.ts` (staff) and `adminAuthStore.ts` (admin), persisted to `localStorage` (user object + permissions only, never tokens).
- **React Query config**: `staleTime: 60_000`, `refetchOnWindowFocus: false`, `retry: 1`.

### Shared Package Conventions

`shared/src/` contains:
- `schemas/` — Zod schemas for every entity, used by both backend (validation) and frontend (form types). Export `*CreateInput` and `*UpdateInput` inferred types.
- `types/` — Plain TypeScript interfaces for API response shapes.
- `enums.ts` — All `const` string unions (used instead of Prisma enums due to SQLite).
- `format.ts` — `formatMoney()`, `titleCase()` — shared display helpers.

### Money

All monetary fields in the DB are stored as **integer paise** (minor units). `100 paise = ₹1`. Never use floats for money. Use `formatMoney(paise)` from `shared/src/format.ts` to render.

### DB Conventions

- IDs: CUID (`@default(cuid())`)
- Enums: stored as `String` in Prisma + TypeScript const unions in `shared/src/enums.ts`
- JSON arrays (e.g., `permissions`): stored as JSON strings (SQLite has no native array type)
- Switching to PostgreSQL requires only changing `provider` in `schema.prisma` — no model changes needed

### Adding a New Admin Master-Data Entity

Follow the pattern of an existing entity (e.g., `admin/designations`):

1. Add Prisma model → `db:push`
2. Add Zod schemas to `shared/src/schemas/`
3. Add TypeScript types to `shared/src/types/`
4. Add mapper (`toAdminX()` + `xAdminInclude`) in `backend/src/lib/`
5. Add route handlers in `backend/src/app/api/v1/admin/<entity>/`
6. Add React Query hooks in `frontend/src/hooks/useAdmin<Entity>.ts`
7. Add page in `frontend/src/app/admin/master/<entity>/page.tsx`
8. Register in `frontend/src/config/adminNavigation.ts`
