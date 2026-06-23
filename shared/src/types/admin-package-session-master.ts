export interface AdminPackageSessionMasterService {
  id:   string;
  name: string;
}

export interface PackageMasterInventoryItem {
  productId:          string;
  productName:        string;
  quantityPerSession: number;
  /** 'collect_amount' = billed to customer; 'consume_only' = stock deduction only */
  chargeType:         string;
  uom?:               string;
}

export interface ServicePriceSnapshot {
  serviceId:              string;
  serviceName:            string;
  maxPrice:               number; // original service master price per session (paise)
  customPricePerSession?: number; // package-specific price override (paise); undefined = use maxPrice
  taxPercent:             number;
  taxType:                string; // "inclusive" | "exclusive"
  sessions:               number; // service master session count
  customSessions?:        number; // package-specific session count override; undefined = use sessions
}

export interface AdminPackageSessionMaster {
  id:               string;
  orgId:            string;
  name:             string;
  description:      string | null;
  serviceIds:       string[];
  services:         AdminPackageSessionMasterService[];
  serviceSnapshots: ServicePriceSnapshot[];
  inventoryItems:   PackageMasterInventoryItem[];
  defaultSessions:  number;
  price:            number; // minor units
  taxPercent:       number; // whole percent: 0, 5, 12, 18, 28
  taxType:          string; // "inclusive" | "exclusive"
  collectAdvance:   boolean;
  advancePercent:   number; // 0-100
  isActive:         boolean;
  packageCount:     number;
  createdAt:        string;
  updatedAt:        string;
}

export interface AdminMasterPackage {
  id:            string;
  customerId:    string;
  customerName:  string;
  customerPhone: string | null;
  branchName:    string | null;
  name:          string;
  totalSessions: number;
  usedSessions:  number;
  status:        string;
  purchasedAt:   string;
  expiresAt:     string | null;
}

/** Minimal shape used in branch/staff dropdowns. */
export interface PackageSessionMasterOption {
  id:               string;
  name:             string;
  serviceIds:       string[];
  services:         AdminPackageSessionMasterService[];
  serviceSnapshots: ServicePriceSnapshot[];
  inventoryItems:   PackageMasterInventoryItem[];
  defaultSessions:  number;
  price:            number;
  taxPercent:       number;
  taxType:          string;
  collectAdvance:   boolean;
  advancePercent:   number;
}
