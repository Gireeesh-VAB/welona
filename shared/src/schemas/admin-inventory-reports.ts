import { z } from 'zod';

/** Query for inventory report endpoints. */
export const adminInventoryReportQuerySchema = z.object({
  branchId: z.string().optional(),
  /** Movement window in days for sold/purchased/movement-class metrics. */
  days: z.coerce.number().int().positive().max(365).default(30),
  /** Fast/slow threshold: units sold in the window at/above this = "fast". */
  fastThreshold: z.coerce.number().int().positive().default(10),
});

export type AdminInventoryReportQuery = z.infer<typeof adminInventoryReportQuerySchema>;
