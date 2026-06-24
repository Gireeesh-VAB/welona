import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';

const staffCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId: z.string().min(1, 'Role is required'),
  branchId: z.string().min(1).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  designation: z.string().trim().optional(),
  gender: z.string().trim().optional(),
});

/**
 * GET /api/v1/staff — every employee in the organisation, with their role
 * and branch, for the Employees directory.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'staff:read');

  // Branch-scoped: staff assigned to a branch see only their branch's
  // employees. Org-wide staff (branchIds=[]) see everyone.
  const staffBranchId = claims.branchIds[0] ?? null;

  const staff = await db.staff.findMany({
    where: {
      orgId: claims.orgId,
      ...(staffBranchId ? { branchId: staffBranchId } : {}),
    },
    include: {
      role: { select: { name: true } },
      branch: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });

  return ok(
    staff.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      avatarUrl: s.avatarUrl,
      status: s.status,
      twoFactorEnabled: s.twoFactorEnabled,
      roleName: s.role.name,
      branchName: s.branch?.name ?? null,
      lastLoginAt: s.lastLoginAt ? s.lastLoginAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      employeeCode: s.employeeCode,
      designation: s.designation,
      dateOfJoining: s.dateOfJoining ? s.dateOfJoining.toISOString() : null,
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.toISOString() : null,
      gender: s.gender,
      address: s.address,
      emergencyContact: s.emergencyContact,
      weeklyOff: s.weeklyOff,
      shiftStart: s.shiftStart,
      shiftEnd: s.shiftEnd,
      bankName: s.bankName,
      bankAccountName: s.bankAccountName,
      bankAccountNumber: s.bankAccountNumber,
      bankIfsc: s.bankIfsc,
      salary: s.salary,
    })),
  );
});

/** POST /api/v1/staff — add a new employee (creates their sign-in account). */
export const POST = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'staff:create');
  const body = await parseBody(req, staffCreateSchema);

  const role = await db.role.findFirst({ where: { id: body.roleId, orgId: claims.orgId } });
  if (!role) throw Errors.notFound('Role');

  if (body.branchId) {
    const branch = await db.branch.findFirst({
      where: { id: body.branchId, orgId: claims.orgId },
    });
    if (!branch) throw Errors.notFound('Branch');
  }

  const email = body.email.toLowerCase();
  const existing = await db.staff.findUnique({ where: { email } });
  if (existing) throw Errors.conflict('An employee with this email already exists');

  // Auto-generate employee code: pick max across both Staff and Employee tables
  function parseEmpNum(code: string | null | undefined): number {
    if (!code) return 0;
    const m = code.match(/EMP-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }
  const [lastStaff, lastEmployee] = await Promise.all([
    db.staff.findFirst({
      where: { orgId: claims.orgId, employeeCode: { startsWith: 'EMP-' } },
      orderBy: { createdAt: 'desc' },
      select: { employeeCode: true },
    }),
    db.employee.findFirst({
      where: { employeeCode: { startsWith: 'EMP-' } },
      orderBy: { createdAt: 'desc' },
      select: { employeeCode: true },
    }),
  ]);
  const nextNum = Math.max(parseEmpNum(lastStaff?.employeeCode), parseEmpNum(lastEmployee?.employeeCode)) + 1;
  const nextCode = `EMP-${String(nextNum).padStart(4, '0')}`;

  const passwordHash = await bcrypt.hash(body.password, 10);
  const branchId = body.branchId ?? null;

  const [staff] = await db.$transaction([
    db.staff.create({
      data: {
        orgId: claims.orgId,
        roleId: body.roleId,
        branchId,
        name: body.name,
        email,
        phone: body.phone || null,
        passwordHash,
        status: body.status ?? 'active',
        employeeCode: nextCode,
        designation: body.designation || null,
        gender: body.gender || null,
      },
    }),
    db.employee.create({
      data: {
        name: body.name,
        employeeCode: nextCode,
        mobileNo: body.phone || '0000000000',
        email,
        gender: body.gender || null,
        branchId,
        designation: body.designation ? undefined : undefined,
        joiningDate: new Date(),
        isActive: (body.status ?? 'active') === 'active',
      },
    }),
  ]);

  return created({ id: staff.id, name: staff.name, email: staff.email });
});
