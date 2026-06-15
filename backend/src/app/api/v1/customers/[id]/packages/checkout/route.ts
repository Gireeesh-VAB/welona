import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { packageCheckoutSchema } from '@shared/schemas/customer-modules';
import { nextDocumentNumber, recomputeInvoice } from '@/lib/sales/service';
import type { PrismaClient } from '@prisma/client';

type Ctx = { params: { id: string } };
type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * POST /api/v1/customers/[id]/packages/checkout
 * Atomically creates a Package + Invoice + optional Payment in one transaction.
 * The invoice is created with status='issued' so it surfaces in Pending Payments
 * when paidAmount < total.
 */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:create');

  const customer = await db.customer.findFirst({
    where: { id: params.id, orgId: claims.orgId },
  });
  if (!customer) throw Errors.notFound('Customer');

  const body = await parseBody(req, packageCheckoutSchema);
  const branchId = claims.branchIds?.[0] ?? null;

  // Snapshot the master's serviceIds before the transaction so future edits to
  // the master don't retroactively change this package's inventory mapping.
  let serviceIdsSnapshot = '[]';
  if (body.masterId) {
    const master = await (db as any).packageSessionMaster.findUnique({
      where: { id: body.masterId },
      select: { serviceIds: true },
    });
    serviceIdsSnapshot = master?.serviceIds ?? '[]';
  }

  const result = await db.$transaction(async (tx: Tx) => {
    // 1 — Create the Package record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pkg = await (tx as any).package.create({
      data: {
        orgId:               claims.orgId,
        customerId:          customer.id,
        branchId,
        masterId:            body.masterId ?? null,
        serviceIdsSnapshot,
        name:                body.name,
        totalSessions: body.totalSessions,
        usedSessions:  0,
        price:         body.price,
        purchasedAt:   new Date(),
        expiresAt:     body.expiresAt ? new Date(body.expiresAt) : null,
        status:        'active',
        notes:         body.notes || null,
        createdById:   claims.sub,
      },
    });

    // 2 — Create the Invoice (status='issued' so it shows in Pending Payments)
    const number = await nextDocumentNumber(tx, claims.orgId, 'invoice', 'INV');
    const invoice = await tx.invoice.create({
      data: {
        orgId:      claims.orgId,
        branchId,
        number,
        customerId: customer.id,
        packageId:  pkg.id,
        status:     'issued',
        issuedAt:   new Date(),
        subtotal:   body.price,
        taxAmt:     0,
        total:      body.price,
        amountPaid: 0,
        dueAt:      body.expiresAt ? new Date(body.expiresAt) : null,
        notes:      `Package: ${body.name} (${body.totalSessions} sessions)`,
      },
    });

    // 3 — Record payment if any amount was paid up-front
    if (body.paidAmount > 0) {
      await tx.payment.create({
        data: {
          orgId:       claims.orgId,
          invoiceId:   invoice.id,
          amount:      body.paidAmount,
          method:      body.paymentMethod,
          reference:   body.paymentRef || null,
          receivedAt:  new Date(),
          recordedById: claims.sub,
        },
      });
      await recomputeInvoice(tx, invoice.id);
    }

    const finalInvoice = await tx.invoice.findUnique({ where: { id: invoice.id } });
    return { package: pkg, invoice: finalInvoice };
  });

  return created(result);
});
