/**
 * Top-up script — make sure today's attendance grid is populated for the
 * /admin/hr/attendance page demo. Marks every active employee that doesn't
 * already have a row for today, with a realistic status mix.
 *
 * Idempotent: existing rows for today are left untouched.
 *
 * Usage: `npx tsx prisma/fill-today.ts`
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

const weightedStatuses: Array<[string, number]> = [
  ['present', 65],
  ['wfh', 12],
  ['half_day', 6],
  ['leave', 8],
  ['absent', 5],
  ['present', 4],
];

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function weightedPick(r: () => number): string {
  const total = weightedStatuses.reduce((s, [, w]) => s + w, 0);
  let n = r() * total;
  for (const [k, w] of weightedStatuses) {
    n -= w;
    if (n <= 0) return k;
  }
  return 'present';
}

async function main() {
  const admin = await db.adminUser.findFirst();
  if (!admin) {
    console.error('No AdminUser — run the base admin seed first.');
    process.exit(1);
  }

  const today = todayUtc();
  console.log(`[fill-today] Date: ${today.toISOString().slice(0, 10)}`);

  const employees = await db.employee.findMany({ where: { isActive: true } });
  console.log(`[fill-today] Active employees: ${employees.length}`);

  const existing = await db.attendance.findMany({
    where: { date: today },
    select: { employeeId: true },
  });
  const alreadyMarked = new Set(existing.map((e) => e.employeeId));
  console.log(`[fill-today] Already marked today: ${alreadyMarked.size}`);

  const r = rng(today.getUTCDate() * 31 + today.getUTCMonth());
  let added = 0;
  for (const emp of employees) {
    if (alreadyMarked.has(emp.id)) continue;
    const status = weightedPick(r);
    await db.attendance.create({
      data: {
        employeeId: emp.id,
        date: today,
        status,
        markedByAdminId: admin.id,
      },
    });
    added += 1;
  }
  console.log(`[fill-today] Newly marked: ${added}`);

  const breakdown = await db.attendance.groupBy({
    by: ['status'],
    where: { date: today },
    _count: { _all: true },
  });
  console.log('[fill-today] Final breakdown:');
  for (const b of breakdown) {
    console.log(`  ${b.status.padEnd(10)} ${b._count._all}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
