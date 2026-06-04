import { randomBytes } from 'crypto';
import { type NextRequest, type NextResponse } from 'next/server';
import type { AdminUser, Branch, Role, Staff, SystemUser } from '@prisma/client';
import { db } from '@/lib/db';
import { Errors } from '@/lib/api/errors';
import type { AdminAuthUser, AuthUser, BranchAuthUser } from '@shared/types/auth';
import {
  signAccessToken,
  verifyAccessToken,
  type AdminAuthClaims,
  type AuthClaims,
  type BranchAuthClaims,
  type StaffAuthClaims,
} from './jwt';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@shared/auth-constants';

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
  const secure = process.env.NODE_ENV === 'production';
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
// Branch session pool
//
// Branch logins are `SystemUser` records (already managed under HR / User).
// They authenticate by `userName`, are scoped to a single `branchId`, and get
// their own refresh-token table (`SystemRefreshToken`). The JWT `type`
// discriminator (`'branch'`) keeps this pool distinct from staff and admin.
// ---------------------------------------------------------------------------

/** A SystemUser with the branch relation needed to build a session. */
export type SystemUserWithRelations = SystemUser & { branch: Branch | null };

/** Find a branch user by id or userName, or return null. */
export function findSystemUser(where: { id: string } | { userName: string }) {
  return db.systemUser.findUnique({ where, include: { branch: true } });
}

/** Build the JWT claims for a branch user. */
export function buildBranchClaims(user: SystemUserWithRelations): BranchAuthClaims {
  return {
    sub: user.id,
    type: 'branch',
    branchId: user.branchId as string,
    branchName: user.branch?.name ?? null,
    userName: user.userName,
  };
}

/** Map a branch user to the UI-facing `BranchAuthUser`. */
export function toBranchAuthUser(user: SystemUserWithRelations): BranchAuthUser {
  return {
    id: user.id,
    userName: user.userName,
    branchId: user.branchId as string,
    branchName: user.branch?.name ?? null,
    type: 'branch',
  };
}

/**
 * Issue a fresh branch session: a 1h access token plus a 7d refresh token
 * persisted in `SystemRefreshToken`. `lastLoginAt` is stamped on the user.
 */
export async function issueBranchSession(user: SystemUserWithRelations) {
  const accessToken = signAccessToken(buildBranchClaims(user));
  const refreshToken = randomBytes(48).toString('hex');

  await db.systemRefreshToken.create({
    data: {
      systemUserId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000),
    },
  });
  await db.systemUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return { accessToken, refreshToken, user: toBranchAuthUser(user) };
}

/** Revoke a branch refresh token (logout). Silent if unknown. */
export async function revokeBranchSession(refreshToken: string | undefined) {
  if (!refreshToken) return;
  await db.systemRefreshToken.updateMany({
    where: { token: refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Rotate a branch refresh token against the `SystemRefreshToken` pool, revoke
 * it, and issue a new branch session. Throws `UNAUTHORIZED` if the token is
 * unknown/expired/revoked or the account is inactive / unscoped.
 */
export async function rotateBranchSession(refreshToken: string) {
  const existing = await db.systemRefreshToken.findUnique({ where: { token: refreshToken } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    throw Errors.unauthorized('Session expired, please sign in again');
  }
  await db.systemRefreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  const user = await findSystemUser({ id: existing.systemUserId });
  if (!user || !user.isActive || !user.branchId) {
    throw Errors.unauthorized('Account is no longer active');
  }
  return issueBranchSession(user);
}

/**
 * Require a branch session. Returns the claims or throws `UNAUTHORIZED`.
 * Staff and admin tokens are rejected here.
 */
export function requireBranchAuth(req: NextRequest): BranchAuthClaims {
  const claims = readClaims(req);
  if (claims.type !== 'branch') {
    throw Errors.unauthorized('Branch session required');
  }
  return claims;
}

/**
 * Accept either an admin OR a branch session and report the branch scope.
 *
 * - Admin sessions return `branchScope: null` (see every branch).
 * - Branch sessions return `branchScope: <their branchId>` (single branch).
 *
 * Staff tokens are rejected. Use this on branch-operational admin routes
 * (inventory, catalog, ...) and apply `branchScope` as a hard filter when set.
 */
export function requireAdminOrBranchAuth(
  req: NextRequest,
): { claims: AdminAuthClaims | BranchAuthClaims; branchScope: string | null } {
  const claims = readClaims(req);
  if (claims.type === 'admin') return { claims, branchScope: null };
  if (claims.type === 'branch') return { claims, branchScope: claims.branchId };
  throw Errors.unauthorized('Admin or branch session required');
}
