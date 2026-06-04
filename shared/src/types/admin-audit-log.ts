export interface AdminAuditLog {
  id: string;
  actorType: string;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string | null;
  createdAt: string;
}
