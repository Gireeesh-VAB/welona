import jwt, { type SignOptions } from 'jsonwebtoken';

/**
 * JWT access-token signing and verification.
 * Source: Developer Reference Architecture v2.0, sections 7.1–7.2.
 */

/** Decoded access-token payload — staff session (section 7.2). */
export interface StaffAuthClaims {
  sub: string;
  type: 'staff';
  orgId: string;
  branchIds: string[];
  role: string;
  permissions: string[];
}

/** Decoded access-token payload — admin (super-admin) session. */
export interface AdminAuthClaims {
  sub: string;
  type: 'admin';
  name: string;
  email: string;
}

/** Any kind of session — discriminated on `type`. */
export type AuthClaims = StaffAuthClaims | AdminAuthClaims;

const ACCESS_SECRET = process.env.JWT_SECRET ?? 'welona-dev-access-secret';
const ACCESS_EXPIRY = process.env.JWT_EXPIRY ?? '1h';

/** Sign a 1-hour access token from the given claims. */
export function signAccessToken(claims: AuthClaims): string {
  return jwt.sign(claims, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY } as SignOptions);
}

/**
 * Verify an access token and return its claims.
 * Throws if the token is missing, malformed or expired.
 */
export function verifyAccessToken(token: string): AuthClaims {
  const decoded = jwt.verify(token, ACCESS_SECRET);
  if (typeof decoded === 'string') {
    throw new Error('Malformed token');
  }
  return decoded as AuthClaims;
}
