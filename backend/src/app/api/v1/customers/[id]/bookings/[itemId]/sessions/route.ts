import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { getDefaultWarehouseId } from '@/lib/warehouse';
import { depleteBatchStockFEFO } from '@/lib/batch';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dba = db as any;

type Ctx = { params: { id: string; itemId: string } };

const productLineSchema = z.object({
  productId:   z.string().min(1),
  productName: z.string().min(1),
  quantity:    z.number().positive(),
  uom:         z.string().optional(),
});

const sessionCreateSchema = z.object({
  bookingItemId: z.string().optional(),
  serviceName:   z.string().optional(),
  sessionDate:   z.string().datetime(),
  staffId:       z.string().optional(),
  staffName:     z.string().trim().max(200).optional(),
  status:        z.enum(['pending', 'in_progress', 'completed', 'no_show', 'cancelled', 'rescheduled']).default('pending'),
  remarks:       z.string().trim().max(1000).optional(),
  startTime:     z.string().datetime().optional(),
  endTime:       z.string().datetime().optional(),
  products:      z.array(productLineSchema).default([]),
});

async function requireBooking(orgId: string, customerId: string, bookingId: string) {
  const booking = await db.booking.findFirst({
    where:   { id: bookingId, customerId, orgId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!booking) throw Errors.notFound('Booking');
  return booking;
}

function serializeSession(e: any) {
  return {
    id:            e.id,
    bookingId:     e.bookingId,
    bookingItemId: e.bookingItemId,
    serviceName:   e.serviceName,
    sessionNumber: e.sessionNumber,
    sessionDate:   e.sessionDate instanceof Date ? e.sessionDate.toISOString() : e.sessionDate,
    staffId:        e.staffId,
    staffName:      e.staffName,
    status:         e.status,
    remarks:        e.remarks,
    startTime:      e.startTime ? (e.startTime instanceof Date ? e.startTime.toISOString() : e.startTime) : null,
    endTime:        e.endTime   ? (e.endTime   instanceof Date ? e.endTime.toISOString()   : e.endTime)   : null,
    durationMinutes: e.durationMinutes ?? null,
    products:      (e.products ?? []).map((p: any) => ({
      id:          p.id,
      productId:   p.productId,
      productName: p.productName,
      quantity:    p.quantity,
      uom:         p.uom,
    })),
    createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
  };
}

/**
 * GET /api/v1/customers/[id]/bookings/[itemId]/sessions
 * Returns all sessions for the booking, plus the booking items so the
 * frontend can build the service summary table (Total / Taken / Balance).
 */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'bookings:read');
  const booking = await requireBooking(claims.orgId, params.id, params.itemId);

  const sessions = await dba.bookingSession.findMany({
    where:   { bookingId: params.itemId },
    include: { products: true },
    orderBy: { sessionNumber: 'asc' },
  });

  // For session-based items with quantity=1 (old bookings), look up the
  // PackageSessionMaster by service name to recover the real session count.
  const sessionBasedOld = booking.items.filter(
    (it: any) => it.isSessionBased && it.quantity === 1,
  );
  const masterMap = new Map<string, number>();
  if (sessionBasedOld.length > 0) {
    const names = sessionBasedOld.map((it: any) => it.service);
    const masters = await dba.packageSessionMaster.findMany({
      where: { orgId: claims.orgId, name: { in: names } },
      select: { name: true, defaultSessions: true },
    });
    for (const m of masters) masterMap.set(m.name, m.defaultSessions);
  }

  // If no BookingItem rows exist (flat/legacy booking), synthesise one from serviceName
  const items = booking.items.length > 0
    ? booking.items.map((it: any) => {
        let qty = it.quantity;
        if (it.isSessionBased && qty === 1 && masterMap.has(it.service)) {
          qty = masterMap.get(it.service)!;
        }
        return {
          id:             it.id,
          service:        it.service,
          category:       it.category,
          quantity:       qty,
          isSessionBased: it.isSessionBased ?? false,
        };
      })
    : [{
        id:             booking.id,
        service:        (booking as any).serviceName ?? 'Service',
        category:       null,
        quantity:       1,
        isSessionBased: false,
      }];

  return ok({ items, sessions: sessions.map(serializeSession) });
});

/** POST /api/v1/customers/[id]/bookings/[itemId]/sessions */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'bookings:create');
  const booking = await requireBooking(claims.orgId, params.id, params.itemId);

  const body = await parseBody(req, sessionCreateSchema);

  // Resolve staff name from Employee if staffId provided
  let resolvedStaffName = body.staffName ?? null;
  if (body.staffId) {
    const emp = await db.employee.findUnique({ where: { id: body.staffId }, select: { name: true } });
    if (emp) resolvedStaffName = emp.name;
  }

  // Enforce session cap: count active/completed sessions vs the real session count.
  // For old bookings with quantity=1, look up the package master's defaultSessions.
  if (body.bookingItemId) {
    const item = booking.items.find((it: any) => it.id === body.bookingItemId);
    if (item) {
      let sessionCap = item.quantity;
      if (item.isSessionBased && sessionCap === 1) {
        const master = await dba.packageSessionMaster.findFirst({
          where: { orgId: claims.orgId, name: item.service },
          select: { defaultSessions: true },
        });
        if (master) sessionCap = master.defaultSessions;
      }
      const completedCount = await dba.bookingSession.count({
        where: { bookingId: params.itemId, bookingItemId: body.bookingItemId, status: { in: ['in_progress', 'completed'] } },
      });
      if (completedCount >= sessionCap) {
        throw Errors.conflict(`All ${sessionCap} session(s) for "${item.service}" have already been taken.`);
      }
    }
  }

  const result = await db.$transaction(async (tx) => {
    const txA = tx as any;

    // Session number is per booking-item so each service tracks its own count
    const last = await txA.bookingSession.findFirst({
      where:   { bookingId: params.itemId, bookingItemId: body.bookingItemId ?? null },
      orderBy: { sessionNumber: 'desc' },
      select:  { sessionNumber: true },
    });
    const sessionNumber = (last?.sessionNumber ?? 0) + 1;

    const session = await txA.bookingSession.create({
      data: {
        orgId:         claims.orgId,
        bookingId:     params.itemId,
        bookingItemId: body.bookingItemId ?? null,
        serviceName:   body.serviceName ?? null,
        sessionNumber,
        sessionDate:   new Date(body.sessionDate),
        startTime:     body.startTime ? new Date(body.startTime) : (body.status === 'in_progress' ? new Date() : null),
        staffId:       body.staffId ?? null,
        staffName:     resolvedStaffName,
        status:        body.status,
        remarks:       body.remarks ?? null,
        createdById:   claims.sub,
        products: body.products.length > 0 ? {
          create: body.products.map((p) => ({
            productId:   p.productId,
            productName: p.productName,
            quantity:    p.quantity,
            uom:         p.uom ?? null,
          })),
        } : undefined,
      },
      include: { products: true },
    });

    // Deduct extra products from inventory when session is completed
    if (body.status === 'completed' && body.products.length > 0 && booking.branchId) {
      const warehouseId = await getDefaultWarehouseId(tx, booking.branchId);
      const productIds  = body.products.map((p) => p.productId);
      const productRows = await tx.product.findMany({
        where:  { id: { in: productIds } },
        select: { id: true, trackBatches: true },
      });
      const trackMap = new Map(productRows.map((p) => [p.id, p.trackBatches]));

      for (const line of body.products) {
        const qty = line.quantity;
        await tx.inventoryStock.upsert({
          where:  { warehouseId_productId: { warehouseId, productId: line.productId } },
          create: { branchId: booking.branchId!, warehouseId, productId: line.productId, quantity: 0 },
          update: {},
        });
        await tx.inventoryStock.update({
          where: { warehouseId_productId: { warehouseId, productId: line.productId } },
          data:  { quantity: { decrement: qty } },
        });
        if (trackMap.get(line.productId)) {
          await depleteBatchStockFEFO(tx, { productId: line.productId, warehouseId, quantity: qty, force: true });
        }
        await tx.inventoryMovement.create({
          data: {
            branchId:        booking.branchId!,
            warehouseId,
            productId:       line.productId,
            type:            'service_consumption',
            delta:           -qty,
            reason:          `Session #${sessionNumber} extra product (${body.serviceName ?? 'booking'})`,
            ref:             session.id,
            createdByAdminId: null,
          },
        });
      }
    }

    return session;
  });

  return created(serializeSession(result));
});
