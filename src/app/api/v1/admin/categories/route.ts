import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminCategoryCreateSchema,
  adminCategoryListQuerySchema,
  CATEGORY_FLAG_KEYS,
  type CategoryFlagKey,
} from '@/lib/admin-categories';
import type { AdminCategory } from '@/types/admin-category';

type CategoryWithRels = Prisma.CategoryGetPayload<{
  include: { createdByAdmin: true; _count: { select: { services: true } } };
}>;

function toDTO(row: CategoryWithRels): AdminCategory {
  const flags = CATEGORY_FLAG_KEYS.reduce(
    (acc, key) => {
      acc[key] = (row[key as keyof CategoryWithRels] as boolean) ?? false;
      return acc;
    },
    {} as Record<CategoryFlagKey, boolean>,
  );
  return {
    id: row.id,
    name: row.name,
    categoryCode: row.categoryCode,
    description: row.description,
    isActive: row.isActive,
    serviceCount: row._count.services,
    createdBy: row.createdByAdmin
      ? {
          id: row.createdByAdmin.id,
          name: row.createdByAdmin.name,
          email: row.createdByAdmin.email,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...flags,
  };
}

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, active, page, limit } = parseQuery(req, adminCategoryListQuerySchema);

  const where: Prisma.CategoryWhereInput = {
    ...(active === 'active' && { isActive: true }),
    ...(active === 'inactive' && { isActive: false }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { categoryCode: { contains: search } },
        { description: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.category.findMany({
      where,
      include: { createdByAdmin: true, _count: { select: { services: true } } },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.category.count({ where }),
  ]);

  return ok(items.map(toDTO), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminCategoryCreateSchema);

  const flagData = CATEGORY_FLAG_KEYS.reduce(
    (acc, key) => {
      acc[key] = body[key] ?? false;
      return acc;
    },
    {} as Record<CategoryFlagKey, boolean>,
  );

  try {
    const row = await db.category.create({
      data: {
        name: body.name,
        categoryCode: body.categoryCode ?? null,
        description: body.description ?? null,
        isActive: body.isActive ?? true,
        createdByAdminId: claims.sub,
        ...flagData,
      },
      include: { createdByAdmin: true, _count: { select: { services: true } } },
    });
    return created(toDTO(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = (error.meta?.target as string[] | undefined) ?? [];
      throw Errors.conflict(
        target.includes('categoryCode')
          ? `Category code "${body.categoryCode}" is already in use.`
          : `A category named "${body.name}" already exists.`,
      );
    }
    throw error;
  }
});
