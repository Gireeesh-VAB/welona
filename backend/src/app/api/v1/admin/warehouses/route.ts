import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import {
  adminWarehouseCreateSchema,
  adminWarehouseListQuerySchema,
} from '@shared/schemas/admin-warehouses';
import {
  toAdminWarehouse,
  warehouseInclude,
  type WarehouseWithRelations,
} from '@/lib/admin-warehouse-mapper';
import { recordAudit, actorFromClaims } from '@/lib/audit';

/**
 * GET  /api/v1/admin/warehouses?branchId=&search=&active=
 * POST /api/v1/admin/warehouses
 *
 * Branch sessions are scoped to their own branch.
 */
export const GET = route(async (req) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const { branchId, search, active, page, limit } = parseQuery(req, adminWarehouseListQuerySchema);

  const where: Prisma.WarehouseWhereInput = {
    ...((branchScope ?? branchId) && { branchId: branchScope ?? branchId }),
    ...(active === 'active' && { isActive: true }),
    ...(active === 'inactive' && { isActive: false }),
    ...(search && {
      OR: [{ name: { contains: search } }, { code: { contains: search } }],
    }),
  };

  const [items, total] = await Promise.all([
    db.warehouse.findMany({
      where,
      include: warehouseInclude,
      orderBy: [{ branchId: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.warehouse.count({ where }),
  ]);

  return ok(items.map((w) => toAdminWarehouse(w as WarehouseWithRelations)),
    buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const { claims, branchScope } = requireAdminOrBranchAuth(req);
  const body = await parseBody(req, adminWarehouseCreateSchema);
  const branchId = branchScope ?? body.branchId;
  const createdByAdminId = claims.type === 'admin' ? claims.sub : null;

  const branch = await db.branch.findUnique({ where: { id: branchId }, select: { id: true } });
  if (!branch) throw Errors.notFound('Branch');

  try {
    const wh = await db.$transaction(async (tx) => {
      // Only one default warehouse per branch.
      if (body.isDefault) {
        await tx.warehouse.updateMany({ where: { branchId, isDefault: true }, data: { isDefault: false } });
      }
      // Guarantee the branch always has a default: first warehouse becomes default.
      const count = await tx.warehouse.count({ where: { branchId } });
      const isDefault = body.isDefault || count === 0;
      return tx.warehouse.create({
        data: {
          branchId,
          name: body.name,
          code: body.code,
          isDefault,
          isActive: body.isActive,
          createdByAdminId,
        },
        include: warehouseInclude,
      });
    });
    await recordAudit({
      actor: actorFromClaims(claims),
      action: 'create',
      entity: 'warehouse',
      entityId: wh.id,
      branchId,
      summary: `Created warehouse ${wh.name} (${wh.code})`,
    });
    return created(toAdminWarehouse(wh as WarehouseWithRelations));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw Errors.conflict(`A warehouse with code "${body.code}" already exists in this branch.`);
    }
    throw error;
  }
});
