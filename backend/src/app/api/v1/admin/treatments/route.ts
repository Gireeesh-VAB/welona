import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { treatmentCreateSchema } from '@shared/schemas/sales';

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const treatments = await db.treatment.findMany({
    where: { orgId },
    orderBy: { name: 'asc' },
  });
  return ok(treatments);
});

export const POST = route(async (req) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const body = await parseBody(req, treatmentCreateSchema);

  const treatment = await db.treatment.create({
    data: {
      orgId,
      name: body.name,
      category: body.category || null,
      description: body.description || null,
      durationMinutes: body.durationMinutes ?? null,
      price: body.price ?? null,
    },
  });
  return created(treatment);
});
