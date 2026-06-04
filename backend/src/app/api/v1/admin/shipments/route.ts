import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { nextDocumentNumber } from '@/lib/sales/service';
import { recordAudit, actorFromClaims } from '@/lib/audit';
import {
  adminShipmentCreateSchema,
  adminShipmentListQuerySchema,
} from '@shared/schemas/admin-shipments';
import { toAdminShipment, type ShipmentWithEvents } from '@/lib/admin-shipment-mapper';

/** Resolve branch names for a set of shipment rows (branchId is a scalar). */
async function branchNameMap(rows: { branchId: string | null }[]): Promise<Map<string, string>> {
  const ids = [...new Set(rows.map((r) => r.branchId).filter((b): b is string => Boolean(b)))];
  if (ids.length === 0) return new Map();
  const branches = await db.branch.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  return new Map(branches.map((b) => [b.id, b.name]));
}

/**
 * GET  /api/v1/admin/shipments?branchId=&stage=&search=
 * POST /api/v1/admin/shipments  — creates at stage `ordered` + first event.
 * Branch sessions are scoped to their own branch.
 */
export const GET = route(async (req) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const { branchId, stage, search, page, limit } = parseQuery(req, adminShipmentListQuerySchema);

  const where: Prisma.TrackedShipmentWhereInput = {
    ...((branchScope ?? branchId) && { branchId: branchScope ?? branchId }),
    ...(stage && { stage }),
    ...(search && {
      OR: [
        { number: { contains: search } },
        { title: { contains: search } },
        { supplier: { contains: search } },
        { reference: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.trackedShipment.findMany({
      where,
      include: { events: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.trackedShipment.count({ where }),
  ]);

  const names = await branchNameMap(items);
  return ok(
    items.map((s) => toAdminShipment(s as ShipmentWithEvents, s.branchId ? names.get(s.branchId) ?? null : null)),
    buildMeta(page, limit, total),
  );
});

export const POST = route(async (req) => {
  const { claims, branchScope } = requireAdminOrBranchAuth(req);
  const body = await parseBody(req, adminShipmentCreateSchema);
  const actor = actorFromClaims(claims);
  const branchId = branchScope ?? body.branchId ?? null;

  if (branchId) {
    const branch = await db.branch.findUnique({ where: { id: branchId }, select: { id: true } });
    if (!branch) throw Errors.badRequest('Selected branch no longer exists.');
  }

  const orgId = await resolveOrgId();
  const shipment = await db.$transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, orgId, 'shipment', 'TRK');
    return tx.trackedShipment.create({
      data: {
        orgId,
        number,
        title: body.title,
        branchId,
        supplier: body.supplier ?? null,
        reference: body.reference ?? null,
        notes: body.notes ?? null,
        stage: 'ordered',
        createdByAdminId: actor.actorType === 'admin' ? actor.actorId : null,
        createdByName: actor.actorName,
        events: { create: [{ stage: 'ordered', note: 'Created', actorName: actor.actorName }] },
      },
      include: { events: true },
    });
  });

  await recordAudit({ actor, action: 'create', entity: 'shipment', entityId: shipment.id, branchId, summary: `Created tracking ${shipment.number}: ${shipment.title}` });

  const names = await branchNameMap([shipment]);
  return created(toAdminShipment(shipment as ShipmentWithEvents, branchId ? names.get(branchId) ?? null : null));
});
