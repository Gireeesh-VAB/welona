import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { zoneCreateSchema, zoneListQuerySchema } from '@shared/schemas/zones';

/**
 * Admin master-data: zones.
 *
 * GET  /api/v1/admin/zones?search=&page=&limit= — paginated, searchable list.
 * POST /api/v1/admin/zones                      — create a new zone.
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, page, limit } = parseQuery(req, zoneListQuerySchema);

  const where: Prisma.ZoneWhereInput = search
    ? {
        OR: [
          { country: { contains: search } },
          { stateName: { contains: search } },
          { remarks: { contains: search } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    db.zone.findMany({
      where,
      orderBy: [{ country: 'asc' }, { stateName: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.zone.count({ where }),
  ]);

  return ok(items, buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  requireAdminAuth(req);
  const body = await parseBody(req, zoneCreateSchema);

  try {
    const zone = await db.zone.create({
      data: {
        country: body.country,
        stateName: body.stateName,
        remarks: body.remarks ?? null,
      },
    });
    return created(zone);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw Errors.conflict(
        `A zone for ${body.country} / ${body.stateName} already exists.`,
      );
    }
    throw error;
  }
});
