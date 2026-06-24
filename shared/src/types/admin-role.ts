export interface AdminRoleMember {
  id: string;
  name: string;
  email: string;
  designation: string | null;
  branchName: string | null;
}

export interface AdminRole {
  id: string;
  key: string;
  name: string;
  scope: string;
  description: string;
  /** DB-format permission strings, e.g. ['customers:read', 'leads:create']. */
  permissions: string[];
  isSystem: boolean;
  staffCount: number;
  members: AdminRoleMember[];
  createdAt: string;
  updatedAt: string;
}
