import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { applySessionCookies, findAdmin, issueAdminSession } from '@/lib/auth/service';
import type { AdminSessionResult } from '@/types/auth';

/**
 * POST /api/v1/auth/admin/login — super-admin sign-in.
 *
 * Independent of /auth/login (staff). Looks up the AdminUser pool, verifies
 * the password, and issues an admin-typed session.
 */
const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const POST = route(async (req) => {
  const { identifier, password } = await parseBody(req, loginSchema);

  const admin = await findAdmin({ email: identifier.toLowerCase() });
  const invalid = Errors.unauthorized('Invalid email or password');
  if (!admin) throw invalid;

  const passwordOk = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordOk) throw invalid;

  if (admin.status !== 'active') {
    throw Errors.forbidden('This admin account has been suspended.');
  }

  const { accessToken, refreshToken, user } = await issueAdminSession(admin);
  const res = ok<AdminSessionResult>({ user, accessToken });
  applySessionCookies(res, accessToken, refreshToken);
  return res;
});
