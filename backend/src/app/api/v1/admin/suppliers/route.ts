import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
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
  requireAdminAuth(req);
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
      include: {
        createdByAdmin: true,
        _count: { select: { supplierProducts: true } },
      },
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
    const row = await db.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
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
        include: {
          createdByAdmin: true,
          _count: { select: { supplierProducts: true } },
        },
      });

      if (body.products && body.products.length > 0) {
        await tx.supplierProduct.createMany({
          data: body.products.map((p) => ({
            supplierId: supplier.id,
            productId: p.productId,
            unitPrice: p.unitPrice ?? null,
            leadTimeDays: p.leadTimeDays ?? null,
            moq: p.moq ?? null,
            notes: p.notes ?? null,
            isActive: p.isActive,
          })),
        });
      }

      return supplier;
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
