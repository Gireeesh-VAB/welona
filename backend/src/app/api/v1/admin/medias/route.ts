import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminMediaCreateSchema, adminMediaListQuerySchema } from '@shared/schemas/admin-medias';
import { toAdminMedia } from '@/lib/admin-media-mapper';

/**
 * Admin master-data: lead-source / marketing channels (media).
 *
 * GET  /api/v1/admin/medias?search=&zoneId=&page=&limit=
 * POST /api/v1/admin/medias
 */
export const GET = route(async (req) => {
  // Org-wide reference data; branch sessions read it. Writes stay admin-only.
  requireAdminAuth(req);
  const { search, zoneId, page, limit } = parseQuery(req, adminMediaListQuerySchema);

  const where: Prisma.MediaWhereInput = {
    ...(zoneId && { zoneId }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { remarks: { contains: search } },
        { ipAddress: { contains: search } },
        { zone: { stateName: { contains: search } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.media.findMany({
      where,
      include: { zone: true, createdByAdmin: true },
      orderBy: [{ zone: { stateName: 'asc' } }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.media.count({ where }),
  ]);

  return ok(items.map(toAdminMedia), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminMediaCreateSchema);

  const zone = await db.zone.findUnique({ where: { id: body.zoneId } });
  if (!zone) throw Errors.badRequest('Selected zone no longer exists.');

  try {
    const row = await db.media.create({
      data: {
        zoneId: body.zoneId,
        name: body.name,
        remarks: body.remarks ?? null,
        ipAddress: body.ipAddress ?? null,
        isActive: body.isActive,
        createdByAdminId: claims.sub,
      },
      include: { zone: true, createdByAdmin: true },
    });
    return created(toAdminMedia(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw Errors.conflict(
        `A media named "${body.name}" already exists for ${zone.stateName}.`,
      );
    }
    throw error;
  }
});
