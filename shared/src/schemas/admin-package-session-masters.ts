import { z } from 'zod';

const optText = (max = 500) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminPackageSessionMasterCreateSchema = z.object({
  name:            z.string().trim().min(1, 'Name is required').max(200),
  description:     optText(500),
  serviceIds:      z.array(z.string()).default([]),
  defaultSessions: z.number().int().positive('At least 1 session required').default(1),
  price:           z.number().int().min(0).default(0), // minor units (paise)
  isActive:        z.boolean().default(true),
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
