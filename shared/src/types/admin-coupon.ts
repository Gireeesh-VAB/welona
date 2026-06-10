export interface AdminCoupon {
  id: string;
  couponName: string;
  couponCode: string;
  couponType: 'percentage' | 'fixed';
  /** Integer: % value (1-100) for percentage coupons; paise for fixed-amount coupons. */
  couponValue: number;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  isActive: boolean;
  allBranches: boolean;
  branches: { id: string; branchName: string; branchCode: string }[];
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

/** Returned by the staff-side lookup endpoint. */
export interface CouponLookupResult {
  couponName: string;
  couponCode: string;
  couponType: 'percentage' | 'fixed';
  couponValue: number;
}
