import { z } from 'zod';
import { HOLIDAY_TYPES } from '../enums';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminHolidayCreateSchema = z.object({
  date: z.string().datetime(),
  name: z.string().trim().min(1, 'Holiday name is required').max(120),
  type: z.enum(HOLIDAY_TYPES).default('public'),
  region: optionalText(80),
});

export const adminHolidayUpdateSchema = adminHolidayCreateSchema.partial();

export const adminHolidayListQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(3000).optional(),
  type: z.enum(HOLIDAY_TYPES).optional(),
  region: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(200),
});

export type AdminHolidayCreateInput = z.infer<typeof adminHolidayCreateSchema>;
export type AdminHolidayUpdateInput = z.infer<typeof adminHolidayUpdateSchema>;
export type AdminHolidayListQuery = z.infer<typeof adminHolidayListQuerySchema>;
