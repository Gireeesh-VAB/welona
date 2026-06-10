import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminStateCreateSchema, adminStateListQuerySchema } from '@shared/schemas/admin-states';
import { toAdminState } from '@/lib/admin-state-mapper';

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, page, limit } = parseQuery(req, adminStateListQuerySchema);
  const where = search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] } : {};
  const [items, total] = await Promise.all([
    db.state.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
    db.state.count({ where }),
  ]);
  return ok(items.map(toAdminState), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminStateCreateSchema);
  const existing = await db.state.findFirst({ where: { OR: [{ name: body.name }, { code: body.code }] } });
  if (existing) throw Errors.conflict('A state with this name or code already exists.');
  const state = await db.state.create({ data: { name: body.name, code: body.code.toUpperCase(), isActive: body.isActive ?? true } });
  return created(toAdminState(state));
});
