import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminCategoryUpdateSchema,
  CATEGORY_FLAG_KEYS,
  type CategoryFlagKey,
} from '@shared/schemas/admin-categories';
import type { AdminCategory } from '@shared/types/admin-category';

interface RouteContext {
  params: { id: string };
}

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

export const GET = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const row = await db.category.findUnique({
    where: { id: params.id },
    include: { createdByAdmin: true, _count: { select: { services: true } } },
  });
  if (!row) throw Errors.notFound('Category');
  return ok(toDTO(row));
});

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminCategoryUpdateSchema);

  // Only forward flag keys the caller actually set.
  const flagPatch: Partial<Record<CategoryFlagKey, boolean>> = {};
  for (const key of CATEGORY_FLAG_KEYS) {
    if (body[key] !== undefined) flagPatch[key] = body[key]!;
  }

  try {
    const row = await db.category.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.categoryCode !== undefined && {
          categoryCode: body.categoryCode ?? null,
        }),
        ...(body.description !== undefined && { description: body.description ?? null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...flagPatch,
      },
      include: { createdByAdmin: true, _count: { select: { services: true } } },
    });
    return ok(toDTO(row));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Category');
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[] | undefined) ?? [];
        throw Errors.conflict(
          target.includes('categoryCode')
            ? 'A category with this code already exists.'
            : 'A category with this name already exists.',
        );
      }
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);

  const linked = await db.service.count({ where: { categoryId: params.id } });
  if (linked > 0) {
    throw Errors.conflict(
      `This category has ${linked} service${linked === 1 ? '' : 's'} linked to it and cannot be deleted. Deactivate it instead.`,
    );
  }

  try {
    await db.category.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Category');
    }
    throw error;
  }
});
