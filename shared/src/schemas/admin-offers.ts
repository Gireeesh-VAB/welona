import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

/** A single service line on the offer. */
export const offerItemInputSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  serviceId: z.string().min(1, 'Service is required'),
  quantity: z.coerce.number().int().positive().default(1),
});

const offerScalarShape = {
  packageName: z.string().trim().min(1, 'Package name is required').max(120),
  packageCode: z
    .string()
    .trim()
    .min(1, 'Package code is required')
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, digits, dash or underscore only'),
  // Dates arrive as ISO strings from the client (DatePicker).
  fromDate: z.string().min(1, 'From date is required'),
  toDate: z.string().min(1, 'To date is required'),
  // Amounts are stored as paise (integer minor units).
  minAmount: z.coerce.number().int().nonnegative().default(0),
  maxAmount: z.coerce.number().int().nonnegative().default(0),
  remarks: optionalText(500),
  frontImageUrl: optionalText(2_000_000), // accommodates ~1.5MB data URL
  isActive: z.boolean().default(true),
  branchIds: z.array(z.string().min(1)).min(1, 'Select at least one branch'),
  items: z.array(offerItemInputSchema).min(1, 'Add at least one service'),
};

export const adminOfferCreateSchema = z
  .object(offerScalarShape)
  .refine((v) => v.maxAmount >= v.minAmount, {
    message: 'Max amount must be ≥ min amount',
    path: ['maxAmount'],
  });

// Build the update schema from the same shape so .partial() works (refined
// schemas don't expose .partial()). Min/max validation at update time is
// handled in the route handler.
export const adminOfferUpdateSchema = z.object(offerScalarShape).partial();

export const adminOfferListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type AdminOfferCreateInput = z.infer<typeof adminOfferCreateSchema>;
export type AdminOfferUpdateInput = z.infer<typeof adminOfferUpdateSchema>;
export type AdminOfferListQuery = z.infer<typeof adminOfferListQuerySchema>;
export type AdminOfferItemInput = z.infer<typeof offerItemInputSchema>;
