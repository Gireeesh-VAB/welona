import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminMediaUpdateSchema } from '@/lib/admin-medias';
import { toAdminMedia } from '@/lib/admin-media-mapper';

interface RouteContext {
  params: { id: string };
}

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminMediaUpdateSchema);

  if (body.zoneId !== undefined) {
    const zone = await db.zone.findUnique({ where: { id: body.zoneId } });
    if (!zone) throw Errors.badRequest('Selected zone no longer exists.');
  }

  try {
    const row = await db.media.update({
      where: { id: params.id },
      data: {
        ...(body.zoneId !== undefined && { zoneId: body.zoneId }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.remarks !== undefined && { remarks: body.remarks ?? null }),
        ...(body.ipAddress !== undefined && { ipAddress: body.ipAddress ?? null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: { zone: true, createdByAdmin: true },
    });
    return ok(toAdminMedia(row));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Media');
      if (error.code === 'P2002') {
        throw Errors.conflict('A media with this name already exists in this zone.');
      }
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.media.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Media');
    }
    throw error;
  }
});
