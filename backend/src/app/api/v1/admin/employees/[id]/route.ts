import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminEmployeeUpdateSchema } from '@shared/schemas/admin-employees';
import { toAdminEmployee } from '@/lib/admin-employee-mapper';

interface RouteContext {
  params: { id: string };
}

const fullInclude = {
  designation: true,
  department: true,
  branch: true,
  zone: true,
  createdByAdmin: true,
} satisfies Prisma.EmployeeInclude;

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminEmployeeUpdateSchema);

  try {
    const row = await db.employee.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.biometricId !== undefined && { biometricId: body.biometricId ?? null }),
        ...(body.fatherName !== undefined && { fatherName: body.fatherName ?? null }),
        ...(body.gender !== undefined && { gender: body.gender ?? null }),
        ...(body.dob !== undefined && { dob: body.dob ? new Date(body.dob) : null }),
        ...(body.mobileNo !== undefined && { mobileNo: body.mobileNo }),
        ...(body.mobileAlternate !== undefined && {
          mobileAlternate: body.mobileAlternate ?? null,
        }),
        ...(body.email !== undefined && { email: body.email ?? null }),
        ...(body.panNo !== undefined && { panNo: body.panNo ?? null }),
        ...(body.pincode !== undefined && { pincode: body.pincode ?? null }),
        ...(body.address !== undefined && { address: body.address ?? null }),
        ...(body.employeeCode !== undefined && { employeeCode: body.employeeCode }),
        ...(body.designationId !== undefined && {
          designationId: body.designationId || null,
        }),
        ...(body.departmentId !== undefined && {
          departmentId: body.departmentId || null,
        }),
        ...(body.branchId !== undefined && { branchId: body.branchId || null }),
        ...(body.zoneId !== undefined && { zoneId: body.zoneId || null }),
        ...(body.joiningDate !== undefined && {
          joiningDate: new Date(body.joiningDate),
        }),
        ...(body.relievingDate !== undefined && {
          relievingDate: body.relievingDate ? new Date(body.relievingDate) : null,
        }),
        ...(body.salary !== undefined && { salary: body.salary }),
        ...(body.bankName !== undefined && { bankName: body.bankName ?? null }),
        ...(body.bankAccountNo !== undefined && {
          bankAccountNo: body.bankAccountNo ?? null,
        }),
        ...(body.callerType !== undefined && { callerType: body.callerType ?? null }),
        ...(body.pf !== undefined && { pf: body.pf }),
        ...(body.esi !== undefined && { esi: body.esi }),
        ...(body.weeklyOff !== undefined && { weeklyOff: body.weeklyOff ?? null }),
      },
      include: fullInclude,
    });
    return ok(toAdminEmployee(row));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Employee');
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[] | undefined) ?? [];
        throw Errors.conflict(
          target.includes('biometricId')
            ? 'Biometric ID is already used by another employee.'
            : 'Employee code is already in use.',
        );
      }
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.employee.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Employee');
    }
    throw error;
  }
});
