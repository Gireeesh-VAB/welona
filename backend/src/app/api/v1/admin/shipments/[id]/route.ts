import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { recordAudit, actorFromClaims } from '@/lib/audit';
import { adminShipmentAdvanceSchema } from '@shared/schemas/admin-shipments';
import { toAdminShipment, type ShipmentWithEvents } from '@/lib/admin-shipment-mapper';

interface RouteContext {
  params: { id: string };
}

async function loadScoped(id: string) {
  const s = await db.trackedShipment.findUnique({ where: { id }, include: { events: true } });
  if (!s) throw Errors.notFound('Shipment');
  return s;
}
async function branchName(branchId: string | null): Promise<string | null> {
  if (!branchId) return null;
  const b = await db.branch.findUnique({ where: { id: branchId }, select: { name: true } });
  return b?.name ?? null;
}

export const GET = route<RouteContext>(async (req, { params }) => {
  const claims = requireAdminAuth(req);
  const s = await loadScoped(params.id);
  return ok(toAdminShipment(s as ShipmentWithEvents, await branchName(s.branchId)));
});

/** PUT advances the shipment to a new stage and appends a stage event. */
export const PUT = route<RouteContext>(async (req, { params }) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminShipmentAdvanceSchema);
  const existing = await loadScoped(params.id);
  const actor = actorFromClaims(claims);

  if (existing.stage === 'stocked' || existing.stage === 'cancelled') {
    throw Errors.badRequest(`This shipment is already ${existing.stage} and cannot change stage.`);
  }
  if (body.stage === existing.stage) {
    throw Errors.badRequest('The shipment is already at that stage.');
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.shipmentStageEvent.create({
      data: { shipmentId: existing.id, stage: body.stage, note: body.note ?? null, actorName: actor.actorName },
    });
    return tx.trackedShipment.update({
      where: { id: existing.id },
      data: { stage: body.stage },
      include: { events: true },
    });
  });

  await recordAudit({
    actor,
    action: body.stage,
    entity: 'shipment',
    entityId: existing.id,
    branchId: existing.branchId,
    summary: `${existing.number} → ${body.stage}`,
  });

  return ok(toAdminShipment(updated as ShipmentWithEvents, await branchName(existing.branchId)));
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  const claims = requireAdminAuth(req);
  const existing = await loadScoped(params.id);
  try {
    await db.trackedShipment.delete({ where: { id: existing.id } });
    await recordAudit({
      actor: actorFromClaims(claims),
      action: 'delete',
      entity: 'shipment',
      entityId: existing.id,
      branchId: existing.branchId,
      summary: `Deleted tracking ${existing.number}`,
    });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw Errors.notFound('Shipment');
    }
    throw error;
  }
});
