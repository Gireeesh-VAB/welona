/**
 * System users (login accounts) showcase seed.
 *
 * Run with: `npx tsx prisma/seed-admin-system-users.ts`
 *
 * Idempotent — each user is upserted on `userName`. Each user is paired with
 * an existing showcase Employee (created by `seed-admin-showcase.ts`) so the
 * Admin → HR → User screen shows realistic employee + branch links.
 *
 * Default password for every seeded user: `welona@123` (bcrypt-hashed before
 * storage). Change in production!
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const DEFAULT_PASSWORD = 'welona@123';

interface SystemUserSpec {
  userName: string;
  email: string;
  /** Match an Employee row by `employeeCode` (from `seed-admin-showcase.ts`). */
  employeeCode: string;
  ipAddress: string;
}

const userSpecs: SystemUserSpec[] = [
  { userName: 'rohit.sharma',  email: 'rohit.sharma@welona.com',  employeeCode: 'EMP-0001', ipAddress: '192.168.1.10' },
  { userName: 'priya.kapoor',  email: 'priya.kapoor@welona.com',  employeeCode: 'EMP-0002', ipAddress: '192.168.1.11' },
  { userName: 'karthik.iyer',  email: 'karthik.iyer@welona.com',  employeeCode: 'EMP-0003', ipAddress: '192.168.2.10' },
  { userName: 'anita.reddy',   email: 'anita.reddy@welona.com',   employeeCode: 'EMP-0004', ipAddress: '192.168.3.10' },
  { userName: 'vikram.singh',  email: 'vikram.singh@welona.com',  employeeCode: 'EMP-0005', ipAddress: '192.168.4.10' },
  { userName: 'meera.joshi',   email: 'meera.joshi@welona.com',   employeeCode: 'EMP-0006', ipAddress: '192.168.2.11' },
  { userName: 'arjun.mehta',   email: 'arjun.mehta@welona.com',   employeeCode: 'EMP-0007', ipAddress: '192.168.3.11' },
  { userName: 'sneha.iyer',    email: 'sneha.iyer@welona.com',    employeeCode: 'EMP-0008', ipAddress: '192.168.5.10' },
  { userName: 'rajesh.kumar',  email: 'rajesh.kumar@welona.com',  employeeCode: 'EMP-0009', ipAddress: '192.168.1.12' },
  { userName: 'divya.rao',     email: 'divya.rao@welona.com',     employeeCode: 'EMP-0010', ipAddress: '192.168.1.13' },
];

async function main() {
  const admin = await db.adminUser.findUnique({
    where: { email: 'superadmin@welona.com' },
    select: { id: true, name: true },
  });
  if (!admin) {
    throw new Error(
      'No `superadmin@welona.com` AdminUser. Run `npx tsx prisma/seed-admin.ts` first.',
    );
  }
  console.log(`Attributing system users to admin: ${admin.name}\n`);

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Map each Employee by code so we can wire employeeId + inherit branchId.
  const employees = await db.employee.findMany({
    select: { id: true, employeeCode: true, branchId: true },
  });
  const employeeByCode = new Map(employees.map((e) => [e.employeeCode, e]));

  console.log('System users:');
  let added = 0;
  let updated = 0;
  for (const spec of userSpecs) {
    const employee = employeeByCode.get(spec.employeeCode);
    if (!employee) {
      console.warn(
        `  ! Skipping ${spec.userName} — employee "${spec.employeeCode}" not found. ` +
          `Run \`npx tsx prisma/seed-admin-showcase.ts\` first.`,
      );
      continue;
    }

    const existing = await db.systemUser.findUnique({
      where: { userName: spec.userName },
      select: { id: true },
    });

    if (existing) {
      await db.systemUser.update({
        where: { id: existing.id },
        data: {
          email: spec.email,
          employeeId: employee.id,
          branchId: employee.branchId,
          ipAddress: spec.ipAddress,
          // Note: we intentionally do NOT overwrite the password on re-runs
          // so users that have rotated theirs keep the new one.
        },
      });
      updated += 1;
      console.log(`  ↻ ${spec.userName.padEnd(16)} ${spec.email}`);
    } else {
      await db.systemUser.create({
        data: {
          userName: spec.userName,
          passwordHash,
          email: spec.email,
          employeeId: employee.id,
          branchId: employee.branchId,
          ipAddress: spec.ipAddress,
          isActive: true,
          createdByAdminId: admin.id,
        },
      });
      added += 1;
      console.log(`  ✓ ${spec.userName.padEnd(16)} ${spec.email}`);
    }
  }

  console.log(
    `\nDone. ${added} user${added === 1 ? '' : 's'} added, ` +
      `${updated} updated. Default password for new users: "${DEFAULT_PASSWORD}".`,
  );
}

main()
  .catch((e) => {
    console.error('System users seed failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
