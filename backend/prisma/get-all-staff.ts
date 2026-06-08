/**
 * Get all staff members with complete details and their IDs.
 * Run with: npx tsx prisma/get-all-staff.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const staff = await db.staff.findMany({
    include: {
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
    },
    orderBy: { createdAt: 'desc' },
  });

  if (staff.length === 0) {
    console.log('\n❌ No staff members found in the database.\n');
    return;
  }

  console.log('\n' + '='.repeat(140));
  console.log('STAFF MODULE - ALL STAFF MEMBERS WITH IDs');
  console.log('='.repeat(140) + '\n');

  staff.forEach((s, index) => {
    const permissions = JSON.parse(s.role.permissions);
    console.log(`${index + 1}. ${s.name.toUpperCase()}`);
    console.log('─'.repeat(140));
    console.log(`   ID:                 ${s.id}`);
    console.log(`   Email:              ${s.email}`);
    console.log(`   Phone:              ${s.phone || 'N/A'}`);
    console.log(`   Employee Code:      ${s.employeeCode || 'N/A'}`);
    console.log(`   Designation:        ${s.designation || 'N/A'}`);
    console.log(`   Branch:             ${s.branch?.name || 'Not assigned'} (${s.branch?.code || 'N/A'})`);
    console.log(`   Role:               ${s.role.name} (${s.role.key})`);
    console.log(`   Permissions:        ${Array.isArray(permissions) ? permissions.join(', ') : 'All'}`);
    console.log(`   Status:             ${s.status}`);
    console.log(`   2FA Enabled:        ${s.twoFactorEnabled ? 'Yes' : 'No'}`);
    console.log(`   Gender:             ${s.gender || 'N/A'}`);
    console.log(`   Address:            ${s.address || 'N/A'}`);
    console.log(`   Emergency Contact:  ${s.emergencyContact || 'N/A'}`);
    console.log(`   Bank:               ${s.bankName || 'N/A'}`);
    console.log(`   Account Number:     ${s.bankAccountNumber || 'N/A'}`);
    console.log(`   IFSC:               ${s.bankIfsc || 'N/A'}`);
    console.log(`   Salary:             ${s.salary ? `₹${(s.salary / 100).toFixed(2)}` : 'N/A'}`);
    console.log(`   Joining Date:       ${s.dateOfJoining ? new Date(s.dateOfJoining).toLocaleDateString() : 'N/A'}`);
    console.log(`   DOB:                ${s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString() : 'N/A'}`);
    console.log(`   Last Login:         ${s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : 'Never'}`);
    console.log(`   Created:            ${new Date(s.createdAt).toLocaleString()}`);
    console.log(`   Login URL:          http://localhost:3001/login`);
    console.log(`   API Endpoint:       GET /api/v1/staff/${s.id}`);
    console.log('');
  });

  console.log('='.repeat(140));
  console.log(`Total Staff Members: ${staff.length}`);
  console.log('='.repeat(140) + '\n');

  // Export as JSON for reference
  const json = JSON.stringify(staff.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    employeeCode: s.employeeCode,
    designation: s.designation,
    branch: s.branch?.name,
    role: s.role.name,
    status: s.status,
  })), null, 2);

  console.log('JSON Export:');
  console.log(json);
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
