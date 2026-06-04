import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminBranchAddressCreateSchema } from '@shared/schemas/admin-branch-addresses';
import { toAdminBranchAddress } from '@/lib/admin-branch-mapper';

interface RouteContext {
  params: { id: string };
}

/**
 * GET  /api/v1/admin/branches/:id/addresses
 * POST /api/v1/admin/branches/:id/addresses
 *
 * Sibling rows of the legacy `Branch.address` field. Primary-flag is unique
 * per branch — promoting a new primary clears the flag on any existing one
 * inside the same transaction.
 */
export const GET = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const exists = await db.branch.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound('Branch');
  const rows = await db.branchAddress.findMany({
    where: { branchId: params.id },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
  return ok(rows.map(toAdminBranchAddress));
});

export const POST = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminBranchAddressCreateSchema);
  const exists = await db.branch.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound('Branch');

  const row = await db.$transaction(async (tx) => {
    if (body.isPrimary) {
      await tx.branchAddress.updateMany({
        where: { branchId: params.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    return tx.branchAddress.create({
      data: {
        branchId: params.id,
        label: body.label,
        line1: body.line1,
        line2: body.line2 ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        pincode: body.pincode ?? null,
        country: body.country ?? 'India',
        phone: body.phone ?? null,
        email: body.email ?? null,
        isPrimary: body.isPrimary,
        isActive: body.isActive,
      },
    });
  });
  return created(toAdminBranchAddress(row));
});
