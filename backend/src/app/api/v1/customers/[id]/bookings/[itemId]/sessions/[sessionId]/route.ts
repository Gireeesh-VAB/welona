import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { getDefaultWarehouseId } from '@/lib/warehouse';
import { depleteBatchStockFEFO } from '@/lib/batch';
import { applyConsumableUsage } from '@/lib/service-inventory';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dba = db as any;

type Ctx = { params: { id: string; itemId: string; sessionId: string } };

const productLineSchema = z.object({
  productId:   z.string().min(1),
  productName: z.string().min(1),
  quantity:    z.number().positive(),
  uom:         z.string().optional(),
});

const sessionUpdateSchema = z.object({
  action:      z.enum(['start', 'complete', 'update']).optional(),
  sessionDate: z.string().datetime().optional(),
  staffId:     z.string().optional().nullable(),
  staffName:   z.string().trim().max(200).optional(),
  status:      z.enum(['pending', 'in_progress', 'completed', 'no_show', 'cancelled', 'rescheduled']).optional(),
  remarks:     z.string().trim().max(1000).optional().nullable(),
  products:    z.array(productLineSchema).optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeResult(result: any) {
  return {
    id:              result.id,
    bookingId:       result.bookingId,
    bookingItemId:   result.bookingItemId,
    serviceName:     result.serviceName,
    sessionNumber:   result.sessionNumber,
    sessionDate:     result.sessionDate instanceof Date ? result.sessionDate.toISOString() : result.sessionDate,
    staffId:         result.staffId,
    staffName:       result.staffName,
    status:          result.status,
    remarks:         result.remarks,
    startTime:       result.startTime ? (result.startTime instanceof Date ? result.startTime.toISOString() : result.startTime) : null,
    endTime:         result.endTime   ? (result.endTime   instanceof Date ? result.endTime.toISOString()   : result.endTime)   : null,
    durationMinutes: result.durationMinutes ?? null,
    products:        (result.products ?? []).map((p: any) => ({
      id: p.id, productId: p.productId, productName: p.productName, quantity: p.quantity, uom: p.uom,
    })),
    createdAt: result.createdAt instanceof Date ? result.createdAt.toISOString() : result.createdAt,
  };
}

/** PATCH /api/v1/customers/[id]/bookings/[itemId]/sessions/[sessionId] */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'bookings:create');

  const session = await dba.bookingSession.findFirst({
    where:   { id: params.sessionId, bookingId: params.itemId },
    include: { products: true },
  });
  if (!session) throw Errors.notFound('Session');

  const booking = await db.booking.findFirst({
    where: { id: params.itemId, customerId: params.id, orgId: claims.orgId },
  });
  if (!booking) throw Errors.notFound('Booking');

  const body = await parseBody(req, sessionUpdateSchema);
  const now  = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};

  /* ── START ── */
  if (body.action === 'start') {
    if (session.status !== 'pending') throw Errors.conflict('Session has already been started');
    data.status    = 'in_progress';
    data.startTime = now;
    if (body.staffId)               data.staffId   = body.staffId;
    if (body.staffName)             data.staffName = body.staffName;
    if (body.remarks !== undefined) data.remarks   = body.remarks;
    if (body.products !== undefined) {
      data.products = {
        deleteMany: {},
        create: body.products.map((p) => ({
          productId: p.productId, productName: p.productName, quantity: p.quantity, uom: p.uom ?? null,
        })),
      };
    }
    const updated = await dba.bookingSession.update({ where: { id: params.sessionId }, data, include: { products: true } });
    return ok(serializeResult(updated));
  }

  /* ── COMPLETE ── */
  if (body.action === 'complete') {
    if (session.status !== 'in_progress') throw Errors.conflict('Session must be in progress to complete');
    data.status  = 'completed';
    data.endTime = now;
    const startMs = session.startTime ? new Date(session.startTime).getTime() : now.getTime();
    data.durationMinutes = Math.round((now.getTime() - startMs) / 60000);
    if (body.remarks !== undefined) data.remarks = body.remarks;

    const result = await db.$transaction(async (tx) => {
      const txA = tx as any;
      if (body.products !== undefined) {
        data.products = {
          deleteMany: {},
          create: body.products.map((p) => ({
            productId: p.productId, productName: p.productName, quantity: p.quantity, uom: p.uom ?? null,
          })),
        };
      }
      const updated = await txA.bookingSession.update({ where: { id: params.sessionId }, data, include: { products: true } });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productsToDeduct: any[] = body.products ?? session.products;
      if (productsToDeduct.length > 0 && booking.branchId) {
        const warehouseId = await getDefaultWarehouseId(tx, booking.branchId);
        const productIds  = productsToDeduct.map((p: any) => p.productId);
        const productRows = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, trackBatches: true, consumptionUom: true, unitsPerPurchase: true },
        });
        const productMeta = new Map(productRows.map((p) => [p.id, p]));
        for (const line of productsToDeduct) {
          const qty  = line.quantity;
          const meta = productMeta.get(line.productId);
          const isConsumable = !!(meta?.consumptionUom) && (meta?.unitsPerPurchase ?? 1) > 1;
          if (isConsumable) {
            await applyConsumableUsage(tx, {
              productId: line.productId, branchId: booking.branchId!,
              quantityUsed: qty, bookingId: booking.id, sessionRef: session.id, force: true,
            });
          } else {
            await tx.inventoryStock.upsert({
              where:  { warehouseId_productId: { warehouseId, productId: line.productId } },
              create: { branchId: booking.branchId!, warehouseId, productId: line.productId, quantity: 0 },
              update: {},
            });
            await tx.inventoryStock.update({
              where: { warehouseId_productId: { warehouseId, productId: line.productId } },
              data:  { quantity: { decrement: qty } },
            });
            if (meta?.trackBatches) {
              await depleteBatchStockFEFO(tx, { productId: line.productId, warehouseId, quantity: qty, force: true });
            }
            await tx.inventoryMovement.create({
              data: {
                branchId: booking.branchId!, warehouseId, productId: line.productId,
                type: 'service_consumption', delta: -qty,
                reason: `Session #${session.sessionNumber} (${session.serviceName ?? 'booking'})`,
                ref: session.id, createdByAdminId: null,
              },
            });
          }
        }
      }
      return updated;
    });
    return ok(serializeResult(result));
  }

  /* ── GENERIC UPDATE ── */
  // Resolve staff name if staffId provided
  let resolvedStaffName = body.staffName ?? session.staffName;
  if (body.staffId) {
    const emp = await db.employee.findUnique({ where: { id: body.staffId }, select: { name: true } });
    if (emp) resolvedStaffName = emp.name;
  } else if (body.staffId === null) {
    resolvedStaffName = null;
  }

  if (body.sessionDate)             data.sessionDate = new Date(body.sessionDate);
  if (body.staffId !== undefined)   data.staffId     = body.staffId ?? null;
  if (resolvedStaffName !== undefined) data.staffName = resolvedStaffName;
  if (body.status !== undefined)    data.status      = body.status;
  if (body.remarks !== undefined)   data.remarks     = body.remarks || null;

  const wasCompleted = session.status === 'completed';
  const nowCompleted = (body.status ?? session.status) === 'completed';
  // Fall back to the session's stored products when completing without an explicit product list
  const newProducts  = body.products ?? (!wasCompleted && nowCompleted ? (session.products ?? []) : []);
  const shouldDeduct = !wasCompleted && nowCompleted && newProducts.length > 0 && booking?.branchId;

  if (body.products !== undefined) {
    data.products = {
      deleteMany: {},
      create: newProducts.map((p) => ({
        productId: p.productId, productName: p.productName, quantity: p.quantity, uom: p.uom ?? null,
      })),
    };
  }

  const result = await db.$transaction(async (tx) => {
    const txA = tx as any;
    const updated = await txA.bookingSession.update({ where: { id: params.sessionId }, data, include: { products: true } });

    if (shouldDeduct) {
      const warehouseId = await getDefaultWarehouseId(tx, booking!.branchId!);
      const productIds  = newProducts.map((p) => p.productId);
      const productRows = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, trackBatches: true, consumptionUom: true, unitsPerPurchase: true },
      });
      const productMeta = new Map(productRows.map((p) => [p.id, p]));
      for (const line of newProducts) {
        const qty  = line.quantity;
        const meta = productMeta.get(line.productId);
        const isConsumable = !!(meta?.consumptionUom) && (meta?.unitsPerPurchase ?? 1) > 1;
        if (isConsumable) {
          await applyConsumableUsage(tx, {
            productId: line.productId, branchId: booking!.branchId!,
            quantityUsed: qty, bookingId: booking!.id, sessionRef: params.sessionId, force: true,
          });
        } else {
          await tx.inventoryStock.upsert({
            where:  { warehouseId_productId: { warehouseId, productId: line.productId } },
            create: { branchId: booking!.branchId!, warehouseId, productId: line.productId, quantity: 0 },
            update: {},
          });
          await tx.inventoryStock.update({
            where: { warehouseId_productId: { warehouseId, productId: line.productId } },
            data:  { quantity: { decrement: qty } },
          });
          if (meta?.trackBatches) {
            await depleteBatchStockFEFO(tx, { productId: line.productId, warehouseId, quantity: qty, force: true });
          }
          await tx.inventoryMovement.create({
            data: {
              branchId: booking!.branchId!, warehouseId, productId: line.productId,
              type: 'service_consumption', delta: -qty,
              reason: `Session #${session.sessionNumber} (edit)`,
              ref: params.sessionId, createdByAdminId: null,
            },
          });
        }
      }
    }
    return updated;
  });

  return ok(serializeResult(result));
});
