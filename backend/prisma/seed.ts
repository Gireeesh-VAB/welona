/**
 * Seeds the local development database with a realistic baseline:
 * one organization, two branches, the eight RBAC roles (section 7.3),
 * staff accounts, and a demo sales pipeline (customers, leads, quotations,
 * orders, invoices and payments).
 *
 * Run with: npm run db:seed   (or npm run db:reset to wipe + reseed)
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SYSTEM_ROLES } from '../src/lib/rbac';

const db = new PrismaClient();

/** Shared password for every seeded account. */
const DEMO_PASSWORD = 'Welona@123';

/** Rupees -> integer minor units (paise). */
const inr = (rupees: number) => Math.round(rupees * 100);

/** Zero-padded document number, e.g. 1 -> "0001". */
const pad = (n: number) => String(n).padStart(4, '0');

interface SeedItem {
  description: string;
  quantity: number;
  /** Unit price in minor units. */
  unitPrice: number;
  discountAmt?: number;
  /** Tax rate in basis points; defaults to 1800 (18% GST). */
  taxRate?: number;
}

/** Compute line + document totals for a set of items. */
function priceItems(items: SeedItem[]) {
  let subtotal = 0;
  let taxAmt = 0;
  let discountAmt = 0;
  const rows = items.map((it, index) => {
    const lineDiscount = it.discountAmt ?? 0;
    const taxRate = it.taxRate ?? 1800;
    const lineTotal = it.unitPrice * it.quantity - lineDiscount;
    const tax = Math.round((lineTotal * taxRate) / 10000);
    subtotal += lineTotal;
    taxAmt += tax;
    discountAmt += lineDiscount;
    return {
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountAmt: lineDiscount,
      taxRate,
      lineTotal,
      sortOrder: index,
    };
  });
  return { rows, subtotal, taxAmt, discountAmt, total: subtotal + taxAmt };
}

async function main() {
  console.log('Seeding Welona admin database...');

  // Clear existing data (children first to respect foreign keys).
  await db.payment.deleteMany();
  await db.invoice.deleteMany();
  await db.delivery.deleteMany();
  await db.orderItem.deleteMany();
  await db.salesOrder.deleteMany();
  await db.quotationItem.deleteMany();
  await db.quotation.deleteMany();
  await db.followUp.deleteMany();
  await db.lead.deleteMany();
  await db.customer.deleteMany();
  await db.counter.deleteMany();
  await db.loginChallenge.deleteMany();
  await db.refreshToken.deleteMany();
  await db.staff.deleteMany();
  await db.role.deleteMany();
  await db.branch.deleteMany();
  await db.organization.deleteMany();
  await db.adminRefreshToken.deleteMany();
  await db.adminUser.deleteMany();

  // --- Organization ---
  const org = await db.organization.create({
    data: { name: 'Welona Health & Wellness', slug: 'welona' },
  });

  // --- Branches ---
  const [cp, bandra] = await Promise.all([
    db.branch.create({
      data: {
        orgId: org.id,
        name: 'Welona — Connaught Place',
        code: 'CP',
        address: 'Block A, Connaught Place',
        city: 'New Delhi',
        phone: '+91 11 4000 1000',
      },
    }),
    db.branch.create({
      data: {
        orgId: org.id,
        name: 'Welona — Bandra West',
        code: 'BND',
        address: 'Linking Road, Bandra West',
        city: 'Mumbai',
        phone: '+91 22 4000 2000',
      },
    }),
  ]);

  // --- Roles (8 built-in roles, section 7.3) ---
  const roleIds: Record<string, string> = {};
  for (const role of SYSTEM_ROLES) {
    const created = await db.role.create({
      data: {
        orgId: org.id,
        key: role.key,
        name: role.name,
        scope: role.scope,
        permissions: JSON.stringify(role.permissions),
        isSystem: true,
      },
    });
    roleIds[role.key] = created.id;
  }

  // --- Staff ---
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const staffSeed = [
    { name: 'Aarav Mehta', email: 'admin@welona.com', roleKey: 'super_admin', branchId: null },
    { name: 'Priya Nair', email: 'ho@welona.com', roleKey: 'ho_manager', branchId: null },
    { name: 'Rahul Verma', email: 'manager.cp@welona.com', roleKey: 'branch_manager', branchId: cp.id },
    { name: 'Sneha Iyer', email: 'reception.cp@welona.com', roleKey: 'receptionist', branchId: cp.id },
    { name: 'Karan Shah', email: 'manager.bnd@welona.com', roleKey: 'branch_manager', branchId: bandra.id },
    { name: 'Divya Rao', email: 'finance@welona.com', roleKey: 'finance', branchId: null },
  ];

  const staff: Record<string, string> = {};
  for (const s of staffSeed) {
    const created = await db.staff.create({
      data: {
        orgId: org.id,
        branchId: s.branchId,
        roleId: roleIds[s.roleKey],
        name: s.name,
        email: s.email,
        passwordHash,
        phone: '+91 90000 00000',
        status: 'active',
        twoFactorEnabled: true,
      },
    });
    staff[s.email] = created.id;
  }

  // Salespeople used as pipeline owners.
  const aarav = staff['admin@welona.com'];
  const priya = staff['ho@welona.com'];
  const rahul = staff['manager.cp@welona.com'];
  const karan = staff['manager.bnd@welona.com'];

  // --- Customers ---
  const customerSeed = [
    { name: 'Rohan Kapoor', type: 'individual', branchId: cp.id, email: 'rohan.kapoor@example.com', phone: '+91 98100 11111', city: 'New Delhi' },
    { name: 'Wellness Corp Pvt Ltd', type: 'business', branchId: cp.id, companyName: 'Wellness Corp Pvt Ltd', gstin: '07AABCW1234C1Z5', email: 'procurement@wellnesscorp.in', phone: '+91 98100 22222', city: 'New Delhi' },
    { name: 'Anita Desai', type: 'individual', branchId: bandra.id, email: 'anita.desai@example.com', phone: '+91 98200 33333', city: 'Mumbai' },
    { name: 'GreenLeaf Spa LLP', type: 'business', branchId: bandra.id, companyName: 'GreenLeaf Spa LLP', gstin: '27AAFFG5678D1Z2', email: 'accounts@greenleafspa.in', phone: '+91 98200 44444', city: 'Mumbai' },
    { name: 'Vikram Singh', type: 'individual', branchId: null, email: 'vikram.singh@example.com', phone: '+91 99000 55555', city: 'Gurugram' },
  ];
  const customers: Record<string, string> = {};
  for (const c of customerSeed) {
    const created = await db.customer.create({
      data: {
        orgId: org.id,
        branchId: c.branchId,
        type: c.type,
        name: c.name,
        companyName: c.companyName ?? null,
        gstin: c.gstin ?? null,
        email: c.email,
        phone: c.phone,
        city: c.city,
        createdById: aarav,
      },
    });
    customers[c.name] = created.id;
  }

  // --- Leads ---
  const leadSeed = [
    { contactName: 'Meera Joshi', contactPhone: '+91 98111 60001', source: 'website', status: 'new', interest: 'Annual wellness membership', estimatedValue: inr(25000), ownerStaffId: rahul, branchId: cp.id },
    { contactName: 'Sahil Khanna', contactPhone: '+91 98111 60002', source: 'referral', status: 'contacted', interest: 'Spa therapy package', estimatedValue: inr(15000), ownerStaffId: rahul, branchId: cp.id },
    { contactName: 'Wellness Corp Pvt Ltd', contactPhone: '+91 98100 22222', source: 'campaign', status: 'qualified', interest: 'Corporate wellness program', estimatedValue: inr(120000), ownerStaffId: priya, branchId: cp.id, customerName: 'Wellness Corp Pvt Ltd' },
    { contactName: 'Anita Desai', contactPhone: '+91 98200 33333', source: 'walk_in', status: 'converted', interest: 'Skincare product bundle', estimatedValue: inr(8500), ownerStaffId: karan, branchId: bandra.id, customerName: 'Anita Desai' },
    { contactName: 'Deepak Menon', contactPhone: '+91 98200 60005', source: 'phone', status: 'lost', interest: 'Quarterly fitness plan', estimatedValue: inr(9000), ownerStaffId: karan, branchId: bandra.id, lostReason: 'Chose a competitor' },
    { contactName: 'GreenLeaf Spa LLP', contactPhone: '+91 98200 44444', source: 'referral', status: 'qualified', interest: 'Bulk product supply', estimatedValue: inr(60000), ownerStaffId: karan, branchId: bandra.id, customerName: 'GreenLeaf Spa LLP' },
  ];
  for (const l of leadSeed) {
    await db.lead.create({
      data: {
        orgId: org.id,
        branchId: l.branchId,
        customerId: l.customerName ? customers[l.customerName] : null,
        contactName: l.contactName,
        contactPhone: l.contactPhone,
        source: l.source,
        status: l.status,
        interest: l.interest,
        estimatedValue: l.estimatedValue,
        ownerStaffId: l.ownerStaffId,
        lostReason: l.lostReason ?? null,
      },
    });
  }

  // --- Quotations (with items) ---
  let qtSeq = 0;
  let soSeq = 0;
  let invSeq = 0;

  // QT-0001 — draft
  const q1 = priceItems([
    { description: 'Annual Wellness Membership', quantity: 1, unitPrice: inr(25000) },
    { description: 'Premium Skincare Product Bundle', quantity: 1, unitPrice: inr(8500), discountAmt: inr(500) },
  ]);
  await db.quotation.create({
    data: {
      orgId: org.id,
      branchId: cp.id,
      number: `QT-${pad(++qtSeq)}`,
      customerId: customers['Rohan Kapoor'],
      ownerStaffId: rahul,
      status: 'draft',
      subtotal: q1.subtotal,
      discountAmt: q1.discountAmt,
      taxAmt: q1.taxAmt,
      total: q1.total,
      items: { create: q1.rows },
    },
  });

  // QT-0002 — sent
  const q2 = priceItems([
    { description: 'Spa Therapy Package (10 sessions)', quantity: 1, unitPrice: inr(15000) },
  ]);
  await db.quotation.create({
    data: {
      orgId: org.id,
      branchId: bandra.id,
      number: `QT-${pad(++qtSeq)}`,
      customerId: customers['Anita Desai'],
      ownerStaffId: karan,
      status: 'sent',
      sentAt: new Date(),
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      subtotal: q2.subtotal,
      discountAmt: q2.discountAmt,
      taxAmt: q2.taxAmt,
      total: q2.total,
      items: { create: q2.rows },
    },
  });

  // QT-0003 — approved + converted (becomes SO-0001)
  const q3 = priceItems([
    { description: 'Corporate Wellness Program (annual)', quantity: 1, unitPrice: inr(120000), discountAmt: inr(10000) },
  ]);
  const quotation3 = await db.quotation.create({
    data: {
      orgId: org.id,
      branchId: cp.id,
      number: `QT-${pad(++qtSeq)}`,
      customerId: customers['Wellness Corp Pvt Ltd'],
      ownerStaffId: priya,
      status: 'converted',
      sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      approvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      approvedById: priya,
      subtotal: q3.subtotal,
      discountAmt: q3.discountAmt,
      taxAmt: q3.taxAmt,
      total: q3.total,
      items: { create: q3.rows },
    },
  });

  // --- Sales orders ---
  // SO-0001 — confirmed, from QT-0003
  const order1 = await db.salesOrder.create({
    data: {
      orgId: org.id,
      branchId: cp.id,
      number: `SO-${pad(++soSeq)}`,
      customerId: customers['Wellness Corp Pvt Ltd'],
      quotationId: quotation3.id,
      ownerStaffId: priya,
      status: 'confirmed',
      paymentStatus: 'partially_paid',
      subtotal: q3.subtotal,
      discountAmt: q3.discountAmt,
      taxAmt: q3.taxAmt,
      total: q3.total,
      items: { create: q3.rows.map((r) => ({ ...r, quantityDelivered: 0 })) },
    },
  });

  // SO-0002 — delivered, direct order
  const o2 = priceItems([
    { description: 'Premium Skincare Product Bundle', quantity: 5, unitPrice: inr(8500) },
  ]);
  const order2 = await db.salesOrder.create({
    data: {
      orgId: org.id,
      branchId: bandra.id,
      number: `SO-${pad(++soSeq)}`,
      customerId: customers['GreenLeaf Spa LLP'],
      ownerStaffId: karan,
      status: 'delivered',
      paymentStatus: 'paid',
      subtotal: o2.subtotal,
      discountAmt: o2.discountAmt,
      taxAmt: o2.taxAmt,
      total: o2.total,
      items: { create: o2.rows.map((r) => ({ ...r, quantityDelivered: r.quantity })) },
    },
  });

  // --- Delivery for SO-0002 ---
  await db.delivery.create({
    data: {
      orgId: org.id,
      orderId: order2.id,
      status: 'delivered',
      scheduledFor: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      dispatchedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      handledById: karan,
      trackingRef: 'TRK-100245',
    },
  });

  // --- Invoices + payments ---
  // INV-0001 — for SO-0002, fully paid
  const invoice1 = await db.invoice.create({
    data: {
      orgId: org.id,
      branchId: bandra.id,
      number: `INV-${pad(++invSeq)}`,
      customerId: customers['GreenLeaf Spa LLP'],
      orderId: order2.id,
      status: 'paid',
      issuedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      dueAt: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
      subtotal: o2.subtotal,
      taxAmt: o2.taxAmt,
      total: o2.total,
      amountPaid: o2.total,
    },
  });
  await db.payment.create({
    data: {
      orgId: org.id,
      invoiceId: invoice1.id,
      amount: o2.total,
      method: 'bank_transfer',
      reference: 'NEFT-558821',
      recordedById: karan,
    },
  });

  // INV-0002 — for SO-0001, partially paid
  const invoice2 = await db.invoice.create({
    data: {
      orgId: org.id,
      branchId: cp.id,
      number: `INV-${pad(++invSeq)}`,
      customerId: customers['Wellness Corp Pvt Ltd'],
      orderId: order1.id,
      status: 'partially_paid',
      issuedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      dueAt: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
      subtotal: q3.subtotal,
      taxAmt: q3.taxAmt,
      total: q3.total,
      amountPaid: inr(50000),
    },
  });
  await db.payment.create({
    data: {
      orgId: org.id,
      invoiceId: invoice2.id,
      amount: inr(50000),
      method: 'upi',
      reference: 'UPI-7741203',
      recordedById: priya,
    },
  });

  // --- Sequence counters (continue numbering after the seeded documents) ---
  await db.counter.createMany({
    data: [
      { orgId: org.id, key: 'quotation', value: qtSeq },
      { orgId: org.id, key: 'order', value: soSeq },
      { orgId: org.id, key: 'invoice', value: invSeq },
    ],
  });

  // --- Admin pool (separate identity from Staff) ---
  // These accounts only sign in to /admin/login and never appear in the
  // employee directory.
  const adminSeed = [
    { name: 'Welona Super Admin', email: 'superadmin@welona.com' },
    { name: 'Welona Admin', email: 'admin.console@welona.com' },
  ];
  for (const a of adminSeed) {
    await db.adminUser.create({
      data: {
        name: a.name,
        email: a.email,
        passwordHash,
        status: 'active',
      },
    });
  }

  // Reference the created orders so unused-variable lint stays quiet.
  void order1;

  console.log(`  Organization: ${org.name}`);
  console.log(`  Branches:     2`);
  console.log(`  Roles:        ${SYSTEM_ROLES.length}`);
  console.log(`  Staff:        ${staffSeed.length}`);
  console.log(`  Customers:    ${customerSeed.length}`);
  console.log(`  Leads:        ${leadSeed.length}`);
  console.log(`  Quotations:   ${qtSeq}   Orders: ${soSeq}   Invoices: ${invSeq}`);
  console.log(`  Admin users: ${adminSeed.length}`);

  console.log(`\nSign in with any seeded email and password "${DEMO_PASSWORD}".`);
  console.log('Employee sign-in: /login         — primary: admin@welona.com');
  console.log('Admin sign-in:    /admin/login   — primary: superadmin@welona.com');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
