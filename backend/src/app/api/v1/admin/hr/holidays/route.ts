import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminHolidayCreateSchema,
  adminHolidayListQuerySchema,
} from '@shared/schemas/admin-holidays';
import { toAdminHoliday } from '@/lib/admin-holiday-mapper';
import { dayKey } from '@/lib/hr-dates';

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { year, type, region, page, limit } = parseQuery(req, adminHolidayListQuerySchema);

  const where: Prisma.HolidayWhereInput = {
    ...(type && { type }),
    ...(region && { region: { contains: region } }),
    ...(year && {
      date: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      },
    }),
  };

  const [items, total] = await Promise.all([
    db.holiday.findMany({
      where,
      include: { createdByAdmin: true },
      orderBy: { date: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.holiday.count({ where }),
  ]);

  return ok(items.map(toAdminHoliday), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminHolidayCreateSchema);

  try {
    const row = await db.holiday.create({
      data: {
        date: dayKey(body.date),
        name: body.name,
        type: body.type,
        region: body.region ?? null,
        isActive: true,
        createdByAdminId: claims.sub,
      },
      include: { createdByAdmin: true },
    });
    return created(toAdminHoliday(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw Errors.conflict('A holiday with this date and name already exists.');
    }
    throw error;
  }
});
