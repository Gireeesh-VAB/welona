export interface AdminService {
  id: string;
  categoryId: string;
  category: { id: string; name: string };
  name: string;
  hsnSacCode: string | null;
  /** Stored as integer paise; convert for display. */
  minPrice: number;
  maxPrice: number;
  /** Whole percentage, 0-100. */
  taxPercent: number;
  /** 'inclusive' | 'exclusive' */
  taxType: string;
  hasMeasurements: boolean;
  hasComplementary: boolean;
  isActive: boolean;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
