import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { masterOptionCreateSchema, masterOptionQuerySchema } from '@shared/schemas/sales';

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const { kind } = parseQuery(req, masterOptionQuerySchema);

  const options = await db.masterOption.findMany({
    where: { orgId, kind },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  });
  return ok(options);
});

export const POST = route(async (req) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const body = await parseBody(req, masterOptionCreateSchema);

  const option = await db.masterOption.create({
    data: { orgId, kind: body.kind, label: body.label, sortOrder: body.sortOrder ?? 0 },
  });
  return created(option);
});
