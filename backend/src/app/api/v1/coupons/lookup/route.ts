import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth } from '@/lib/auth/service';
import type { CouponLookupResult } from '@shared/types/admin-coupon';

const querySchema = z.object({
  code: z.string().trim().min(1, 'Coupon code is required'),
});

export const GET = route(async (req) => {
  const claims = requireAuth(req);
  const branchId = claims.branchIds?.[0] ?? null;
  const { code } = parseQuery(req, querySchema);

  const coupon = await db.coupon.findFirst({
    where: { orgId: claims.orgId, couponCode: code.toUpperCase() },
    include: { branches: true },
  });

  const INVALID = 'Invalid or Expired Coupon';

  if (!coupon)         throw Errors.badRequest(INVALID);
  if (!coupon.isActive) throw Errors.badRequest(INVALID);

  const now = new Date();
  if (now < coupon.startDate || now > coupon.endDate) throw Errors.badRequest(INVALID);

  if (!coupon.allBranches && branchId) {
    const assigned = coupon.branches.some((b) => b.branchId === branchId);
    if (!assigned) throw Errors.badRequest('Coupon is not assigned to this branch');
  }

  const result: CouponLookupResult = {
    couponName:  coupon.couponName,
    couponCode:  coupon.couponCode,
    couponType:  coupon.couponType as 'percentage' | 'fixed',
    couponValue: coupon.couponValue,
  };

  return ok(result);
});
