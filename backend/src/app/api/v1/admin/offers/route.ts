import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth, requireAdminOrBranchAuth } from '@/lib/auth/service';
import {
  adminOfferCreateSchema,
  adminOfferListQuerySchema,
} from '@shared/schemas/admin-offers';
import { toAdminOffer } from '@/lib/admin-offer-mapper';

const fullInclude = {
  createdByAdmin: true,
  branches: { include: { branch: { include: { zone: true } } } },
  items: { include: { category: true, service: true } },
} satisfies Prisma.MarketingOfferInclude;

/**
 * Admin master-data: marketing offers (package offers).
 *
 * GET  /api/v1/admin/offers?search=&page=&limit=
 * POST /api/v1/admin/offers — creates the offer + nested branches + items in one tx.
 */
export const GET = route(async (req) => {
  // Org-wide reference data; branch sessions read it. Writes stay admin-only.
  requireAdminOrBranchAuth(req);
  const { search, page, limit } = parseQuery(req, adminOfferListQuerySchema);

  const where: Prisma.MarketingOfferWhereInput = search
    ? {
        OR: [
          { packageName: { contains: search } },
          { packageCode: { contains: search } },
          { remarks: { contains: search } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    db.marketingOffer.findMany({
      where,
      include: fullInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.marketingOffer.count({ where }),
  ]);

  return ok(items.map(toAdminOffer), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminOfferCreateSchema);

  // Validate the nested references before opening the transaction so we can
  // return clean 400s instead of opaque foreign-key errors.
  const branches = await db.branch.findMany({
    where: { id: { in: body.branchIds } },
    select: { id: true },
  });
  if (branches.length !== body.branchIds.length) {
    throw Errors.badRequest('One or more selected branches no longer exist.');
  }

  for (const it of body.items) {
    const svc = await db.service.findUnique({
      where: { id: it.serviceId },
      select: { categoryId: true },
    });
    if (!svc) throw Errors.badRequest('A selected service no longer exists.');
    if (svc.categoryId !== it.categoryId) {
      throw Errors.badRequest('A service does not belong to the selected category.');
    }
  }

  try {
    const row = await db.marketingOffer.create({
      data: {
        packageName: body.packageName,
        packageCode: body.packageCode,
        fromDate: new Date(body.fromDate),
        toDate: new Date(body.toDate),
        minAmount: body.minAmount,
        maxAmount: body.maxAmount,
        remarks: body.remarks ?? null,
        frontImageUrl: body.frontImageUrl ?? null,
        isActive: body.isActive,
        createdByAdminId: claims.sub,
        branches: { create: body.branchIds.map((bid) => ({ branchId: bid })) },
        items: {
          create: body.items.map((it, idx) => ({
            categoryId: it.categoryId,
            serviceId: it.serviceId,
            quantity: it.quantity,
            sortOrder: idx,
          })),
        },
      },
      include: fullInclude,
    });
    return created(toAdminOffer(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw Errors.conflict(`Package code "${body.packageCode}" is already in use.`);
    }
    throw error;
  }
});
