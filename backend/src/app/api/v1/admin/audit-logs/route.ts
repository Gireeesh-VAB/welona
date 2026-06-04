import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok, buildMeta } from '@/lib/api/response';
import { requireAdminAuth } from '@/lib/auth/service';
import type { AdminAuditLog } from '@shared/types/admin-audit-log';

const querySchema = z.object({
  entity: z.string().optional(),
  actorType: z.string().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

/**
 * GET /api/v1/admin/audit-logs?entity=&actorType=&search=
 * Admin-only read of the append-only audit trail.
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { entity, actorType, search, page, limit } = parseQuery(req, querySchema);

  const where: Prisma.AuditLogWhereInput = {
    ...(entity && { entity }),
    ...(actorType && { actorType }),
    ...(search && {
      OR: [
        { summary: { contains: search } },
        { actorName: { contains: search } },
        { entityId: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ]);

  const rows: AdminAuditLog[] = items.map((a) => ({
    id: a.id,
    actorType: a.actorType,
    actorName: a.actorName,
    action: a.action,
    entity: a.entity,
    entityId: a.entityId,
    summary: a.summary,
    createdAt: a.createdAt.toISOString(),
  }));

  return ok(rows, buildMeta(page, limit, total));
});
