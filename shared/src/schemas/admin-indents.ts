import { z } from 'zod';
import { DISPATCH_METHODS } from '../enums';

// --- Create (multi-item) ---

export const stockIndentCreateSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product is required'),
        requestedQty: z.coerce.number().int().positive('Must be at least 1'),
      }),
    )
    .min(1, 'Add at least one product'),
  reason: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
});

// --- Actions (discriminated union) ---

export const stockIndentActionSchema = z.discriminatedUnion('action', [
  // Approve: set approvedQty per item (and optional rejectionReason when partial)
  z.object({
    action: z.literal('approve'),
    items: z
      .array(z.object({
        itemId: z.string().min(1),
        approvedQty: z.coerce.number().int().min(0),
        rejectionReason: z.string().trim().max(500).optional(),
      }))
      .min(1),
    notes: z.string().trim().max(500).optional(),
  }),
  // Dispatch: delivery info + fulfilledQty per item; deducts from sourceWarehouseId
  z.object({
    action: z.literal('dispatch'),
    dispatchMethod: z.enum(DISPATCH_METHODS),
    sourceWarehouseId: z.string().min(1).optional(),
    items: z
      .array(z.object({
        itemId: z.string().min(1),
        fulfilledQty: z.coerce.number().int().min(0),
        warehouseId: z.string().min(1).optional(),
      }))
      .min(1),
    // Company vehicle
    vehicleNumber: z.string().trim().max(20).optional(),
    // Shared: driver / employee / delivery person name
    driverName: z.string().trim().max(100).optional(),
    // Shared: contact mobile
    driverMobile: z.string().trim().max(15).optional(),
    // Branch staff pickup
    pickupEmployeeId: z.string().trim().max(50).optional(),
    // Porter / Rapido / Courier
    providerName: z.string().trim().max(100).optional(),
    trackingNumber: z.string().trim().max(100).optional(),
    deliveryCharges: z.coerce.number().int().min(0).optional(),
    // Other
    customMethodName: z.string().trim().max(100).optional(),
    // All methods
    expectedDeliveryAt: z.string().datetime({ offset: true }).optional(),
    deliveryNotes: z.string().trim().max(500).optional(),
  }),
  // Deliver: receivedQty per item → triggers inventory credit
  z.object({
    action: z.literal('deliver'),
    items: z
      .array(z.object({ itemId: z.string().min(1), receivedQty: z.coerce.number().int().min(0) }))
      .min(1),
    notes: z.string().trim().max(500).optional(),
  }),
  // Reject: from pending or approved
  z.object({
    action: z.literal('reject'),
    notes: z.string().trim().max(500).optional(),
  }),
  // Close: terminal from delivered
  z.object({
    action: z.literal('close'),
    notes: z.string().trim().max(500).optional(),
  }),
]);

// --- List query ---

export const stockIndentListQuerySchema = z.object({
  branchId: z.string().optional(),
  status: z
    .enum(['pending', 'approved', 'dispatched', 'delivered', 'closed', 'rejected'])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

// --- Types ---

export type StockIndentCreateInput = z.infer<typeof stockIndentCreateSchema>;
export type StockIndentActionInput = z.infer<typeof stockIndentActionSchema>;
export type StockIndentListQuery = z.infer<typeof stockIndentListQuerySchema>;

// Legacy — kept for branch-side staff route compatibility
export const stockIndentUpdateSchema = z.object({
  status: z.enum(['approved', 'rejected', 'dispatched', 'delivered', 'closed']),
  notes: z.string().trim().max(500).optional(),
});
export type StockIndentUpdateInput = z.infer<typeof stockIndentUpdateSchema>;
