/**
 * QUICK SETUP: Complete test data for all modules
 * Run with: npx tsx prisma/setup-complete-test-data.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('\n🚀 SETTING UP COMPLETE TEST DATA FOR ALL MODULES...\n');

  // Get org and branch
  const org = await db.organization.findFirst();
  const branch = await db.branch.findFirst();

  if (!org || !branch) {
    throw new Error('Missing org or branch. Run seed-admin.ts first.');
  }

  // 1. CREATE LEADS/ENQUIRIES
  console.log('📋 Creating Leads...');
  const leads = await Promise.all([
    db.lead.create({
      data: {
        org: { connect: { id: org.id } },
        branch: { connect: { id: branch.id } },
        contactName: 'John Fitness',
        source: 'walk-in',
        phone: '+91 98765 11111',
        email: 'john.fit@example.com',
        status: 'open',
        notes: 'Interested in wellness packages',
      },
    }),
    db.lead.create({
      data: {
        org: { connect: { id: org.id } },
        branch: { connect: { id: branch.id } },
        contactName: 'Sarah Health',
        source: 'referral',
        phone: '+91 98765 22222',
        email: 'sarah.health@example.com',
        status: 'open',
        notes: 'Medical consultation required',
      },
    }),
    db.lead.create({
      data: {
        org: { connect: { id: org.id } },
        branch: { connect: { id: branch.id } },
        contactName: 'Mike Therapy',
        source: 'website',
        phone: '+91 98765 33333',
        email: 'mike.therapy@example.com',
        status: 'open',
        notes: 'Interested in therapy sessions',
      },
    }),
  ]);
  console.log(`✅ Created ${leads.length} leads\n`);

  // 2. CREATE PRODUCTS FOR INVENTORY
  console.log('📦 Creating Products...');
  const products = await Promise.all([
    db.product.create({
      data: {
        org: { connect: { id: org.id } },
        name: 'Vitamin C Supplement',
        sku: 'VIT-C-001',
        category: 'Supplements',
        price: 50000,
        reorderLevel: 10,
      },
    }),
    db.product.create({
      data: {
        org: { connect: { id: org.id } },
        name: 'Medical Mask (Box of 50)',
        sku: 'MASK-001',
        category: 'PPE',
        price: 25000,
        reorderLevel: 5,
      },
    }),
    db.product.create({
      data: {
        org: { connect: { id: org.id } },
        name: 'Thermometer Digital',
        sku: 'THERM-001',
        category: 'Equipment',
        price: 80000,
        reorderLevel: 3,
      },
    }),
  ]);
  console.log(`✅ Created ${products.length} products\n`);

  // 3. CREATE INVENTORY STOCK
  console.log('📊 Creating Inventory Stock...');
  const warehouse = await db.warehouse.findFirst({ where: { branchId: branch.id } });
  if (warehouse) {
    await Promise.all(
      products.map((p) =>
        db.inventoryStock.upsert({
          where: { warehouseId_productId: { warehouseId: warehouse.id, productId: p.id } },
          update: { quantityOnHand: 100, quantityReserved: 10 },
          create: {
            warehouseId: warehouse.id,
            productId: p.id,
            quantityOnHand: 100,
            quantityReserved: 10,
            lastCountedAt: new Date(),
          },
        }),
      ),
    );
    console.log(`✅ Created inventory stock\n`);
  }

  // 4. CREATE QUOTATIONS
  console.log('📄 Creating Quotations...');
  const customer = await db.customer.findFirst({ where: { branchId: branch.id } });
  if (customer) {
    const quotations = await Promise.all([
      db.quotation.create({
        data: {
          org: { connect: { id: org.id } },
          branch: { connect: { id: branch.id } },
          customer: { connect: { id: customer.id } },
          quoteNumber: 'QT-001',
          status: 'draft',
          subtotalAmount: 500000,
          taxAmount: 90000,
          totalAmount: 590000,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
      db.quotation.create({
        data: {
          org: { connect: { id: org.id } },
          branch: { connect: { id: branch.id } },
          customer: { connect: { id: customer.id } },
          quoteNumber: 'QT-002',
          status: 'sent',
          subtotalAmount: 750000,
          taxAmount: 135000,
          totalAmount: 885000,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);
    console.log(`✅ Created ${quotations.length} quotations\n`);
  }

  // 5. CREATE SALES ORDERS
  console.log('🛒 Creating Sales Orders...');
  if (customer) {
    const orders = await Promise.all([
      db.salesOrder.create({
        data: {
          org: { connect: { id: org.id } },
          branch: { connect: { id: branch.id } },
          customer: { connect: { id: customer.id } },
          orderNumber: 'ORD-001',
          status: 'pending',
          subtotalAmount: 500000,
          taxAmount: 90000,
          totalAmount: 590000,
          orderDate: new Date(),
        },
      }),
      db.salesOrder.create({
        data: {
          org: { connect: { id: org.id } },
          branch: { connect: { id: branch.id } },
          customer: { connect: { id: customer.id } },
          orderNumber: 'ORD-002',
          status: 'confirmed',
          subtotalAmount: 750000,
          taxAmount: 135000,
          totalAmount: 885000,
          orderDate: new Date(),
        },
      }),
    ]);
    console.log(`✅ Created ${orders.length} sales orders\n`);
  }

  // 6. CREATE INVOICES
  console.log('💰 Creating Invoices...');
  if (customer) {
    const invoices = await Promise.all([
      db.invoice.create({
        data: {
          org: { connect: { id: org.id } },
          branch: { connect: { id: branch.id } },
          customer: { connect: { id: customer.id } },
          invoiceNumber: 'INV-001',
          status: 'draft',
          subtotalAmount: 500000,
          taxAmount: 90000,
          totalAmount: 590000,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
      db.invoice.create({
        data: {
          org: { connect: { id: org.id } },
          branch: { connect: { id: branch.id } },
          customer: { connect: { id: customer.id } },
          invoiceNumber: 'INV-002',
          status: 'issued',
          subtotalAmount: 750000,
          taxAmount: 135000,
          totalAmount: 885000,
          issueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);
    console.log(`✅ Created ${invoices.length} invoices\n`);
  }

  console.log('='.repeat(100));
  console.log('✅ COMPLETE TEST DATA SETUP FINISHED!');
  console.log('='.repeat(100) + '\n');

  console.log('📊 DATA SUMMARY:');
  console.log(`   • Leads: ${leads.length}`);
  console.log(`   • Products: ${products.length}`);
  console.log(`   • Inventory Items: ${products.length}`);
  console.log(`   • Quotations: 2`);
  console.log(`   • Sales Orders: 2`);
  console.log(`   • Invoices: 2\n`);

  console.log('🌐 TEST THE FOLLOWING:');
  console.log('   1. Login: http://localhost:3001/login');
  console.log('   2. Email: teststaff@welona.com');
  console.log('   3. Password: Test@123\n');

  console.log('📍 MODULES TO CHECK:');
  console.log('   ✓ /admin/sales - View leads, quotations, orders, invoices');
  console.log('   ✓ /admin/customers - View customers');
  console.log('   ✓ /admin/inventory - View products and stock');
  console.log('   ✓ /admin/hr - View employees and HR data');
  console.log('   ✓ /admin/report - View reports\n');
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
