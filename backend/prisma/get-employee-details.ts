/**
 * Get all employees and their details.
 * Run with: npx tsx prisma/get-employee-details.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const employees = await db.employee.findMany({
    select: {
      id: true,
      name: true,
      employeeCode: true,
      email: true,
      mobileNo: true,
      designation: {
        select: { name: true },
      },
      department: {
        select: { name: true },
      },
      branch: {
        select: { name: true, code: true },
      },
      joiningDate: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  if (employees.length === 0) {
    console.log('\n❌ No employees found in the database.\n');
    return;
  }

  console.log('\n' + '='.repeat(120));
  console.log('EMPLOYEES IN SYSTEM');
  console.log('='.repeat(120) + '\n');

  employees.forEach((emp, index) => {
    console.log(`${index + 1}. ${emp.name.toUpperCase()}`);
    console.log('─'.repeat(120));
    console.log(`   Employee Code:      ${emp.employeeCode}`);
    console.log(`   Email:              ${emp.email || 'N/A'}`);
    console.log(`   Mobile:             ${emp.mobileNo}`);
    console.log(`   Designation:        ${emp.designation?.name || 'N/A'}`);
    console.log(`   Department:         ${emp.department?.name || 'N/A'}`);
    console.log(`   Branch:             ${emp.branch?.name || 'Not assigned'} (${emp.branch?.code || 'N/A'})`);
    console.log(`   Joining Date:       ${new Date(emp.joiningDate).toLocaleDateString()}`);
    console.log(`   Created:            ${new Date(emp.createdAt).toLocaleString()}`);
    console.log('');
  });

  console.log('='.repeat(120));
  console.log(`Total Employees: ${employees.length}`);
  console.log('='.repeat(120) + '\n');
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
