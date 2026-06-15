import { randomBytes } from 'crypto';
import { type NextRequest, type NextResponse } from 'next/server';
import type { AdminUser, Branch, Employee, Role, Staff, SystemUser } from '@prisma/client';
import { db } from '@/lib/db';
import { Errors } from '@/lib/api/errors';
import type { AdminAuthUser, AuthUser } from '@shared/types/auth';
import {
  signAccessToken,
  verifyAccessToken,
  type AdminAuthClaims,
  type AuthClaims,
  type StaffAuthClaims,
} from './jwt';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@shared/auth-constants';
import { SYSTEM_ROLES } from '../rbac';

// Re-exported for existing importers; defined in ./constants so client code
// can use them without importing this server-only module.
export { ACCESS_COOKIE, REFRESH_COOKIE };

const ACCESS_TTL_SEC = 60 * 60; // 1 hour
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60; // 7 days

/** A staff record with the relations needed to build a session. */
export type StaffWithRelations = Staff & { role: Role; branch: Branch | null };

/** Load a staff member with role + branch, or return null. */
export function findStaff(where: { id: string } | { email: string }) {
  return db.staff.findUnique({ where, include: { role: true, branch: true } });
}

/** Parse a Role's JSON-encoded permission list. */
export function rolePermissions(role: Role): string[] {
  try {
    const parsed = JSON.parse(role.permissions);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/** Build the JWT claims (section 7.2) for a staff member. */
export function buildClaims(staff: StaffWithRelations): StaffAuthClaims {
  return {
    sub: staff.id,
    type: 'staff',
    orgId: staff.orgId,
    branchIds: staff.branchId ? [staff.branchId] : [],
    role: staff.role.key,
    permissions: rolePermissions(staff.role),
  };
}

/** Map a staff record to the UI-facing `AuthUser`. */
export function toAuthUser(staff: StaffWithRelations): AuthUser {
  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    phone: staff.phone,
    avatarUrl: staff.avatarUrl,
    role: staff.role.key,
    roleName: staff.role.name,
    orgId: staff.orgId,
    branchId: staff.branchId,
    branchName: staff.branch?.name ?? null,
    branchIds: staff.branchId ? [staff.branchId] : [],
    permissions: rolePermissions(staff.role),
  };
}

/**
 * Issue a fresh session: a 1h access token plus a 7d opaque refresh token
 * persisted for revocation. `lastLoginAt` is stamped.
 */
export async function issueSession(staff: StaffWithRelations) {
  const accessToken = signAccessToken(buildClaims(staff));
  const refreshToken = randomBytes(48).toString('hex');

  await db.refreshToken.create({
    data: {
      staffId: staff.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000),
    },
  });
  await db.staff.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } });

  return { accessToken, refreshToken, user: toAuthUser(staff) };
}

/**
 * Rotate a refresh token: validate the presented token, revoke it, and issue
 * a new session. Throws `UNAUTHORIZED` if the token is unknown/expired/revoked.
 */
export async function rotateSession(refreshToken: string) {
  const existing = await db.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    throw Errors.unauthorized('Session expired, please sign in again');
  }
  await db.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  const staff = await findStaff({ id: existing.staffId });
  if (!staff || staff.status !== 'active') {
    throw Errors.unauthorized('Account is no longer active');
  }
  return issueSession(staff);
}

/** Revoke a refresh token (logout). Silent if the token is unknown. */
export async function revokeSession(refreshToken: string | undefined) {
  if (!refreshToken) return;
  await db.refreshToken.updateMany({
    where: { token: refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Extract a bearer token from the Authorization header or the access cookie. */
function readAccessToken(req: NextRequest): string | undefined {
  const header = req.headers.get('authorization');
  if (header?.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return req.cookies.get(ACCESS_COOKIE)?.value;
}

/**
 * Verify the access cookie/header and return the raw claims without enforcing
 * a session type. Used by `requireAuth` and `requireAdminAuth`.
 */
function readClaims(req: NextRequest): AuthClaims {
  const token = readAccessToken(req);
  if (!token) throw Errors.unauthorized();
  try {
    return verifyAccessToken(token);
  } catch {
    throw Errors.unauthorized('Session expired');
  }
}

/**
 * Require a staff session. Returns the claims or throws `UNAUTHORIZED`.
 * Admin-session tokens are rejected here — admin endpoints use
 * `requireAdminAuth` instead. Use at the top of every protected staff route.
 */
export function requireAuth(req: NextRequest): StaffAuthClaims {
  const claims = readClaims(req);
  if (claims.type !== 'staff') {
    throw Errors.unauthorized('Staff session required');
  }
  return claims;
}

/**
 * Require an admin session. Returns the claims or throws `UNAUTHORIZED`.
 * Use at the top of every protected /admin/* route handler.
 */
export function requireAdminAuth(req: NextRequest): AdminAuthClaims {
  const claims = readClaims(req);
  if (claims.type !== 'admin') {
    throw Errors.unauthorized('Admin session required');
  }
  return claims;
}

/** True if the staff claims grant the given `module:action` permission. */
export function hasPermission(claims: StaffAuthClaims, permission: string): boolean {
  return claims.permissions.includes('*') || claims.permissions.includes(permission);
}

/** Require a specific permission, throwing `FORBIDDEN` if absent. */
export function requirePermission(claims: StaffAuthClaims, permission: string): void {
  if (!hasPermission(claims, permission)) {
    throw Errors.forbidden();
  }
}

/** Attach the access + refresh cookies to a response. */
export function applySessionCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string,
): void {
  const secure = process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';
  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: false, // middleware + client read this; the API still validates every call
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: ACCESS_TTL_SEC,
  });
  res.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: REFRESH_TTL_SEC,
  });
}

/** Clear the session cookies (logout). */
export function clearSessionCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, '', { path: '/', maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, '', { path: '/', maxAge: 0 });
}

// ---------------------------------------------------------------------------
// Admin session pool
//
// Admins are an entirely separate identity (model `AdminUser`) with their own
// refresh-token table (`AdminRefreshToken`). The session cookies are reused —
// only one session can be active at a time per browser — but the JWT `type`
// discriminator (`'staff'` vs `'admin'`) keeps the two pools from mixing.
// ---------------------------------------------------------------------------

/** Find an admin user by id or email, or return null. */
export function findAdmin(where: { id: string } | { email: string }) {
  return db.adminUser.findUnique({ where });
}

/** Build the JWT claims for an admin user. */
export function buildAdminClaims(admin: AdminUser): AdminAuthClaims {
  return {
    sub: admin.id,
    type: 'admin',
    name: admin.name,
    email: admin.email,
  };
}

/** Map an admin record to the UI-facing `AdminAuthUser`. */
export function toAdminAuthUser(admin: AdminUser): AdminAuthUser {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    type: 'admin',
  };
}

/**
 * Issue a fresh admin session: a 1h access token plus a 7d refresh token
 * persisted in `AdminRefreshToken`. `lastLoginAt` is stamped on the admin.
 */
export async function issueAdminSession(admin: AdminUser) {
  const accessToken = signAccessToken(buildAdminClaims(admin));
  const refreshToken = randomBytes(48).toString('hex');

  await db.adminRefreshToken.create({
    data: {
      adminId: admin.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000),
    },
  });
  await db.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

  return { accessToken, refreshToken, user: toAdminAuthUser(admin) };
}

/**
 * Revoke an admin refresh token (logout). Silent if the token is unknown or
 * belongs to the staff pool.
 */
export async function revokeAdminSession(refreshToken: string | undefined) {
  if (!refreshToken) return;
  await db.adminRefreshToken.updateMany({
    where: { token: refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Rotate an admin refresh token: validate the presented token (looked up in
 * the AdminRefreshToken pool, not the staff pool), revoke it, and issue a
 * new admin session. Throws `UNAUTHORIZED` if the token is unknown/expired/
 * revoked.
 */
export async function rotateAdminSession(refreshToken: string) {
  const existing = await db.adminRefreshToken.findUnique({ where: { token: refreshToken } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    throw Errors.unauthorized('Session expired, please sign in again');
  }
  await db.adminRefreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  const admin = await db.adminUser.findUnique({ where: { id: existing.adminId } });
  if (!admin || admin.status !== 'active') {
    throw Errors.unauthorized('Account is no longer active');
  }
  return issueAdminSession(admin);
}

// ---------------------------------------------------------------------------
// SystemUser session pool
//
// SystemUsers are branch-level login accounts (receptionists, etc.) that log
// in with a username+password pair rather than email. They use the same JWT
// type ('staff') so the existing middleware and route guards work unchanged,
// but their refresh tokens are stored in the separate SystemRefreshToken table.
// ---------------------------------------------------------------------------

export type SystemUserWithRelations = SystemUser & {
  branch: Branch | null;
  employee: Pick<Employee, 'name'> | null;
};

const BRANCH_ADMIN_PERMISSIONS =
  SYSTEM_ROLES.find((r) => r.key === 'branch_manager')?.permissions ?? [];

/** Load a SystemUser by username or email, including branch + employee name. */
export function findSystemUser(identifier: string) {
  return db.systemUser.findFirst({
    where: { OR: [{ userName: identifier }, { email: identifier }] },
    include: { branch: true, employee: { select: { name: true } } },
  });
}

/** Load a SystemUser by ID, including branch + employee name. */
export function findSystemUserById(id: string) {
  return db.systemUser.findUnique({
    where: { id },
    include: { branch: true, employee: { select: { name: true } } },
  });
}

function buildSystemUserClaims(su: SystemUserWithRelations): StaffAuthClaims {
  return {
    sub: su.id,
    type: 'staff',
    orgId: su.branch?.orgId ?? '',
    branchIds: su.branchId ? [su.branchId] : [],
    role: 'branch_manager',
    permissions: BRANCH_ADMIN_PERMISSIONS,
  };
}

export function toSystemAuthUser(su: SystemUserWithRelations): AuthUser {
  return {
    id: su.id,
    name: su.employee?.name ?? su.userName,
    email: su.email ?? '',
    phone: null,
    avatarUrl: null,
    role: 'branch_manager',
    roleName: 'Branch Admin',
    orgId: su.branch?.orgId ?? '',
    branchId: su.branchId ?? null,
    branchName: su.branch?.name ?? null,
    branchIds: su.branchId ? [su.branchId] : [],
    permissions: BRANCH_ADMIN_PERMISSIONS,
  };
}

/** Issue a session for a SystemUser; stores the refresh token in SystemRefreshToken. */
export async function issueSystemSession(su: SystemUserWithRelations) {
  const accessToken = signAccessToken(buildSystemUserClaims(su));
  const refreshToken = randomBytes(48).toString('hex');

  await db.systemRefreshToken.create({
    data: {
      systemUserId: su.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000),
    },
  });
  await db.systemUser.update({ where: { id: su.id }, data: { lastLoginAt: new Date() } });

  return { accessToken, refreshToken, user: toSystemAuthUser(su) };
}

/** Rotate a SystemUser refresh token. Throws `UNAUTHORIZED` if invalid/expired. */
export async function rotateSystemSession(refreshToken: string) {
  const existing = await db.systemRefreshToken.findUnique({ where: { token: refreshToken } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    throw Errors.unauthorized('Session expired, please sign in again');
  }
  await db.systemRefreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  const su = await db.systemUser.findUnique({
    where: { id: existing.systemUserId },
    include: { branch: true, employee: { select: { name: true } } },
  });
  if (!su || !su.isActive) {
    throw Errors.unauthorized('Account is no longer active');
  }
  return issueSystemSession(su);
}

/** Revoke a SystemUser refresh token (silent no-op if not found). */
export async function revokeSystemSession(refreshToken: string | undefined) {
  if (!refreshToken) return;
  await db.systemRefreshToken.updateMany({
    where: { token: refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

