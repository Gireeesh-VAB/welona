/**
 * Zod request schemas for the cash-management modules: cash denomination
 * counts, petty cash, vouchers and day close. Money is in minor units.
 */
import { z } from 'zod';
import { PETTY_CASH_DIRECTIONS, VOUCHER_MODES, VOUCHER_TYPES } from '@shared/enums';

const money = z.number().int().nonnegative();
const optionalText = z.string().trim().optional();

// --- Cash denomination ------------------------------------------------------

export const cashDenominationCreateSchema = z.object({
  countedAt: z.string().datetime().optional(),
  label: optionalText,
  /** Map of denomination value -> note/coin count. */
  breakdown: z.record(z.string(), z.number().int().nonnegative()),
  note: optionalText,
});

// --- Petty cash -------------------------------------------------------------

export const pettyCashCreateSchema = z.object({
  entryDate: z.string().datetime().optional(),
  direction: z.enum(PETTY_CASH_DIRECTIONS),
  category: optionalText,
  description: z.string().trim().min(1, 'Description is required'),
  amount: money.refine((v) => v > 0, 'Amount must be greater than zero'),
  paidTo: optionalText,
  reference: optionalText,
});

// --- Vouchers ---------------------------------------------------------------

export const voucherCreateSchema = z.object({
  voucherDate: z.string().datetime().optional(),
  voucherType: z.enum(VOUCHER_TYPES),
  party: z.string().trim().min(1, 'Party is required'),
  amount: money.refine((v) => v > 0, 'Amount must be greater than zero'),
  mode: z.enum(VOUCHER_MODES).default('cash'),
  narration: optionalText,
});

// --- Day close --------------------------------------------------------------

export const dayCloseCreateSchema = z.object({
  closeDate: z.string().datetime(),
  openingCash: money.default(0),
  countedCash: money.default(0),
  note: optionalText,
});

export const dayCloseQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
});
