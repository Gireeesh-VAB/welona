import type { Prisma } from '@prisma/client';
import type { AdminShipment } from '@shared/types/admin-shipment';
import type { ShipmentStage } from '@shared/enums';

export type ShipmentWithEvents = Prisma.TrackedShipmentGetPayload<{
  include: { events: true };
}>;

export function toAdminShipment(row: ShipmentWithEvents, branchName: string | null): AdminShipment {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    branchId: row.branchId,
    branchName,
    supplier: row.supplier,
    reference: row.reference,
    stage: row.stage as ShipmentStage,
    notes: row.notes,
    createdByName: row.createdByName,
    events: [...row.events]
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map((e) => ({
        id: e.id,
        stage: e.stage as ShipmentStage,
        note: e.note,
        actorName: e.actorName,
        at: e.at.toISOString(),
      })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
