import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';

type Ctx = { params: { id: string } };

const optionalText = z.string().trim().optional();

const staffUpdateSchema = z.object({
  status: z.enum(['active', 'suspended']).optional(),
  employeeCode: optionalText,
  designation: optionalText,
  dateOfJoining: z.string().datetime().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: optionalText,
  address: optionalText,
  emergencyContact: optionalText,
  weeklyOff: optionalText,
  shiftStart: optionalText,
  shiftEnd: optionalText,
  bankName: optionalText,
  bankAccountName: optionalText,
  bankAccountNumber: optionalText,
  bankIfsc: optionalText,
  salary: z.number().int().nonnegative().optional(),
});

/**
 * PATCH /api/v1/staff/[id] — update an employee: account status and the
 * full set of HR / employment details.
 */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'staff:update');

  const staff = await db.staff.findFirst({
    where: { id: params.id, orgId: claims.orgId },
  });
  if (!staff) throw Errors.notFound('Employee');

  const body = await parseBody(req, staffUpdateSchema);
  if (body.status === 'suspended' && staff.id === claims.sub) {
    throw Errors.badRequest('You cannot suspend your own account');
  }

  const data: Prisma.StaffUpdateInput = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.employeeCode !== undefined) data.employeeCode = body.employeeCode || null;
  if (body.designation !== undefined) data.designation = body.designation || null;
  if (body.gender !== undefined) data.gender = body.gender || null;
  if (body.address !== undefined) data.address = body.address || null;
  if (body.emergencyContact !== undefined) data.emergencyContact = body.emergencyContact || null;
  if (body.weeklyOff !== undefined) data.weeklyOff = body.weeklyOff || null;
  if (body.shiftStart !== undefined) data.shiftStart = body.shiftStart || null;
  if (body.shiftEnd !== undefined) data.shiftEnd = body.shiftEnd || null;
  if (body.bankName !== undefined) data.bankName = body.bankName || null;
  if (body.bankAccountName !== undefined) data.bankAccountName = body.bankAccountName || null;
  if (body.bankAccountNumber !== undefined) {
    data.bankAccountNumber = body.bankAccountNumber || null;
  }
  if (body.bankIfsc !== undefined) data.bankIfsc = body.bankIfsc || null;
  if (body.salary !== undefined) data.salary = body.salary;
  if (body.dateOfJoining !== undefined) data.dateOfJoining = new Date(body.dateOfJoining);
  if (body.dateOfBirth !== undefined) data.dateOfBirth = new Date(body.dateOfBirth);

  const updated = await db.staff.update({ where: { id: params.id }, data });
  return ok({ id: updated.id, status: updated.status });
});
