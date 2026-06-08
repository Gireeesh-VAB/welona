/**
 * POPULATE ALL PAGES WITH DATA
 * Creates complete test data for all modules
 * Run with: npx tsx prisma/populate-all-data.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('\n' + '='.repeat(100));
  console.log('🚀 POPULATING ALL PAGES WITH COMPLETE DATA');
  console.log('='.repeat(100) + '\n');

  // Get organization and branch
  const org = await db.organization.findFirst();
  const branch = await db.branch.findFirst();
  const staff = await db.staff.findFirst();

  if (!org || !branch || !staff) {
    throw new Error('Missing org, branch, or staff. Run seed scripts first.');
  }

  // Get customers
  const customers = await db.customer.findMany({ where: { branchId: branch.id }, take: 5 });
  const employees = await db.employee.findMany({ where: { branchId: branch.id }, take: 10 });

  console.log('📋 1. Creating Quotations with Line Items...');
  const quotations = [];
  for (let i = 0; i < 3; i++) {
    const customer = customers[i % customers.length];
    const quot = await db.quotation.create({
      data: {
        org: { connect: { id: org.id } },
        branch: { connect: { id: branch.id } },
        customer: { connect: { id: customer.id } },
        quoteNumber: `QT-${String(i + 1).padStart(3, '0')}`,
        status: i === 0 ? 'draft' : i === 1 ? 'sent' : 'approved',
        subtotalAmount: 500000 + i * 100000,
        taxAmount: 90000 + i * 18000,
        totalAmount: 590000 + i * 118000,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    quotations.push(quot);
  }
  console.log(`✅ Created ${quotations.length} quotations\n`);

  console.log('📦 2. Creating Sales Orders with Line Items...');
  const orders = [];
  for (let i = 0; i < 4; i++) {
    const customer = customers[i % customers.length];
    const order = await db.salesOrder.create({
      data: {
        org: { connect: { id: org.id } },
        branch: { connect: { id: branch.id } },
        customer: { connect: { id: customer.id } },
        orderNumber: `ORD-${String(i + 1).padStart(3, '0')}`,
        status: i === 0 ? 'pending' : i === 1 ? 'confirmed' : i === 2 ? 'dispatched' : 'delivered',
        subtotalAmount: 600000 + i * 100000,
        taxAmount: 108000 + i * 18000,
        totalAmount: 708000 + i * 118000,
        orderDate: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000),
      },
    });
    orders.push(order);
  }
  console.log(`✅ Created ${orders.length} sales orders\n`);

  console.log('💰 3. Creating Invoices with Payments...');
  const invoices = [];
  for (let i = 0; i < 4; i++) {
    const customer = customers[i % customers.length];
    const invoice = await db.invoice.create({
      data: {
        org: { connect: { id: org.id } },
        branch: { connect: { id: branch.id } },
        customer: { connect: { id: customer.id } },
        invoiceNumber: `INV-${String(i + 1).padStart(3, '0')}`,
        status: i === 0 ? 'draft' : i === 1 ? 'issued' : 'paid',
        subtotalAmount: 600000 + i * 100000,
        taxAmount: 108000 + i * 18000,
        totalAmount: 708000 + i * 118000,
        issueDate: new Date(Date.now() - i * 10 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + (30 - i * 10) * 24 * 60 * 60 * 1000),
      },
    });
    invoices.push(invoice);

    // Add payment for paid invoices
    if (i >= 2) {
      await db.payment.create({
        data: {
          org: { connect: { id: org.id } },
          branch: { connect: { id: branch.id } },
          invoice: { connect: { id: invoice.id } },
          amount: invoice.totalAmount,
          paymentMode: i === 2 ? 'cash' : 'upi',
          referenceNumber: `PAY-${String(i).padStart(3, '0')}`,
          recordedAt: new Date(Date.now() - i * 5 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log(`✅ Created ${invoices.length} invoices\n`);

  console.log('📊 4. Creating Customer Packages...');
  for (let i = 0; i < 3; i++) {
    const customer = customers[i % customers.length];
    await db.package.create({
      data: {
        org: { connect: { id: org.id } },
        customer: { connect: { id: customer.id } },
        title: `Wellness Package ${i + 1}`,
        description: `Complete wellness and health package ${i + 1}`,
        totalSessions: 10 + i * 5,
        sessionsDone: i * 3,
        startDate: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + (90 - i * 30) * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`✅ Created 3 customer packages\n`);

  console.log('🎁 5. Creating Customer Offers...');
  for (let i = 0; i < 3; i++) {
    const customer = customers[i % customers.length];
    await db.offer.create({
      data: {
        org: { connect: { id: org.id } },
        customer: { connect: { id: customer.id } },
        title: `Special Offer ${i + 1}`,
        description: `Exclusive offer valid for ${30 + i * 10} days`,
        discountPercentage: 10 + i * 5,
        validFrom: new Date(),
        validUpto: new Date(Date.now() + (30 + i * 10) * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`✅ Created 3 customer offers\n`);

  console.log('📋 6. Creating Medical Reports...');
  for (let i = 0; i < 3; i++) {
    const customer = customers[i % customers.length];
    await db.medicalReport.create({
      data: {
        org: { connect: { id: org.id } },
        customer: { connect: { id: customer.id } },
        reportType: i === 0 ? 'blood_test' : i === 1 ? 'xray' : 'general_checkup',
        reportDate: new Date(Date.now() - i * 10 * 24 * 60 * 60 * 1000),
        findings: `Medical report findings for ${customer.name}`,
      },
    });
  }
  console.log(`✅ Created 3 medical reports\n`);

  console.log('💊 7. Creating Prescriptions...');
  for (let i = 0; i < 3; i++) {
    const customer = customers[i % customers.length];
    await db.prescription.create({
      data: {
        org: { connect: { id: org.id } },
        customer: { connect: { id: customer.id } },
        prescriptionDate: new Date(Date.now() - i * 5 * 24 * 60 * 60 * 1000),
        medicines: `Medicine ${i + 1}, Medicine ${i + 2}`,
        instructions: `Take ${i + 1} tablet daily after meals`,
        validUpto: new Date(Date.now() + (30 - i * 10) * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`✅ Created 3 prescriptions\n`);

  console.log('📄 8. Creating Bookings...');
  for (let i = 0; i < 4; i++) {
    const customer = customers[i % customers.length];
    await db.booking.create({
      data: {
        org: { connect: { id: org.id } },
        customer: { connect: { id: customer.id } },
        bookingNumber: `BK-${String(i + 1).padStart(3, '0')}`,
        appointmentDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        status: i === 0 ? 'scheduled' : i === 1 ? 'confirmed' : 'completed',
      },
    });
  }
  console.log(`✅ Created 4 bookings\n`);

  console.log('⭐ 9. Creating Feedback...');
  for (let i = 0; i < 3; i++) {
    const customer = customers[i % customers.length];
    await db.feedback.create({
      data: {
        org: { connect: { id: org.id } },
        customer: { connect: { id: customer.id } },
        rating: 4 + (i % 2),
        comment: `Great experience! Very satisfied with the service. Staff was helpful and professional.`,
      },
    });
  }
  console.log(`✅ Created 3 feedback entries\n`);

  console.log('📎 10. Creating Documents...');
  for (let i = 0; i < 3; i++) {
    const customer = customers[i % customers.length];
    await db.document.create({
      data: {
        org: { connect: { id: org.id } },
        customer: { connect: { id: customer.id } },
        title: `Document ${i + 1}`,
        docType: i === 0 ? 'invoice' : i === 1 ? 'receipt' : 'agreement',
      },
    });
  }
  console.log(`✅ Created 3 documents\n`);

  console.log('⏰ 11. Creating Attendance Records...');
  const attendanceDays = 20;
  for (let i = 0; i < attendanceDays; i++) {
    if (employees.length > 0) {
      const statuses = ['present', 'absent', 'half_day', 'wfh'];
      await db.attendance.create({
        data: {
          org: { connect: { id: org.id } },
          employee: { connect: { id: employees[i % employees.length].id } },
          date: new Date(Date.now() - (attendanceDays - i) * 24 * 60 * 60 * 1000),
          status: statuses[Math.floor(Math.random() * statuses.length)],
        },
      });
    }
  }
  console.log(`✅ Created ${attendanceDays} attendance records\n`);

  console.log('🎫 12. Creating Leave Records...');
  if (employees.length > 0) {
    for (let i = 0; i < 3; i++) {
      await db.leave.create({
        data: {
          org: { connect: { id: org.id } },
          employee: { connect: { id: employees[i].id } },
          leaveType: i === 0 ? 'casual' : i === 1 ? 'sick' : 'personal',
          fromDate: new Date(Date.now() + (i + 1) * 10 * 24 * 60 * 60 * 1000),
          toDate: new Date(Date.now() + (i + 1) * 10 * 24 * 60 * 60 * 1000 + 3 * 24 * 60 * 60 * 1000),
          status: i === 0 ? 'pending' : 'approved',
          reason: `Leave request for ${['vacation', 'medical', 'personal'][i]}`,
        },
      });
    }
  }
  console.log(`✅ Created 3 leave records\n`);

  console.log('='.repeat(100));
  console.log('✅ ALL PAGES POPULATED WITH DATA!');
  console.log('='.repeat(100) + '\n');

  console.log('📊 DATA CREATED:');
  console.log(`   ✓ Quotations: 3`);
  console.log(`   ✓ Sales Orders: 4`);
  console.log(`   ✓ Invoices: 4 (with 2 payments)`);
  console.log(`   ✓ Customer Packages: 3`);
  console.log(`   ✓ Customer Offers: 3`);
  console.log(`   ✓ Medical Reports: 3`);
  console.log(`   ✓ Prescriptions: 3`);
  console.log(`   ✓ Bookings: 4`);
  console.log(`   ✓ Feedback: 3`);
  console.log(`   ✓ Documents: 3`);
  console.log(`   ✓ Attendance: 20`);
  console.log(`   ✓ Leave Requests: 3\n`);

  console.log('🌐 PAGES TO VIEW:');
  console.log('   http://localhost:3001/admin/customers        - View customers');
  console.log('   http://localhost:3001/admin/sales            - View sales pipeline');
  console.log('   http://localhost:3001/admin/sales/quotations - View quotations');
  console.log('   http://localhost:3001/admin/sales/orders     - View sales orders');
  console.log('   http://localhost:3001/admin/sales/invoices   - View invoices');
  console.log('   http://localhost:3001/admin/inventory        - View inventory');
  console.log('   http://localhost:3001/admin/hr               - View HR module');
  console.log('   http://localhost:3001/admin/hr/attendance    - View attendance\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
