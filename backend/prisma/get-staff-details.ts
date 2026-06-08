/**
 * Get all staff members and their details.
 * Run with: npx tsx prisma/get-staff-details.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const staffMembers = await db.staff.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      role: {
        select: {
          name: true,
          key: true,
          permissions: true,
        },
      },
      branch: {
        select: {
          name: true,
          code: true,
        },
      },
      twoFactorEnabled: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (staffMembers.length === 0) {
    console.log('\n❌ No staff members found in the database.\n');
    return;
  }

  console.log('\n' + '='.repeat(120));
  console.log('STAFF MEMBERS IN SYSTEM');
  console.log('='.repeat(120) + '\n');

  staffMembers.forEach((staff, index) => {
    const permissions = JSON.parse(staff.role.permissions);
    console.log(`${index + 1}. ${staff.name.toUpperCase()}`);
    console.log('─'.repeat(120));
    console.log(`   Email:              ${staff.email}`);
    console.log(`   Phone:              ${staff.phone || 'N/A'}`);
    console.log(`   Branch:             ${staff.branch?.name || 'Not assigned'} (${staff.branch?.code || 'N/A'})`);
    console.log(`   Role:               ${staff.role.name} (${staff.role.key})`);
    console.log(`   Permissions:        ${Array.isArray(permissions) ? permissions.join(', ') : permissions}`);
    console.log(`   Status:             ${staff.status}`);
    console.log(`   2FA Enabled:        ${staff.twoFactorEnabled ? 'Yes' : 'No'}`);
    console.log(`   Last Login:         ${staff.lastLoginAt ? new Date(staff.lastLoginAt).toLocaleString() : 'Never'}`);
    console.log(`   Created:            ${new Date(staff.createdAt).toLocaleString()}`);
    console.log(`   Login URL:          http://localhost:3001/login`);
    console.log(`   Username/Email:     ${staff.email}`);
    console.log('');
  });

  console.log('='.repeat(120));
  console.log(`Total Staff Members: ${staffMembers.length}`);
  console.log('='.repeat(120) + '\n');

  console.log('📝 NOTE: Passwords are hashed in the database. If you need to reset a password,');
  console.log('   you can create a new staff member or ask the admin to reset it.\n');
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
