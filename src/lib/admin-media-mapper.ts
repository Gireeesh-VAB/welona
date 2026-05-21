import type { Prisma } from '@prisma/client';
import type { AdminMedia } from '@/types/admin-media';

export type MediaWithRelations = Prisma.MediaGetPayload<{
  include: { zone: true; createdByAdmin: true };
}>;

export function toAdminMedia(row: MediaWithRelations): AdminMedia {
  return {
    id: row.id,
    zoneId: row.zoneId,
    zone: {
      id: row.zone.id,
      country: row.zone.country,
      stateName: row.zone.stateName,
    },
    name: row.name,
    remarks: row.remarks,
    ipAddress: row.ipAddress,
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
