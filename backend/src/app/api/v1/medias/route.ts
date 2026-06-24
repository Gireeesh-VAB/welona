import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/service';

/**
 * Staff-accessible media list for enquiry dropdowns.
 * Returns all active Media records (same set as Admin → Master → Media).
 * Writes remain admin-only via /api/v1/admin/medias.
 *
 * GET /api/v1/medias
 */
export const GET = route(async (req) => {
  requireAuth(req);

  const medias = await db.media.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return ok(medias);
});
