import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminHolidayUpdateSchema } from '@shared/schemas/admin-holidays';
import { toAdminHoliday } from '@/lib/admin-holiday-mapper';
import { dayKey } from '@/lib/hr-dates';

interface RouteContext {
  params: { id: string };
}

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminHolidayUpdateSchema);

  try {
    const row = await db.holiday.update({
      where: { id: params.id },
      data: {
        ...(body.date !== undefined && { date: dayKey(body.date) }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.region !== undefined && { region: body.region ?? null }),
      },
      include: { createdByAdmin: true },
    });
    return ok(toAdminHoliday(row));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Holiday');
      if (error.code === 'P2002') {
        throw Errors.conflict('A holiday with this date and name already exists.');
      }
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.holiday.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Holiday');
    }
    throw error;
  }
});
