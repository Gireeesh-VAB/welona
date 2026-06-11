export interface AdminPackageSessionMasterService {
  id:   string;
  name: string;
}

export interface AdminPackageSessionMaster {
  id:              string;
  orgId:           string;
  name:            string;
  description:     string | null;
  serviceIds:      string[];
  services:        AdminPackageSessionMasterService[];
  defaultSessions: number;
  price:           number; // minor units
  isActive:        boolean;
  createdAt:       string;
  updatedAt:       string;
}

/** Minimal shape used in branch/staff dropdowns. */
export interface PackageSessionMasterOption {
  id:              string;
  name:            string;
  serviceIds:      string[];
  services:        AdminPackageSessionMasterService[];
  defaultSessions: number;
  price:           number;
}
