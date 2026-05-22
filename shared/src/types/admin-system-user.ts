export interface AdminSystemUser {
  id: string;
  userName: string;
  email: string | null;
  branch: { id: string; name: string; code: string } | null;
  employee: { id: string; name: string; employeeCode: string } | null;
  isActive: boolean;
  ipAddress: string | null;
  lastLoginAt: string | null;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
