/**
 * Get all records created in May 2026.
 * Run with: npx tsx prisma/get-may-records.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('\n' + '='.repeat(140));
  console.log('RECORDS CREATED IN MAY 2026');
  console.log('='.repeat(140) + '\n');

  // May 1 - May 31, 2026
  const mayStart = new Date('2026-05-01');
  const mayEnd = new Date('2026-05-31T23:59:59');

  // Get employees created in May
  const mayEmployees = await db.employee.findMany({
    where: {
      createdAt: {
        gte: mayStart,
        lte: mayEnd,
      },
    },
    include: {
      designation: { select: { name: true } },
      department: { select: { name: true } },
      branch: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get customers created in May
  const mayCustomers = await db.customer.findMany({
    where: {
      createdAt: {
        gte: mayStart,
        lte: mayEnd,
      },
    },
    include: {
      branch: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get staff created in May
  const mayStaff = await db.staff.findMany({
    where: {
      createdAt: {
        gte: mayStart,
        lte: mayEnd,
      },
    },
    include: {
      role: { select: { name: true } },
      branch: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get leads created in May
  const mayLeads = await db.lead.findMany({
    where: {
      createdAt: {
        gte: mayStart,
        lte: mayEnd,
      },
    },
    include: {
      customer: { select: { name: true } },
      branch: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`📅 EMPLOYEES CREATED IN MAY (Total: ${mayEmployees.length})`);
  console.log('─'.repeat(140));
  if (mayEmployees.length > 0) {
    mayEmployees.forEach((emp) => {
      console.log(`✓ ${emp.name}`);
      console.log(`  ID: ${emp.id}`);
      console.log(`  Code: ${emp.employeeCode}`);
      console.log(`  Email: ${emp.email || 'N/A'}`);
      console.log(`  Phone: ${emp.mobileNo}`);
      console.log(`  Designation: ${emp.designation?.name || 'N/A'}`);
      console.log(`  Department: ${emp.department?.name || 'N/A'}`);
      console.log(`  Branch: ${emp.branch?.name || 'N/A'}`);
      console.log(`  Created: ${new Date(emp.createdAt).toLocaleString()}`);
      console.log('');
    });
  } else {
    console.log('No employees created in May\n');
  }

  console.log(`👥 CUSTOMERS CREATED IN MAY (Total: ${mayCustomers.length})`);
  console.log('─'.repeat(140));
  if (mayCustomers.length > 0) {
    mayCustomers.forEach((cust) => {
      console.log(`✓ ${cust.name}`);
      console.log(`  ID: ${cust.id}`);
      console.log(`  Type: ${cust.type}`);
      console.log(`  Email: ${cust.email || 'N/A'}`);
      console.log(`  Phone: ${cust.phone || 'N/A'}`);
      console.log(`  Branch: ${cust.branch?.name || 'Not assigned'}`);
      console.log(`  Created: ${new Date(cust.createdAt).toLocaleString()}`);
      console.log('');
    });
  } else {
    console.log('No customers created in May\n');
  }

  console.log(`👨‍💼 STAFF CREATED IN MAY (Total: ${mayStaff.length})`);
  console.log('─'.repeat(140));
  if (mayStaff.length > 0) {
    mayStaff.forEach((s) => {
      console.log(`✓ ${s.name}`);
      console.log(`  ID: ${s.id}`);
      console.log(`  Email: ${s.email}`);
      console.log(`  Phone: ${s.phone || 'N/A'}`);
      console.log(`  Role: ${s.role.name}`);
      console.log(`  Branch: ${s.branch?.name || 'Not assigned'}`);
      console.log(`  Status: ${s.status}`);
      console.log(`  Created: ${new Date(s.createdAt).toLocaleString()}`);
      console.log('');
    });
  } else {
    console.log('No staff created in May\n');
  }

  console.log(`📋 LEADS CREATED IN MAY (Total: ${mayLeads.length})`);
  console.log('─'.repeat(140));
  if (mayLeads.length > 0) {
    mayLeads.forEach((lead) => {
      console.log(`✓ ${lead.customer?.name || 'Unknown'}`);
      console.log(`  ID: ${lead.id}`);
      console.log(`  Status: ${lead.status}`);
      console.log(`  Source: ${lead.source || 'N/A'}`);
      console.log(`  Branch: ${lead.branch?.name || 'N/A'}`);
      console.log(`  Created: ${new Date(lead.createdAt).toLocaleString()}`);
      console.log('');
    });
  } else {
    console.log('No leads created in May\n');
  }

  console.log('='.repeat(140) + '\n');

  console.log('📊 SUMMARY:');
  console.log(`   Employees: ${mayEmployees.length}`);
  console.log(`   Customers: ${mayCustomers.length}`);
  console.log(`   Staff: ${mayStaff.length}`);
  console.log(`   Leads: ${mayLeads.length}`);
  console.log(`   Total: ${mayEmployees.length + mayCustomers.length + mayStaff.length + mayLeads.length}\n`);
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
