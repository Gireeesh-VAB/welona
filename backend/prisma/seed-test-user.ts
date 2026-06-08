/**
 * Quick script to create a test employee with login credentials.
 * Run with: npx tsx prisma/seed-test-user.ts
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const TEST_PASSWORD = 'Test@123';

async function main() {
  // Get or create an admin user
  const admin = await db.adminUser.findUnique({
    where: { email: 'superadmin@welona.com' },
    select: { id: true },
  });

  if (!admin) {
    throw new Error('No admin found. Run seed-admin.ts first.');
  }

  // Get the first branch (or create a basic one)
  let branch = await db.branch.findFirst();

  if (!branch) {
    // Create a default branch if none exists
    const org = await db.organization.findFirst() || await db.organization.create({
      data: { name: 'Welona', slug: 'welona' },
    });

    branch = await db.branch.create({
      data: {
        orgId: org.id,
        name: 'Main Branch',
        code: 'MAIN',
        createdByAdminId: admin.id,
      },
    });
  }

  // Create test employee
  const employee = await db.employee.upsert({
    where: { employeeCode: 'TEST-001' },
    update: {},
    create: {
      employeeCode: 'TEST-001',
      name: 'Test User',
      mobileNo: '9999999999',
      email: 'testuser@welona.com',
      branchId: branch.id,
      joiningDate: new Date(),
    },
  });

  // Create system user (login account)
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const systemUser = await db.systemUser.upsert({
    where: { userName: 'testuser' },
    update: {},
    create: {
      userName: 'testuser',
      email: 'testuser@welona.com',
      passwordHash,
      employeeId: employee.id,
      branchId: branch.id,
      isActive: true,
      createdByAdminId: admin.id,
    },
  });

  console.log('\n✅ Test Employee Created Successfully!\n');
  console.log('Login Credentials:');
  console.log('─'.repeat(40));
  console.log(`Email/Username: testuser`);
  console.log(`Password:       ${TEST_PASSWORD}`);
  console.log(`Branch:         ${branch.name}`);
  console.log('─'.repeat(40));
  console.log('\nLogin URL: http://localhost:3001/login');
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
