import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminLedgerCreateSchema,
  adminLedgerListQuerySchema,
} from '@shared/schemas/admin-ledgers';
import { toAdminLedger } from '@/lib/admin-ledger-mapper';

/**
 * Admin master-data: ledgers (chart of accounts).
 *
 * GET  /api/v1/admin/ledgers?search=&group=&active=&page=&limit=
 * POST /api/v1/admin/ledgers
 */
export const GET = route(async (req) => {
  // Org-wide reference data; branch sessions read it. Writes stay admin-only.
  requireAdminAuth(req);
  const { search, group, active, page, limit } = parseQuery(
    req,
    adminLedgerListQuerySchema,
  );

  const where: Prisma.LedgerWhereInput = {
    ...(group && { group }),
    ...(active === 'active' && { isActive: true }),
    ...(active === 'inactive' && { isActive: false }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { gstNumber: { contains: search } },
        { description: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.ledger.findMany({
      where,
      include: { createdByAdmin: true },
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.ledger.count({ where }),
  ]);

  return ok(items.map(toAdminLedger), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminLedgerCreateSchema);

  try {
    const row = await db.ledger.create({
      data: {
        name: body.name,
        group: body.group,
        openingBalance: body.openingBalance,
        balanceType: body.balanceType,
        description: body.description ?? null,
        gstNumber: body.gstNumber ?? null,
        isActive: body.isActive,
        createdByAdminId: claims.sub,
      },
      include: { createdByAdmin: true },
    });
    return created(toAdminLedger(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw Errors.conflict(`A ledger named "${body.name}" already exists.`);
    }
    throw error;
  }
});
