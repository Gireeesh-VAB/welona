/**
 * Dummy data for the Admin → Reports → Cash → Expense Report screen.
 *
 * Branch-level operating expenses recorded through the voucher entry module.
 * Status reflects whether the voucher was approved, is still pending, or
 * was rejected by the manager.
 */

export type ExpenseStatus = 'Approved' | 'Pending' | 'Rejected';
export type PaidVia = 'Cash' | 'Bank Transfer' | 'Credit Card' | 'Cheque' | 'UPI';

export interface ExpenseRow {
  key: string;
  expenseDate: string;          // ISO yyyy-mm-dd
  branchName: string;
  expenseType: string;
  description: string;
  voucherNo: string;
  amount: number;               // paise
  paidVia: PaidVia;
  recordedBy: string;
  status: ExpenseStatus;
}

const r = (rupees: number) => rupees * 100;

export const EXPENSE_ROWS: ExpenseRow[] = [
  { key: 'EX-0001', expenseDate: '2026-05-21', branchName: 'Jubilee Hills',   expenseType: 'Rent',             description: 'May rent — Jubilee Hills clinic',           voucherNo: 'VCH-2026-0451', amount: r(85000),  paidVia: 'Bank Transfer', recordedBy: 'Rohit Sharma',  status: 'Approved' },
  { key: 'EX-0002', expenseDate: '2026-05-21', branchName: 'Banjara Hills',   expenseType: 'Electricity',      description: 'Electricity bill — May',                    voucherNo: 'VCH-2026-0452', amount: r(12500),  paidVia: 'UPI',           recordedBy: 'Divya Rao',     status: 'Approved' },
  { key: 'EX-0003', expenseDate: '2026-05-21', branchName: 'Bandra West',    expenseType: 'Consumables',      description: 'Cotton, gloves & disinfectants restock',    voucherNo: 'VCH-2026-0453', amount: r(8400),   paidVia: 'Cash',          recordedBy: 'Karthik Iyer',  status: 'Approved' },
  { key: 'EX-0004', expenseDate: '2026-05-20', branchName: 'Powai',          expenseType: 'Maintenance',      description: 'AC service contract — quarterly',           voucherNo: 'VCH-2026-0445', amount: r(15000),  paidVia: 'Cheque',        recordedBy: 'Meera Joshi',   status: 'Approved' },
  { key: 'EX-0005', expenseDate: '2026-05-20', branchName: 'Koramangala',    expenseType: 'Marketing',        description: 'Instagram ad campaign — Week 3',            voucherNo: 'VCH-2026-0446', amount: r(28000),  paidVia: 'Credit Card',   recordedBy: 'Anita Reddy',   status: 'Approved' },
  { key: 'EX-0006', expenseDate: '2026-05-20', branchName: 'Indiranagar',    expenseType: 'Office Supplies',  description: 'Printer ink + stationery',                  voucherNo: 'VCH-2026-0447', amount: r(3200),   paidVia: 'Cash',          recordedBy: 'Arjun Mehta',   status: 'Approved' },
  { key: 'EX-0007', expenseDate: '2026-05-19', branchName: 'Connaught Place', expenseType: 'Travel',          description: 'Vendor visit — equipment',                  voucherNo: 'VCH-2026-0438', amount: r(6800),   paidVia: 'Cash',          recordedBy: 'Vikram Singh',  status: 'Approved' },
  { key: 'EX-0008', expenseDate: '2026-05-19', branchName: 'Anna Nagar',     expenseType: 'Internet',        description: 'Monthly broadband',                          voucherNo: 'VCH-2026-0439', amount: r(2400),   paidVia: 'UPI',           recordedBy: 'Sneha Iyer',    status: 'Approved' },
  { key: 'EX-0009', expenseDate: '2026-05-19', branchName: 'Jubilee Hills',  expenseType: 'Salaries',        description: 'May salary — Rohit Sharma',                  voucherNo: 'VCH-2026-0440', amount: r(95000),  paidVia: 'Bank Transfer', recordedBy: 'HR Office',     status: 'Approved' },
  { key: 'EX-0010', expenseDate: '2026-05-18', branchName: 'Banjara Hills',  expenseType: 'Consumables',     description: 'Skin peel solution refill',                  voucherNo: 'VCH-2026-0432', amount: r(11500),  paidVia: 'Bank Transfer', recordedBy: 'Divya Rao',     status: 'Approved' },
  { key: 'EX-0011', expenseDate: '2026-05-18', branchName: 'Powai',          expenseType: 'Marketing',       description: 'Hoarding rental — Hiranandani',              voucherNo: 'VCH-2026-0433', amount: r(45000),  paidVia: 'Bank Transfer', recordedBy: 'Meera Joshi',   status: 'Pending' },
  { key: 'EX-0012', expenseDate: '2026-05-18', branchName: 'Koramangala',    expenseType: 'Maintenance',     description: 'Laser machine annual service',               voucherNo: 'VCH-2026-0434', amount: r(35000),  paidVia: 'Bank Transfer', recordedBy: 'Anita Reddy',   status: 'Approved' },
  { key: 'EX-0013', expenseDate: '2026-05-17', branchName: 'Bandra West',    expenseType: 'Rent',            description: 'May rent — Bandra branch',                   voucherNo: 'VCH-2026-0421', amount: r(125000), paidVia: 'Bank Transfer', recordedBy: 'Karthik Iyer',  status: 'Approved' },
  { key: 'EX-0014', expenseDate: '2026-05-17', branchName: 'Indiranagar',    expenseType: 'Travel',          description: 'Therapist training travel',                  voucherNo: 'VCH-2026-0422', amount: r(7500),   paidVia: 'Cash',          recordedBy: 'Arjun Mehta',   status: 'Approved' },
  { key: 'EX-0015', expenseDate: '2026-05-16', branchName: 'Connaught Place', expenseType: 'Salaries',       description: 'May salary — Vikram Singh',                  voucherNo: 'VCH-2026-0410', amount: r(85000),  paidVia: 'Bank Transfer', recordedBy: 'HR Office',     status: 'Approved' },
  { key: 'EX-0016', expenseDate: '2026-05-16', branchName: 'Anna Nagar',     expenseType: 'Office Supplies', description: 'New chairs for waiting area (×4)',           voucherNo: 'VCH-2026-0411', amount: r(18000),  paidVia: 'Credit Card',   recordedBy: 'Sneha Iyer',    status: 'Pending' },
  { key: 'EX-0017', expenseDate: '2026-05-15', branchName: 'Jubilee Hills',  expenseType: 'Marketing',       description: 'Google Ads — Hyderabad campaign',            voucherNo: 'VCH-2026-0398', amount: r(22000),  paidVia: 'Credit Card',   recordedBy: 'Rohit Sharma',  status: 'Approved' },
  { key: 'EX-0018', expenseDate: '2026-05-15', branchName: 'Banjara Hills',  expenseType: 'Electricity',     description: 'DG fuel refill',                             voucherNo: 'VCH-2026-0399', amount: r(4500),   paidVia: 'Cash',          recordedBy: 'Divya Rao',     status: 'Approved' },
  { key: 'EX-0019', expenseDate: '2026-05-14', branchName: 'Powai',          expenseType: 'Consumables',     description: 'PRP kits — bulk',                            voucherNo: 'VCH-2026-0385', amount: r(38500),  paidVia: 'Bank Transfer', recordedBy: 'Meera Joshi',   status: 'Approved' },
  { key: 'EX-0020', expenseDate: '2026-05-14', branchName: 'Bandra West',    expenseType: 'Maintenance',     description: 'Plumbing repair — basin leak',               voucherNo: 'VCH-2026-0386', amount: r(2800),   paidVia: 'Cash',          recordedBy: 'Karthik Iyer',  status: 'Approved' },
  { key: 'EX-0021', expenseDate: '2026-05-13', branchName: 'Koramangala',    expenseType: 'Internet',        description: 'Monthly broadband — Koramangala',            voucherNo: 'VCH-2026-0370', amount: r(2200),   paidVia: 'UPI',           recordedBy: 'Anita Reddy',   status: 'Approved' },
  { key: 'EX-0022', expenseDate: '2026-05-13', branchName: 'Indiranagar',    expenseType: 'Marketing',       description: 'Pamphlet print — 5,000 copies',              voucherNo: 'VCH-2026-0371', amount: r(8500),   paidVia: 'Cash',          recordedBy: 'Arjun Mehta',   status: 'Rejected' },
  { key: 'EX-0023', expenseDate: '2026-05-12', branchName: 'Connaught Place', expenseType: 'Office Supplies', description: 'Reception desk refurbish',                  voucherNo: 'VCH-2026-0355', amount: r(32000),  paidVia: 'Credit Card',   recordedBy: 'Vikram Singh',  status: 'Pending' },
  { key: 'EX-0024', expenseDate: '2026-05-12', branchName: 'Anna Nagar',     expenseType: 'Travel',          description: 'Doctor travel — Chennai → Hyderabad',         voucherNo: 'VCH-2026-0356', amount: r(12500),  paidVia: 'Bank Transfer', recordedBy: 'Sneha Iyer',    status: 'Approved' },
  { key: 'EX-0025', expenseDate: '2026-05-12', branchName: 'Jubilee Hills',  expenseType: 'Consumables',     description: 'Sterilisation autoclave consumables',         voucherNo: 'VCH-2026-0357', amount: r(5200),   paidVia: 'Cash',          recordedBy: 'Rohit Sharma',  status: 'Approved' },
];
