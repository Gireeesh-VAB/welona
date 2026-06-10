import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminGstRateCreateSchema, adminGstRateListQuerySchema } from '@shared/schemas/admin-gst-rates';
import { toAdminGstRate } from '@/lib/admin-gst-rate-mapper';

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, page, limit } = parseQuery(req, adminGstRateListQuerySchema);
  const where = search ? { name: { contains: search } } : {};
  const [items, total] = await Promise.all([
    db.gstRate.findMany({ where, orderBy: { percentage: 'asc' }, skip: (page - 1) * limit, take: limit }),
    db.gstRate.count({ where }),
  ]);
  return ok(items.map(toAdminGstRate), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminGstRateCreateSchema);
  const rate = await db.gstRate.create({
    data: { name: body.name, percentage: body.percentage, taxType: body.taxType ?? 'exclusive', isActive: body.isActive ?? true },
  });
  return created(toAdminGstRate(rate));
});
