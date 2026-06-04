import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth, requireAdminOrBranchAuth } from '@/lib/auth/service';
import {
  adminSupplierCreateSchema,
  adminSupplierListQuerySchema,
} from '@shared/schemas/admin-suppliers';
import { toAdminSupplier } from '@/lib/admin-supplier-mapper';
import { readClientIp } from '@/lib/client-ip';
import { recordAudit, actorFromClaims } from '@/lib/audit';

/**
 * Admin master-data: suppliers (procurement).
 *
 * GET  /api/v1/admin/suppliers?search=&active=&page=&limit=
 * POST /api/v1/admin/suppliers
 */
export const GET = route(async (req) => {
  // Org-wide reference data; branch sessions read it. Writes stay admin-only.
  requireAdminOrBranchAuth(req);
  const { search, active, page, limit } = parseQuery(req, adminSupplierListQuerySchema);

  const where: Prisma.SupplierWhereInput = {
    ...(active === 'active' && { isActive: true }),
    ...(active === 'inactive' && { isActive: false }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { code: { contains: search } },
        { contactPerson: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { gstin: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.supplier.findMany({
      where,
      include: { createdByAdmin: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.supplier.count({ where }),
  ]);

  return ok(items.map(toAdminSupplier), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminSupplierCreateSchema);
  const ip = readClientIp(req);

  try {
    const row = await db.supplier.create({
      data: {
        name: body.name,
        code: body.code,
        contactPerson: body.contactPerson ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        gstin: body.gstin ?? null,
        address: body.address ?? null,
        paymentTerms: body.paymentTerms ?? null,
        isActive: body.isActive,
        ipAddress: ip,
        createdByAdminId: claims.sub,
      },
      include: { createdByAdmin: true },
    });
    await recordAudit({
      actor: actorFromClaims(claims),
      action: 'create',
      entity: 'supplier',
      entityId: row.id,
      summary: `Created supplier ${row.name} (${row.code})`,
    });
    return created(toAdminSupplier(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw Errors.conflict(`A supplier with code "${body.code}" already exists.`);
    }
    throw error;
  }
});
