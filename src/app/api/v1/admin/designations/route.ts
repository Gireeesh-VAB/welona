import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminDesignationCreateSchema,
  adminDesignationListQuerySchema,
} from '@/lib/admin-designations';
import { toAdminDesignation } from '@/lib/admin-designation-mapper';
import { readClientIp } from '@/lib/client-ip';

/**
 * Admin master-data: designations (job titles).
 *
 * GET  /api/v1/admin/designations?search=&page=&limit=
 * POST /api/v1/admin/designations
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, page, limit } = parseQuery(req, adminDesignationListQuerySchema);

  const where: Prisma.DesignationWhereInput = search
    ? {
        OR: [
          { name: { contains: search } },
          { remarks: { contains: search } },
          { ipAddress: { contains: search } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    db.designation.findMany({
      where,
      include: { createdByAdmin: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.designation.count({ where }),
  ]);

  return ok(items.map(toAdminDesignation), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminDesignationCreateSchema);
  const ip = readClientIp(req);

  try {
    const row = await db.designation.create({
      data: {
        name: body.name,
        remarks: body.remarks ?? null,
        ipAddress: ip,
        isActive: true,
        createdByAdminId: claims.sub,
      },
      include: { createdByAdmin: true },
    });
    return created(toAdminDesignation(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw Errors.conflict(`A designation named "${body.name}" already exists.`);
    }
    throw error;
  }
});
