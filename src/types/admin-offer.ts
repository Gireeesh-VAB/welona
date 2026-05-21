export interface AdminOfferBranchRef {
  id: string;
  name: string;
  code: string;
  zone: { id: string; stateName: string } | null;
}

export interface AdminOfferItem {
  id: string;
  categoryId: string;
  categoryName: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
}

export interface AdminOffer {
  id: string;
  packageName: string;
  packageCode: string;
  fromDate: string;
  toDate: string;
  minAmount: number;
  maxAmount: number;
  remarks: string | null;
  frontImageUrl: string | null;
  isActive: boolean;
  branches: AdminOfferBranchRef[];
  items: AdminOfferItem[];
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
