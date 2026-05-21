/**
 * Dummy data for the Admin → Change Pay Mode screen.
 *
 * Each row is a receipt whose payment-mode entry can be corrected (e.g. a
 * front-desk clerk picked "Cash" when the customer actually paid via UPI).
 * The page lets an admin pick the right pay mode, capture a reason, and
 * append an audit entry to the change log.
 */

export const PAY_MODES = [
  'Cash',
  'Credit Cards',
  'Debit Cards',
  'UPI',
  'Office Scan',
  'Cheque',
  'Net Banking',
  'Bajaj',
  'Ez Finanz',
  'SaveIn',
  'Shopse',
  'Fibe',
] as const;
export type PayMode = (typeof PAY_MODES)[number];

export interface PaymodeReceipt {
  key: string;
  receiptNo: string;
  packageNo: string;
  receiptDate: string;          // ISO yyyy-mm-dd
  customerName: string;
  mobileNumber: string;
  branchName: string;
  treatment: string;            // shown as a colored tag (Skin / LASER / Hair / Wellness / Hair Transplantation)
  category: string;             // matches seeded category list
  paidAmount: number;           // paise
  currentPayMode: PayMode;
  recordedBy: string;
}

export interface PaymodeChangeLogEntry {
  key: string;
  changedAt: string;            // ISO timestamp
  receiptNo: string;
  customerName: string;
  fromPayMode: PayMode;
  toPayMode: PayMode;
  reason: string;
  changedBy: string;
}

const r = (rupees: number) => rupees * 100;

export const PAYMODE_RECEIPTS: PaymodeReceipt[] = [
  { key: 'PMR-0001', receiptNo: 'RCP-0010234', packageNo: '#Hair Services HSR-37', receiptDate: '2026-05-21', customerName: 'Harsh Vardhan',  mobileNumber: '+91 98112 70011', branchName: 'Jubilee Hills',   treatment: 'Hair Services',       category: 'Hair Care',     paidAmount: r(14286), currentPayMode: 'Office Scan', recordedBy: 'Anita Reddy' },
  { key: 'PMR-0002', receiptNo: 'RCP-0010235', packageNo: '#LASER VZWD-46',        receiptDate: '2026-05-21', customerName: 'Rahimunnisa MD', mobileNumber: '+91 98100 10002', branchName: 'Banjara Hills',   treatment: 'LASER',                category: 'LASER',         paidAmount: r(44762), currentPayMode: 'Bajaj',       recordedBy: 'Divya Rao' },
  { key: 'PMR-0003', receiptNo: 'RCP-0010236', packageNo: '#Hair Transplantation VZG-22', receiptDate: '2026-05-21', customerName: 'Praveen Kumar', mobileNumber: '+91 98200 10003', branchName: 'Bandra West',     treatment: 'Hair Transplantation', category: 'Hair Care',     paidAmount: r(9524),  currentPayMode: 'Office Scan', recordedBy: 'Karthik Iyer' },
  { key: 'PMR-0004', receiptNo: 'RCP-0010237', packageNo: '#Hair Services INDR-55', receiptDate: '2026-05-21', customerName: 'Prabhu K',       mobileNumber: '+91 98300 10004', branchName: 'Indiranagar',     treatment: 'Hair Services',       category: 'Hair Care',     paidAmount: r(6667),  currentPayMode: 'Office Scan', recordedBy: 'Arjun Mehta' },
  { key: 'PMR-0005', receiptNo: 'RCP-0010238', packageNo: '#LASER BJH-50',          receiptDate: '2026-05-20', customerName: 'Kalyani',        mobileNumber: '+91 98111 10005', branchName: 'Banjara Hills',   treatment: 'LASER',                category: 'LASER',         paidAmount: r(4762),  currentPayMode: 'Cash',        recordedBy: 'Divya Rao' },
  { key: 'PMR-0006', receiptNo: 'RCP-0010239', packageNo: '#LASER BJH-49',          receiptDate: '2026-05-20', customerName: 'Sasirekha',      mobileNumber: '+91 98220 10006', branchName: 'Banjara Hills',   treatment: 'LASER',                category: 'LASER',         paidAmount: r(33333), currentPayMode: 'Ez Finanz',   recordedBy: 'Divya Rao' },
  { key: 'PMR-0007', receiptNo: 'RCP-0010240', packageNo: '#LASER BJH-49',          receiptDate: '2026-05-20', customerName: 'Sasirekha',      mobileNumber: '+91 98220 10006', branchName: 'Banjara Hills',   treatment: 'LASER',                category: 'LASER',         paidAmount: r(28571), currentPayMode: 'Ez Finanz',   recordedBy: 'Divya Rao' },
  { key: 'PMR-0008', receiptNo: 'RCP-0010241', packageNo: '#Skin Services TRPT-24',  receiptDate: '2026-05-20', customerName: 'Meghana',        mobileNumber: '+91 98445 10007', branchName: 'Powai',           treatment: 'Skin Services',       category: 'Skin Services', paidAmount: r(3810),  currentPayMode: 'Credit Cards',recordedBy: 'Meera Joshi' },
  { key: 'PMR-0009', receiptNo: 'RCP-0010242', packageNo: '#Hair Services TRPT-17',  receiptDate: '2026-05-19', customerName: 'Giri',           mobileNumber: '+91 98445 10008', branchName: 'Powai',           treatment: 'Hair Services',       category: 'Hair Care',     paidAmount: r(16190), currentPayMode: 'Office Scan', recordedBy: 'Meera Joshi' },
  { key: 'PMR-0010', receiptNo: 'RCP-0010243', packageNo: '#LASER DSNR-51',          receiptDate: '2026-05-19', customerName: 'Sreelatha',      mobileNumber: '+91 99004 10009', branchName: 'Connaught Place', treatment: 'LASER',                category: 'LASER',         paidAmount: r(3810),  currentPayMode: 'Office Scan', recordedBy: 'Vikram Singh' },
  { key: 'PMR-0011', receiptNo: 'RCP-0010244', packageNo: '#LASER KKD-25',           receiptDate: '2026-05-19', customerName: 'Madhavi',        mobileNumber: '+91 99004 10010', branchName: 'Koramangala',     treatment: 'LASER',                category: 'LASER',         paidAmount: r(4762),  currentPayMode: 'Cash',        recordedBy: 'Anita Reddy' },
  { key: 'PMR-0012', receiptNo: 'RCP-0010245', packageNo: '#Hair Services DSNR-58',  receiptDate: '2026-05-19', customerName: 'Dr. Sameer Nandhan', mobileNumber: '+91 98100 11111', branchName: 'Connaught Place', treatment: 'Hair Services',       category: 'Hair Care',     paidAmount: r(11429), currentPayMode: 'Office Scan', recordedBy: 'Vikram Singh' },
  { key: 'PMR-0013', receiptNo: 'RCP-0010246', packageNo: '#LASER DSNR-50',          receiptDate: '2026-05-18', customerName: 'Shaheen',        mobileNumber: '+91 98200 33333', branchName: 'Connaught Place', treatment: 'LASER',                category: 'LASER',         paidAmount: r(952),   currentPayMode: 'Cash',        recordedBy: 'Vikram Singh' },
  { key: 'PMR-0014', receiptNo: 'RCP-0010247', packageNo: '#Skin Services BNJ-71',   receiptDate: '2026-05-18', customerName: 'Neha Bansal',    mobileNumber: '+91 99220 44444', branchName: 'Banjara Hills',   treatment: 'Skin Services',       category: 'Skin Services', paidAmount: r(8500),  currentPayMode: 'UPI',         recordedBy: 'Divya Rao' },
  { key: 'PMR-0015', receiptNo: 'RCP-0010248', packageNo: '#Wellness JH-12',         receiptDate: '2026-05-18', customerName: 'Karan Malhotra', mobileNumber: '+91 90008 77788', branchName: 'Jubilee Hills',   treatment: 'Wellness',             category: 'Wellness',      paidAmount: r(45000), currentPayMode: 'Net Banking', recordedBy: 'Rohit Sharma' },
  { key: 'PMR-0016', receiptNo: 'RCP-0010249', packageNo: '#Hair Services ANR-09',   receiptDate: '2026-05-17', customerName: 'Rahul Verma',    mobileNumber: '+91 99550 11122', branchName: 'Anna Nagar',      treatment: 'Hair Services',       category: 'Hair Care',     paidAmount: r(7200),  currentPayMode: 'Cheque',      recordedBy: 'Sneha Iyer' },
  { key: 'PMR-0017', receiptNo: 'RCP-0010250', packageNo: '#LASER POW-33',           receiptDate: '2026-05-17', customerName: 'Manish Gupta',   mobileNumber: '+91 90110 33344', branchName: 'Powai',           treatment: 'LASER',                category: 'LASER',         paidAmount: r(22000), currentPayMode: 'Shopse',      recordedBy: 'Meera Joshi' },
  { key: 'PMR-0018', receiptNo: 'RCP-0010251', packageNo: '#Skin Services JH-08',    receiptDate: '2026-05-17', customerName: 'Ishita Nair',    mobileNumber: '+91 90880 22233', branchName: 'Jubilee Hills',   treatment: 'Skin Services',       category: 'Skin Services', paidAmount: r(5400),  currentPayMode: 'SaveIn',      recordedBy: 'Anita Reddy' },
  { key: 'PMR-0019', receiptNo: 'RCP-0010252', packageNo: '#Hair Services BNR-12',   receiptDate: '2026-05-16', customerName: 'Aarav Mehta',    mobileNumber: '+91 98112 70011', branchName: 'Bandra West',     treatment: 'Hair Services',       category: 'Hair Care',     paidAmount: r(18500), currentPayMode: 'Fibe',        recordedBy: 'Karthik Iyer' },
  { key: 'PMR-0020', receiptNo: 'RCP-0010253', packageNo: '#LASER KOR-17',           receiptDate: '2026-05-16', customerName: 'Pooja Sharma',   mobileNumber: '+91 98112 70010', branchName: 'Koramangala',     treatment: 'LASER',                category: 'LASER',         paidAmount: r(12500), currentPayMode: 'Cash',        recordedBy: 'Anita Reddy' },
];

export const PAYMODE_CHANGE_LOG: PaymodeChangeLogEntry[] = [
  {
    key: 'PML-0001', changedAt: '2026-05-21T11:42:00',
    receiptNo: 'RCP-0010228', customerName: 'Rohan Kapoor',
    fromPayMode: 'Cash', toPayMode: 'UPI',
    reason: 'Customer paid via UPI; cashier entered cash by mistake.',
    changedBy: 'Welona Super Admin',
  },
  {
    key: 'PML-0002', changedAt: '2026-05-21T10:15:00',
    receiptNo: 'RCP-0010225', customerName: 'Anita Desai',
    fromPayMode: 'Credit Cards', toPayMode: 'Debit Cards',
    reason: 'POS receipt confirms debit-card transaction.',
    changedBy: 'Welona Super Admin',
  },
  {
    key: 'PML-0003', changedAt: '2026-05-20T16:30:00',
    receiptNo: 'RCP-0010219', customerName: 'Sahil Khanna',
    fromPayMode: 'Office Scan', toPayMode: 'Net Banking',
    reason: 'Reconciliation correction during EOD close.',
    changedBy: 'Welona Super Admin',
  },
  {
    key: 'PML-0004', changedAt: '2026-05-20T11:08:00',
    receiptNo: 'RCP-0010216', customerName: 'Deepak Menon',
    fromPayMode: 'Bajaj', toPayMode: 'Ez Finanz',
    reason: 'Finance partner switched; updated to correct lender.',
    changedBy: 'Welona Super Admin',
  },
  {
    key: 'PML-0005', changedAt: '2026-05-19T18:55:00',
    receiptNo: 'RCP-0010211', customerName: 'Tanvi Shah',
    fromPayMode: 'Cash', toPayMode: 'UPI',
    reason: 'Customer disputed cash entry; UPI receipt verified.',
    changedBy: 'Welona Super Admin',
  },
];
