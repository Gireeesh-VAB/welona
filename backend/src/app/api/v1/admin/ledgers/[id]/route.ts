import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminLedgerUpdateSchema } from '@shared/schemas/admin-ledgers';
import { toAdminLedger } from '@/lib/admin-ledger-mapper';

interface RouteContext {
  params: { id: string };
}

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminLedgerUpdateSchema);

  try {
    const row = await db.ledger.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.group !== undefined && { group: body.group }),
        ...(body.openingBalance !== undefined && { openingBalance: body.openingBalance }),
        ...(body.balanceType !== undefined && { balanceType: body.balanceType }),
        ...(body.description !== undefined && { description: body.description ?? null }),
        ...(body.gstNumber !== undefined && { gstNumber: body.gstNumber ?? null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: { createdByAdmin: true },
    });
    return ok(toAdminLedger(row));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Ledger');
      if (error.code === 'P2002') {
        throw Errors.conflict('A ledger with this name already exists.');
      }
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.ledger.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Ledger');
    }
    throw error;
  }
});
