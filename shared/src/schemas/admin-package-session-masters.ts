import { z } from 'zod';

const optText = (max = 500) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

const packageInventoryItemSchema = z.object({
  productId:          z.string().min(1),
  productName:        z.string().min(1),
  quantityPerSession: z.coerce.number().positive().default(1),
  chargeType:         z.enum(['collect_amount', 'consume_only']).default('consume_only'),
  uom:                z.string().optional(),
});

const servicePriceOverrideSchema = z.object({
  serviceId:             z.string().min(1),
  customPricePerSession: z.number().int().min(0).optional(),      // paise; undefined = use service master price
  customSessions:        z.number().int().positive().optional(),  // undefined = use service master sessions
});

export const adminPackageSessionMasterCreateSchema = z.object({
  name:                  z.string().trim().min(1, 'Name is required').max(200),
  description:           optText(500),
  serviceIds:            z.array(z.string()).default([]),
  servicePriceOverrides: z.array(servicePriceOverrideSchema).default([]),
  inventoryItems:        z.array(packageInventoryItemSchema).default([]),
  defaultSessions:       z.number().int().positive('At least 1 session required').default(1),
  price:                 z.number().int().min(0).default(0), // minor units (paise)
  taxPercent:            z.number().int().min(0).max(100).default(0), // whole percent
  taxType:               z.enum(['inclusive', 'exclusive']).default('exclusive'),
  collectAdvance:        z.boolean().default(false),
  advancePercent:        z.number().int().min(0).max(100).default(0),
  isActive:              z.boolean().default(true),
});

export const adminPackageSessionMasterUpdateSchema =
  adminPackageSessionMasterCreateSchema.partial();

export const adminPackageSessionMasterListQuerySchema = z.object({
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(200).default(50),
  search: z.string().trim().optional(),
  active: z.enum(['true', 'false', 'all']).optional(),
});

export type AdminPackageSessionMasterCreateInput = z.infer<typeof adminPackageSessionMasterCreateSchema>;
export type AdminPackageSessionMasterUpdateInput = z.infer<typeof adminPackageSessionMasterUpdateSchema>;
