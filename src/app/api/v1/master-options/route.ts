import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { masterOptionCreateSchema, masterOptionQuerySchema } from '@/lib/sales/schemas';

/**
 * Master options — configurable dropdown lists (enquiry type, media, call
 * type) managed in Settings.
 *
 * GET  /api/v1/master-options?kind=enquiry_type — options for one kind.
 * POST /api/v1/master-options — add an option.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:read');
  const { kind } = parseQuery(req, masterOptionQuerySchema);

  const options = await db.masterOption.findMany({
    where: { orgId: claims.orgId, kind },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  });
  return ok(options);
});

export const POST = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');
  const body = await parseBody(req, masterOptionCreateSchema);

  const option = await db.masterOption.create({
    data: {
      orgId: claims.orgId,
      kind: body.kind,
      label: body.label,
      sortOrder: body.sortOrder ?? 0,
    },
  });
  return created(option);
});
