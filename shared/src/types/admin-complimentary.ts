export interface AdminComplimentaryAssignment {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
}

export interface AdminComplimentaryRule {
  id: string;
  name: string;
  description: string | null;
  triggerServiceId: string;
  triggerServiceName: string;
  triggerCategoryName: string | null;
  isActive: boolean;
  assignments: AdminComplimentaryAssignment[];
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
