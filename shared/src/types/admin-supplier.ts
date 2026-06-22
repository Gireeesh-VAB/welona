export interface SupplierProductMapping {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productUom: string;
  unitPrice: number | null;
  leadTimeDays: number | null;
  moq: number | null;
  notes: string | null;
  isActive: boolean;
}

/** The admin-side view of a Supplier (procurement master). */
export interface AdminSupplier {
  id: string;
  name: string;
  code: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
  paymentTerms: string | null;
  deliveryLeadTime: number | null;
  rating: number | null;
  isActive: boolean;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  products: SupplierProductMapping[];
  productCount: number;
}
