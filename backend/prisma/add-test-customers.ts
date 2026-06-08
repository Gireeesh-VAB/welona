/**
 * Add test customers for the admin panel.
 * Run with: npx tsx prisma/add-test-customers.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // Get the organization
  const org = await db.organization.findFirst();
  if (!org) {
    throw new Error('No organization found. Run seed-admin.ts first.');
  }

  // Get some branches
  const branches = await db.branch.findMany({
    where: { orgId: org.id },
    take: 3,
  });

  if (branches.length === 0) {
    throw new Error('No branches found. Run seed-admin-showcase.ts first.');
  }

  const customers = [
    {
      name: 'Rajesh Sharma',
      phone: '+91 98765 43210',
      email: 'rajesh.sharma@example.com',
      city: 'Hyderabad',
      type: 'individual',
      branchId: branches[0].id,
    },
    {
      name: 'Priya Enterprises',
      phone: '+91 98765 43211',
      email: 'info@priya.com',
      city: 'Mumbai',
      companyName: 'Priya Enterprises Ltd',
      gstin: '27AABCT1234H1Z0',
      type: 'business',
      branchId: branches[1].id,
    },
    {
      name: 'Amit Patel',
      phone: '+91 98765 43212',
      email: 'amit.p@example.com',
      city: 'Bengaluru',
      type: 'individual',
      branchId: branches[2].id,
    },
    {
      name: 'Health Plus Solutions',
      phone: '+91 98765 43213',
      email: 'contact@healthplus.com',
      city: 'Delhi',
      companyName: 'Health Plus Solutions Pvt Ltd',
      gstin: '07AABCT5678H2Z1',
      type: 'business',
      branchId: branches[0].id,
    },
    {
      name: 'Sneha Gupta',
      phone: '+91 98765 43214',
      email: 'sneha.g@example.com',
      city: 'Pune',
      type: 'individual',
      branchId: branches[1].id,
    },
  ];

  console.log('\n' + '='.repeat(100));
  console.log('ADDING TEST CUSTOMERS');
  console.log('='.repeat(100) + '\n');

  for (const customerData of customers) {
    const branch = branches.find((b) => b.id === customerData.branchId);
    const customer = await db.customer.create({
      data: {
        orgId: org.id,
        ...customerData,
        notes: `Test customer for ${branch?.name} branch`,
        tags: JSON.stringify(['test', 'demo']),
      },
    });

    console.log(`✅ Created: ${customer.name}`);
    console.log(`   Email:    ${customer.email}`);
    console.log(`   Phone:    ${customer.phone}`);
    console.log(`   Branch:   ${branch?.name}`);
    console.log(`   Type:     ${customer.type}`);
    console.log('');
  }

  console.log('='.repeat(100));
  console.log(`Total customers added: ${customers.length}`);
  console.log('='.repeat(100) + '\n');

  console.log('📝 All test customers have been added successfully!');
  console.log('   You can now view them in the admin panel at /admin/customers\n');
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
