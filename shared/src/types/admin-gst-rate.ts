export type GstTaxType = 'inclusive' | 'exclusive';

export interface AdminGstRate {
  id: string;
  name: string;
  percentage: number;   // whole percent: 5, 12, 18, 28
  taxType: GstTaxType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
