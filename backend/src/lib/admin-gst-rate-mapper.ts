import type { GstRate } from '@prisma/client';
import type { AdminGstRate } from '@shared/types/admin-gst-rate';

export function toAdminGstRate(row: GstRate): AdminGstRate {
  return {
    id: row.id,
    name: row.name,
    percentage: row.percentage,
    taxType: row.taxType as 'inclusive' | 'exclusive',
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
