import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminLeaveApplicationCreateSchema,
  adminLeaveListQuerySchema,
} from '@shared/schemas/admin-leaves';
import { toAdminLeaveApplication } from '@/lib/admin-leave-mapper';
import { dayKey, inclusiveDays } from '@/lib/hr-dates';

const include = {
  employee: { include: { branch: true, department: true } },
  leaveType: true,
  approvedByAdmin: true,
  appliedByAdmin: true,
} as const;

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { employeeId, branchId: queryBranchId, leaveTypeId, status, from, to, page, limit } =
    parseQuery(req, adminLeaveListQuerySchema);
  // Branch sessions are locked to their own branch regardless of the query.
  const branchId = queryBranchId;

  const where: Prisma.LeaveApplicationWhereInput = {
    ...(employeeId && { employeeId }),
    ...(branchId && { employee: { branchId } }),
    ...(leaveTypeId && { leaveTypeId }),
    ...(status && { status }),
    ...((from || to) && {
      AND: [
        ...(from ? [{ toDate: { gte: dayKey(from) } }] : []),
        ...(to ? [{ fromDate: { lte: dayKey(to) } }] : []),
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.leaveApplication.findMany({
      where,
      include,
      orderBy: [{ status: 'asc' }, { fromDate: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.leaveApplication.count({ where }),
  ]);

  return ok(items.map(toAdminLeaveApplication), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminLeaveApplicationCreateSchema);

  const from = dayKey(body.fromDate);
  const to = dayKey(body.toDate);
  const rangeDays = inclusiveDays(from, to);
  if (body.days > rangeDays) {
    throw Errors.badRequest(
      `Days (${body.days}) cannot exceed the inclusive date range (${rangeDays}).`,
    );
  }

  // Ensure employee + leave type exist up-front (clearer error than P2003).
  const [employee, leaveType] = await Promise.all([
    db.employee.findUnique({ where: { id: body.employeeId } }),
    db.leaveType.findUnique({ where: { id: body.leaveTypeId } }),
  ]);
  if (!employee) throw Errors.notFound('Employee');
  if (!leaveType) throw Errors.notFound('Leave type');

  const row = await db.leaveApplication.create({
    data: {
      employeeId: body.employeeId,
      leaveTypeId: body.leaveTypeId,
      fromDate: from,
      toDate: to,
      days: body.days,
      reason: body.reason ?? null,
      status: 'pending',
      appliedByAdminId: claims.sub,
    },
    include,
  });
  return created(toAdminLeaveApplication(row));
});
