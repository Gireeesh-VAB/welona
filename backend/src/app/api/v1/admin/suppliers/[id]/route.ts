import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminSupplierUpdateSchema } from '@shared/schemas/admin-suppliers';
import { toAdminSupplier } from '@/lib/admin-supplier-mapper';
import { recordAudit, actorFromClaims } from '@/lib/audit';

interface RouteContext {
  params: { id: string };
}

export const PUT = route<RouteContext>(async (req, { params }) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminSupplierUpdateSchema);

  try {
    const row = await db.supplier.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.code !== undefined && { code: body.code }),
        ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson ?? null }),
        ...(body.phone !== undefined && { phone: body.phone ?? null }),
        ...(body.email !== undefined && { email: body.email ?? null }),
        ...(body.gstin !== undefined && { gstin: body.gstin ?? null }),
        ...(body.address !== undefined && { address: body.address ?? null }),
        ...(body.paymentTerms !== undefined && { paymentTerms: body.paymentTerms ?? null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: { createdByAdmin: true },
    });
    await recordAudit({
      actor: actorFromClaims(claims),
      action: 'update',
      entity: 'supplier',
      entityId: row.id,
      summary: `Updated supplier ${row.name} (${row.code})`,
    });
    return ok(toAdminSupplier(row));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Supplier');
      if (error.code === 'P2002') {
        throw Errors.conflict('A supplier with this code already exists.');
      }
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  const claims = requireAdminAuth(req);
  try {
    await db.supplier.delete({ where: { id: params.id } });
    await recordAudit({
      actor: actorFromClaims(claims),
      action: 'delete',
      entity: 'supplier',
      entityId: params.id,
      summary: `Deleted supplier ${params.id}`,
    });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Supplier');
      if (error.code === 'P2003') {
        throw Errors.conflict(
          'This supplier is linked to purchase orders or receipts and cannot be deleted. Mark it inactive instead.',
        );
      }
    }
    throw error;
  }
});
