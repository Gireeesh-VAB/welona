import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { zoneUpdateSchema } from '@shared/schemas/zones';

interface RouteContext {
  params: { id: string };
}

/**
 * Admin master-data: zone item.
 *
 * PUT    /api/v1/admin/zones/:id — update a zone.
 * DELETE /api/v1/admin/zones/:id — delete a zone.
 */
export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, zoneUpdateSchema);

  try {
    const zone = await db.zone.update({
      where: { id: params.id },
      data: {
        ...(body.country !== undefined && { country: body.country }),
        ...(body.stateName !== undefined && { stateName: body.stateName }),
        ...(body.remarks !== undefined && { remarks: body.remarks ?? null }),
      },
    });
    return ok(zone);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Zone');
      if (error.code === 'P2002') {
        throw Errors.conflict('A zone with the same country and state already exists.');
      }
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);

  try {
    await db.zone.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Zone');
    }
    throw error;
  }
});
