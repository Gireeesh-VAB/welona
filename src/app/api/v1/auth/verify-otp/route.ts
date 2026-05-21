import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { applySessionCookies, findStaff, issueSession } from '@/lib/auth/service';
import type { SessionResult } from '@/types/auth';

/**
 * POST /api/v1/auth/verify-otp — complete the 2FA step (section 6.1).
 *
 * Step 2 of sign-in: exchanges a valid one-time code for an access token
 * and a refresh-token cookie.
 */
const verifySchema = z.object({
  challengeId: z.string().min(1, 'Challenge id is required'),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export const POST = route(async (req) => {
  const { challengeId, otp } = await parseBody(req, verifySchema);

  const challenge = await db.loginChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge || challenge.consumedAt) {
    throw Errors.unauthorized('This verification request is no longer valid');
  }
  if (challenge.expiresAt < new Date()) {
    throw Errors.unauthorized('The code has expired. Please sign in again.');
  }
  if (challenge.otp !== otp) {
    throw Errors.unauthorized('Incorrect code');
  }

  // Single-use: consume the challenge.
  await db.loginChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  const staff = await findStaff({ id: challenge.staffId });
  if (!staff || staff.status !== 'active') {
    throw Errors.forbidden('This account is no longer active');
  }

  const { accessToken, refreshToken, user } = await issueSession(staff);
  const res = ok<SessionResult>({ user, accessToken });
  applySessionCookies(res, accessToken, refreshToken);
  return res;
});
