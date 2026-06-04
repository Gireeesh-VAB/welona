import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth, requireAdminOrBranchAuth } from '@/lib/auth/service';
import {
  adminLeaveTypeCreateSchema,
  adminLeaveTypeListQuerySchema,
} from '@shared/schemas/admin-leave-types';
import { toAdminLeaveType } from '@/lib/admin-leave-type-mapper';

export const GET = route(async (req) => {
  // Leave types are org-wide reference data; branch sessions read them (e.g. on
  // the Leaves page) but only admins manage them (POST/PUT/DELETE stay admin).
  requireAdminOrBranchAuth(req);
  const { search, page, limit } = parseQuery(req, adminLeaveTypeListQuerySchema);

  const where: Prisma.LeaveTypeWhereInput = search
    ? {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
          { description: { contains: search } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    db.leaveType.findMany({
      where,
      include: { createdByAdmin: true },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.leaveType.count({ where }),
  ]);

  return ok(items.map(toAdminLeaveType), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminLeaveTypeCreateSchema);

  try {
    const row = await db.leaveType.create({
      data: {
        name: body.name,
        code: body.code,
        daysPerYear: body.daysPerYear,
        paid: body.paid,
        description: body.description ?? null,
        isActive: true,
        createdByAdminId: claims.sub,
      },
      include: { createdByAdmin: true },
    });
    return created(toAdminLeaveType(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const field = (error.meta?.target as string[] | undefined)?.includes('code')
        ? 'code'
        : 'name';
      throw Errors.conflict(`A leave type with this ${field} already exists.`);
    }
    throw error;
  }
});
