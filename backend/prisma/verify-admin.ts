import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const admins = await db.adminUser.findMany();
  console.log(`AdminUser table has ${admins.length} row(s):`);
  for (const a of admins) {
    const okWelona = await bcrypt.compare('Welona@123', a.passwordHash);
    console.log(
      `  - id=${a.id} email=${a.email} status=${a.status} ` +
        `Welona@123-matches=${okWelona}`,
    );
  }
}

main()
  .catch((e) => {
    console.error('FAIL:', e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
