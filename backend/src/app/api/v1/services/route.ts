import { db } from '@/lib/db';
import { route, parseQuery, booleanQueryParam } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/service';
import { z } from 'zod';

const querySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: booleanQueryParam(),
});

/**
 * GET /api/v1/services — branch-staff service catalogue filtered by BranchService.
 *
 * Strict branch isolation:
 *  - Staff with a branchId see ONLY services explicitly assigned to their branch.
 *    If the branch has no assignments → return empty (no fallback to full catalogue).
 *  - Org-wide staff (branchIds=[]) see all active services.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  const branchId = claims.branchIds[0] ?? null;

  const { search, categoryId, isActive } = parseQuery(req, querySchema);
  // Default to active-only unless the caller explicitly passes isActive=false.
  const showActive = isActive ?? true;

  // Branch-scoped: resolve assigned service IDs.
  // If branchId is set but no assignments exist → return empty immediately.
  if (branchId) {
    const assigned = await db.branchService.findMany({
      where: { branchId },
      select: { serviceId: true },
    });

    if (assigned.length === 0) {
      return ok([]);
    }

    const assignedServiceIds = assigned.map((a) => a.serviceId);
    const where: Record<string, unknown> = {
      isActive: showActive,
      id: { in: assignedServiceIds },
    };
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { category: { name: { contains: search } } },
      ];
    }

    const services = await db.service.findMany({
      where,
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      include: { category: { select: { id: true, name: true } } },
    });

    return ok(services.map(serialize));
  }

  // Org-wide staff: no branch restriction.
  const where: Record<string, unknown> = { isActive: showActive };
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { category: { name: { contains: search } } },
    ];
  }

  const services = await db.service.findMany({
    where,
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    include: { category: { select: { id: true, name: true } } },
  });

  return ok(services.map(serialize));
});

function serialize(s: {
  id: string;
  name: string;
  categoryId: string;
  category?: { name: string } | null;
  hsnSacCode: string | null;
  minPrice: number;
  maxPrice: number;
  taxPercent: number;
  taxType: string;
  hasMeasurements: boolean;
  hasComplementary: boolean;
  isActive: boolean;
}) {
  return {
    id: s.id,
    name: s.name,
    categoryId: s.categoryId,
    categoryName: s.category?.name ?? null,
    hsnSacCode: s.hsnSacCode,
    minPrice: s.minPrice,
    maxPrice: s.maxPrice,
    taxPercent: s.taxPercent,
    taxType: s.taxType,
    hasMeasurements: s.hasMeasurements,
    hasComplementary: s.hasComplementary,
    isActive: s.isActive,
  };
}
