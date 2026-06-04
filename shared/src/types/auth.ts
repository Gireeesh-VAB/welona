/**
 * Shared authentication types used by both the API routes and the client.
 * Source: Developer Reference Architecture v2.0, section 7.2.
 */

/** The signed-in staff member, as exposed to the Admin Panel UI. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  /** Role key, e.g. "branch_manager". */
  role: string;
  /** Human-readable role name, e.g. "Branch Manager". */
  roleName: string;
  orgId: string;
  /** Primary branch id, or null for organization-wide roles. */
  branchId: string | null;
  branchName: string | null;
  /** All branch ids in scope (mirrors the JWT `branchIds` claim). */
  branchIds: string[];
  /** `module:action` permission strings, or `["*"]`. */
  permissions: string[];
}

/** Result of a completed sign-in. */
export interface SessionResult {
  user: AuthUser;
  accessToken: string;
}

/** Response of the first login step when 2FA is required. */
export interface TwoFactorChallenge {
  requiresTwoFactor: true;
  challengeId: string;
  /** Masked destination the OTP was "sent" to. */
  sentTo: string;
  /** Development convenience: the OTP itself. Never returned in production. */
  devOtp?: string;
}

/** The signed-in admin (super-admin) user, as exposed to the admin console. */
export interface AdminAuthUser {
  id: string;
  name: string;
  email: string;
  /** Discriminator so the client can tell admin sessions from staff sessions. */
  type: 'admin';
}

/** Result of a completed admin sign-in. */
export interface AdminSessionResult {
  user: AdminAuthUser;
  accessToken: string;
}

/**
 * The signed-in branch user (a `SystemUser`), as exposed to the panel.
 * Branch sessions are scoped to a single branch — every list they see is
 * filtered to `branchId`.
 */
export interface BranchAuthUser {
  id: string;
  userName: string;
  branchId: string;
  branchName: string | null;
  /** Discriminator so the client can tell branch sessions from admin/staff. */
  type: 'branch';
}

/** Result of a completed branch sign-in. */
export interface BranchSessionResult {
  user: BranchAuthUser;
  accessToken: string;
}
