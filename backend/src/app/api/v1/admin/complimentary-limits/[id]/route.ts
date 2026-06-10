import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminBranchComplimentaryLimitUpdateSchema } from '@shared/schemas/admin-complimentary';
import {
  toAdminBranchComplimentaryLimit,
  complimentaryLimitInclude,
} from '@/lib/admin-complimentary-mapper';

interface RouteContext { params: { id: string } }

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminBranchComplimentaryLimitUpdateSchema);

  try {
    const limit = await db.branchComplimentaryLimit.update({
      where: { id: params.id },
      data: {
        ...(body.percentage !== undefined && { percentage: body.percentage }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: complimentaryLimitInclude,
    });
    return ok(toAdminBranchComplimentaryLimit(limit));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw Errors.notFound('Branch complimentary limit');
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.branchComplimentaryLimit.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw Errors.notFound('Branch complimentary limit');
    }
    throw error;
  }
});
