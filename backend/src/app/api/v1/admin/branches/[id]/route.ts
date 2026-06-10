import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminBranchUpdateSchema } from '@shared/schemas/admin-branches';
import { toAdminBranch, branchAdminInclude } from '@/lib/admin-branch-mapper';
import { assertValidParent } from '@/lib/admin-branch-hierarchy';

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

  // Validate any proposed parent (existence + no cycle through this branch).
  if (body.parentBranchId !== undefined) {
    await assertValidParent(params.id, body.parentBranchId);
  }

  try {
    const branch = await db.$transaction(async (tx) => {
      const updated = await tx.branch.update({
        where: { id: params.id },
        data: {
          ...(body.branchName !== undefined && { name: body.branchName }),
          ...(body.branchCode !== undefined && { code: body.branchCode }),
          ...(body.branchType !== undefined && { branchType: body.branchType }),
          ...(body.zoneId !== undefined && { zoneId: body.zoneId }),
          ...(body.parentBranchId !== undefined && { parentBranchId: body.parentBranchId }),
          ...(body.address !== undefined && { address: body.address ?? null }),
          ...(body.phone !== undefined && { phone: body.phone ?? null }),
          ...(body.email !== undefined && { email: body.email ?? null }),
          ...(body.ipAddress !== undefined && { ipAddress: body.ipAddress ?? null }),
          ...(body.loginPassword !== undefined && { loginPassword: body.loginPassword ?? null }),
          ...(body.stateId !== undefined && { stateId: body.stateId ?? null }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
        include: branchAdminInclude,
      });

      // Sync the SystemUser password if a new password was provided.
      if (body.loginPassword) {
        const passwordHash = await bcrypt.hash(body.loginPassword, 10);
        const userName = (body.branchCode ?? updated.code).toLowerCase();
        const existing = await tx.systemUser.findFirst({ where: { branchId: params.id } });
        if (existing) {
          await tx.systemUser.update({
            where: { id: existing.id },
            data: { passwordHash, userName },
          });
        } else {
          await tx.systemUser.create({
            data: {
              userName,
              passwordHash,
              branchId: params.id,
              isActive: true,
            },
          });
        }
      }

      return updated;
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
