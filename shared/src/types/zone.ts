/** A Zone as exposed to the admin console. */
export interface Zone {
  id: string;
  country: string;
  stateName: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}
