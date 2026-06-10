import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminCouponUpdateSchema } from '@shared/schemas/admin-coupon';
import { couponAdminInclude, toAdminCoupon } from '@/lib/admin-coupon-mapper';

interface RouteContext { params: { id: string } }

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminCouponUpdateSchema);

  if (body.branchIds && body.branchIds.length > 0 && !body.allBranches) {
    const found = await db.branch.findMany({
      where: { id: { in: body.branchIds } },
      select: { id: true },
    });
    if (found.length !== body.branchIds.length) {
      throw Errors.badRequest('One or more selected branches do not exist.');
    }
  }

  try {
    const row = await db.$transaction(async (tx) => {
      await tx.coupon.update({
        where: { id: params.id },
        data: {
          ...(body.couponName  !== undefined && { couponName:  body.couponName }),
          ...(body.couponType  !== undefined && { couponType:  body.couponType }),
          ...(body.couponValue !== undefined && { couponValue: body.couponValue }),
          ...(body.startDate   !== undefined && { startDate:   new Date(body.startDate) }),
          ...(body.endDate     !== undefined && { endDate:     new Date(body.endDate) }),
          ...(body.isActive    !== undefined && { isActive:    body.isActive }),
          ...(body.allBranches !== undefined && { allBranches: body.allBranches }),
        },
      });

      if (body.branchIds !== undefined) {
        await tx.couponBranch.deleteMany({ where: { couponId: params.id } });
        if (body.branchIds.length > 0) {
          await tx.couponBranch.createMany({
            data: body.branchIds.map((bid) => ({ couponId: params.id, branchId: bid })),
          });
        }
      }

      return tx.coupon.findUniqueOrThrow({
        where: { id: params.id },
        include: couponAdminInclude,
      });
    });

    return ok(toAdminCoupon(row));
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'P2025') throw Errors.notFound('Coupon');
    if (e.code === 'P2002') throw Errors.conflict('Coupon code is already in use.');
    throw err;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.coupon.delete({ where: { id: params.id } });
    return ok({});
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'P2025') throw Errors.notFound('Coupon');
    throw err;
  }
});
