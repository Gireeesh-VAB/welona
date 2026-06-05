import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminAttendanceUpsertSchema,
  adminAttendanceListQuerySchema,
} from '@shared/schemas/admin-attendance';
import { toAdminAttendance } from '@/lib/admin-attendance-mapper';
import { dayKey } from '@/lib/hr-dates';

const includeRelations = {
  employee: { include: { branch: true, department: true, designation: true } },
  markedByAdmin: true,
} as const;

/**
 * GET /api/v1/admin/hr/attendance
 *   ?employeeId&branchId&from&to&status&page&limit
 *
 * Pulls one attendance row per (employeeId, date). The caller stitches
 * absent days into an empty cell on the client.
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { employeeId, branchId: queryBranchId, from, to, status, page, limit } = parseQuery(
    req,
    adminAttendanceListQuerySchema,
  );
  // Branch sessions are locked to their own branch regardless of the query.
  const branchId = queryBranchId;

  const where: Prisma.AttendanceWhereInput = {
    ...(employeeId && { employeeId }),
    ...(branchId && { employee: { branchId } }),
    ...(status && { status }),
    ...((from || to) && {
      date: {
        ...(from && { gte: dayKey(from) }),
        ...(to && { lte: dayKey(to) }),
      },
    }),
  };

  const [items, total] = await Promise.all([
    db.attendance.findMany({
      where,
      include: includeRelations,
      orderBy: [{ date: 'desc' }, { employee: { name: 'asc' } }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.attendance.count({ where }),
  ]);

  return ok(items.map(toAdminAttendance), buildMeta(page, limit, total));
});

/**
 * POST /api/v1/admin/hr/attendance — upsert a single cell (employee + date).
 *
 * Replaces any existing entry for the same (employeeId, date). Used when HR
 * clicks a cell in the monthly grid to mark / change a single day.
 */
export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminAttendanceUpsertSchema);
  const date = dayKey(body.date);

  const row = await db.attendance.upsert({
    where: {
      employeeId_date: { employeeId: body.employeeId, date },
    },
    create: {
      employeeId: body.employeeId,
      date,
      status: body.status,
      checkIn: body.checkIn ? new Date(body.checkIn) : null,
      checkOut: body.checkOut ? new Date(body.checkOut) : null,
      hoursWorked: body.hoursWorked ?? null,
      remarks: body.remarks ?? null,
      markedByAdminId: claims.sub,
    },
    update: {
      status: body.status,
      checkIn: body.checkIn ? new Date(body.checkIn) : null,
      checkOut: body.checkOut ? new Date(body.checkOut) : null,
      hoursWorked: body.hoursWorked ?? null,
      remarks: body.remarks ?? null,
      markedByAdminId: claims.sub,
    },
    include: includeRelations,
  });

  return created(toAdminAttendance(row));
});
