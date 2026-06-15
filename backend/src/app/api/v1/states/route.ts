import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok, buildMeta } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/service';
import { adminStateListQuerySchema } from '@shared/schemas/admin-states';
import { toAdminState } from '@/lib/admin-state-mapper';

/** GET /api/v1/states — read-only active states list for staff forms (state picker on customer create/edit). */
export const GET = route(async (req) => {
  requireAuth(req);
  const { search, page, limit } = parseQuery(req, adminStateListQuerySchema);
  const where = search
    ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] }
    : { isActive: true };
  const [items, total] = await Promise.all([
    db.state.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
    db.state.count({ where }),
  ]);
  return ok(items.map(toAdminState), buildMeta(page, limit, total));
});
