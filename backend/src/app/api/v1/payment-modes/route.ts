import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/service';

/**
 * GET /api/v1/payment-modes
 * Returns payment modes allocated to the staff member's branch.
 * If the user is org-wide (no branchId), returns all active org payment modes.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);

  const branchId = claims.branchIds?.[0] ?? null;

  let modes: { id: string; name: string; remarks: string | null }[];

  if (branchId) {
    const rows = await db.branchPaymentMode.findMany({
      where: { branchId },
      include: { paymentMode: { select: { id: true, name: true, remarks: true, isActive: true } } },
      orderBy: { paymentMode: { name: 'asc' } },
    });
    modes = rows
      .filter((r) => r.paymentMode.isActive)
      .map((r) => ({
        id: r.paymentMode.id,
        name: r.paymentMode.name,
        remarks: r.paymentMode.remarks,
      }));
  } else {
    // org-wide staff see all active payment modes for the org
    const rows = await db.paymentMode.findMany({
      where: { isActive: true },
      select: { id: true, name: true, remarks: true },
      orderBy: { name: 'asc' },
    });
    modes = rows;
  }

  return ok(modes);
});
