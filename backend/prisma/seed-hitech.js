const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const db = new PrismaClient();

const BRANCH_ID = 'cmqetfx4o000c9yxsgmphpzoo';
const ORG_ID    = 'cmpaya5cw0000ne84ix4eg0mx';
const ADMIN_ID  = 'cmpdlsrhq0000ge6h4z8scr0j';

const ROLES = {
  branch_manager: 'cmqalk9970005rvc48j5gq414',
  receptionist:   'cmqalk99j0007rvc4lxbrvewf',
  therapist:      'cmqalk99q0009rvc4jm7r9vb2',
};

const ALL_CATEGORIES = [
  'cmpdr5p5o000plkjl9ksi03mq', // Skin Services
  'cmpdr5p5u000rlkjlkmf6p25p', // Products
  'cmpdr5p61000tlkjlqiuk3l6g', // LASER
  'cmpdr5p6c000vlkjluqtkfme9', // Hair Care
  'cmpdr5p6i000xlkjlcy4vuwtk', // Wellness
];

const ALL_SERVICES = [
  { id: 'cmpdr5p6r000zlkjlj9amrp04', name: 'TCA Peel',                         price: 350000 },
  { id: 'cmpdr5p6y0011lkjla6aq5aa9', name: 'Under-Eye Peel',                    price: 250000 },
  { id: 'cmpdr5p750013lkjlo228zndq', name: 'Pumpkin Peel',                       price: 200000 },
  { id: 'cmpdr5p7b0015lkjlqwsliegg', name: 'Minor Skin Surgery',                 price: 800000 },
  { id: 'cmpdr5p7j0017lkjljdwi33x4', name: 'FCI T-Shampoo Anti Dandruff',        price: 55000  },
  { id: 'cmpdr5p7r0019lkjlwlk4ptwl', name: 'Cerascape Face Cleanser',            price: 75000  },
  { id: 'cmpdr5p89001dlkjliv1fo3la', name: 'Multivitamins & Multiminerals',       price: 60000  },
  { id: 'cmpdr5p8f001flkjlqiffwndv', name: 'Hair Care Strip',                    price: 15000  },
  { id: 'cmpdr5p8m001hlkjlt5z386m8', name: 'Laser - Half Legs',                  price: 450000 },
  { id: 'cmpdr5p8t001jlkjl6ifgaiet', name: 'Laser - Full Legs',                  price: 750000 },
  { id: 'cmpdr5p92001llkjlzqcjqpoh', name: 'Laser - Upper Lip',                  price: 100000 },
  { id: 'cmpdr5p9b001nlkjlf31sjtf6', name: 'Trichology Consultation',            price: 100000 },
  { id: 'cmpdr5p9j001plkjl6d15svx9', name: 'PRP Hair Therapy (single session)',  price: 600000 },
  { id: 'cmpdr5p9p001rlkjloc98upbw', name: 'Wellness Membership (Annual)',       price: 2000000},
  { id: 'cmpggrpbo0006dfa8hhzxsaxv', name: 'TAC',                                price: 150000 },
  { id: 'cmq9c6kl10005800m56y0ivu6', name: 'Hair Spa Treatment',                 price: 180000 },
  { id: 'cmq9c6knc0007800mjhdngohh', name: 'Scalp Deep Cleansing',               price: 150000 },
];

const ALL_PRODUCTS = [
  { id: 'cmpgtjr1g0007rzgggh9p8jd8', name: 'Anti-Dandruff Shampoo 200ml',    price: 45000  },
  { id: 'cmpgtjr1t0009rzggehfu0318', name: 'Hair-Fall Defence Shampoo 200ml', price: 48000  },
  { id: 'cmpgtjr22000brzggpn411hl3', name: 'Repair Conditioner 200ml',        price: 42000  },
  { id: 'cmpgtjr2b000drzgg6nx1d508', name: 'Onion Hair Oil 100ml',            price: 35000  },
  { id: 'cmpgtjr2k000frzgggif7iymg', name: 'Hair Growth Serum 30ml',          price: 89000  },
  { id: 'cmpgtjr2r000hrzggo54989v1', name: 'Vitamin C Face Wash 100ml',       price: 38000  },
  { id: 'cmpgtjr2y000jrzggef70zd8m', name: 'Acne-Control Face Wash 100ml',   price: 36000  },
  { id: 'cmpgtjr36000lrzgg5095nng2', name: 'Niacinamide 10% Serum 30ml',     price: 69900  },
  { id: 'cmpgtjr3d000nrzgg8l23opk1', name: 'Vitamin C 20% Serum 30ml',       price: 79900  },
  { id: 'cmpgtjr3k000przggzecxh4z0', name: 'Hyaluronic Acid Serum 30ml',     price: 74900  },
  { id: 'cmpgtjr3q000rrzggzx0tm2tx', name: 'Daily Moisturizer SPF 30 50ml',  price: 55000  },
  { id: 'cmpgtjr3w000trzggu7dodgt9', name: 'Mineral Sunscreen SPF 50 60ml',  price: 65000  },
  { id: 'cmpgtjr43000vrzggld2mit54', name: 'Biotin 5000mcg (60 tabs)',        price: 75000  },
  { id: 'cmpgtjr4e000xrzggr4apk8w4', name: 'Multivitamin Daily (60 tabs)',   price: 69900  },
  { id: 'cmpgtjr4l000zrzggq2j3z6nf', name: 'Omega-3 Fish Oil (60 caps)',     price: 89900  },
  { id: 'cmpgtjr4t0011rzggxfg7c8b0', name: 'Whey Protein Vanilla 1kg',       price: 199900 },
  { id: 'cmpgtjr4z0013rzgggh9trv0q', name: 'Collagen Powder (250g)',          price: 149900 },
  { id: 'cmpgtjr550015rzgg4kw3x63c', name: 'Wide-Tooth Wooden Comb',         price: 25000  },
  { id: 'cmpgtjr5c0017rzggai4y5fs2', name: 'Microfibre Hair Towel',          price: 39900  },
  { id: 'cmpgtjr5j0019rzggtuptisyu', name: 'Silk Pillowcase',                 price: 89900  },
  { id: 'cmpgtjr5s001brzgg5m9wjr0y', name: 'LED Face Massager',              price: 149900 },
  { id: 'cmpgtjr5x001drzggm021bkd5', name: 'Jade Face Roller',               price: 69900  },
  { id: 'cmpm8k37g0007llqn5fub3uxg', name: 'Rose Hydration Toner 200ml',     price: 55000  },
  { id: 'cmpm8k3810009llqnod4ol4j3', name: 'Clay Detox Face Mask 100g',      price: 49900  },
  { id: 'cmpm8k38b000bllqneut6xpl3', name: 'Argan Hair Mask 200g',           price: 59900  },
  { id: 'cmpm8k38l000dllqngr9rvell', name: 'Magnesium Glycinate (60 tabs)',   price: 79900  },
  { id: 'cmpm8k38s000fllqnihx8cqo0', name: 'Gua Sha Rose Quartz Stone',      price: 59900  },
];

const PAYMENT_MODES = [
  'cmpdvq1e1001ftrrzufni37zy', // Cash
  'cmpdvq1e6001htrrzinghjnrr', // Credit Card
  'cmpdvq1cs000ztrrzn1pzyenw', // Medscred
  'cmpdvq1cx0011trrzc5uoi9pj', // Fibe
  'cmpdvq1dq001btrrzzwisj8lm', // Cheque
  'cmpdvq1dv001dtrrzkuh3h40j', // Office Scan
];

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const pad = (n, len = 4) => String(n).padStart(len, '0');

async function main() {
  console.log('Seeding Hi-Tech City branch...\n');
  const pwHash = await bcrypt.hash('Welona@123', 10);

  // ── 1. Warehouse ─────────────────────────────────────────────────────────
  console.log('1/9 Warehouse...');
  const warehouse = await db.warehouse.create({
    data: {
      branchId: BRANCH_ID,
      name: 'Main',
      code: 'HI-WH-001',
      isDefault: true,
      isActive: true,
      createdByAdminId: ADMIN_ID,
    },
  });

  // ── 2. Branch Categories ──────────────────────────────────────────────────
  console.log('2/9 Categories...');
  for (const catId of ALL_CATEGORIES) {
    await db.branchCategory.upsert({
      where: { branchId_categoryId: { branchId: BRANCH_ID, categoryId: catId } },
      update: {},
      create: { branchId: BRANCH_ID, categoryId: catId },
    });
  }

  // ── 3. Branch Payment Modes ───────────────────────────────────────────────
  console.log('3/9 Payment modes...');
  for (const pmId of PAYMENT_MODES) {
    await db.branchPaymentMode.upsert({
      where: { branchId_paymentModeId: { branchId: BRANCH_ID, paymentModeId: pmId } },
      update: {},
      create: { branchId: BRANCH_ID, paymentModeId: pmId },
    });
  }

  // ── 4. Branch Services ────────────────────────────────────────────────────
  console.log('4/9 Services...');
  for (const svc of ALL_SERVICES) {
    await db.branchService.upsert({
      where: { branchId_serviceId: { branchId: BRANCH_ID, serviceId: svc.id } },
      update: {},
      create: { branchId: BRANCH_ID, serviceId: svc.id },
    });
  }

  // ── 5. Branch Products + Inventory Stock ──────────────────────────────────
  console.log('5/9 Products + inventory...');
  const stockQtys = [40,35,30,25,20,45,38,22,18,28,32,24,50,45,40,15,18,60,55,30,20,25,35,28,22,40,30];
  for (let i = 0; i < ALL_PRODUCTS.length; i++) {
    const prod = ALL_PRODUCTS[i];
    await db.branchProduct.upsert({
      where: { branchId_productId: { branchId: BRANCH_ID, productId: prod.id } },
      update: {},
      create: { branchId: BRANCH_ID, productId: prod.id },
    });
    await db.inventoryStock.upsert({
      where: { warehouseId_productId: { warehouseId: warehouse.id, productId: prod.id } },
      update: {},
      create: {
        branchId: BRANCH_ID,
        warehouseId: warehouse.id,
        productId: prod.id,
        quantity: stockQtys[i] ?? 20,
      },
    });
  }

  // ── 6. Employees + Staff ──────────────────────────────────────────────────
  console.log('6/9 Staff & employees...');

  const empManager = await db.employee.create({
    data: {
      name: 'Kavitha Reddy',
      mobileNo: '9876501001',
      employeeCode: 'HI-EMP-001',
      joiningDate: new Date('2024-01-15'),
      gender: 'female',
      email: 'kavitha.reddy@welona.com',
      branchId: BRANCH_ID,
      designationId: 'cmpdzweme001g10dqqvpp0y6m', // Sr Branch Manager
      departmentId: 'cmpe0ozs5001o48fd5cy6h0ne',  // Operations
    },
  });
  const staffManager = await db.staff.create({
    data: {
      orgId: ORG_ID, branchId: BRANCH_ID,
      roleId: ROLES.branch_manager,
      name: 'Kavitha Reddy',
      email: 'kavitha.reddy@welona.com',
      phone: '9876501001',
      passwordHash: pwHash,
      status: 'active',
      twoFactorEnabled: false,
      designation: 'Sr Branch Manager',
      dateOfJoining: new Date('2024-01-15'),
    },
  });

  const empRecep = await db.employee.create({
    data: {
      name: 'Srinivas Rao',
      mobileNo: '9876501002',
      employeeCode: 'HI-EMP-002',
      joiningDate: new Date('2024-02-01'),
      gender: 'male',
      email: 'srinivas.rao@welona.com',
      branchId: BRANCH_ID,
      designationId: 'cmpdzwepy001w10dq8lfyjnhv', // Receptionist
      departmentId: 'cmpe0ozra001e48fdw53mhkr5',  // Front Desk
    },
  });
  const staffRecep = await db.staff.create({
    data: {
      orgId: ORG_ID, branchId: BRANCH_ID,
      roleId: ROLES.receptionist,
      name: 'Srinivas Rao',
      email: 'srinivas.rao@welona.com',
      phone: '9876501002',
      passwordHash: pwHash,
      status: 'active',
      twoFactorEnabled: false,
      designation: 'Front Desk',
      dateOfJoining: new Date('2024-02-01'),
    },
  });

  const empT1 = await db.employee.create({
    data: {
      name: 'Preethi Kumari',
      mobileNo: '9876501003',
      employeeCode: 'HI-EMP-003',
      joiningDate: new Date('2024-03-10'),
      gender: 'female',
      email: 'preethi.kumari@welona.com',
      branchId: BRANCH_ID,
      designationId: 'cmpdzweom001q10dq6fomci7s', // Aesthetic Therapist
      departmentId: 'cmpe0ozrg001g48fd6ywh2yjd',  // Clinical
    },
  });
  const staffT1 = await db.staff.create({
    data: {
      orgId: ORG_ID, branchId: BRANCH_ID,
      roleId: ROLES.therapist,
      name: 'Preethi Kumari',
      email: 'preethi.kumari@welona.com',
      phone: '9876501003',
      passwordHash: pwHash,
      status: 'active',
      twoFactorEnabled: false,
      designation: 'Aesthetic Therapist',
      dateOfJoining: new Date('2024-03-10'),
    },
  });

  const empT2 = await db.employee.create({
    data: {
      name: 'Aakash Sharma',
      mobileNo: '9876501004',
      employeeCode: 'HI-EMP-004',
      joiningDate: new Date('2024-04-05'),
      gender: 'male',
      email: 'aakash.sharma@welona.com',
      branchId: BRANCH_ID,
      designationId: 'cmpdzweom001q10dq6fomci7s', // Aesthetic Therapist
      departmentId: 'cmpe0ozrg001g48fd6ywh2yjd',  // Clinical
    },
  });
  await db.staff.create({
    data: {
      orgId: ORG_ID, branchId: BRANCH_ID,
      roleId: ROLES.therapist,
      name: 'Aakash Sharma',
      email: 'aakash.sharma@welona.com',
      phone: '9876501004',
      passwordHash: pwHash,
      status: 'active',
      twoFactorEnabled: false,
      designation: 'Aesthetic Therapist',
      dateOfJoining: new Date('2024-04-05'),
    },
  });

  // ── 7. Customers ──────────────────────────────────────────────────────────
  console.log('7/9 Customers...');
  const customerRows = [
    { name: 'Ananya Krishnamurthy', phone: '9988001001', email: 'ananya.k@gmail.com',   city: 'Hyderabad',   notes: 'Interested in skin treatments' },
    { name: 'Rohit Nambiar',        phone: '9988001002', email: 'rohit.n@gmail.com',    city: 'Hyderabad'    },
    { name: 'Divya Shetty',         phone: '9988001003', email: 'divya.s@gmail.com',    city: 'Hyderabad',   notes: 'Laser hair removal enquiry' },
    { name: 'Kiran Babu',           phone: '9988001004', email: 'kiran.b@gmail.com',    city: 'Hyderabad'    },
    { name: 'Meghana Rao',          phone: '9988001005', email: 'meghana.r@gmail.com',  city: 'Secunderabad' },
    { name: 'Suresh Goud',          phone: '9988001006', email: 'suresh.g@gmail.com',   city: 'Hyderabad'    },
    { name: 'Lakshmi Prasad',       phone: '9988001007', email: 'lakshmi.p@gmail.com',  city: 'Hyderabad',   notes: 'Regular wellness member' },
    { name: 'Venkatesh Murthy',     phone: '9988001008', email: 'venkatesh.m@gmail.com',city: 'Hyderabad'    },
    { name: 'Pooja Agarwal',        phone: '9988001009', email: 'pooja.a@gmail.com',    city: 'Hyderabad'    },
    { name: 'Rahul Chandra',        phone: '9988001010', email: 'rahul.c@gmail.com',    city: 'Secunderabad' },
    { name: 'Sneha Pillai',         phone: '9988001011', email: 'sneha.p@gmail.com',    city: 'Hyderabad'    },
    { name: 'Arjun Reddy',          phone: '9988001012', email: 'arjun.r@gmail.com',    city: 'Hyderabad'    },
  ];

  const customers = [];
  for (const c of customerRows) {
    const cust = await db.customer.create({
      data: {
        orgId: ORG_ID,
        branchId: BRANCH_ID,
        name: c.name,
        phone: c.phone,
        email: c.email,
        city: c.city,
        notes: c.notes,
        type: 'individual',
        isActive: true,
        createdById: staffRecep.id,
      },
    });
    customers.push(cust);
  }

  // ── 8. Bookings ───────────────────────────────────────────────────────────
  console.log('8/9 Bookings...');
  const bookingSvcs = [
    { name: 'TCA Peel',                        amount: 350000 },
    { name: 'Under-Eye Peel',                   amount: 250000 },
    { name: 'Laser - Upper Lip',                amount: 100000 },
    { name: 'PRP Hair Therapy (single session)',amount: 600000 },
    { name: 'Laser - Half Legs',               amount: 450000 },
    { name: 'Trichology Consultation',         amount: 100000 },
    { name: 'Pumpkin Peel',                    amount: 200000 },
    { name: 'Hair Spa Treatment',              amount: 180000 },
    { name: 'Scalp Deep Cleansing',            amount: 150000 },
    { name: 'Wellness Membership (Annual)',    amount: 2000000},
    { name: 'Minor Skin Surgery',              amount: 800000 },
    { name: 'Laser - Full Legs',               amount: 750000 },
  ];

  let bkCtr = 1;
  for (let i = 0; i < customers.length; i++) {
    const cust = customers[i];
    // 2 to 4 bookings each
    const count = 2 + (i % 3);
    for (let j = 0; j < count; j++) {
      const svc = bookingSvcs[(i * 3 + j) % bookingSvcs.length];
      const ago = 5 + i * 7 + j * 3;
      const completed = ago > 3;
      await db.booking.create({
        data: {
          orgId: ORG_ID,
          branchId: BRANCH_ID,
          number: `HI-BK-${pad(bkCtr++)}`,
          customerId: cust.id,
          serviceName: svc.name,
          scheduledAt: daysAgo(ago),
          status: completed ? 'completed' : 'scheduled',
          totalAmount: svc.amount,
          discount: 0,
          roundOff: 0,
          netAmount: svc.amount,
          paidAmount: completed ? svc.amount : 0,
          consultantStaffId: j % 2 === 0 ? empT1.id : empT2.id,
          createdById: staffRecep.id,
          items: {
            create: [{
              category: 'Service',
              service: svc.name,
              quantity: 1,
              amount: svc.amount,
              lineTotal: svc.amount,
            }],
          },
        },
      });
    }
  }

  // ── 9. Sales Orders ───────────────────────────────────────────────────────
  console.log('9/9 Sales orders...');
  const orderItems = [
    { prod: ALL_PRODUCTS[0],  qty: 2 },
    { prod: ALL_PRODUCTS[5],  qty: 1 },
    { prod: ALL_PRODUCTS[7],  qty: 1 },
    { prod: ALL_PRODUCTS[11], qty: 2 },
    { prod: ALL_PRODUCTS[12], qty: 1 },
    { prod: ALL_PRODUCTS[13], qty: 2 },
    { prod: ALL_PRODUCTS[4],  qty: 1 },
    { prod: ALL_PRODUCTS[9],  qty: 1 },
  ];

  let soCtr = 1;
  for (let i = 0; i < orderItems.length && i < customers.length; i++) {
    const { prod, qty } = orderItems[i];
    const subtotal = prod.price * qty;
    const taxAmt   = Math.round(subtotal * 0.18);
    const total    = subtotal + taxAmt;
    await db.salesOrder.create({
      data: {
        orgId: ORG_ID,
        branchId: BRANCH_ID,
        number: `HI-SO-${pad(soCtr++)}`,
        customerId: customers[i].id,
        ownerStaffId: staffRecep.id,
        status: 'confirmed',
        paymentStatus: 'paid',
        subtotal,
        discountAmt: 0,
        taxAmt,
        total,
        currency: 'INR',
        orderedAt: daysAgo(10 + i * 5),
        items: {
          create: [{
            productId: prod.id,
            description: prod.name,
            quantity: qty,
            unitPrice: prod.price,
            discountAmt: 0,
            taxRate: 1800,
            lineTotal: total,
          }],
        },
      },
    });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\nDone! Hi-Tech City seeded:');
  console.log('  Warehouse:      1 (Main)');
  console.log('  Categories:    ', ALL_CATEGORIES.length);
  console.log('  Payment modes: ', PAYMENT_MODES.length);
  console.log('  Services:      ', ALL_SERVICES.length);
  console.log('  Products:      ', ALL_PRODUCTS.length, '(with inventory)');
  console.log('  Staff:          4 (Branch Manager, Receptionist, 2 Therapists)');
  console.log('  Customers:     ', customers.length);
  console.log('  Bookings:      ', bkCtr - 1);
  console.log('  Sales orders:  ', soCtr - 1);
  console.log('\nAll staff password: Welona@123');
}

main()
  .catch((e) => { console.error(e.message ?? e); process.exit(1); })
  .finally(() => db.$disconnect());
