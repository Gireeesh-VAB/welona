import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { created } from '@/lib/api/response';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminAttendanceBulkSchema } from '@shared/schemas/admin-attendance';
import { dayKey } from '@/lib/hr-dates';

/**
 * POST /api/v1/admin/hr/attendance/bulk — mark many employees on one date.
 *
 * Each entry is upserted, so re-running the same payload is idempotent and
 * safe to use as the bulk-mark behaviour from the attendance grid.
 */
export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminAttendanceBulkSchema);
  const date = dayKey(body.date);

  await db.$transaction(
    body.entries.map((entry) =>
      db.attendance.upsert({
        where: { employeeId_date: { employeeId: entry.employeeId, date } },
        create: {
          employeeId: entry.employeeId,
          date,
          status: entry.status,
          remarks: entry.remarks ?? null,
          markedByAdminId: claims.sub,
        },
        update: {
          status: entry.status,
          remarks: entry.remarks ?? null,
          markedByAdminId: claims.sub,
        },
      }),
    ),
  );

  return created({ marked: body.entries.length, date: date.toISOString() });
});
