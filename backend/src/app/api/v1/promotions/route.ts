import { db } from '@/lib/db';
import { route, parseQuery, booleanQueryParam } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/service';
import { z } from 'zod';

const querySchema = z.object({
  activeOnly: booleanQueryParam(),
});

/**
 * GET /api/v1/promotions — marketing offers visible to the calling staff member.
 *
 * Branch filtering via MarketingOfferBranch:
 *  - Staff with a branchId only see offers explicitly assigned to their branch.
 *  - Org-wide staff (branchIds=[]) see all offers.
 *  - If an offer has no branch assignments it is visible to everyone (fallback).
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  const branchId = claims.branchIds[0] ?? null;

  const { activeOnly } = parseQuery(req, querySchema);
  // Default to active-only unless the caller explicitly passes activeOnly=false.
  const onlyActive = activeOnly ?? true;
  const now = new Date();

  const baseWhere = onlyActive
    ? { isActive: true, fromDate: { lte: now }, toDate: { gte: now } }
    : {};

  const offers = await db.marketingOffer.findMany({
    where: {
      ...baseWhere,
      // If caller has a branchId, only return offers that include this branch
      // OR offers with no branch restrictions at all (org-wide offers).
      ...(branchId
        ? {
            OR: [
              { branches: { some: { branchId } } },
              { branches: { none: {} } },
            ],
          }
        : {}),
    },
    include: {
      items: {
        include: {
          category: { select: { id: true, name: true } },
          service: { select: { id: true, name: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
      branches: { select: { branchId: true } },
    },
    orderBy: { fromDate: 'desc' },
    take: 100,
  });

  return ok(
    offers.map((o) => ({
      id: o.id,
      packageName: o.packageName,
      packageCode: o.packageCode,
      fromDate: o.fromDate.toISOString(),
      toDate: o.toDate.toISOString(),
      minAmount: o.minAmount,
      maxAmount: o.maxAmount,
      remarks: o.remarks,
      frontImageUrl: o.frontImageUrl,
      isActive: o.isActive,
      branchIds: o.branches.map((b) => b.branchId),
      items: o.items.map((item) => ({
        id: item.id,
        categoryName: item.category.name,
        serviceName: item.service.name,
        quantity: item.quantity,
      })),
    })),
  );
});
