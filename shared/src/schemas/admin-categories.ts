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
  hasServiceBy: 'HasServiceBy',
  hasIndividualDiscount: 'HasIndividualDiscount',
  hasTotalDiscount: 'HasTotalDiscount',
  hasTokenReference: 'HasTokenReference',
  hasShareIncentive: 'HasShareIncentive',
  hasConsultant: 'HasConsultant',
  hasTeleCaller: 'HasTeleCaller',
  hasMedia: 'HasMedia',
  hasDirectPayment: 'HasDirectPayment',
  hasDND: 'HasDND',
  hasSession: 'HasSession',
  hasRating: 'HasRating',
  isAmountEditable: 'IsAmountEditable',
  hasQuantity: 'HasQuantity',
  hasDoctor: 'HasDoctor',
  hasValidity: 'HasValidity',
  isCombo: 'IsCombo',
  servicesInCombo: 'ServicesInCombo',
  hasAllSessionsLink: 'HasAllSessionsLink',
  hasBreakPackage: 'HasBreakPackage',
  sessionBased: 'SessionBased',
  targetWeightBased: 'TargetWeightBased',
  hasMeasurement: 'HasMeasurement',
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

export const adminCategoryUpdateSchema = adminCategoryCreateSchema.partial();

export const adminCategoryListQuerySchema = z.object({
  search: z.string().trim().optional(),
  active: z.enum(['all', 'active', 'inactive']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export type AdminCategoryCreateInput = z.infer<typeof adminCategoryCreateSchema>;
export type AdminCategoryUpdateInput = z.infer<typeof adminCategoryUpdateSchema>;
export type AdminCategoryListQuery = z.infer<typeof adminCategoryListQuerySchema>;
