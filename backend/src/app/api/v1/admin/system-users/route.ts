import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminSystemUserCreateSchema,
  adminSystemUserListQuerySchema,
} from '@shared/schemas/admin-system-users';
import { toAdminSystemUser } from '@/lib/admin-system-user-mapper';
import { readClientIp } from '@/lib/client-ip';

const fullInclude = {
  branch: true,
  employee: true,
  createdByAdmin: true,
} satisfies Prisma.SystemUserInclude;

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, branchId, page, limit } = parseQuery(
    req,
    adminSystemUserListQuerySchema,
  );

  const where: Prisma.SystemUserWhereInput = {
    ...(branchId && { branchId }),
    ...(search && {
      OR: [
        { userName: { contains: search } },
        { email: { contains: search } },
        { employee: { name: { contains: search } } },
        { branch: { name: { contains: search } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.systemUser.findMany({
      where,
      include: fullInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.systemUser.count({ where }),
  ]);

  return ok(items.map(toAdminSystemUser), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminSystemUserCreateSchema);

  const passwordHash = await bcrypt.hash(body.password, 10);
  const ip = readClientIp(req);

  try {
    const row = await db.systemUser.create({
      data: {
        userName: body.userName,
        passwordHash,
        email: body.email ?? null,
        employeeId: body.employeeId || null,
        branchId: body.branchId || null,
        ipAddress: ip,
        isActive: true,
        createdByAdminId: claims.sub,
      },
      include: fullInclude,
    });
    return created(toAdminSystemUser(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw Errors.conflict(`User name "${body.userName}" is already taken.`);
    }
    throw error;
  }
});
