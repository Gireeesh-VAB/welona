import { z } from 'zod';
import { ATTENDANCE_STATUSES } from '../enums';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

/** Mark a single (employee, date) attendance cell. */
export const adminAttendanceUpsertSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().datetime(),
  status: z.enum(ATTENDANCE_STATUSES),
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  hoursWorked: z.number().min(0).max(24).optional(),
  remarks: optionalText(300),
});

/** Bulk-mark for one date across multiple employees. */
export const adminAttendanceBulkSchema = z.object({
  date: z.string().datetime(),
  entries: z
    .array(
      z.object({
        employeeId: z.string().min(1),
        status: z.enum(ATTENDANCE_STATUSES),
        remarks: optionalText(300),
      }),
    )
    .min(1)
    .max(500),
});

export const adminAttendanceListQuerySchema = z.object({
  employeeId: z.string().optional(),
  branchId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z.enum(ATTENDANCE_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(2000).default(500),
});

export type AdminAttendanceUpsertInput = z.infer<typeof adminAttendanceUpsertSchema>;
export type AdminAttendanceBulkInput = z.infer<typeof adminAttendanceBulkSchema>;
export type AdminAttendanceListQuery = z.infer<typeof adminAttendanceListQuerySchema>;
