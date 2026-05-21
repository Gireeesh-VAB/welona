import type { Prisma } from '@prisma/client';
import type { AdminPaymentMode } from '@/types/admin-payment-mode';

export type PaymentModeWithRelations = Prisma.PaymentModeGetPayload<{
  include: { createdByAdmin: true };
}>;

export function toAdminPaymentMode(row: PaymentModeWithRelations): AdminPaymentMode {
  return {
    id: row.id,
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
