import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import {
  applySessionCookies,
  findStaff,
  findSystemUser,
  issueSession,
  issueSystemSession,
} from '@/lib/auth/service';
import type { SessionResult, TwoFactorChallenge } from '@shared/types/auth';

/**
 * POST /api/v1/auth/login — staff sign-in (section 6.1).
 *
 * Step 1 of the flow. On valid credentials, admin accounts with 2FA enabled
 * receive a one-time code and must complete /auth/verify-otp; other accounts
 * are signed in immediately. Reference: section 7.1.
 */
const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
});

/** Mask an email for the "code sent to" hint, e.g. a***@welona.com. */
function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name[0]}${'*'.repeat(Math.max(1, name.length - 1))}@${domain}`;
}

export const POST = route(async (req) => {
  const { identifier, password } = await parseBody(req, loginSchema);

  // Generic message — never reveal whether the account exists.
  const invalid = Errors.unauthorized('Invalid credentials');

  const staff = await findStaff({ email: identifier.toLowerCase() });

  // Not a staff email — try SystemUser (branch portal login with username).
  if (!staff) {
    const systemUser = await findSystemUser(identifier);
    if (!systemUser) throw invalid;

    const passwordOk = await bcrypt.compare(password, systemUser.passwordHash);
    if (!passwordOk) throw invalid;

    if (!systemUser.isActive) {
      throw Errors.forbidden('This account has been suspended. Contact your administrator.');
    }

    const { accessToken, refreshToken, user } = await issueSystemSession(systemUser);
    const res = ok<SessionResult>({ user, accessToken });
    applySessionCookies(res, accessToken, refreshToken);
    return res;
  }

  const passwordOk = await bcrypt.compare(password, staff.passwordHash);
  if (!passwordOk) throw invalid;

  if (staff.status !== 'active') {
    throw Errors.forbidden('This account has been suspended. Contact your administrator.');
  }

  // --- 2FA required (mandatory for admin roles, section 7.1) ---
  if (staff.twoFactorEnabled) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const challenge = await db.loginChallenge.create({
      data: {
        staffId: staff.id,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });
    // No SMS provider in local dev — log the code and return it for convenience.
    console.log(`[auth] 2FA code for ${staff.email}: ${otp}`);

    const body: TwoFactorChallenge = {
      requiresTwoFactor: true,
      challengeId: challenge.id,
      sentTo: maskEmail(staff.email),
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
    };
    return ok(body);
  }

  // --- No 2FA: sign in directly ---
  const { accessToken, refreshToken, user } = await issueSession(staff);
  const res = ok<SessionResult>({ user, accessToken });
  applySessionCookies(res, accessToken, refreshToken);
  return res;
});
