import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok, buildMeta } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { Errors } from '@/lib/api/errors';
import { z } from 'zod';

const querySchema = z.object({
  direction: z.enum(['incoming', 'outgoing']).default('incoming'),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * GET /api/v1/inventory/transfers?direction=incoming|outgoing
 * Branch staff: list transfers involving their branch.
 *  - incoming: transfers where toBranchId = branch (default)
 *  - outgoing: transfers where fromBranchId = branch
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'inventory:read');

  const branchId = claims.branchIds?.[0] ?? null;
  if (!branchId) throw Errors.badRequest('No branch associated with this account.');

  const { direction, status, page, limit } = parseQuery(req, querySchema);

  const dirFilter = direction === 'outgoing'
    ? { fromBranchId: branchId }
    : { toBranchId: branchId };

  const defaultStatuses = direction === 'outgoing'
    ? { in: ['requested', 'dispatched', 'received'] }
    : { in: ['dispatched', 'received'] };

  const where = {
    ...dirFilter,
    status: status ?? defaultStatuses,
  };

  const [items, total] = await Promise.all([
    db.stockTransfer.findMany({
      where,
      include: {
        fromBranch: { select: { id: true, name: true, code: true } },
        toBranch: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, uom: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.stockTransfer.count({ where }),
  ]);

  return ok(items, buildMeta(page, limit, total));
});
