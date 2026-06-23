/**
 * Patch: add today's activity for Hi-Tech City branch so the dashboard
 * shows live numbers — bookings today, payments this month, and leads.
 */
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

const BRANCH_ID = 'cmqetfx4o000c9yxsgmphpzoo';
const ORG_ID    = 'cmpaya5cw0000ne84ix4eg0mx';

const pad = (n, len = 4) => String(n).padStart(len, '0');

async function main() {
  // Fetch existing staff and customers for this branch
  const [staff, customers, existingBk, existingLead] = await Promise.all([
    db.staff.findMany({ where: { branchId: BRANCH_ID }, select: { id: true, name: true, email: true } }),
    db.customer.findMany({ where: { branchId: BRANCH_ID }, select: { id: true, name: true } }),
    db.booking.count({ where: { orgId: ORG_ID, branchId: BRANCH_ID } }),
    db.lead.count({ where: { orgId: ORG_ID, branchId: BRANCH_ID } }),
  ]);

  const recep = staff.find(s => s.email === 'srinivas.rao@welona.com') ?? staff[0];
  const mgr   = staff.find(s => s.email === 'kavitha.reddy@welona.com') ?? staff[0];

  if (!recep || customers.length === 0) {
    console.error('Staff or customers not found — run seed-hitech.js first');
    process.exit(1);
  }

  const now = new Date();
  const today9am  = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
  const today11am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0);
  const today2pm  = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0);
  const today4pm  = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0);

  // ── Today's bookings ──────────────────────────────────────────────────────
  console.log('Adding today\'s bookings...');
  let bkCtr = existingBk + 1;

  const todayBookings = [
    { customerId: customers[0].id, service: 'TCA Peel',                        amount: 350000, scheduledAt: today9am  },
    { customerId: customers[1].id, service: 'Laser - Upper Lip',               amount: 100000, scheduledAt: today11am },
    { customerId: customers[2].id, service: 'PRP Hair Therapy (single session)',amount: 600000, scheduledAt: today2pm  },
    { customerId: customers[3].id, service: 'Trichology Consultation',         amount: 100000, scheduledAt: today4pm  },
    { customerId: customers[4].id, service: 'Under-Eye Peel',                  amount: 250000, scheduledAt: today11am },
  ];

  const createdBookings = [];
  for (const b of todayBookings) {
    const bk = await db.booking.create({
      data: {
        orgId: ORG_ID,
        branchId: BRANCH_ID,
        number: `HI-BK-${pad(bkCtr++)}`,
        customerId: b.customerId,
        serviceName: b.service,
        scheduledAt: b.scheduledAt,
        status: 'scheduled',
        totalAmount: b.amount,
        discount: 0,
        roundOff: 0,
        netAmount: b.amount,
        paidAmount: 0,
        createdById: recep.id,
        items: {
          create: [{ category: 'Service', service: b.service, quantity: 1, amount: b.amount, lineTotal: b.amount }],
        },
      },
    });
    createdBookings.push(bk);
  }
  console.log(`  Created ${createdBookings.length} bookings for today`);

  // ── This month's payments (via Invoice → Payment) ─────────────────────────
  // The dashboard queries db.payment directly; we need Invoice rows first.
  console.log('Adding this month\'s payments...');

  // Find or create a counter for invoices
  const existingInvoices = await db.invoice.count({ where: { orgId: ORG_ID } });
  let invCtr = existingInvoices + 1;

  const paymentData = [
    { customerId: customers[0].id, amount: 350000, method: 'cash',          daysAgo: 0  },
    { customerId: customers[1].id, amount: 100000, method: 'credit_card',   daysAgo: 0  },
    { customerId: customers[2].id, amount: 250000, method: 'cash',          daysAgo: 2  },
    { customerId: customers[3].id, amount: 600000, method: 'credit_card',   daysAgo: 3  },
    { customerId: customers[4].id, amount: 180000, method: 'cash',          daysAgo: 5  },
    { customerId: customers[5].id, amount: 450000, method: 'upi',           daysAgo: 7  },
    { customerId: customers[6].id, amount: 200000, method: 'cash',          daysAgo: 10 },
    { customerId: customers[7].id, amount: 750000, method: 'credit_card',   daysAgo: 12 },
    { customerId: customers[8].id, amount: 100000, method: 'cash',          daysAgo: 15 },
    { customerId: customers[9 % customers.length].id, amount: 350000, method: 'upi', daysAgo: 18 },
  ];

  for (const p of paymentData) {
    const receivedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - p.daysAgo,
      10 + Math.floor(Math.random() * 6), 0);

    // Create a minimal invoice
    const invoice = await db.invoice.create({
      data: {
        orgId: ORG_ID,
        branchId: BRANCH_ID,
        number: `HI-INV-${pad(invCtr++)}`,
        customerId: p.customerId,
        subtotal: p.amount,
        taxAmt: 0,
        total: p.amount,
        amountPaid: p.amount,
        status: 'paid',
        issuedAt: receivedAt,
      },
    });

    await db.payment.create({
      data: {
        orgId: ORG_ID,
        invoiceId: invoice.id,
        amount: p.amount,
        method: p.method,
        receivedAt,
        recordedById: recep.id,
      },
    });
  }
  console.log(`  Created ${paymentData.length} payments`);

  // ── Leads (enquiries) ─────────────────────────────────────────────────────
  console.log('Adding leads / enquiries...');
  let leadCtr = existingLead + 1;

  const leadData = [
    { name: 'Kavya Menon',     phone: '9900001001', treatment: null,                              daysAgo: 0 },
    { name: 'Tarun Gupta',     phone: '9900001002', treatment: null,                              daysAgo: 0 },
    { name: 'Nisha Varma',     phone: '9900001003', treatment: null,                              daysAgo: 1 },
    { name: 'Shiva Prasad',    phone: '9900001004', treatment: null,                              daysAgo: 3 },
    { name: 'Aarti Singh',     phone: '9900001005', treatment: null,                              daysAgo: 5 },
    { name: 'Deepak Kumar',    phone: '9900001006', treatment: null,                              daysAgo: 8 },
    { name: 'Rekha Naidu',     phone: '9900001007', treatment: null,                              daysAgo: 12 },
  ];

  for (const l of leadData) {
    const createdAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - l.daysAgo, 10, 0);
    await db.lead.create({
      data: {
        orgId: ORG_ID,
        branchId: BRANCH_ID,
        contactName: l.name,
        contactPhone: l.phone,
        status: 'new',
        source: 'walk_in',
        ownerStaffId: mgr.id,
        createdAt,
        updatedAt: createdAt,
      },
    });
    leadCtr++;
  }
  console.log(`  Created ${leadData.length} leads`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const todayPayments = paymentData.filter(p => p.daysAgo === 0);
  const todayTotal    = todayPayments.reduce((s, p) => s + p.amount, 0);
  const monthTotal    = paymentData.reduce((s, p) => s + p.amount, 0);

  console.log('\nDashboard will now show:');
  console.log('  Today\'s Walk-ins:        ', todayBookings.length);
  console.log('  Today\'s Enquiries:       ', leadData.filter(l => l.daysAgo === 0).length);
  console.log('  Today\'s Collection:     ₹', (todayTotal / 100).toFixed(2));
  console.log('  Month\'s Collection:     ₹', (monthTotal / 100).toFixed(2));
}

main()
  .catch((e) => { console.error(e.message ?? e); process.exit(1); })
  .finally(() => db.$disconnect());
