import type { Prisma } from '@prisma/client';
import type { AdminHoliday } from '@shared/types/admin-holiday';
import type { HolidayType } from '@shared/enums';

export type HolidayWithRelations = Prisma.HolidayGetPayload<{
  include: { createdByAdmin: true };
}>;

export function toAdminHoliday(row: HolidayWithRelations): AdminHoliday {
  return {
    id: row.id,
    date: row.date.toISOString(),
    name: row.name,
    type: row.type as HolidayType,
    region: row.region,
    isActive: row.isActive,
    createdBy: row.createdByAdmin
      ? {
          id: row.createdByAdmin.id,
          name: row.createdByAdmin.name,
          email: row.createdByAdmin.email,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
