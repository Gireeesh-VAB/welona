import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth, requireAdminOrBranchAuth } from '@/lib/auth/service';
import {
  adminPaymentModeCreateSchema,
  adminPaymentModeListQuerySchema,
} from '@shared/schemas/admin-payment-modes';
import { toAdminPaymentMode } from '@/lib/admin-payment-mode-mapper';

/**
 * Admin master-data: payment modes (Cash / Cheque / Card / EMI providers / etc.).
 *
 * GET  /api/v1/admin/payment-modes?search=&active=&page=&limit=
 * POST /api/v1/admin/payment-modes
 */
export const GET = route(async (req) => {
  // Org-wide reference data; branch sessions read it. Writes stay admin-only.
  requireAdminOrBranchAuth(req);
  const { search, active, page, limit } = parseQuery(req, adminPaymentModeListQuerySchema);

  const where: Prisma.PaymentModeWhereInput = {
    ...(active === 'active' && { isActive: true }),
    ...(active === 'inactive' && { isActive: false }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { remarks: { contains: search } },
        { ipAddress: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.paymentMode.findMany({
      where,
      include: { createdByAdmin: true },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.paymentMode.count({ where }),
  ]);

  return ok(items.map(toAdminPaymentMode), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminPaymentModeCreateSchema);

  try {
    const row = await db.paymentMode.create({
      data: {
        name: body.name,
        remarks: body.remarks ?? null,
        ipAddress: body.ipAddress ?? null,
        isActive: body.isActive,
        createdByAdminId: claims.sub,
      },
      include: { createdByAdmin: true },
    });
    return created(toAdminPaymentMode(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw Errors.conflict(`A payment mode named "${body.name}" already exists.`);
    }
    throw error;
  }
});
