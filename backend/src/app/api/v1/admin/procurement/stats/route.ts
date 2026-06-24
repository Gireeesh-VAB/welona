import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAdminAuth } from '@/lib/auth/service';

export const GET = route(async (req) => {
  requireAdminAuth(req);

  const [
    totalSuppliers,
    openPOs,
    pendingDeliveries,
    pendingBills,
    pendingPayments,
    purchaseValueResult,
  ] = await Promise.all([
    db.supplier.count({ where: { isActive: true } }),
    db.purchaseOrder.count({ where: { status: { in: ['draft', 'sent'] } } }),
    db.purchaseOrder.count({ where: { status: { in: ['sent', 'partially_received'] } } }),
    db.goodsReceipt.count({ where: { invoiceNumber: null } }),
    db.purchaseOrder.count({
      where: {
        status: { in: ['partially_received', 'received'] },
        OR: [{ paymentStatus: null }, { paymentStatus: { not: 'paid' } }],
      },
    }),
    db.purchaseOrder.aggregate({
      where: { status: { not: 'cancelled' } },
      _sum: { total: true },
    }),
  ]);

  return ok({
    totalSuppliers,
    openPOs,
    pendingDeliveries,
    pendingBills,
    pendingPayments,
    totalPurchaseValue: purchaseValueResult._sum.total ?? 0,
  });
});
