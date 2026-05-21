/**
 * The admin-side view of a Branch — flattens the relations the admin UI
 * needs (zone name, creator name) so the table can render without extra
 * lookups.
 */
export interface AdminBranch {
  id: string;
  branchName: string;
  branchCode: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  ipAddress: string | null;
  zone: {
    id: string;
    country: string;
    stateName: string;
  } | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}
