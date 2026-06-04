import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminBranchAddressUpdateSchema } from '@shared/schemas/admin-branch-addresses';
import { toAdminBranchAddress } from '@/lib/admin-branch-mapper';

interface RouteContext {
  params: { id: string; addressId: string };
}

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminBranchAddressUpdateSchema);

  try {
    const row = await db.$transaction(async (tx) => {
      // If the caller is promoting this row to primary, clear the flag on the
      // current primary so the uniqueness invariant holds.
      if (body.isPrimary) {
        await tx.branchAddress.updateMany({
          where: { branchId: params.id, isPrimary: true, NOT: { id: params.addressId } },
          data: { isPrimary: false },
        });
      }
      return tx.branchAddress.update({
        where: { id: params.addressId },
        data: {
          ...(body.label !== undefined && { label: body.label }),
          ...(body.line1 !== undefined && { line1: body.line1 }),
          ...(body.line2 !== undefined && { line2: body.line2 ?? null }),
          ...(body.city !== undefined && { city: body.city ?? null }),
          ...(body.state !== undefined && { state: body.state ?? null }),
          ...(body.pincode !== undefined && { pincode: body.pincode ?? null }),
          ...(body.country !== undefined && { country: body.country ?? null }),
          ...(body.phone !== undefined && { phone: body.phone ?? null }),
          ...(body.email !== undefined && { email: body.email ?? null }),
          ...(body.isPrimary !== undefined && { isPrimary: body.isPrimary }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
      });
    });
    return ok(toAdminBranchAddress(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Branch address');
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.branchAddress.delete({ where: { id: params.addressId } });
    return ok({ deleted: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Branch address');
    }
    throw error;
  }
});
