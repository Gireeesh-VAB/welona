import { db } from '@/lib/db';
import { Errors } from '@/lib/api/errors';
import type { Prisma } from '@prisma/client';
import { dayKey } from './hr-dates';

/**
 * Get-or-create the LeaveBalance row for (employee, type, year). New rows
 * inherit the type's `daysPerYear` as their allocation so a freshly-approved
 * leave doesn't fall into a negative balance just because nobody seeded one.
 */
async function ensureBalance(
  tx: Prisma.TransactionClient,
  employeeId: string,
  leaveTypeId: string,
  year: number,
) {
  const existing = await tx.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
  });
  if (existing) return existing;

  const type = await tx.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!type) throw Errors.notFound('Leave type');

  return tx.leaveBalance.create({
    data: {
      employeeId,
      leaveTypeId,
      year,
      allocated: type.daysPerYear,
      used: 0,
    },
  });
}

/**
 * Bump `LeaveBalance.used` by `+days`. The application's `fromDate` year is
 * used as the bucket — split-year leaves are bucketed against the start year
 * for the v1 model.
 */
export async function consumeBalance(
  tx: Prisma.TransactionClient,
  employeeId: string,
  leaveTypeId: string,
  fromDate: Date,
  days: number,
) {
  const year = dayKey(fromDate).getUTCFullYear();
  const balance = await ensureBalance(tx, employeeId, leaveTypeId, year);
  await tx.leaveBalance.update({
    where: { id: balance.id },
    data: { used: balance.used + days },
  });
}

/** Mirror of `consumeBalance`, used when an approved leave is cancelled. */
export async function releaseBalance(
  tx: Prisma.TransactionClient,
  employeeId: string,
  leaveTypeId: string,
  fromDate: Date,
  days: number,
) {
  const year = dayKey(fromDate).getUTCFullYear();
  const balance = await tx.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
  });
  if (!balance) return;
  await tx.leaveBalance.update({
    where: { id: balance.id },
    data: { used: Math.max(0, balance.used - days) },
  });
}

/**
 * Mark a date range as `status: 'leave'` on the employee's attendance —
 * called when a leave application is approved so the attendance grid stays
 * in sync without HR re-entering anything.
 */
export async function paintLeaveAttendance(
  tx: Prisma.TransactionClient,
  employeeId: string,
  fromDate: Date,
  toDate: Date,
  reason: string | null,
) {
  const start = dayKey(fromDate);
  const end = dayKey(toDate);
  const writes: Promise<unknown>[] = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86_400_000)) {
    const date = new Date(d);
    writes.push(
      tx.attendance.upsert({
        where: { employeeId_date: { employeeId, date } },
        create: {
          employeeId,
          date,
          status: 'leave',
          remarks: reason ?? 'Approved leave',
        },
        update: { status: 'leave', remarks: reason ?? 'Approved leave' },
      }),
    );
  }
  await Promise.all(writes);
}

/** Reverse of `paintLeaveAttendance` — wipes leave-painted cells in the range. */
export async function clearLeaveAttendance(
  tx: Prisma.TransactionClient,
  employeeId: string,
  fromDate: Date,
  toDate: Date,
) {
  await tx.attendance.deleteMany({
    where: {
      employeeId,
      status: 'leave',
      date: { gte: dayKey(fromDate), lte: dayKey(toDate) },
    },
  });
}
