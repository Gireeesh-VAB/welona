import { z } from 'zod';

const couponBaseShape = {
  couponName:  z.string().trim().min(1, 'Coupon name is required').max(120),
  couponCode:  z
    .string()
    .trim()
    .min(1, 'Coupon code is required')
    .max(40)
    .regex(/^[A-Z0-9_-]+$/, 'Use uppercase letters, digits, dash or underscore only'),
  couponType:  z.enum(['percentage', 'fixed']),
  couponValue: z.coerce.number().int().positive('Value must be positive'),
  startDate:   z.string().min(1, 'Start date is required'),
  endDate:     z.string().min(1, 'End date is required'),
  isActive:    z.boolean().default(true),
  allBranches: z.boolean().default(false),
  branchIds:   z.array(z.string()).default([]),
};

const couponBaseSchema = z.object(couponBaseShape);

export const adminCouponCreateSchema = couponBaseSchema
  .refine((v) => v.allBranches || v.branchIds.length > 0, {
    message: 'Select at least one branch or enable "All Branches"',
    path: ['branchIds'],
  })
  .refine((v) => v.couponType !== 'percentage' || (v.couponValue >= 1 && v.couponValue <= 100), {
    message: 'Percentage must be between 1 and 100',
    path: ['couponValue'],
  });

export const adminCouponUpdateSchema = couponBaseSchema.partial();

export type AdminCouponCreateInput = z.infer<typeof adminCouponCreateSchema>;
export type AdminCouponUpdateInput = z.infer<typeof adminCouponUpdateSchema>;
