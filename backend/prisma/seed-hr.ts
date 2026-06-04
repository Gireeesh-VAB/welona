/**
 * HR demo seed — populates every sub-module of the Phase 1 HR area with
 * realistic, idempotent data.
 *
 * Run with: `npm run db:seed-hr`
 *
 * Idempotent — each upsert uses a stable natural key (`name`, `code`,
 * `employeeCode`, `userName`, or composite uniques), so running the seed
 * twice produces the same set of rows with refreshed timestamps. Existing
 * data is preserved.
 *
 * Populates / tops up:
 *   - Departments   : 11 (existing ones from showcase + Finance, HR, Marketing, IT, Wellness)
 *   - Designations  : 16 (existing + Sr Doctor, Wellness Coach, Marketing Manager…)
 *   - Employees     : +15 fresh employees (EMP-0011 … EMP-0025) across all branches
 *   - System users  : one login per new employee
 *   - Leave types   : 5 (CL / SL / EL / CO / ML)
 *   - Holidays      : 14 Indian holidays for the current calendar year
 *   - Leave balances: every active employee × every leave type
 *   - Attendance    : last 30 days per employee (weekday mix, weekends mostly off)
 *   - Leave apps    : 25 sample applications, 50/30/15/5 pending/approved/rejected/cancelled
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const DEFAULT_USER_PASSWORD = 'welona@123';
const ATTENDANCE_DAYS = 30;
const LEAVE_APP_COUNT = 25;

// ---------- helpers ---------------------------------------------------------

function utcDay(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function shiftDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function pick<T>(items: T[], r: () => number): T {
  return items[Math.floor(r() * items.length)];
}

// ---------- master data -----------------------------------------------------

const extraDepartments = [
  { name: 'Finance',    remarks: 'Accounts, AP/AR, payroll inputs' },
  { name: 'HR',         remarks: 'Recruiting, employee lifecycle, payroll' },
  { name: 'Marketing',  remarks: 'Brand, digital, content, campaigns' },
  { name: 'IT',         remarks: 'Infrastructure, helpdesk, admin tools' },
  { name: 'Wellness',   remarks: 'Nutrition, lifestyle and wellness programmes' },
];

const extraDesignations = [
  { name: 'Senior Doctor',         remarks: 'Lead clinician across multiple branches' },
  { name: 'Wellness Coach',        remarks: 'Lifestyle and nutrition advisory' },
  { name: 'Marketing Manager',     remarks: 'Owns campaigns, content and brand' },
  { name: 'Accountant',            remarks: 'Day-to-day book-keeping' },
  { name: 'IT Support',            remarks: 'Branch helpdesk and devices' },
  { name: 'HR Executive',          remarks: 'HR ops, onboarding, attendance' },
];

const leaveTypes = [
  { name: 'Casual Leave',    code: 'CL', daysPerYear: 12,  paid: true,
    description: 'For personal errands and short notice off-days.' },
  { name: 'Sick Leave',      code: 'SL', daysPerYear: 10,  paid: true,
    description: 'For illness — a medical certificate may be requested after 2 days.' },
  { name: 'Earned Leave',    code: 'EL', daysPerYear: 18,  paid: true,
    description: 'Privilege / annual leave, accrues monthly.' },
  { name: 'Comp-Off',        code: 'CO', daysPerYear: 6,   paid: true,
    description: 'Compensatory off granted for working on a holiday.' },
  { name: 'Maternity Leave', code: 'ML', daysPerYear: 182, paid: true,
    description: 'As per the Maternity Benefit (Amendment) Act, 2017.' },
];

function indianHolidaysFor(year: number) {
  return [
    { date: utcDay(year, 1, 1),   name: "New Year's Day",          type: 'optional' as const },
    { date: utcDay(year, 1, 14),  name: 'Sankranti / Pongal',      type: 'regional' as const, region: 'South India' },
    { date: utcDay(year, 1, 26),  name: 'Republic Day',            type: 'public'   as const },
    { date: utcDay(year, 3, 8),   name: 'Holi',                    type: 'public'   as const },
    { date: utcDay(year, 4, 14),  name: 'Dr. Ambedkar Jayanti',    type: 'public'   as const },
    { date: utcDay(year, 5, 1),   name: 'Labour Day',              type: 'public'   as const },
    { date: utcDay(year, 8, 15),  name: 'Independence Day',        type: 'public'   as const },
    { date: utcDay(year, 8, 19),  name: 'Raksha Bandhan',          type: 'optional' as const },
    { date: utcDay(year, 9, 5),   name: "Teacher's Day",           type: 'optional' as const },
    { date: utcDay(year, 10, 2),  name: 'Gandhi Jayanti',          type: 'public'   as const },
    { date: utcDay(year, 10, 24), name: 'Dussehra',                type: 'public'   as const },
    { date: utcDay(year, 11, 12), name: 'Diwali',                  type: 'public'   as const },
    { date: utcDay(year, 11, 20), name: 'Telangana Formation Day', type: 'regional' as const, region: 'Telangana' },
    { date: utcDay(year, 12, 25), name: 'Christmas',               type: 'public'   as const },
  ];
}

// ---------- new employees (EMP-0011 … EMP-0025) -----------------------------

interface NewEmployee {
  name: string;
  employeeCode: string;
  biometricId: string;
  mobileNo: string;
  email: string;
  fatherName?: string;
  gender: 'male' | 'female' | 'other';
  dob: Date;
  designation: string;
  department: string;
  branchCode: string;
  joiningDate: Date;
  salaryRupees: number;
  panNo?: string;
  pincode?: string;
  address?: string;
  bankName?: string;
  bankAccountNo?: string;
  pf: boolean;
  esi: boolean;
  weeklyOff: string;
  userName: string;
}

const newEmployees: NewEmployee[] = [
  {
    name: 'Aarti Deshmukh', employeeCode: 'EMP-0011', biometricId: 'BIO-1011',
    mobileNo: '+91 98200 10011', email: 'aarti.deshmukh@welona.com',
    fatherName: 'Mahesh Deshmukh', gender: 'female', dob: new Date('1990-02-18'),
    designation: 'Senior Doctor', department: 'Clinical', branchCode: 'PW004',
    joiningDate: new Date('2019-04-22'), salaryRupees: 140000,
    panNo: 'AAHPD2233E', pincode: '400076', address: 'Powai, Mumbai',
    bankName: 'HDFC Bank', bankAccountNo: '50100345678901', pf: true, esi: false,
    weeklyOff: 'Sunday', userName: 'aarti.deshmukh',
  },
  {
    name: 'Vikas Nair', employeeCode: 'EMP-0012', biometricId: 'BIO-1012',
    mobileNo: '+91 98765 10012', email: 'vikas.nair@welona.com',
    fatherName: 'Krishnan Nair', gender: 'male', dob: new Date('1988-09-04'),
    designation: 'Marketing Manager', department: 'Marketing', branchCode: 'JH001',
    joiningDate: new Date('2021-07-01'), salaryRupees: 90000,
    panNo: 'AAFPN4567F', pincode: '500033', address: 'Jubilee Hills, Hyderabad',
    bankName: 'Axis Bank', bankAccountNo: '912010056789', pf: true, esi: false,
    weeklyOff: 'Sunday', userName: 'vikas.nair',
  },
  {
    name: 'Sanjana Pillai', employeeCode: 'EMP-0013', biometricId: 'BIO-1013',
    mobileNo: '+91 99001 10013', email: 'sanjana.pillai@welona.com',
    fatherName: 'Mohan Pillai', gender: 'female', dob: new Date('1995-12-30'),
    designation: 'Wellness Coach', department: 'Wellness', branchCode: 'BW003',
    joiningDate: new Date('2023-01-09'), salaryRupees: 55000,
    panNo: 'AAGPP9988G', pincode: '400050', address: 'Bandra West, Mumbai',
    bankName: 'SBI', bankAccountNo: '30012345678', pf: true, esi: true,
    weeklyOff: 'Monday', userName: 'sanjana.pillai',
  },
  {
    name: 'Imran Khan', employeeCode: 'EMP-0014', biometricId: 'BIO-1014',
    mobileNo: '+91 98300 10014', email: 'imran.khan@welona.com',
    fatherName: 'Salim Khan', gender: 'male', dob: new Date('1993-06-11'),
    designation: 'Accountant', department: 'Finance', branchCode: 'BH002',
    joiningDate: new Date('2022-03-15'), salaryRupees: 48000,
    panNo: 'AAGPK6677H', pincode: '500034', address: 'Banjara Hills, Hyderabad',
    bankName: 'ICICI Bank', bankAccountNo: '003112345678', pf: true, esi: true,
    weeklyOff: 'Sunday', userName: 'imran.khan',
  },
  {
    name: 'Ritu Agarwal', employeeCode: 'EMP-0015', biometricId: 'BIO-1015',
    mobileNo: '+91 98400 10015', email: 'ritu.agarwal@welona.com',
    fatherName: 'Naresh Agarwal', gender: 'female', dob: new Date('1991-08-25'),
    designation: 'HR Executive', department: 'HR', branchCode: 'JH001',
    joiningDate: new Date('2022-11-01'), salaryRupees: 52000,
    panNo: 'AAIPA1199J', pincode: '500033', address: 'Jubilee Hills, Hyderabad',
    bankName: 'HDFC Bank', bankAccountNo: '50100876543210', pf: true, esi: true,
    weeklyOff: 'Sunday', userName: 'ritu.agarwal',
  },
  {
    name: 'Suresh Patel', employeeCode: 'EMP-0016', biometricId: 'BIO-1016',
    mobileNo: '+91 98500 10016', email: 'suresh.patel@welona.com',
    fatherName: 'Bhavin Patel', gender: 'male', dob: new Date('1985-01-14'),
    designation: 'IT Support', department: 'IT', branchCode: 'BW003',
    joiningDate: new Date('2018-06-19'), salaryRupees: 60000,
    panNo: 'AAFPP3344K', pincode: '400050', address: 'Bandra West, Mumbai',
    bankName: 'Kotak Bank', bankAccountNo: '7711223344', pf: true, esi: false,
    weeklyOff: 'Saturday', userName: 'suresh.patel',
  },
  {
    name: 'Anjali Verma', employeeCode: 'EMP-0017', biometricId: 'BIO-1017',
    mobileNo: '+91 98600 10017', email: 'anjali.verma@welona.com',
    fatherName: 'Mukesh Verma', gender: 'female', dob: new Date('1994-04-09'),
    designation: 'Counsellor', department: 'Customer Support', branchCode: 'KR005',
    joiningDate: new Date('2023-08-21'), salaryRupees: 38000,
    panNo: 'AAJPV2211L', pincode: '560034', address: 'Koramangala, Bengaluru',
    bankName: 'IDFC First', bankAccountNo: '88800011223', pf: true, esi: true,
    weeklyOff: 'Sunday', userName: 'anjali.verma',
  },
  {
    name: 'Mohit Bansal', employeeCode: 'EMP-0018', biometricId: 'BIO-1018',
    mobileNo: '+91 98700 10018', email: 'mohit.bansal@welona.com',
    fatherName: 'Pradeep Bansal', gender: 'male', dob: new Date('1989-10-27'),
    designation: 'Operations Manager', department: 'Operations', branchCode: 'CP007',
    joiningDate: new Date('2020-12-01'), salaryRupees: 88000,
    panNo: 'AAEPB4422M', pincode: '110001', address: 'Connaught Place, New Delhi',
    bankName: 'HDFC Bank', bankAccountNo: '50100999887766', pf: true, esi: false,
    weeklyOff: 'Sunday', userName: 'mohit.bansal',
  },
  {
    name: 'Pooja Menon', employeeCode: 'EMP-0019', biometricId: 'BIO-1019',
    mobileNo: '+91 98800 10019', email: 'pooja.menon@welona.com',
    fatherName: 'Suresh Menon', gender: 'female', dob: new Date('1996-03-17'),
    designation: 'Aesthetic Therapist', department: 'Clinical', branchCode: 'AN008',
    joiningDate: new Date('2024-02-12'), salaryRupees: 42000,
    panNo: 'AAFPM5566N', pincode: '600020', address: 'Anna Nagar, Chennai',
    bankName: 'SBI', bankAccountNo: '30087654321', pf: true, esi: true,
    weeklyOff: 'Monday', userName: 'pooja.menon',
  },
  {
    name: 'Rakesh Yadav', employeeCode: 'EMP-0020', biometricId: 'BIO-1020',
    mobileNo: '+91 98900 10020', email: 'rakesh.yadav@welona.com',
    fatherName: 'Shyam Yadav', gender: 'male', dob: new Date('1987-07-30'),
    designation: 'Therapist', department: 'Clinical', branchCode: 'IN006',
    joiningDate: new Date('2019-09-23'), salaryRupees: 47000,
    panNo: 'AAGPY7788P', pincode: '500081', address: 'Indiranagar, Bengaluru',
    bankName: 'Axis Bank', bankAccountNo: '912010998877', pf: true, esi: false,
    weeklyOff: 'Sunday', userName: 'rakesh.yadav',
  },
  {
    name: 'Lakshmi Rao', employeeCode: 'EMP-0021', biometricId: 'BIO-1021',
    mobileNo: '+91 99100 10021', email: 'lakshmi.rao@welona.com',
    fatherName: 'Venkat Rao', gender: 'female', dob: new Date('1992-05-06'),
    designation: 'Doctor', department: 'Clinical', branchCode: 'JH001',
    joiningDate: new Date('2021-11-18'), salaryRupees: 115000,
    panNo: 'AAFPR8899Q', pincode: '500033', address: 'Jubilee Hills, Hyderabad',
    bankName: 'HDFC Bank', bankAccountNo: '50100445566778', pf: true, esi: false,
    weeklyOff: 'Sunday', userName: 'lakshmi.rao',
  },
  {
    name: 'Amit Saxena', employeeCode: 'EMP-0022', biometricId: 'BIO-1022',
    mobileNo: '+91 99200 10022', email: 'amit.saxena@welona.com',
    fatherName: 'Brij Saxena', gender: 'male', dob: new Date('1990-12-19'),
    designation: 'Chat Support Executive', department: 'Customer Support',
    branchCode: 'CP007', joiningDate: new Date('2022-05-30'), salaryRupees: 32000,
    panNo: 'AAGPS9911R', pincode: '110001', address: 'Connaught Place, New Delhi',
    bankName: 'Yes Bank', bankAccountNo: '4400112233', pf: true, esi: true,
    weeklyOff: 'Sunday', userName: 'amit.saxena',
  },
  {
    name: 'Neha Choudhary', employeeCode: 'EMP-0023', biometricId: 'BIO-1023',
    mobileNo: '+91 99300 10023', email: 'neha.choudhary@welona.com',
    fatherName: 'Rajesh Choudhary', gender: 'female', dob: new Date('1997-09-23'),
    designation: 'Front desk', department: 'Front Desk', branchCode: 'BW003',
    joiningDate: new Date('2024-06-04'), salaryRupees: 28000,
    panNo: 'AAFPC2244S', pincode: '400050', address: 'Bandra West, Mumbai',
    bankName: 'ICICI Bank', bankAccountNo: '003198765432', pf: true, esi: true,
    weeklyOff: 'Monday', userName: 'neha.choudhary',
  },
  {
    name: 'Harish Gupta', employeeCode: 'EMP-0024', biometricId: 'BIO-1024',
    mobileNo: '+91 99400 10024', email: 'harish.gupta@welona.com',
    fatherName: 'Kamal Gupta', gender: 'male', dob: new Date('1986-11-08'),
    designation: 'Senior Doctor', department: 'Clinical', branchCode: 'KR005',
    joiningDate: new Date('2019-01-14'), salaryRupees: 145000,
    panNo: 'AAFPG3322T', pincode: '560034', address: 'Koramangala, Bengaluru',
    bankName: 'HDFC Bank', bankAccountNo: '50100123987456', pf: true, esi: false,
    weeklyOff: 'Sunday', userName: 'harish.gupta',
  },
  {
    name: 'Sunita Bose', employeeCode: 'EMP-0025', biometricId: 'BIO-1025',
    mobileNo: '+91 99500 10025', email: 'sunita.bose@welona.com',
    fatherName: 'Anil Bose', gender: 'female', dob: new Date('1993-02-02'),
    designation: 'Junior Doctor', department: 'Clinical', branchCode: 'AN008',
    joiningDate: new Date('2023-04-17'), salaryRupees: 68000,
    panNo: 'AAGPB4455V', pincode: '600020', address: 'Anna Nagar, Chennai',
    bankName: 'SBI', bankAccountNo: '30055443322', pf: true, esi: true,
    weeklyOff: 'Monday', userName: 'sunita.bose',
  },
];

// ---------- attendance + applications generation ---------------------------

const presenceWeights: Array<[string, number]> = [
  ['present', 70],
  ['wfh', 10],
  ['half_day', 6],
  ['leave', 8],
  ['absent', 6],
];

function weightedPick(r: () => number): string {
  const total = presenceWeights.reduce((s, [, w]) => s + w, 0);
  let n = r() * total;
  for (const [k, w] of presenceWeights) {
    n -= w;
    if (n <= 0) return k;
  }
  return 'present';
}

const sampleReasons = [
  'Personal work',
  'Family function',
  'Medical appointment',
  'Travel — out of city',
  'Festival leave',
  'Childcare',
  'Annual vacation',
  'Wedding in family',
  'House shifting',
  'Parents visiting',
];

// ---------- main ------------------------------------------------------------

async function main() {
  console.log('[hr-seed] Starting …');

  const admin = await db.adminUser.findFirst();
  if (!admin) {
    console.error('[hr-seed] No AdminUser found. Run the base admin seed first.');
    process.exit(1);
  }

  // ---- Departments ----
  for (const d of extraDepartments) {
    await db.department.upsert({
      where: { name: d.name },
      update: { remarks: d.remarks, isActive: true },
      create: {
        name: d.name,
        remarks: d.remarks,
        isActive: true,
        createdByAdminId: admin.id,
      },
    });
  }
  console.log(`[hr-seed] Departments topped up (+${extraDepartments.length})`);

  // ---- Designations ----
  for (const d of extraDesignations) {
    await db.designation.upsert({
      where: { name: d.name },
      update: { remarks: d.remarks, isActive: true },
      create: {
        name: d.name,
        remarks: d.remarks,
        isActive: true,
        createdByAdminId: admin.id,
      },
    });
  }
  console.log(`[hr-seed] Designations topped up (+${extraDesignations.length})`);

  // ---- Employees + System Users ----
  const passwordHash = await bcrypt.hash(DEFAULT_USER_PASSWORD, 10);
  let employeesAdded = 0;
  let usersAdded = 0;
  for (const e of newEmployees) {
    const [designation, department, branch] = await Promise.all([
      db.designation.findUnique({ where: { name: e.designation } }),
      db.department.findUnique({ where: { name: e.department } }),
      db.branch.findFirst({ where: { code: e.branchCode } }),
    ]);
    if (!designation || !department || !branch) {
      console.warn(
        `  ! Skipping ${e.employeeCode} — missing master ` +
          `(designation:${!!designation}, department:${!!department}, branch:${!!branch})`,
      );
      continue;
    }

    const emp = await db.employee.upsert({
      where: { employeeCode: e.employeeCode },
      update: {
        name: e.name,
        biometricId: e.biometricId,
        mobileNo: e.mobileNo,
        email: e.email,
        fatherName: e.fatherName ?? null,
        gender: e.gender,
        dob: e.dob,
        designationId: designation.id,
        departmentId: department.id,
        branchId: branch.id,
        zoneId: branch.zoneId,
        joiningDate: e.joiningDate,
        salary: e.salaryRupees * 100,
        panNo: e.panNo ?? null,
        pincode: e.pincode ?? null,
        address: e.address ?? null,
        bankName: e.bankName ?? null,
        bankAccountNo: e.bankAccountNo ?? null,
        pf: e.pf,
        esi: e.esi,
        weeklyOff: e.weeklyOff,
        isActive: true,
      },
      create: {
        name: e.name,
        employeeCode: e.employeeCode,
        biometricId: e.biometricId,
        mobileNo: e.mobileNo,
        email: e.email,
        fatherName: e.fatherName,
        gender: e.gender,
        dob: e.dob,
        designationId: designation.id,
        departmentId: department.id,
        branchId: branch.id,
        zoneId: branch.zoneId,
        joiningDate: e.joiningDate,
        salary: e.salaryRupees * 100,
        panNo: e.panNo,
        pincode: e.pincode,
        address: e.address,
        bankName: e.bankName,
        bankAccountNo: e.bankAccountNo,
        pf: e.pf,
        esi: e.esi,
        weeklyOff: e.weeklyOff,
        isActive: true,
        createdByAdminId: admin.id,
      },
    });
    employeesAdded += 1;

    await db.systemUser.upsert({
      where: { userName: e.userName },
      update: {
        email: e.email,
        employeeId: emp.id,
        branchId: branch.id,
        isActive: true,
      },
      create: {
        userName: e.userName,
        passwordHash,
        email: e.email,
        employeeId: emp.id,
        branchId: branch.id,
        isActive: true,
        createdByAdminId: admin.id,
      },
    });
    usersAdded += 1;
  }
  console.log(
    `[hr-seed] Employees synced: ${employeesAdded} · System users synced: ${usersAdded}`,
  );

  // ---- Leave Types ----
  for (const lt of leaveTypes) {
    await db.leaveType.upsert({
      where: { name: lt.name },
      update: {
        code: lt.code,
        daysPerYear: lt.daysPerYear,
        paid: lt.paid,
        description: lt.description,
        isActive: true,
      },
      create: { ...lt, isActive: true, createdByAdminId: admin.id },
    });
  }
  const allTypes = await db.leaveType.findMany({ where: { isActive: true } });
  console.log(`[hr-seed] Leave types: ${allTypes.length}`);

  // ---- Holidays ----
  const year = new Date().getUTCFullYear();
  const holidays = indianHolidaysFor(year);
  for (const h of holidays) {
    await db.holiday.upsert({
      where: { date_name: { date: h.date, name: h.name } },
      update: {
        type: h.type,
        region: 'region' in h ? h.region : null,
        isActive: true,
      },
      create: {
        date: h.date,
        name: h.name,
        type: h.type,
        region: 'region' in h ? h.region : null,
        isActive: true,
        createdByAdminId: admin.id,
      },
    });
  }
  console.log(`[hr-seed] Holidays for ${year}: ${holidays.length}`);

  // ---- Employees + Leave balances ----
  const employees = await db.employee.findMany({ where: { isActive: true } });
  if (employees.length === 0) {
    console.warn('[hr-seed] No active employees — skipping balances / attendance / apps.');
    return;
  }
  console.log(`[hr-seed] Active employees: ${employees.length}`);

  let balancesWritten = 0;
  for (const emp of employees) {
    for (const t of allTypes) {
      await db.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: emp.id,
            leaveTypeId: t.id,
            year,
          },
        },
        update: {},
        create: {
          employeeId: emp.id,
          leaveTypeId: t.id,
          year,
          allocated: t.daysPerYear,
          used: 0,
        },
      });
      balancesWritten += 1;
    }
  }
  console.log(`[hr-seed] Leave balances: ${balancesWritten}`);

  // ---- Attendance (last 30 days) ----
  const today = todayUtc();
  const r = rng(12345);
  let attendanceWritten = 0;
  for (let dayOffset = -ATTENDANCE_DAYS; dayOffset <= 0; dayOffset++) {
    const day = shiftDays(today, dayOffset);
    const dow = day.getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    for (const emp of employees) {
      // 95% of weekdays marked, 15% of weekends (catch-up shifts)
      if (r() > (isWeekend ? 0.15 : 0.95)) continue;
      const status = isWeekend ? 'present' : weightedPick(r);
      await db.attendance.upsert({
        where: { employeeId_date: { employeeId: emp.id, date: day } },
        update: { status, markedByAdminId: admin.id },
        create: {
          employeeId: emp.id,
          date: day,
          status,
          markedByAdminId: admin.id,
        },
      });
      attendanceWritten += 1;
    }
  }
  console.log(`[hr-seed] Attendance rows: ${attendanceWritten}`);

  // ---- Leave Applications (idempotent on (employeeId, fromDate, toDate, leaveTypeId)) ----
  const r2 = rng(98765);
  let applicationsWritten = 0;
  for (let i = 0; i < LEAVE_APP_COUNT; i++) {
    const emp = pick(employees, r2);
    const type = pick(allTypes, r2);
    const days = pick([1, 1, 1, 2, 2, 3, 5, 7], r2);
    const startOffset = pick([-45, -30, -20, -10, -5, -2, 2, 5, 10, 14, 21, 30], r2);
    const fromDate = shiftDays(today, startOffset);
    const toDate = shiftDays(fromDate, days - 1);
    const reason = pick(sampleReasons, r2);

    const roll = r2();
    const status: 'pending' | 'approved' | 'rejected' | 'cancelled' =
      roll < 0.5 ? 'pending'
        : roll < 0.8 ? 'approved'
        : roll < 0.95 ? 'rejected'
        : 'cancelled';

    const existing = await db.leaveApplication.findFirst({
      where: { employeeId: emp.id, fromDate, toDate, leaveTypeId: type.id },
    });
    if (existing) continue;

    await db.leaveApplication.create({
      data: {
        employeeId: emp.id,
        leaveTypeId: type.id,
        fromDate,
        toDate,
        days,
        reason,
        status,
        approverNote:
          status === 'approved' ? 'Approved — enjoy.'
            : status === 'rejected' ? 'Cannot approve — staffing constraint.'
            : null,
        approvedByAdminId: status === 'approved' || status === 'rejected' ? admin.id : null,
        approvedAt: status === 'approved' || status === 'rejected' ? new Date() : null,
        appliedByAdminId: admin.id,
      },
    });

    if (status === 'approved') {
      const yearKey = fromDate.getUTCFullYear();
      const balance = await db.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: emp.id,
            leaveTypeId: type.id,
            year: yearKey,
          },
        },
      });
      if (balance) {
        await db.leaveBalance.update({
          where: { id: balance.id },
          data: { used: balance.used + days },
        });
      }
      for (let d = 0; d < days; d++) {
        const cellDate = shiftDays(fromDate, d);
        await db.attendance.upsert({
          where: { employeeId_date: { employeeId: emp.id, date: cellDate } },
          update: { status: 'leave', remarks: reason, markedByAdminId: admin.id },
          create: {
            employeeId: emp.id,
            date: cellDate,
            status: 'leave',
            remarks: reason,
            markedByAdminId: admin.id,
          },
        });
      }
    }
    applicationsWritten += 1;
  }
  console.log(`[hr-seed] Leave applications added this run: ${applicationsWritten}`);

  console.log('[hr-seed] Done.');
}

main()
  .catch((err) => {
    console.error('[hr-seed] Failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
