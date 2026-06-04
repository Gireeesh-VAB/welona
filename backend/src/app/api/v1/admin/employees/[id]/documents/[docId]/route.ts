import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';

interface RouteContext {
  params: { id: string; docId: string };
}

/** DELETE /api/v1/admin/employees/:id/documents/:docId */
export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.employeeDocument.delete({ where: { id: params.docId } });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw Errors.notFound('Document');
    }
    throw error;
  }
});
