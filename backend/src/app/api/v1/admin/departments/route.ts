import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminDepartmentCreateSchema,
  adminDepartmentListQuerySchema,
} from '@shared/schemas/admin-departments';
import { toAdminDepartment } from '@/lib/admin-department-mapper';
import { readClientIp } from '@/lib/client-ip';

/**
 * Admin master-data: departments.
 *
 * GET  /api/v1/admin/departments?search=&page=&limit=
 * POST /api/v1/admin/departments
 */
export const GET = route(async (req) => {
  // Org-wide reference data; branch sessions read it (filters/forms). Writes stay admin-only.
  requireAdminAuth(req);
  const { search, page, limit } = parseQuery(req, adminDepartmentListQuerySchema);

  const where: Prisma.DepartmentWhereInput = search
    ? {
        OR: [
          { name: { contains: search } },
          { remarks: { contains: search } },
          { ipAddress: { contains: search } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    db.department.findMany({
      where,
      include: { createdByAdmin: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.department.count({ where }),
  ]);

  return ok(items.map(toAdminDepartment), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminDepartmentCreateSchema);
  const ip = readClientIp(req);

  try {
    const row = await db.department.create({
      data: {
        name: body.name,
        remarks: body.remarks ?? null,
        ipAddress: ip,
        isActive: true,
        createdByAdminId: claims.sub,
      },
      include: { createdByAdmin: true },
    });
    return created(toAdminDepartment(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw Errors.conflict(`A department named "${body.name}" already exists.`);
    }
    throw error;
  }
});
