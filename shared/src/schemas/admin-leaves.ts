import { z } from 'zod';
import { LEAVE_APPLICATION_STATUSES } from '../enums';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminLeaveApplicationCreateSchema = z
  .object({
    employeeId: z.string().min(1),
    leaveTypeId: z.string().min(1),
    fromDate: z.string().datetime(),
    toDate: z.string().datetime(),
    /** Number of leave days; supports halves (0.5). */
    days: z.coerce.number().positive().max(365),
    reason: optionalText(500),
  })
  .refine((v) => new Date(v.toDate) >= new Date(v.fromDate), {
    message: 'To-date must be on or after From-date',
    path: ['toDate'],
  });

export const adminLeaveDecisionSchema = z.object({
  approverNote: optionalText(500),
});

export const adminLeaveListQuerySchema = z.object({
  employeeId: z.string().optional(),
  /** Admin-only optional branch filter; branch sessions are locked server-side. */
  branchId: z.string().optional(),
  leaveTypeId: z.string().optional(),
  status: z.enum(LEAVE_APPLICATION_STATUSES).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

export const adminLeaveBalanceQuerySchema = z.object({
  employeeId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(3000).optional(),
});

export type AdminLeaveApplicationCreateInput = z.infer<typeof adminLeaveApplicationCreateSchema>;
export type AdminLeaveDecisionInput = z.infer<typeof adminLeaveDecisionSchema>;
export type AdminLeaveListQuery = z.infer<typeof adminLeaveListQuerySchema>;
export type AdminLeaveBalanceQuery = z.infer<typeof adminLeaveBalanceQuerySchema>;
