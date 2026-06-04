import { z } from 'zod';
import { SHIPMENT_STAGES } from '../enums';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminShipmentCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(160),
  branchId: z.string().trim().optional().or(z.literal('').transform(() => undefined)),
  supplier: optionalText(120),
  reference: optionalText(80),
  notes: optionalText(500),
});

/** Move a shipment to a new stage (logs a stage event). */
export const adminShipmentAdvanceSchema = z.object({
  stage: z.enum(SHIPMENT_STAGES),
  note: optionalText(300),
});

export const adminShipmentListQuerySchema = z.object({
  branchId: z.string().optional(),
  stage: z.enum(SHIPMENT_STAGES).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export type AdminShipmentCreateInput = z.infer<typeof adminShipmentCreateSchema>;
export type AdminShipmentAdvanceInput = z.infer<typeof adminShipmentAdvanceSchema>;
export type AdminShipmentListQuery = z.infer<typeof adminShipmentListQuerySchema>;
