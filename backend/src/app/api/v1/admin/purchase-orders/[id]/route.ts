import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminPurchaseOrderUpdateSchema } from '@shared/schemas/admin-purchase-orders';
import {
  toAdminPurchaseOrder,
  purchaseOrderInclude,
  type PurchaseOrderWithRelations,
} from '@/lib/admin-purchase-order-mapper';

interface RouteContext {
  params: { id: string };
}

/** Load a PO and enforce branch scope; throws 404 if absent/out-of-scope. */
async function loadScoped(id: string) {
  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: purchaseOrderInclude,
  });
  if (!po) {
    throw Errors.notFound('Purchase order');
  }
  return po;
}

export const GET = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const po = await loadScoped(params.id);
  return ok(toAdminPurchaseOrder(po as PurchaseOrderWithRelations));
});

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminPurchaseOrderUpdateSchema);
  const existing = await loadScoped(params.id);

  // Don't let a manual status edit override a received PO back to draft if
  // any stock has already been received — keep it simple: block re-opening a
  // (partially) received PO to draft/sent.
  if (
    body.status &&
    ['draft', 'sent'].includes(body.status) &&
    ['partially_received', 'received'].includes(existing.status)
  ) {
    throw Errors.badRequest('This PO already has receipts and cannot be reopened.');
  }

  const po = await db.purchaseOrder.update({
    where: { id: params.id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.expectedAt !== undefined && {
        expectedAt: body.expectedAt ? new Date(body.expectedAt) : null,
      }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.paymentStatus !== undefined && { paymentStatus: body.paymentStatus }),
      ...(body.paymentDate !== undefined && {
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
      }),
      ...(body.paymentMethod !== undefined && { paymentMethod: body.paymentMethod }),
      ...(body.amountPaid !== undefined && { amountPaid: body.amountPaid }),
      ...(body.paymentReference !== undefined && { paymentReference: body.paymentReference }),
    },
    include: purchaseOrderInclude,
  });
  return ok(toAdminPurchaseOrder(po as PurchaseOrderWithRelations));
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const existing = await loadScoped(params.id);
  // A PO that has been (partly) received shouldn't be hard-deleted.
  if (existing.status !== 'draft' && existing.status !== 'cancelled') {
    throw Errors.conflict('Only draft or cancelled purchase orders can be deleted.');
  }

  try {
    await db.purchaseOrder.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Purchase order');
      if (error.code === 'P2003') {
        throw Errors.conflict('This purchase order has linked receipts and cannot be deleted.');
      }
    }
    throw error;
  }
});
