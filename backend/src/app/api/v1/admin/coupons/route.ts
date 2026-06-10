import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminCouponCreateSchema } from '@shared/schemas/admin-coupon';
import { couponAdminInclude, toAdminCoupon } from '@/lib/admin-coupon-mapper';

const listQuerySchema = z.object({
  search:   z.string().trim().optional(),
  isActive: z.coerce.boolean().optional(),
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().positive().max(200).default(20),
});

async function resolveOrgId(): Promise<string> {
  const org = await db.organization.findFirst({ select: { id: true } });
  if (!org) throw Errors.notFound('Organization');
  return org.id;
}

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, isActive, page, limit } = parseQuery(req, listQuerySchema);
  const orgId = await resolveOrgId();

  const where: Record<string, unknown> = { orgId };
  if (isActive !== undefined) where.isActive = isActive;
  if (search) {
    where.OR = [
      { couponName: { contains: search } },
      { couponCode: { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    db.coupon.findMany({
      where,
      include: couponAdminInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.coupon.count({ where }),
  ]);

  return ok(items.map(toAdminCoupon), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminCouponCreateSchema);
  const orgId = await resolveOrgId();

  if (!body.allBranches && body.branchIds.length > 0) {
    const found = await db.branch.findMany({
      where: { id: { in: body.branchIds } },
      select: { id: true },
    });
    if (found.length !== body.branchIds.length) {
      throw Errors.badRequest('One or more selected branches do not exist.');
    }
  }

  const row = await db.coupon.create({
    data: {
      orgId,
      couponName:       body.couponName,
      couponCode:       body.couponCode.toUpperCase(),
      couponType:       body.couponType,
      couponValue:      body.couponValue,
      startDate:        new Date(body.startDate),
      endDate:          new Date(body.endDate),
      isActive:         body.isActive,
      allBranches:      body.allBranches,
      createdByAdminId: claims.sub,
      ...(body.branchIds.length > 0 && {
        branches: { create: body.branchIds.map((bid) => ({ branchId: bid })) },
      }),
    },
    include: couponAdminInclude,
  });

  return created(toAdminCoupon(row));
});
