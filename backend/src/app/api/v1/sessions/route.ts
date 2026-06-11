import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok, buildMeta } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import type { PackageSession } from '@shared/types/customer-modules';

const listSchema = z.object({
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPackageSession(pkg: any): PackageSession {
  return {
    id: pkg.id,
    orgId: pkg.orgId,
    customerId: pkg.customerId,
    customerName: pkg.customer.name,
    customerPhone: pkg.customer.phone ?? null,
    branchId: pkg.branchId,
    branchName: pkg.branch?.name ?? null,
    name: pkg.name,
    totalSessions: pkg.totalSessions,
    usedSessions: pkg.usedSessions,
    remainingSessions: Math.max(0, pkg.totalSessions - pkg.usedSessions),
    price: pkg.price,
    purchasedAt: pkg.purchasedAt.toISOString(),
    expiresAt: pkg.expiresAt ? pkg.expiresAt.toISOString() : null,
    status: pkg.status,
    notes: pkg.notes,
    createdAt: pkg.createdAt.toISOString(),
  };
}

/** GET /api/v1/sessions — paginated list of packages with session info. */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:read');

  const { page, limit, search, status } = parseQuery(req, listSchema);
  const skip = (page - 1) * limit;

  const staffBranchId = claims.branchIds?.[0] ?? null;

  const where: Record<string, unknown> = { orgId: claims.orgId };
  if (staffBranchId) where.branchId = staffBranchId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { customer: { name: { contains: search } } },
    ];
  }

  const include = {
    customer: { select: { id: true, name: true, phone: true } },
    branch:   { select: { id: true, name: true } },
  };

  const [rows, total] = await Promise.all([
    db.package.findMany({ where, include, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    db.package.count({ where }),
  ]);

  return ok(rows.map(toPackageSession), buildMeta(page, limit, total));
});
