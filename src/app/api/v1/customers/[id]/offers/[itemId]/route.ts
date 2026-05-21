import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { offerUpdateSchema } from '@/lib/customer-modules';

type Ctx = { params: { id: string; itemId: string } };

/** PATCH /api/v1/customers/[id]/offers/[itemId] — update an offer. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:update');

  const offer = await db.offer.findFirst({
    where: { id: params.itemId, customerId: params.id, orgId: claims.orgId },
  });
  if (!offer) throw Errors.notFound('Offer');

  const body = await parseBody(req, offerUpdateSchema);
  const data: Prisma.OfferUpdateInput = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.discountType !== undefined) data.discountType = body.discountType;
  if (body.discountValue !== undefined) data.discountValue = body.discountValue;
  if (body.validFrom !== undefined) data.validFrom = new Date(body.validFrom);
  if (body.validUntil !== undefined) data.validUntil = new Date(body.validUntil);
  if (body.status !== undefined) {
    data.status = body.status;
    data.redeemedAt = body.status === 'redeemed' ? new Date() : null;
  }

  const updated = await db.offer.update({ where: { id: params.itemId }, data });
  return ok(updated);
});
