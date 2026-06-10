import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminGstRateUpdateSchema } from '@shared/schemas/admin-gst-rates';
import { toAdminGstRate } from '@/lib/admin-gst-rate-mapper';

interface Ctx { params: { id: string } }

export const PUT = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminGstRateUpdateSchema);
  try {
    const rate = await db.gstRate.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.percentage !== undefined && { percentage: body.percentage }),
        ...(body.taxType !== undefined && { taxType: body.taxType }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    return ok(toAdminGstRate(rate));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') throw Errors.notFound('GST Rate');
    }
    throw e;
  }
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.gstRate.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') throw Errors.notFound('GST Rate');
      if (e.code === 'P2003') throw Errors.conflict('This GST rate is used in bookings and cannot be deleted.');
    }
    throw e;
  }
});
