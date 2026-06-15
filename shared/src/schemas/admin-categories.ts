import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

/**
 * The capability-flag keys on a Category. Order matters — the UI renders the
 * checkboxes in this order to match the source admin design.
 */
export const CATEGORY_FLAG_KEYS = [
  'hasServiceBy',
  'hasIndividualDiscount',
  'hasTotalDiscount',
  'hasTokenReference',
  'hasShareIncentive',
  'hasConsultant',
  'hasTeleCaller',
  'hasMedia',
  'hasDirectPayment',
  'hasDND',
  'hasSession',
  'hasRating',
  'isAmountEditable',
  'hasQuantity',
  'hasDoctor',
  'hasValidity',
  'isCombo',
  'servicesInCombo',
  'hasAllSessionsLink',
  'hasBreakPackage',
  'sessionBased',
  'targetWeightBased',
  'hasMeasurement',
] as const;

export type CategoryFlagKey = (typeof CATEGORY_FLAG_KEYS)[number];

/** Human-readable label for each flag (used by the form checkboxes). */
export const CATEGORY_FLAG_LABELS: Record<CategoryFlagKey, string> = {
  hasServiceBy: 'Service By',
  hasIndividualDiscount: 'Individual Discount',
  hasTotalDiscount: 'Total Discount',
  hasTokenReference: 'Token Reference',
  hasShareIncentive: 'Share Incentive',
  hasConsultant: 'Consultant',
  hasTeleCaller: 'Tele Caller',
  hasMedia: 'Media',
  hasDirectPayment: 'Direct Payment',
  hasDND: 'DND',
  hasSession: 'Session',
  hasRating: 'Rating',
  isAmountEditable: 'Amount Editable',
  hasQuantity: 'Quantity',
  hasDoctor: 'Doctor',
  hasValidity: 'Validity',
  isCombo: 'Combo',
  servicesInCombo: 'Services in Combo',
  hasAllSessionsLink: 'All Sessions Link',
  hasBreakPackage: 'Break Package',
  sessionBased: 'Session Based',
  targetWeightBased: 'Target Weight Based',
  hasMeasurement: 'Measurement',
};

const flagShape = Object.fromEntries(
  CATEGORY_FLAG_KEYS.map((k) => [k, z.boolean().default(false)]),
) as Record<CategoryFlagKey, z.ZodDefault<z.ZodBoolean>>;

export const adminCategoryCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  categoryCode: optionalText(40),
  description: optionalText(300),
  isActive: z.boolean().optional(),
  ...flagShape,
});

export const adminCategoryUpdateSchema = adminCategoryCreateSchema.partial().extend({
  serviceIds: z.array(z.string()).optional(),
});

export const adminCategoryListQuerySchema = z.object({
  search: z.string().trim().optional(),
  active: z.enum(['all', 'active', 'inactive']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
});

export type AdminCategoryCreateInput = z.infer<typeof adminCategoryCreateSchema>;
export type AdminCategoryUpdateInput = z.infer<typeof adminCategoryUpdateSchema>;
export type AdminCategoryListQuery = z.infer<typeof adminCategoryListQuerySchema>;
