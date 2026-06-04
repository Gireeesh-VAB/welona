import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

const optionalDateIso = z
  .string()
  .trim()
  .optional()
  .or(z.literal('').transform(() => undefined));

export const adminEmployeeCreateSchema = z.object({
  // --- Personal ---
  name: z.string().trim().min(1, 'Employee name is required').max(160),
  biometricId: optionalText(60),
  fatherName: optionalText(120),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dob: optionalDateIso,
  mobileNo: z.string().trim().min(1, 'Mobile number is required').max(40),
  mobileAlternate: optionalText(40),
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  panNo: optionalText(20),
  pincode: optionalText(12),
  address: optionalText(400),
  // --- Official ---
  employeeCode: z.string().trim().min(1, 'Employee code is required').max(40),
  designationId: z.string().optional().or(z.literal('').transform(() => undefined)),
  departmentId: z.string().optional().or(z.literal('').transform(() => undefined)),
  branchId: z.string().optional().or(z.literal('').transform(() => undefined)),
  zoneId: z.string().optional().or(z.literal('').transform(() => undefined)),
  joiningDate: z.string().min(1, 'Joining date is required'),
  relievingDate: optionalDateIso,
  // Salary arrives from the UI as rupees, converted to paise before submit.
  salary: z.coerce.number().int().nonnegative().default(0),
  bankName: optionalText(120),
  bankAccountNo: optionalText(40),
  callerType: optionalText(40),
  pf: z.boolean().default(false),
  esi: z.boolean().default(false),
  // --- Shift ---
  weeklyOff: optionalText(20),
  // --- Photo (data URL or external URL) ---
  photoUrl: z
    .string()
    .trim()
    .max(2_000_000)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
});

export const adminEmployeeUpdateSchema = adminEmployeeCreateSchema.partial();

export const adminEmployeeListQuerySchema = z.object({
  search: z.string().trim().optional(),
  branchId: z.string().optional(),
  departmentId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type AdminEmployeeCreateInput = z.infer<typeof adminEmployeeCreateSchema>;
export type AdminEmployeeUpdateInput = z.infer<typeof adminEmployeeUpdateSchema>;
export type AdminEmployeeListQuery = z.infer<typeof adminEmployeeListQuerySchema>;

/** Days of week for the Weekly Off picker. */
export const WEEKLY_OFF_OPTIONS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Caller type options. Free-text on save but the dropdown nudges values. */
export const CALLER_TYPE_OPTIONS = [
  'Inbound',
  'Outbound',
  'Tele Caller',
  'Field',
  'None',
] as const;
