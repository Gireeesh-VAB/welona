import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/service';
import { toAdminGstRate } from '@/lib/admin-gst-rate-mapper';

export const GET = route(async (req) => {
  requireAuth(req);
  const rates = await db.gstRate.findMany({ where: { isActive: true }, orderBy: { percentage: 'asc' } });
  return ok(rates.map(toAdminGstRate));
});
