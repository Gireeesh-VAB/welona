import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveWarehouseId } from '@/lib/warehouse';
import { depleteBatchStockFEFO } from '@/lib/batch';
import {
  adminInventoryMovementCreateSchema,
  adminInventoryMovementListQuerySchema,
} from '@shared/schemas/admin-inventory';
import { toAdminInventoryMovement } from '@/lib/admin-inventory-mapper';

const include = { branch: true, product: true, createdByAdmin: true } as const;

/**
 * GET  /api/v1/admin/inventory/movements?branchId&productId&type
 * POST /api/v1/admin/inventory/movements
 *
 * Movement insert and stock update happen in one transaction so the
 * (branch, product) quantity is always equal to the sum of its deltas.
 */
export const GET = route(async (req) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const { branchId, warehouseId, productId, type, page, limit } = parseQuery(
    req,
    adminInventoryMovementListQuerySchema,
  );

  const where: Prisma.InventoryMovementWhereInput = {
    // Branch sessions only ever see their own branch's movements.
    ...((branchScope ?? branchId) && { branchId: branchScope ?? branchId }),
    ...(warehouseId && { warehouseId }),
    ...(productId && { productId }),
    ...(type && { type }),
  };

  const [items, total] = await Promise.all([
    db.inventoryMovement.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.inventoryMovement.count({ where }),
  ]);

  return ok(items.map(toAdminInventoryMovement), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const { claims, branchScope } = requireAdminOrBranchAuth(req);
  const body = await parseBody(req, adminInventoryMovementCreateSchema);
  // Branch sessions can only move stock in their own branch.
  const branchId = branchScope ?? body.branchId;
  // Only admin sessions map to an AdminUser FK; branch sessions leave it null.
  const createdByAdminId = claims.type === 'admin' ? claims.sub : null;

  const [branch, product] = await Promise.all([
    db.branch.findUnique({ where: { id: branchId }, select: { id: true } }),
    db.product.findUnique({ where: { id: body.productId }, select: { id: true, isActive: true, trackBatches: true } }),
  ]);
  if (!branch) throw Errors.notFound('Branch');
  if (!product) throw Errors.notFound('Product');
  if (!product.isActive) throw Errors.badRequest('Cannot move stock on an inactive product.');

  const warehouseId = await resolveWarehouseId(db, branchId, body.warehouseId);

  const row = await db.$transaction(async (tx) => {
    const stock = await tx.inventoryStock.upsert({
      where: { warehouseId_productId: { warehouseId, productId: body.productId } },
      create: { branchId, warehouseId, productId: body.productId, quantity: 0 },
      update: {},
    });
    const newQty = stock.quantity + body.delta;
    if (newQty < 0) {
      throw Errors.conflict(
        `Not enough stock: current ${stock.quantity}, requested ${-body.delta}.`,
      );
    }
    await tx.inventoryStock.update({
      where: { id: stock.id },
      data: { quantity: newQty },
    });
    // Batch-tracked outbound: deplete batch stock FEFO (best-effort).
    if (product.trackBatches && body.delta < 0) {
      await depleteBatchStockFEFO(tx, { productId: body.productId, warehouseId, quantity: -body.delta });
    }
    return tx.inventoryMovement.create({
      data: {
        branchId,
        warehouseId,
        productId: body.productId,
        type: body.type,
        delta: body.delta,
        reason: body.reason ?? null,
        ref: body.ref ?? null,
        createdByAdminId,
      },
      include,
    });
  });

  return created(toAdminInventoryMovement(row));
});
