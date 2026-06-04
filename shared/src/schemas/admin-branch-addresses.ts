import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminBranchAddressCreateSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(80),
  line1: z.string().trim().min(1, 'Address line 1 is required').max(200),
  line2: optionalText(200),
  city: optionalText(80),
  state: optionalText(80),
  pincode: optionalText(12),
  country: optionalText(80),
  phone: optionalText(40),
  email: z.string().trim().email().max(120).optional().or(z.literal('').transform(() => undefined)),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const adminBranchAddressUpdateSchema = adminBranchAddressCreateSchema.partial();

export type AdminBranchAddressCreateInput = z.infer<typeof adminBranchAddressCreateSchema>;
export type AdminBranchAddressUpdateInput = z.infer<typeof adminBranchAddressUpdateSchema>;
