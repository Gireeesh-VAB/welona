import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { treatmentCreateSchema } from '@shared/schemas/sales';

/**
 * Treatments master — the catalogue of treatments/services offered, managed
 * in Settings and selected when recording an enquiry.
 *
 * GET  /api/v1/treatments — full list (active and inactive).
 * POST /api/v1/treatments — add a treatment.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:read');

  const treatments = await db.treatment.findMany({
    where: { orgId: claims.orgId },
    orderBy: { name: 'asc' },
  });
  return ok(treatments);
});

export const POST = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');
  const body = await parseBody(req, treatmentCreateSchema);

  const treatment = await db.treatment.create({
    data: {
      orgId: claims.orgId,
      name: body.name,
      category: body.category || null,
      description: body.description || null,
      durationMinutes: body.durationMinutes ?? null,
      price: body.price ?? null,
    },
  });
  return created(treatment);
});
