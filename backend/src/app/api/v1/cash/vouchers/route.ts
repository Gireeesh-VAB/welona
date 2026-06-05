import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { nextDocumentNumber } from '@/lib/sales/service';
import { voucherCreateSchema } from '@shared/schemas/cash';

/** GET /api/v1/cash/vouchers — accounting vouchers, newest first. */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'finance:read');

  const rows = await db.voucher.findMany({
    where: { orgId: claims.orgId, ...(claims.branchIds[0] ? { branchId: claims.branchIds[0] } : {}) },
    orderBy: { voucherDate: 'desc' },
    take: 200,
  });

  return ok(
    rows.map((r) => ({
      id: r.id,
      number: r.number,
      voucherType: r.voucherType,
      voucherDate: r.voucherDate.toISOString(),
      party: r.party,
      amount: r.amount,
      mode: r.mode,
      narration: r.narration,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

/** POST /api/v1/cash/vouchers — create a voucher with an auto number. */
export const POST = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'finance:create');
  const body = await parseBody(req, voucherCreateSchema);

  const voucher = await db.$transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, claims.orgId, 'voucher', 'VCH');
    return tx.voucher.create({
      data: {
        orgId: claims.orgId,
        number,
        voucherType: body.voucherType,
        voucherDate: body.voucherDate ? new Date(body.voucherDate) : new Date(),
        party: body.party,
        amount: body.amount,
        mode: body.mode,
        narration: body.narration || null,
        createdById: claims.sub,
      },
    });
  });
  return created(voucher);
});
