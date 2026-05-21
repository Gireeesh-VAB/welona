import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminTaxCreateSchema, adminTaxListQuerySchema } from '@/lib/admin-taxes';
import { toAdminTax } from '@/lib/admin-tax-mapper';

/**
 * Admin master-data: tax codes (GST / CGST / SGST / IGST / cess slabs).
 *
 * GET  /api/v1/admin/taxes?search=&page=&limit=
 * POST /api/v1/admin/taxes
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, page, limit } = parseQuery(req, adminTaxListQuerySchema);

  const where: Prisma.TaxWhereInput = search
    ? {
        OR: [
          { name: { contains: search } },
          { remarks: { contains: search } },
          { ipAddress: { contains: search } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    db.tax.findMany({
      where,
      include: { createdByAdmin: true },
      orderBy: [{ percentBps: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.tax.count({ where }),
  ]);

  return ok(items.map(toAdminTax), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminTaxCreateSchema);

  try {
    const row = await db.tax.create({
      data: {
        name: body.name,
        percentBps: body.percentBps,
        remarks: body.remarks ?? null,
        ipAddress: body.ipAddress ?? null,
        isActive: body.isActive,
        createdByAdminId: claims.sub,
      },
      include: { createdByAdmin: true },
    });
    return created(toAdminTax(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw Errors.conflict(`A tax named "${body.name}" already exists.`);
    }
    throw error;
  }
});
