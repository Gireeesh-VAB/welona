import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/service';
import { z } from 'zod';

const querySchema = z.object({
  search: z.string().optional(),
  designation: z.string().optional(),
});

/**
 * GET /api/v1/employees — staff-facing branch employee directory.
 *
 * Branch-scoped: staff assigned to a branch see only that branch's employees
 * (the doctors/therapists/reception working there). Used to populate pickers
 * such as the prescription "Doctor" dropdown. Org-wide staff see everyone.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  const branchId = claims.branchIds[0] ?? null;

  const { search, designation } = parseQuery(req, querySchema);

  const where: Record<string, unknown> = { isActive: true };
  if (branchId) where.branchId = branchId;
  if (designation) where.designation = { name: { contains: designation } };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { employeeCode: { contains: search } },
    ];
  }

  const employees = await db.employee.findMany({
    where,
    include: {
      designation: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  return ok(
    employees.map((e) => ({
      id: e.id,
      name: e.name,
      employeeCode: e.employeeCode,
      designation: e.designation?.name ?? null,
      department: e.department?.name ?? null,
      branchName: e.branch?.name ?? null,
      isActive: e.isActive,
    })),
  );
});
