import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminTaxUpdateSchema } from '@/lib/admin-taxes';
import { toAdminTax } from '@/lib/admin-tax-mapper';

interface RouteContext {
  params: { id: string };
}

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminTaxUpdateSchema);

  try {
    const row = await db.tax.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.percentBps !== undefined && { percentBps: body.percentBps }),
        ...(body.remarks !== undefined && { remarks: body.remarks ?? null }),
        ...(body.ipAddress !== undefined && { ipAddress: body.ipAddress ?? null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: { createdByAdmin: true },
    });
    return ok(toAdminTax(row));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Tax');
      if (error.code === 'P2002') {
        throw Errors.conflict('A tax with this name already exists.');
      }
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.tax.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Tax');
    }
    throw error;
  }
});
