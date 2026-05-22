/**
 * Showcase data for the admin master pages.
 *
 * Run with: `npx tsx prisma/seed-admin-showcase.ts`
 *
 * Idempotent — each Zone is upserted on (country, stateName) and each Branch
 * on (orgId, branchCode). Running it twice produces the same set of rows.
 *
 * It populates:
 *   - Zone master  : 8 Indian states
 *   - Branch master: 8 realistic Indian branches, each with a zone, address,
 *                    phone, email and IPv4, attributed to the seeded admin.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const zones = [
  { country: 'India', stateName: 'Telangana', remarks: 'South — Hyderabad region' },
  { country: 'India', stateName: 'Maharashtra', remarks: 'West — Mumbai region' },
  { country: 'India', stateName: 'Karnataka', remarks: 'South — Bengaluru region' },
  { country: 'India', stateName: 'Delhi', remarks: 'North — NCR' },
  { country: 'India', stateName: 'Tamil Nadu', remarks: 'South — Chennai region' },
  { country: 'India', stateName: 'Kerala', remarks: 'South — Kochi region' },
  { country: 'India', stateName: 'Gujarat', remarks: 'West — Ahmedabad region' },
  { country: 'India', stateName: 'West Bengal', remarks: 'East — Kolkata region' },
];

interface BranchSeed {
  name: string;
  code: string;
  zoneState: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  ipAddress: string;
}

const branches: BranchSeed[] = [
  {
    name: 'Jubilee Hills',
    code: 'JH001',
    zoneState: 'Telangana',
    address: 'Road No. 36, Jubilee Hills, Hyderabad',
    city: 'Hyderabad',
    phone: '+91-9876543210',
    email: 'jubilee@welona.com',
    ipAddress: '192.168.1.10',
  },
  {
    name: 'Banjara Hills',
    code: 'BH002',
    zoneState: 'Telangana',
    address: 'Road No. 12, Banjara Hills, Hyderabad',
    city: 'Hyderabad',
    phone: '+91-9876512345',
    email: 'banjara@welona.com',
    ipAddress: '192.168.1.11',
  },
  {
    name: 'Bandra West',
    code: 'BW003',
    zoneState: 'Maharashtra',
    address: 'Linking Road, Bandra West, Mumbai',
    city: 'Mumbai',
    phone: '+91-9820012345',
    email: 'bandra@welona.com',
    ipAddress: '192.168.2.10',
  },
  {
    name: 'Powai',
    code: 'PW004',
    zoneState: 'Maharashtra',
    address: 'Hiranandani Gardens, Powai, Mumbai',
    city: 'Mumbai',
    phone: '+91-9820067890',
    email: 'powai@welona.com',
    ipAddress: '192.168.2.11',
  },
  {
    name: 'Koramangala',
    code: 'KR005',
    zoneState: 'Karnataka',
    address: '80 Feet Road, 4th Block, Koramangala, Bengaluru',
    city: 'Bengaluru',
    phone: '+91-9845011223',
    email: 'koramangala@welona.com',
    ipAddress: '192.168.3.10',
  },
  {
    name: 'Indiranagar',
    code: 'IN006',
    zoneState: 'Karnataka',
    address: '100 Feet Road, Indiranagar, Bengaluru',
    city: 'Bengaluru',
    phone: '+91-9845098765',
    email: 'indiranagar@welona.com',
    ipAddress: '192.168.3.11',
  },
  {
    name: 'Connaught Place',
    code: 'CP007',
    zoneState: 'Delhi',
    address: 'Block A, Connaught Place, New Delhi',
    city: 'New Delhi',
    phone: '+91-9811023456',
    email: 'cp@welona.com',
    ipAddress: '192.168.4.10',
  },
  {
    name: 'Anna Nagar',
    code: 'AN008',
    zoneState: 'Tamil Nadu',
    address: '2nd Avenue, Anna Nagar, Chennai',
    city: 'Chennai',
    phone: '+91-9444011223',
    email: 'annanagar@welona.com',
    ipAddress: '192.168.5.10',
  },
];

async function main() {
  // Resolve the (single) Organization and the seeded super admin.
  const org = await db.organization.findFirst({ select: { id: true, name: true } });
  if (!org) {
    throw new Error(
      'No Organization row found. Run the main `prisma db seed` first to create one.',
    );
  }
  const admin = await db.adminUser.findUnique({
    where: { email: 'superadmin@welona.com' },
    select: { id: true, name: true },
  });
  if (!admin) {
    throw new Error(
      'No `superadmin@welona.com` AdminUser. Run `npx tsx prisma/seed-admin.ts` first.',
    );
  }

  console.log(`Organization: ${org.name}`);
  console.log(`Attributing branches to admin: ${admin.name}\n`);

  // --- Zones ---
  console.log('Zones:');
  const zoneIdByState: Record<string, string> = {};
  for (const z of zones) {
    const row = await db.zone.upsert({
      where: { country_stateName: { country: z.country, stateName: z.stateName } },
      create: { country: z.country, stateName: z.stateName, remarks: z.remarks },
      update: { remarks: z.remarks },
    });
    zoneIdByState[z.stateName] = row.id;
    console.log(`  ✓ ${row.country} / ${row.stateName}`);
  }

  // --- Branches ---
  console.log('\nBranches:');
  for (const b of branches) {
    const zoneId = zoneIdByState[b.zoneState];
    if (!zoneId) {
      console.warn(`  ! Skipping ${b.code} — zone "${b.zoneState}" not found`);
      continue;
    }
    const row = await db.branch.upsert({
      where: { orgId_code: { orgId: org.id, code: b.code } },
      create: {
        orgId: org.id,
        name: b.name,
        code: b.code,
        address: b.address,
        city: b.city,
        phone: b.phone,
        email: b.email,
        ipAddress: b.ipAddress,
        zoneId,
        createdByAdminId: admin.id,
      },
      update: {
        name: b.name,
        address: b.address,
        city: b.city,
        phone: b.phone,
        email: b.email,
        ipAddress: b.ipAddress,
        zoneId,
      },
    });
    console.log(`  ✓ ${row.code.padEnd(6)} ${row.name} — ${b.zoneState}`);
  }

  // --- Categories ---
  console.log('\nCategories:');
  const categories = [
    { name: 'Skin Services', description: 'Dermatology, peels, treatments and facials' },
    { name: 'Products', description: 'Take-home retail — shampoos, serums, supplements' },
    { name: 'LASER', description: 'Laser hair removal and skin laser procedures' },
    { name: 'Hair Care', description: 'Trichology consultations, scalp and hair treatments' },
    { name: 'Wellness', description: 'Wellness programmes and lifestyle consultations' },
  ];
  const categoryIdByName: Record<string, string> = {};
  for (const c of categories) {
    const row = await db.category.upsert({
      where: { name: c.name },
      create: {
        name: c.name,
        description: c.description,
        isActive: true,
        createdByAdminId: admin.id,
      },
      update: { description: c.description, isActive: true },
    });
    categoryIdByName[c.name] = row.id;
    console.log(`  ✓ ${row.name}`);
  }

  // --- Services / Products ---
  // Prices are stored as integer paise; the seed uses rupees * 100 inline.
  const r = (rupees: number) => rupees * 100;

  const services = [
    // Skin Services
    {
      categoryName: 'Skin Services',
      name: 'TCA Peel',
      hsnSacCode: '999722',
      minPrice: r(3500),
      maxPrice: r(7500),
      taxPercent: 18,
      hasMeasurements: false,
      hasComplementary: true,
    },
    {
      categoryName: 'Skin Services',
      name: 'Under-Eye Peel',
      hsnSacCode: '999722',
      minPrice: r(2500),
      maxPrice: r(5500),
      taxPercent: 18,
      hasMeasurements: false,
      hasComplementary: false,
    },
    {
      categoryName: 'Skin Services',
      name: 'Pumpkin Peel',
      hsnSacCode: '999722',
      minPrice: r(2000),
      maxPrice: r(4500),
      taxPercent: 18,
      hasMeasurements: false,
      hasComplementary: false,
    },
    {
      categoryName: 'Skin Services',
      name: 'Minor Skin Surgery',
      hsnSacCode: '999315',
      minPrice: r(8000),
      maxPrice: r(25000),
      taxPercent: 18,
      hasMeasurements: false,
      hasComplementary: false,
    },
    // Products
    {
      categoryName: 'Products',
      name: 'FCI T-Shampoo Anti Dandruff',
      hsnSacCode: '3305',
      minPrice: r(550),
      maxPrice: r(650),
      taxPercent: 18,
      hasMeasurements: false,
      hasComplementary: false,
    },
    {
      categoryName: 'Products',
      name: 'Cerascape Face Cleanser',
      hsnSacCode: '3304',
      minPrice: r(750),
      maxPrice: r(900),
      taxPercent: 18,
      hasMeasurements: false,
      hasComplementary: false,
    },
    {
      categoryName: 'Products',
      name: 'Melarid De-Pigmentation Serum',
      hsnSacCode: '3304',
      minPrice: r(1200),
      maxPrice: r(1500),
      taxPercent: 18,
      hasMeasurements: false,
      hasComplementary: false,
    },
    {
      categoryName: 'Products',
      name: 'Multivitamins & Multiminerals',
      hsnSacCode: '3004',
      minPrice: r(600),
      maxPrice: r(800),
      taxPercent: 12,
      hasMeasurements: false,
      hasComplementary: false,
    },
    {
      categoryName: 'Products',
      name: 'Hair Care Strip',
      hsnSacCode: '3305',
      minPrice: r(150),
      maxPrice: r(250),
      taxPercent: 18,
      hasMeasurements: false,
      hasComplementary: false,
    },
    // LASER
    {
      categoryName: 'LASER',
      name: 'Laser - Half Legs',
      hsnSacCode: '999722',
      minPrice: r(3500),
      maxPrice: r(6500),
      taxPercent: 18,
      hasMeasurements: true,
      hasComplementary: false,
    },
    {
      categoryName: 'LASER',
      name: 'Laser - Full Legs',
      hsnSacCode: '999722',
      minPrice: r(6500),
      maxPrice: r(11000),
      taxPercent: 18,
      hasMeasurements: true,
      hasComplementary: false,
    },
    {
      categoryName: 'LASER',
      name: 'Laser - Upper Lip',
      hsnSacCode: '999722',
      minPrice: r(800),
      maxPrice: r(1500),
      taxPercent: 18,
      hasMeasurements: false,
      hasComplementary: false,
    },
    // Hair Care
    {
      categoryName: 'Hair Care',
      name: 'Trichology Consultation',
      hsnSacCode: '999315',
      minPrice: r(800),
      maxPrice: r(1500),
      taxPercent: 18,
      hasMeasurements: false,
      hasComplementary: true,
    },
    {
      categoryName: 'Hair Care',
      name: 'PRP Hair Therapy (single session)',
      hsnSacCode: '999722',
      minPrice: r(5000),
      maxPrice: r(9000),
      taxPercent: 18,
      hasMeasurements: false,
      hasComplementary: false,
    },
    // Wellness
    {
      categoryName: 'Wellness',
      name: 'Wellness Membership (Annual)',
      hsnSacCode: '999319',
      minPrice: r(20000),
      maxPrice: r(30000),
      taxPercent: 18,
      hasMeasurements: false,
      hasComplementary: true,
    },
  ];

  console.log('\nServices:');
  for (const s of services) {
    const categoryId = categoryIdByName[s.categoryName];
    if (!categoryId) {
      console.warn(`  ! Skipping ${s.name} — category "${s.categoryName}" not found`);
      continue;
    }
    // Service has no natural unique key. Use a (categoryId, name) lookup
    // before deciding between create vs. update so the script stays idempotent.
    const existing = await db.service.findFirst({
      where: { categoryId, name: s.name },
      select: { id: true },
    });
    if (existing) {
      await db.service.update({
        where: { id: existing.id },
        data: {
          hsnSacCode: s.hsnSacCode,
          minPrice: s.minPrice,
          maxPrice: s.maxPrice,
          taxPercent: s.taxPercent,
          hasMeasurements: s.hasMeasurements,
          hasComplementary: s.hasComplementary,
        },
      });
    } else {
      await db.service.create({
        data: {
          categoryId,
          name: s.name,
          hsnSacCode: s.hsnSacCode,
          minPrice: s.minPrice,
          maxPrice: s.maxPrice,
          taxPercent: s.taxPercent,
          hasMeasurements: s.hasMeasurements,
          hasComplementary: s.hasComplementary,
          isActive: true,
          createdByAdminId: admin.id,
        },
      });
    }
    console.log(`  ✓ [${s.categoryName.padEnd(13)}] ${s.name}`);
  }

  // --- Ledgers (chart of accounts) ---
  // `r` from the services block is already in scope here — reuse it.
  const ledgers: Array<{
    name: string;
    group: string;
    openingBalance: number;
    balanceType: 'debit' | 'credit';
    description?: string;
    gstNumber?: string;
  }> = [
    {
      name: 'Cash on Hand',
      group: 'cash',
      openingBalance: r(50000),
      balanceType: 'debit',
      description: 'Petty cash + drawer float',
    },
    {
      name: 'HDFC Bank — Current Account',
      group: 'bank',
      openingBalance: r(250000),
      balanceType: 'debit',
      description: 'Primary current account',
    },
    {
      name: 'Sales — Skin Services',
      group: 'sales',
      openingBalance: 0,
      balanceType: 'credit',
    },
    {
      name: 'Sales — Products',
      group: 'sales',
      openingBalance: 0,
      balanceType: 'credit',
    },
    {
      name: 'Sales — LASER',
      group: 'sales',
      openingBalance: 0,
      balanceType: 'credit',
    },
    {
      name: 'Purchase — Consumables',
      group: 'purchase',
      openingBalance: 0,
      balanceType: 'debit',
    },
    {
      name: 'Wellness Corp Pvt Ltd',
      group: 'sundry_debtor',
      openingBalance: r(70000),
      balanceType: 'debit',
      gstNumber: '07AABCW1234C1Z5',
      description: 'Corporate wellness customer',
    },
    {
      name: 'GreenLeaf Spa LLP',
      group: 'sundry_debtor',
      openingBalance: 0,
      balanceType: 'debit',
      gstNumber: '27AAFFG5678D1Z2',
    },
    {
      name: 'Beauty Suppliers Pvt Ltd',
      group: 'sundry_creditor',
      openingBalance: r(45000),
      balanceType: 'credit',
      gstNumber: '29AAACB9876E1Z9',
      description: 'Primary product supplier',
    },
    {
      name: 'Rent',
      group: 'indirect_expense',
      openingBalance: 0,
      balanceType: 'debit',
    },
    {
      name: 'Salaries & Wages',
      group: 'indirect_expense',
      openingBalance: 0,
      balanceType: 'debit',
    },
    {
      name: 'Electricity & Utilities',
      group: 'indirect_expense',
      openingBalance: 0,
      balanceType: 'debit',
    },
    {
      name: 'GST Payable',
      group: 'duties_taxes',
      openingBalance: 0,
      balanceType: 'credit',
      description: 'Output GST collected on sales',
    },
    {
      name: 'TDS Receivable',
      group: 'duties_taxes',
      openingBalance: 0,
      balanceType: 'debit',
    },
    {
      name: 'Equipment & Fixtures',
      group: 'fixed_asset',
      openingBalance: r(450000),
      balanceType: 'debit',
      description: 'Lasers, chairs, dermatology equipment',
    },
    {
      name: 'Capital — Founders',
      group: 'capital_account',
      openingBalance: r(1000000),
      balanceType: 'credit',
    },
  ];

  console.log('\nLedgers:');
  for (const l of ledgers) {
    const existing = await db.ledger.findUnique({ where: { name: l.name } });
    if (existing) {
      await db.ledger.update({
        where: { id: existing.id },
        data: {
          group: l.group,
          openingBalance: l.openingBalance,
          balanceType: l.balanceType,
          description: l.description ?? null,
          gstNumber: l.gstNumber ?? null,
          isActive: true,
        },
      });
    } else {
      await db.ledger.create({
        data: {
          name: l.name,
          group: l.group,
          openingBalance: l.openingBalance,
          balanceType: l.balanceType,
          description: l.description ?? null,
          gstNumber: l.gstNumber ?? null,
          isActive: true,
          createdByAdminId: admin.id,
        },
      });
    }
    console.log(`  ✓ [${l.group.padEnd(18)}] ${l.name}`);
  }

  // --- Payment Modes ---
  // Mirrors the names + IPs from the source admin UI screenshot.
  const paymodes: Array<{ name: string; remarks: string; ipAddress: string }> = [
    { name: 'Medscred', remarks: 'Medscred', ipAddress: '216.108.231.117' },
    { name: 'Fibe', remarks: 'Fibe Payment Mode', ipAddress: '64.235.61.97' },
    { name: 'Shopse', remarks: 'Shopse Payment Mode', ipAddress: '64.235.61.97' },
    { name: 'Save In', remarks: 'Save In Payment Mode', ipAddress: '64.235.61.97' },
    { name: 'Ez Finanz', remarks: 'Ez Finanz Payment Mode', ipAddress: '64.235.61.97' },
    { name: 'Bajaj', remarks: 'Bajaj Finance Payment Mode', ipAddress: '64.235.61.97' },
    { name: 'Cheque', remarks: 'Cheque Payment Mode', ipAddress: '64.235.61.97' },
    { name: 'Office Scan', remarks: 'Office Scan Payment Mode', ipAddress: '64.235.61.97' },
    { name: 'Cash', remarks: 'Cash Payment Mode', ipAddress: '64.235.61.97' },
    { name: 'Credit Card', remarks: 'Credit Card Payment Mode', ipAddress: '64.235.61.97' },
  ];

  console.log('\nPayment modes:');
  for (const p of paymodes) {
    const existing = await db.paymentMode.findUnique({ where: { name: p.name } });
    if (existing) {
      await db.paymentMode.update({
        where: { id: existing.id },
        data: { remarks: p.remarks, ipAddress: p.ipAddress },
      });
    } else {
      await db.paymentMode.create({
        data: {
          name: p.name,
          remarks: p.remarks,
          ipAddress: p.ipAddress,
          isActive: true,
          createdByAdminId: admin.id,
        },
      });
    }
    console.log(`  ✓ ${p.name.padEnd(14)} ${p.ipAddress}`);
  }

  // --- Taxes ---
  // Mirrors the 3 rows from the source admin UI screenshot + a few common slabs.
  const taxes: Array<{
    name: string;
    percentBps: number;
    remarks: string;
    ipAddress: string;
  }> = [
    { name: 'IGST', percentBps: 0, remarks: 'IGST', ipAddress: '64.235.41.75' },
    { name: 'CGST', percentBps: 250, remarks: 'CGST', ipAddress: '104.238.80.211' },
    { name: 'SGST', percentBps: 250, remarks: 'SGST', ipAddress: '104.238.80.211' },
    { name: 'GST 5', percentBps: 500, remarks: 'GST 5% slab', ipAddress: '104.238.80.211' },
    { name: 'GST 12', percentBps: 1200, remarks: 'GST 12% slab', ipAddress: '104.238.80.211' },
    { name: 'GST 18', percentBps: 1800, remarks: 'GST 18% slab', ipAddress: '104.238.80.211' },
    { name: 'GST 28', percentBps: 2800, remarks: 'GST 28% slab', ipAddress: '104.238.80.211' },
  ];

  console.log('\nTaxes:');
  for (const t of taxes) {
    const existing = await db.tax.findUnique({ where: { name: t.name } });
    if (existing) {
      await db.tax.update({
        where: { id: existing.id },
        data: {
          percentBps: t.percentBps,
          remarks: t.remarks,
          ipAddress: t.ipAddress,
        },
      });
    } else {
      await db.tax.create({
        data: {
          name: t.name,
          percentBps: t.percentBps,
          remarks: t.remarks,
          ipAddress: t.ipAddress,
          isActive: true,
          createdByAdminId: admin.id,
        },
      });
    }
    console.log(`  ✓ ${t.name.padEnd(8)} ${(t.percentBps / 100).toString().padStart(5)}%`);
  }

  // --- Media (lead source channels) ---
  // The screenshot shows the 9 channels under the West Bengal zone. We also
  // attach a couple of channels to Telangana to make the zone filter useful
  // out of the box.
  const wbZoneId = zoneIdByState['West Bengal'];
  const tsZoneId = zoneIdByState['Telangana'];

  const medias: Array<{ zoneId: string; name: string; remarks: string; ipAddress: string }> = [
    { zoneId: wbZoneId, name: 'Lead in Landline', remarks: 'Lead in Landline', ipAddress: '64.235.61.97' },
    { zoneId: wbZoneId, name: 'Youtube',          remarks: 'Youtube',          ipAddress: '64.235.61.97' },
    { zoneId: wbZoneId, name: 'Rebooking',        remarks: 'Rebooking',        ipAddress: '64.235.61.97' },
    { zoneId: wbZoneId, name: 'Others',           remarks: 'Others',           ipAddress: '64.235.61.97' },
    { zoneId: wbZoneId, name: 'Whatsapp',         remarks: 'Whatsapp',         ipAddress: '64.235.61.97' },
    { zoneId: wbZoneId, name: 'Website',          remarks: 'Website',          ipAddress: '64.235.61.97' },
    { zoneId: wbZoneId, name: 'Sms',              remarks: 'Sms',              ipAddress: '64.235.61.97' },
    { zoneId: wbZoneId, name: 'Referral',         remarks: 'Referral',         ipAddress: '64.235.61.97' },
    { zoneId: wbZoneId, name: 'pamphlet',         remarks: 'pamphlet',         ipAddress: '64.235.61.97' },
    // Telangana — make the zone filter show non-empty results too
    { zoneId: tsZoneId, name: 'Walk-in',          remarks: 'Walk-in',          ipAddress: '64.235.61.97' },
    { zoneId: tsZoneId, name: 'Instagram',        remarks: 'Instagram ads',    ipAddress: '64.235.61.97' },
  ];

  console.log('\nMedia:');
  for (const m of medias) {
    if (!m.zoneId) continue;
    const existing = await db.media.findUnique({
      where: { zoneId_name: { zoneId: m.zoneId, name: m.name } },
    });
    if (existing) {
      await db.media.update({
        where: { id: existing.id },
        data: { remarks: m.remarks, ipAddress: m.ipAddress },
      });
    } else {
      await db.media.create({
        data: {
          zoneId: m.zoneId,
          name: m.name,
          remarks: m.remarks,
          ipAddress: m.ipAddress,
          isActive: true,
          createdByAdminId: admin.id,
        },
      });
    }
    console.log(`  ✓ ${m.name.padEnd(18)} ${m.ipAddress}`);
  }

  // --- Marketing Offers ---
  // One offer mirroring the row in the source screenshot (offerCode "tsep",
  // ₹1000, 22/09/2023 → 27/09/2023) plus a second realistic clinic package.
  const sampleBranches = await db.branch.findMany({
    where: { orgId: org.id },
    select: { id: true, name: true },
    take: 4,
  });
  const skinCategory = await db.category.findUnique({ where: { name: 'Skin Services' } });
  const laserCategory = await db.category.findUnique({ where: { name: 'LASER' } });
  const sampleSkinService = skinCategory
    ? await db.service.findFirst({
        where: { categoryId: skinCategory.id, name: 'TCA Peel' },
      })
    : null;
  const sampleLaserService = laserCategory
    ? await db.service.findFirst({
        where: { categoryId: laserCategory.id, name: 'Laser - Half Legs' },
      })
    : null;

  const offerSpecs: Array<{
    packageName: string;
    packageCode: string;
    fromDate: Date;
    toDate: Date;
    minAmount: number;
    maxAmount: number;
    remarks: string;
    items: Array<{ categoryId: string; serviceId: string; quantity: number }>;
  }> = [];

  if (sampleBranches.length > 0 && skinCategory && sampleSkinService) {
    offerSpecs.push({
      packageName: 'Festive Skin Special',
      packageCode: 'tsep',
      fromDate: new Date('2023-09-22'),
      toDate: new Date('2023-09-27'),
      minAmount: r(500),
      maxAmount: r(1000),
      remarks: 'offer',
      items: [
        { categoryId: skinCategory.id, serviceId: sampleSkinService.id, quantity: 1 },
      ],
    });
  }

  if (sampleBranches.length > 0 && laserCategory && sampleLaserService && skinCategory && sampleSkinService) {
    offerSpecs.push({
      packageName: 'Glow & Smooth Combo',
      packageCode: 'GLOWSMOOTH',
      fromDate: new Date(),
      toDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      minAmount: r(4000),
      maxAmount: r(12000),
      remarks: 'Skin peel + half-legs laser bundle for the month',
      items: [
        { categoryId: skinCategory.id, serviceId: sampleSkinService.id, quantity: 1 },
        { categoryId: laserCategory.id, serviceId: sampleLaserService.id, quantity: 2 },
      ],
    });
  }

  console.log('\nMarketing offers:');
  for (const spec of offerSpecs) {
    const existing = await db.marketingOffer.findUnique({
      where: { packageCode: spec.packageCode },
    });
    if (existing) {
      // Wipe + re-create relations so re-runs reflect the latest spec.
      await db.marketingOfferBranch.deleteMany({ where: { offerId: existing.id } });
      await db.marketingOfferItem.deleteMany({ where: { offerId: existing.id } });
      await db.marketingOffer.update({
        where: { id: existing.id },
        data: {
          packageName: spec.packageName,
          fromDate: spec.fromDate,
          toDate: spec.toDate,
          minAmount: spec.minAmount,
          maxAmount: spec.maxAmount,
          remarks: spec.remarks,
          branches: { create: sampleBranches.map((b) => ({ branchId: b.id })) },
          items: {
            create: spec.items.map((it, idx) => ({
              categoryId: it.categoryId,
              serviceId: it.serviceId,
              quantity: it.quantity,
              sortOrder: idx,
            })),
          },
        },
      });
    } else {
      await db.marketingOffer.create({
        data: {
          packageName: spec.packageName,
          packageCode: spec.packageCode,
          fromDate: spec.fromDate,
          toDate: spec.toDate,
          minAmount: spec.minAmount,
          maxAmount: spec.maxAmount,
          remarks: spec.remarks,
          isActive: true,
          createdByAdminId: admin.id,
          branches: { create: sampleBranches.map((b) => ({ branchId: b.id })) },
          items: {
            create: spec.items.map((it, idx) => ({
              categoryId: it.categoryId,
              serviceId: it.serviceId,
              quantity: it.quantity,
              sortOrder: idx,
            })),
          },
        },
      });
    }
    console.log(`  ✓ ${spec.packageCode.padEnd(12)} ${spec.packageName}`);
  }

  // --- Designations (job titles) ---
  // Mirrors the names from the source admin UI screenshot.
  const designations = [
    { name: 'Chat Support Executive', remarks: 'Chat Support Executive' },
    { name: 'Sr Branch Manager', remarks: 'Sr Branch Manager' },
    { name: 'Front desk', remarks: 'Front desk' },
    { name: 'Doctor', remarks: 'Doctor' },
    { name: 'Therapist', remarks: 'Therapist' },
    { name: 'Counsellor', remarks: 'Counsellor' },
    { name: 'Aesthetic Therapist', remarks: 'Aesthetic Therapist' },
    { name: 'Operations Manager', remarks: 'Operations Manager' },
    { name: 'Junior Doctor', remarks: 'Junior Doctor' },
    { name: 'Receptionist', remarks: 'Receptionist' },
  ];

  console.log('\nDesignations:');
  for (const d of designations) {
    const existing = await db.designation.findUnique({ where: { name: d.name } });
    if (existing) {
      await db.designation.update({
        where: { id: existing.id },
        data: { remarks: d.remarks },
      });
    } else {
      await db.designation.create({
        data: {
          name: d.name,
          remarks: d.remarks,
          ipAddress: '216.108.231.117',
          isActive: true,
          createdByAdminId: admin.id,
        },
      });
    }
    console.log(`  ✓ ${d.name}`);
  }

  // --- Departments ---
  const departments = [
    { name: 'Front Desk', remarks: 'Reception & customer-facing roles' },
    { name: 'Clinical', remarks: 'Doctors, therapists, nurses' },
    { name: 'Finance', remarks: 'Accounting & billing' },
    { name: 'Marketing', remarks: 'Brand, digital & outreach' },
    { name: 'HR', remarks: 'People operations' },
    { name: 'Operations', remarks: 'Branch operations & logistics' },
    { name: 'Customer Support', remarks: 'Phone, chat and ticketing' },
    { name: 'Inventory', remarks: 'Stock & purchasing' },
    { name: 'Pharmacy', remarks: 'Retail pharmacy counter' },
    { name: 'IT', remarks: 'Systems, network and applications' },
  ];

  console.log('\nDepartments:');
  for (const d of departments) {
    const existing = await db.department.findUnique({ where: { name: d.name } });
    if (existing) {
      await db.department.update({
        where: { id: existing.id },
        data: { remarks: d.remarks },
      });
    } else {
      await db.department.create({
        data: {
          name: d.name,
          remarks: d.remarks,
          ipAddress: '216.108.231.117',
          isActive: true,
          createdByAdminId: admin.id,
        },
      });
    }
    console.log(`  ✓ ${d.name}`);
  }

  // --- Employees ---
  // Pull a few master rows and wire up sample employees.
  const designationByName: Record<string, string> = {};
  for (const d of await db.designation.findMany({ select: { id: true, name: true } })) {
    designationByName[d.name] = d.id;
  }
  const departmentByName: Record<string, string> = {};
  for (const d of await db.department.findMany({ select: { id: true, name: true } })) {
    departmentByName[d.name] = d.id;
  }
  const branchByCode: Record<string, string> = {};
  for (const b of await db.branch.findMany({ select: { id: true, code: true } })) {
    branchByCode[b.code] = b.id;
  }

  interface EmployeeSpec {
    name: string;
    employeeCode: string;
    biometricId: string;
    mobileNo: string;
    mobileAlternate?: string;
    email: string;
    gender: 'male' | 'female';
    fatherName: string;
    dob?: Date;
    designationName: string;
    departmentName: string;
    branchCode: string;
    zoneState: string;
    joiningDate?: Date;
    panNo?: string;
    pincode?: string;
    address?: string;
    salaryRupees: number;
    bankName?: string;
    bankAccountNo?: string;
    pf: boolean;
    esi: boolean;
    weeklyOff: string;
    callerType: string;
  }

  const employeeSpecs: EmployeeSpec[] = [
    {
      name: 'Rohit Sharma',
      employeeCode: 'EMP-0001',
      biometricId: 'BIO-1001',
      mobileNo: '+91 98100 10001',
      mobileAlternate: '+91 98100 20001',
      email: 'rohit.sharma@welona.com',
      gender: 'male',
      fatherName: 'Anil Sharma',
      dob: new Date('1986-04-12'),
      designationName: 'Sr Branch Manager',
      departmentName: 'Operations',
      branchCode: 'JH001',
      zoneState: 'Telangana',
      joiningDate: new Date('2020-06-15'),
      panNo: 'ABCPS1234A',
      pincode: '500033',
      address: 'Road No. 36, Jubilee Hills, Hyderabad',
      salaryRupees: 95000,
      bankName: 'HDFC Bank',
      bankAccountNo: '50100123456789',
      pf: true,
      esi: false,
      weeklyOff: 'Sunday',
      callerType: 'None',
    },
    {
      name: 'Priya Kapoor',
      employeeCode: 'EMP-0002',
      biometricId: 'BIO-1002',
      mobileNo: '+91 98100 10002',
      email: 'priya.kapoor@welona.com',
      gender: 'female',
      fatherName: 'Suresh Kapoor',
      dob: new Date('1989-11-03'),
      designationName: 'Doctor',
      departmentName: 'Clinical',
      branchCode: 'BH002',
      zoneState: 'Telangana',
      joiningDate: new Date('2021-02-01'),
      panNo: 'AAAPK4567B',
      pincode: '500034',
      address: 'Road No. 12, Banjara Hills, Hyderabad',
      salaryRupees: 120000,
      bankName: 'ICICI Bank',
      bankAccountNo: '003101567890',
      pf: true,
      esi: false,
      weeklyOff: 'Monday',
      callerType: 'None',
    },
    {
      name: 'Karthik Iyer',
      employeeCode: 'EMP-0003',
      biometricId: 'BIO-1003',
      mobileNo: '+91 98200 10003',
      email: 'karthik.iyer@welona.com',
      gender: 'male',
      fatherName: 'Ramesh Iyer',
      dob: new Date('1992-07-22'),
      designationName: 'Therapist',
      departmentName: 'Clinical',
      branchCode: 'BW003',
      zoneState: 'Maharashtra',
      joiningDate: new Date('2022-09-10'),
      panNo: 'AAFPI7890C',
      pincode: '400050',
      address: 'Linking Road, Bandra West, Mumbai',
      salaryRupees: 45000,
      bankName: 'Axis Bank',
      bankAccountNo: '912010038472',
      pf: true,
      esi: true,
      weeklyOff: 'Tuesday',
      callerType: 'None',
    },
    {
      name: 'Anita Reddy',
      employeeCode: 'EMP-0004',
      biometricId: 'BIO-1004',
      mobileNo: '+91 98300 10004',
      email: 'anita.reddy@welona.com',
      gender: 'female',
      fatherName: 'Vijay Reddy',
      dob: new Date('1995-03-18'),
      designationName: 'Front desk',
      departmentName: 'Front Desk',
      branchCode: 'KR005',
      zoneState: 'Karnataka',
      joiningDate: new Date('2023-04-05'),
      panNo: 'AAGPR3456D',
      pincode: '560034',
      address: '80 Feet Road, Koramangala, Bengaluru',
      salaryRupees: 32000,
      bankName: 'SBI',
      bankAccountNo: '30215678901',
      pf: false,
      esi: true,
      weeklyOff: 'Sunday',
      callerType: 'Tele Caller',
    },
    {
      name: 'Vikram Singh',
      employeeCode: 'EMP-0005',
      biometricId: 'BIO-1005',
      mobileNo: '+91 98111 10005',
      email: 'vikram.singh@welona.com',
      gender: 'male',
      fatherName: 'Pratap Singh',
      dob: new Date('1984-09-30'),
      designationName: 'Operations Manager',
      departmentName: 'Operations',
      branchCode: 'CP007',
      zoneState: 'Delhi',
      joiningDate: new Date('2019-01-20'),
      panNo: 'AAHPS9876E',
      pincode: '110001',
      address: 'Block A, Connaught Place, New Delhi',
      salaryRupees: 85000,
      bankName: 'Kotak Mahindra',
      bankAccountNo: '12345678900',
      pf: true,
      esi: false,
      weeklyOff: 'Sunday',
      callerType: 'None',
    },
    {
      name: 'Meera Joshi',
      employeeCode: 'EMP-0006',
      biometricId: 'BIO-1006',
      mobileNo: '+91 98220 10006',
      email: 'meera.joshi@welona.com',
      gender: 'female',
      fatherName: 'Mahesh Joshi',
      dob: new Date('1990-12-11'),
      designationName: 'Counsellor',
      departmentName: 'Customer Support',
      branchCode: 'PW004',
      zoneState: 'Maharashtra',
      joiningDate: new Date('2021-08-12'),
      panNo: 'AAJPJ1122F',
      pincode: '400076',
      address: 'Hiranandani Gardens, Powai, Mumbai',
      salaryRupees: 48000,
      bankName: 'HDFC Bank',
      bankAccountNo: '50100987654321',
      pf: true,
      esi: true,
      weeklyOff: 'Wednesday',
      callerType: 'Inbound',
    },
    {
      name: 'Arjun Mehta',
      employeeCode: 'EMP-0007',
      biometricId: 'BIO-1007',
      mobileNo: '+91 98445 10007',
      email: 'arjun.mehta@welona.com',
      gender: 'male',
      fatherName: 'Dinesh Mehta',
      dob: new Date('1993-06-04'),
      designationName: 'Aesthetic Therapist',
      departmentName: 'Clinical',
      branchCode: 'IN006',
      zoneState: 'Karnataka',
      joiningDate: new Date('2022-03-18'),
      panNo: 'AAKPM3344G',
      pincode: '560038',
      address: '100 Feet Road, Indiranagar, Bengaluru',
      salaryRupees: 42000,
      bankName: 'Yes Bank',
      bankAccountNo: '0099876543210',
      pf: true,
      esi: true,
      weeklyOff: 'Tuesday',
      callerType: 'None',
    },
    {
      name: 'Sneha Iyer',
      employeeCode: 'EMP-0008',
      biometricId: 'BIO-1008',
      mobileNo: '+91 98445 10008',
      email: 'sneha.iyer@welona.com',
      gender: 'female',
      fatherName: 'Krishna Iyer',
      dob: new Date('1997-02-25'),
      designationName: 'Chat Support Executive',
      departmentName: 'Customer Support',
      branchCode: 'AN008',
      zoneState: 'Tamil Nadu',
      joiningDate: new Date('2023-11-01'),
      panNo: 'AAMPI5566H',
      pincode: '600040',
      address: '2nd Avenue, Anna Nagar, Chennai',
      salaryRupees: 28000,
      bankName: 'IndusInd Bank',
      bankAccountNo: '20019876543210',
      pf: false,
      esi: true,
      weeklyOff: 'Sunday',
      callerType: 'Outbound',
    },
    {
      name: 'Rajesh Kumar',
      employeeCode: 'EMP-0009',
      biometricId: 'BIO-1009',
      mobileNo: '+91 99004 10009',
      email: 'rajesh.kumar@welona.com',
      gender: 'male',
      fatherName: 'Mohan Kumar',
      dob: new Date('1988-05-14'),
      designationName: 'Junior Doctor',
      departmentName: 'Clinical',
      branchCode: 'JH001',
      zoneState: 'Telangana',
      joiningDate: new Date('2023-07-22'),
      panNo: 'AANPK7788J',
      pincode: '500033',
      address: 'Madhapur, Hyderabad',
      salaryRupees: 75000,
      bankName: 'Federal Bank',
      bankAccountNo: '17890123456789',
      pf: true,
      esi: false,
      weeklyOff: 'Thursday',
      callerType: 'None',
    },
    {
      name: 'Divya Rao',
      employeeCode: 'EMP-0010',
      biometricId: 'BIO-1010',
      mobileNo: '+91 99004 10010',
      email: 'divya.rao@welona.com',
      gender: 'female',
      fatherName: 'Lakshmi Rao',
      dob: new Date('1991-10-08'),
      designationName: 'Receptionist',
      departmentName: 'Front Desk',
      branchCode: 'BH002',
      zoneState: 'Telangana',
      joiningDate: new Date('2024-01-10'),
      panNo: 'AAPPR9900K',
      pincode: '500034',
      address: 'Road No. 1, Banjara Hills, Hyderabad',
      salaryRupees: 26000,
      bankName: 'Canara Bank',
      bankAccountNo: '11203456789012',
      pf: false,
      esi: true,
      weeklyOff: 'Saturday',
      callerType: 'Inbound',
    },
  ];

  console.log('\nEmployees:');
  let employeesAdded = 0;
  for (const spec of employeeSpecs) {
    const designationId = designationByName[spec.designationName] ?? null;
    const departmentId = departmentByName[spec.departmentName] ?? null;
    const branchId = branchByCode[spec.branchCode] ?? null;
    const zoneId = zoneIdByState[spec.zoneState] ?? null;

    const existing = await db.employee.findUnique({
      where: { employeeCode: spec.employeeCode },
    });
    if (existing) {
      await db.employee.update({
        where: { id: existing.id },
        data: {
          name: spec.name,
          biometricId: spec.biometricId,
          mobileNo: spec.mobileNo,
          mobileAlternate: spec.mobileAlternate ?? null,
          email: spec.email,
          gender: spec.gender,
          fatherName: spec.fatherName,
          dob: spec.dob ?? null,
          panNo: spec.panNo ?? null,
          pincode: spec.pincode ?? null,
          address: spec.address ?? null,
          designationId,
          departmentId,
          branchId,
          zoneId,
          joiningDate: spec.joiningDate ?? new Date('2024-01-15'),
          salary: spec.salaryRupees * 100,
          bankName: spec.bankName ?? null,
          bankAccountNo: spec.bankAccountNo ?? null,
          pf: spec.pf,
          esi: spec.esi,
          weeklyOff: spec.weeklyOff,
          callerType: spec.callerType,
        },
      });
    } else {
      await db.employee.create({
        data: {
          name: spec.name,
          biometricId: spec.biometricId,
          mobileNo: spec.mobileNo,
          mobileAlternate: spec.mobileAlternate ?? null,
          email: spec.email,
          gender: spec.gender,
          fatherName: spec.fatherName,
          dob: spec.dob ?? null,
          panNo: spec.panNo ?? null,
          pincode: spec.pincode ?? null,
          address: spec.address ?? null,
          employeeCode: spec.employeeCode,
          joiningDate: spec.joiningDate ?? new Date('2024-01-15'),
          designationId,
          departmentId,
          branchId,
          zoneId,
          salary: spec.salaryRupees * 100,
          bankName: spec.bankName ?? null,
          bankAccountNo: spec.bankAccountNo ?? null,
          pf: spec.pf,
          esi: spec.esi,
          weeklyOff: spec.weeklyOff,
          callerType: spec.callerType,
          ipAddress: '216.108.231.117',
          isActive: true,
          createdByAdminId: admin.id,
        },
      });
    }
    employeesAdded += 1;
    console.log(`  ✓ ${spec.employeeCode.padEnd(9)} ${spec.name}`);
  }

  // ---------------------------------------------------------------------
  //  Cancellation showcase data (4 sub-modules)
  // ---------------------------------------------------------------------
  const branchByCodeForCancel: Record<string, string> = {};
  for (const b of await db.branch.findMany({ select: { id: true, code: true } })) {
    branchByCodeForCancel[b.code] = b.id;
  }

  // --- Cancellation customers ---
  const cancelCustomers: Array<{
    name: string;
    mobileNo: string;
    gender: 'male' | 'female';
    email: string | null;
  }> = [
    { name: 'Rohan Kapoor', mobileNo: '+91 98100 11111', gender: 'male', email: 'rohan.kapoor@example.com' },
    { name: 'Anita Desai', mobileNo: '+91 98200 33333', gender: 'female', email: 'anita.desai@example.com' },
    { name: 'Sahil Khanna', mobileNo: '+91 98111 60002', gender: 'male', email: 'sahil.k@example.com' },
    { name: 'Meera Joshi', mobileNo: '+91 98111 60001', gender: 'female', email: 'meera.j@example.com' },
    { name: 'Vikram Singh', mobileNo: '+91 99000 55555', gender: 'male', email: null },
    { name: 'Deepak Menon', mobileNo: '+91 98200 60005', gender: 'male', email: 'deepak.m@example.com' },
    { name: 'Pooja Sharma', mobileNo: '+91 98112 70010', gender: 'female', email: 'pooja.s@example.com' },
    { name: 'Aarav Mehta', mobileNo: '+91 98112 70011', gender: 'male', email: 'aarav.m@example.com' },
  ];
  console.log('\nCancellation customers:');
  for (const c of cancelCustomers) {
    const existing = await db.cancellationCustomer.findFirst({
      where: { mobileNo: c.mobileNo },
    });
    if (existing) {
      await db.cancellationCustomer.update({
        where: { id: existing.id },
        data: { name: c.name, gender: c.gender, email: c.email },
      });
    } else {
      await db.cancellationCustomer.create({
        data: {
          name: c.name,
          mobileNo: c.mobileNo,
          gender: c.gender,
          email: c.email,
          ipAddress: '216.108.231.117',
          isActive: true,
          createdByAdminId: admin.id,
        },
      });
    }
    console.log(`  ✓ ${c.name}`);
  }

  // --- Package cancellations ---
  const packageCancellations: Array<{
    branchCode: string;
    customerName: string;
    packageNo: string;
    amountRupees: number;
    remarks: string;
    requestedDate: Date;
  }> = [
    { branchCode: 'JH001', customerName: 'Rohan Kapoor', packageNo: 'PKG-2023-001', amountRupees: 25000, remarks: 'Customer relocating', requestedDate: new Date('2025-12-10') },
    { branchCode: 'BH002', customerName: 'Anita Desai', packageNo: 'PKG-2024-014', amountRupees: 15000, remarks: 'Health issues', requestedDate: new Date('2026-01-05') },
    { branchCode: 'BW003', customerName: 'Sahil Khanna', packageNo: 'PKG-2024-021', amountRupees: 32000, remarks: 'Unsatisfied with results', requestedDate: new Date('2026-02-18') },
    { branchCode: 'KR005', customerName: 'Meera Joshi', packageNo: 'PKG-2024-033', amountRupees: 8500, remarks: 'Service mismatch', requestedDate: new Date('2026-03-02') },
    { branchCode: 'IN006', customerName: 'Vikram Singh', packageNo: 'PKG-2025-007', amountRupees: 12000, remarks: 'Duplicate booking', requestedDate: new Date('2026-04-15') },
    { branchCode: 'CP007', customerName: 'Pooja Sharma', packageNo: 'PKG-2025-029', amountRupees: 45000, remarks: 'Refund requested by customer', requestedDate: new Date('2026-05-08') },
    { branchCode: 'AN008', customerName: 'Aarav Mehta', packageNo: 'PKG-2025-051', amountRupees: 18500, remarks: 'Therapist not available', requestedDate: new Date('2026-05-16') },
  ];
  console.log('\nPackage cancellations:');
  for (const p of packageCancellations) {
    const branchId = branchByCodeForCancel[p.branchCode] ?? null;
    const existing = await db.packageCancellation.findFirst({
      where: { packageNo: p.packageNo },
    });
    if (existing) {
      await db.packageCancellation.update({
        where: { id: existing.id },
        data: {
          branchId,
          customerName: p.customerName,
          amount: p.amountRupees * 100,
          remarks: p.remarks,
          requestedDate: p.requestedDate,
        },
      });
    } else {
      await db.packageCancellation.create({
        data: {
          branchId,
          customerName: p.customerName,
          packageNo: p.packageNo,
          amount: p.amountRupees * 100,
          remarks: p.remarks,
          requestedDate: p.requestedDate,
          ipAddress: '216.108.231.117',
          isActive: true,
          createdByAdminId: admin.id,
        },
      });
    }
    console.log(`  ✓ ${p.packageNo.padEnd(14)} ${p.customerName}`);
  }

  // --- Receipt cancellations ---
  const receiptCancellations: Array<{
    branchCode: string;
    customerName: string;
    packageNo: string | null;
    receiptNo: string;
    paidAmountRupees: number;
    remarks: string;
    requestDate: Date;
  }> = [
    { branchCode: 'JH001', customerName: 'Rohan Kapoor', packageNo: 'PKG-2023-001', receiptNo: 'RCP-001234', paidAmountRupees: 25000, remarks: 'Full refund processed', requestDate: new Date('2025-12-12') },
    { branchCode: 'BH002', customerName: 'Anita Desai', packageNo: 'PKG-2024-014', receiptNo: 'RCP-001456', paidAmountRupees: 7500, remarks: 'Partial refund', requestDate: new Date('2026-01-08') },
    { branchCode: 'BW003', customerName: 'Sahil Khanna', packageNo: null, receiptNo: 'RCP-002001', paidAmountRupees: 5000, remarks: 'Walk-in payment refunded', requestDate: new Date('2026-02-20') },
    { branchCode: 'KR005', customerName: 'Meera Joshi', packageNo: 'PKG-2024-033', receiptNo: 'RCP-002145', paidAmountRupees: 8500, remarks: 'Service cancelled by branch', requestDate: new Date('2026-03-05') },
    { branchCode: 'PW004', customerName: 'Deepak Menon', packageNo: null, receiptNo: 'RCP-002300', paidAmountRupees: 3500, remarks: 'Duplicate receipt issued', requestDate: new Date('2026-03-22') },
    { branchCode: 'CP007', customerName: 'Pooja Sharma', packageNo: 'PKG-2025-029', receiptNo: 'RCP-002567', paidAmountRupees: 22500, remarks: 'Half-refund approved', requestDate: new Date('2026-05-09') },
  ];
  console.log('\nReceipt cancellations:');
  for (const r of receiptCancellations) {
    const branchId = branchByCodeForCancel[r.branchCode] ?? null;
    const existing = await db.receiptCancellation.findFirst({
      where: { receiptNo: r.receiptNo },
    });
    if (existing) {
      await db.receiptCancellation.update({
        where: { id: existing.id },
        data: {
          branchId,
          customerName: r.customerName,
          packageNo: r.packageNo,
          paidAmount: r.paidAmountRupees * 100,
          remarks: r.remarks,
          requestDate: r.requestDate,
        },
      });
    } else {
      await db.receiptCancellation.create({
        data: {
          branchId,
          customerName: r.customerName,
          packageNo: r.packageNo,
          receiptNo: r.receiptNo,
          paidAmount: r.paidAmountRupees * 100,
          remarks: r.remarks,
          requestDate: r.requestDate,
          ipAddress: '216.108.231.117',
          isActive: true,
          createdByAdminId: admin.id,
        },
      });
    }
    console.log(`  ✓ ${r.receiptNo.padEnd(12)} ${r.customerName}`);
  }

  // --- Voucher cancellations ---
  const voucherCancellations: Array<{
    branchCode: string;
    expenseType: string;
    amountRupees: number;
    remarks: string;
    cancelReason: string;
    requestDate: Date;
  }> = [
    { branchCode: 'JH001', expenseType: 'Rent', amountRupees: 45000, remarks: 'Rent voucher VCH-1001', cancelReason: 'Wrong amount entered', requestDate: new Date('2026-01-15') },
    { branchCode: 'BH002', expenseType: 'Salaries', amountRupees: 120000, remarks: 'Salary voucher VCH-1052', cancelReason: 'Duplicate entry', requestDate: new Date('2026-02-04') },
    { branchCode: 'BW003', expenseType: 'Utilities', amountRupees: 8500, remarks: 'Electricity bill VCH-1078', cancelReason: 'Wrong branch', requestDate: new Date('2026-02-22') },
    { branchCode: 'KR005', expenseType: 'Office Supplies', amountRupees: 3200, remarks: 'Stationery VCH-1095', cancelReason: 'Cancelled order', requestDate: new Date('2026-03-10') },
    { branchCode: 'CP007', expenseType: 'Marketing', amountRupees: 27500, remarks: 'Campaign VCH-1120', cancelReason: 'Campaign postponed', requestDate: new Date('2026-04-18') },
    { branchCode: 'AN008', expenseType: 'Travel', amountRupees: 6800, remarks: 'Travel VCH-1145', cancelReason: 'Wrong vendor', requestDate: new Date('2026-05-12') },
    { branchCode: 'IN006', expenseType: 'Maintenance', amountRupees: 15000, remarks: 'AC service VCH-1160', cancelReason: 'Service not delivered', requestDate: new Date('2026-05-18') },
  ];
  console.log('\nVoucher cancellations:');
  for (const v of voucherCancellations) {
    const branchId = branchByCodeForCancel[v.branchCode] ?? null;
    const existing = await db.voucherCancellation.findFirst({
      where: { branchId, expenseType: v.expenseType, remarks: v.remarks },
    });
    if (existing) {
      await db.voucherCancellation.update({
        where: { id: existing.id },
        data: {
          amount: v.amountRupees * 100,
          cancelReason: v.cancelReason,
          requestDate: v.requestDate,
        },
      });
    } else {
      await db.voucherCancellation.create({
        data: {
          branchId,
          expenseType: v.expenseType,
          amount: v.amountRupees * 100,
          remarks: v.remarks,
          cancelReason: v.cancelReason,
          requestDate: v.requestDate,
          ipAddress: '216.108.231.117',
          isActive: true,
          createdByAdminId: admin.id,
        },
      });
    }
    console.log(`  ✓ ${v.expenseType.padEnd(16)} ${v.branchCode}`);
  }

  console.log(
    `\nDone. ${zones.length} zones, ${branches.length} branches, ` +
      `${categories.length} categories, ${services.length} services, ` +
      `${ledgers.length} ledgers, ${paymodes.length} payment modes, ` +
      `${taxes.length} taxes, ${medias.length} media channels, ` +
      `${offerSpecs.length} marketing offers, ` +
      `${designations.length} designations, ` +
      `${departments.length} departments, ` +
      `${employeesAdded} employees, ` +
      `${cancelCustomers.length} cancel customers, ` +
      `${packageCancellations.length} package cancellations, ` +
      `${receiptCancellations.length} receipt cancellations, ` +
      `${voucherCancellations.length} voucher cancellations.`,
  );
}

main()
  .catch((e) => {
    console.error('Showcase seed failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
