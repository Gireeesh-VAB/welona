import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminStateUpdateSchema } from '@shared/schemas/admin-states';
import { toAdminState } from '@/lib/admin-state-mapper';

interface Ctx { params: { id: string } }

export const PUT = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminStateUpdateSchema);
  try {
    const state = await db.state.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.code !== undefined && { code: body.code.toUpperCase() }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    return ok(toAdminState(state));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') throw Errors.notFound('State');
      if (e.code === 'P2002') throw Errors.conflict('A state with this name or code already exists.');
    }
    throw e;
  }
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.state.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') throw Errors.notFound('State');
      if (e.code === 'P2003') throw Errors.conflict('This state is linked to branches or customers and cannot be deleted.');
    }
    throw e;
  }
});
