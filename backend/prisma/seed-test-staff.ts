/**
 * Quick script to create a test staff member with login credentials.
 * Run with: npx tsx prisma/seed-test-staff.ts
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const TEST_PASSWORD = 'Test@123';

async function main() {
  // Get or create organization
  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({
      data: { name: 'Welona', slug: 'welona' },
    });
  }

  // Get or create an admin user
  const admin = await db.adminUser.findUnique({
    where: { email: 'superadmin@welona.com' },
    select: { id: true },
  });

  if (!admin) {
    throw new Error('No admin found. Run seed-admin.ts first.');
  }

  // Get the first branch (or create one)
  let branch = await db.branch.findFirst({
    where: { orgId: org.id },
  });

  if (!branch) {
    branch = await db.branch.create({
      data: {
        orgId: org.id,
        name: 'Main Branch',
        code: 'MAIN',
        createdByAdminId: admin.id,
      },
    });
  }

  // Get or create a role
  let role = await db.role.findFirst({
    where: { orgId: org.id },
  });

  if (!role) {
    role = await db.role.create({
      data: {
        orgId: org.id,
        name: 'Test Role',
        key: 'test_role',
        scope: 'organization',
        permissions: JSON.stringify(['*']),
      },
    });
  }

  // Create test staff member
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const staff = await db.staff.upsert({
    where: { email: 'teststaff@welona.com' },
    update: {},
    create: {
      orgId: org.id,
      branchId: branch.id,
      roleId: role.id,
      name: 'Test Staff',
      email: 'teststaff@welona.com',
      phone: '9999999999',
      passwordHash,
      status: 'active',
      twoFactorEnabled: false, // Disable 2FA for easier testing
    },
  });

  console.log('\n✅ Test Staff Member Created Successfully!\n');
  console.log('Login Credentials:');
  console.log('─'.repeat(50));
  console.log(`Email:          teststaff@welona.com`);
  console.log(`Password:       ${TEST_PASSWORD}`);
  console.log(`Name:           Test Staff`);
  console.log(`Branch:         ${branch.name}`);
  console.log(`2FA:            Disabled (for easy testing)`);
  console.log('─'.repeat(50));
  console.log('\nLogin URL: http://localhost:3001/login');
  console.log('\nNow update the auto-fill credentials to use:');
  console.log('  Email: teststaff@welona.com');
  console.log('  Password: Test@123');
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
