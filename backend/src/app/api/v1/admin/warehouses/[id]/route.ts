import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { adminWarehouseUpdateSchema } from '@shared/schemas/admin-warehouses';
import { toAdminWarehouse, warehouseInclude, type WarehouseWithRelations } from '@/lib/admin-warehouse-mapper';
import { recordAudit, actorFromClaims } from '@/lib/audit';

interface RouteContext {
  params: { id: string };
}

async function loadScoped(id: string, branchScope: string | null) {
  const wh = await db.warehouse.findUnique({ where: { id }, include: warehouseInclude });
  if (!wh || (branchScope && wh.branchId !== branchScope)) throw Errors.notFound('Warehouse');
  return wh;
}

export const PUT = route<RouteContext>(async (req, { params }) => {
  const { claims, branchScope } = requireAdminOrBranchAuth(req);
  const body = await parseBody(req, adminWarehouseUpdateSchema);
  const existing = await loadScoped(params.id, branchScope);

  // Prevent removing the branch's only default by un-setting it directly.
  if (body.isDefault === false && existing.isDefault) {
    throw Errors.badRequest('Set another warehouse as default instead of unsetting this one.');
  }

  try {
    const wh = await db.$transaction(async (tx) => {
      if (body.isDefault === true && !existing.isDefault) {
        await tx.warehouse.updateMany({
          where: { branchId: existing.branchId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.warehouse.update({
        where: { id: params.id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.code !== undefined && { code: body.code }),
          ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
        include: warehouseInclude,
      });
    });
    await recordAudit({
      actor: actorFromClaims(claims),
      action: 'update',
      entity: 'warehouse',
      entityId: wh.id,
      branchId: wh.branchId,
      summary: `Updated warehouse ${wh.name} (${wh.code})`,
    });
    return ok(toAdminWarehouse(wh as WarehouseWithRelations));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Warehouse');
      if (error.code === 'P2002') throw Errors.conflict('A warehouse with this code already exists in this branch.');
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  const { claims, branchScope } = requireAdminOrBranchAuth(req);
  const existing = await loadScoped(params.id, branchScope);
  if (existing.isDefault) {
    throw Errors.conflict('The default warehouse cannot be deleted. Make another one default first.');
  }
  if ((existing._count?.stocks ?? 0) > 0) {
    throw Errors.conflict('This warehouse holds stock and cannot be deleted. Move or zero its stock first.');
  }
  try {
    await db.warehouse.delete({ where: { id: params.id } });
    await recordAudit({
      actor: actorFromClaims(claims),
      action: 'delete',
      entity: 'warehouse',
      entityId: params.id,
      branchId: existing.branchId,
      summary: `Deleted warehouse ${existing.name} (${existing.code})`,
    });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw Errors.notFound('Warehouse');
    }
    throw error;
  }
});
