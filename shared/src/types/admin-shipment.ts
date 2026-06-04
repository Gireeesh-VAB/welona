import type { ShipmentStage } from '../enums';

export interface ShipmentStageEvent {
  id: string;
  stage: ShipmentStage;
  note: string | null;
  actorName: string | null;
  at: string;
}

export interface AdminShipment {
  id: string;
  number: string;
  title: string;
  branchId: string | null;
  branchName: string | null;
  supplier: string | null;
  reference: string | null;
  stage: ShipmentStage;
  notes: string | null;
  createdByName: string | null;
  events: ShipmentStageEvent[];
  createdAt: string;
  updatedAt: string;
}
