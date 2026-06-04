import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { applySessionCookies, findSystemUser, issueBranchSession } from '@/lib/auth/service';
import type { BranchSessionResult } from '@shared/types/auth';

/**
 * POST /api/v1/auth/branch/login — branch (SystemUser) sign-in.
 *
 * Independent of /auth/login (staff) and /auth/admin/login. Looks up the
 * SystemUser pool by userName, verifies the password, and issues a
 * branch-typed session scoped to the user's branch.
 */
const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const POST = route(async (req) => {
  const { identifier, password } = await parseBody(req, loginSchema);

  const user = await findSystemUser({ userName: identifier });
  const invalid = Errors.unauthorized('Invalid username or password');
  if (!user) throw invalid;

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) throw invalid;

  if (!user.isActive) {
    throw Errors.forbidden('This branch account has been deactivated.');
  }
  if (!user.branchId) {
    throw Errors.forbidden('This account is not assigned to a branch.');
  }

  const { accessToken, refreshToken, user: authUser } = await issueBranchSession(user);
  const res = ok<BranchSessionResult>({ user: authUser, accessToken });
  applySessionCookies(res, accessToken, refreshToken);
  return res;
});
