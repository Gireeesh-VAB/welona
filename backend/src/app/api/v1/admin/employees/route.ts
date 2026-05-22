import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminEmployeeCreateSchema,
  adminEmployeeListQuerySchema,
} from '@shared/schemas/admin-employees';
import { toAdminEmployee } from '@/lib/admin-employee-mapper';
import { readClientIp } from '@/lib/client-ip';

const fullInclude = {
  designation: true,
  department: true,
  branch: true,
  zone: true,
  createdByAdmin: true,
} satisfies Prisma.EmployeeInclude;

/**
 * Admin master-data: employees.
 *
 * GET  /api/v1/admin/employees?search=&branchId=&departmentId=&page=&limit=
 * POST /api/v1/admin/employees — IP captured server-side from request headers.
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, branchId, departmentId, page, limit } = parseQuery(
    req,
    adminEmployeeListQuerySchema,
  );

  const where: Prisma.EmployeeWhereInput = {
    ...(branchId && { branchId }),
    ...(departmentId && { departmentId }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { employeeCode: { contains: search } },
        { mobileNo: { contains: search } },
        { email: { contains: search } },
        { biometricId: { contains: search } },
        { panNo: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.employee.findMany({
      where,
      include: fullInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.employee.count({ where }),
  ]);

  return ok(items.map(toAdminEmployee), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminEmployeeCreateSchema);
  const ip = readClientIp(req);

  try {
    const row = await db.employee.create({
      data: {
        name: body.name,
        biometricId: body.biometricId ?? null,
        fatherName: body.fatherName ?? null,
        gender: body.gender ?? null,
        dob: body.dob ? new Date(body.dob) : null,
        mobileNo: body.mobileNo,
        mobileAlternate: body.mobileAlternate ?? null,
        email: body.email ?? null,
        panNo: body.panNo ?? null,
        pincode: body.pincode ?? null,
        address: body.address ?? null,
        employeeCode: body.employeeCode,
        designationId: body.designationId || null,
        departmentId: body.departmentId || null,
        branchId: body.branchId || null,
        zoneId: body.zoneId || null,
        joiningDate: new Date(body.joiningDate),
        relievingDate: body.relievingDate ? new Date(body.relievingDate) : null,
        salary: body.salary,
        bankName: body.bankName ?? null,
        bankAccountNo: body.bankAccountNo ?? null,
        callerType: body.callerType ?? null,
        pf: body.pf,
        esi: body.esi,
        weeklyOff: body.weeklyOff ?? null,
        ipAddress: ip,
        isActive: true,
        createdByAdminId: claims.sub,
      },
      include: fullInclude,
    });
    return created(toAdminEmployee(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = (error.meta?.target as string[] | undefined) ?? [];
      throw Errors.conflict(
        target.includes('biometricId')
          ? `Biometric ID "${body.biometricId}" is already used by another employee.`
          : `Employee code "${body.employeeCode}" is already in use.`,
      );
    }
    throw error;
  }
});
