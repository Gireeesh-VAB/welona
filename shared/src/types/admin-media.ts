export interface AdminMedia {
  id: string;
  zoneId: string;
  zone: { id: string; country: string; stateName: string };
  name: string;
  remarks: string | null;
  ipAddress: string | null;
  isActive: boolean;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
