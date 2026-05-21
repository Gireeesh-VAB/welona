import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminBranchUpdateSchema } from '@/lib/admin-branches';
import { toAdminBranch } from '@/lib/admin-branch-mapper';

interface RouteContext {
  params: { id: string };
}

/**
 * Admin master-data: branch item.
 *
 * PUT    /api/v1/admin/branches/:id — partial update.
 * DELETE /api/v1/admin/branches/:id — remove a branch.
 */
export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminBranchUpdateSchema);

  if (body.zoneId !== undefined) {
    const zone = await db.zone.findUnique({ where: { id: body.zoneId } });
    if (!zone) throw Errors.badRequest('Selected zone no longer exists.');
  }

  try {
    const branch = await db.branch.update({
      where: { id: params.id },
      data: {
        ...(body.branchName !== undefined && { name: body.branchName }),
        ...(body.branchCode !== undefined && { code: body.branchCode }),
        ...(body.zoneId !== undefined && { zoneId: body.zoneId }),
        ...(body.address !== undefined && { address: body.address ?? null }),
        ...(body.phone !== undefined && { phone: body.phone ?? null }),
        ...(body.email !== undefined && { email: body.email ?? null }),
        ...(body.ipAddress !== undefined && { ipAddress: body.ipAddress ?? null }),
      },
      include: { zone: true, createdByAdmin: true },
    });
    return ok(toAdminBranch(branch));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Branch');
      if (error.code === 'P2002') {
        throw Errors.conflict('A branch with this code already exists.');
      }
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);

  try {
    await db.branch.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Branch');
      // FK violation — staff/customers/sales records still reference this branch.
      if (error.code === 'P2003') {
        throw Errors.conflict(
          'This branch has staff, customers or sales records linked to it and cannot be deleted.',
        );
      }
    }
    throw error;
  }
});
