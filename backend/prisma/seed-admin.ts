/**
 * Quick one-shot script that seeds only the AdminUser pool.
 *
 * Use this when the AdminUser table is empty (e.g. just after the migration
 * that added it) but the full seed can't run because the rest of the database
 * is already populated. Run with: `npx tsx prisma/seed-admin.ts`.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();
const DEMO_PASSWORD = 'Welona@123';

const admins = [
  { name: 'Welona Super Admin', email: 'superadmin@welona.com' },
  { name: 'Welona Admin', email: 'admin.console@welona.com' },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const a of admins) {
    await db.adminUser.upsert({
      where: { email: a.email },
      update: { name: a.name },
      create: { name: a.name, email: a.email, passwordHash, status: 'active' },
    });
    console.log(`  ✓ ${a.email}`);
  }
  console.log(`\nAdmin sign-in: /admin/login`);
  console.log(`Password:      ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('Admin seed failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
