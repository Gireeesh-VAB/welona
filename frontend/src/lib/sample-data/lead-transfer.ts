/**
 * Dummy data for the Admin → Reports → Calls & Media → Lead Transfer screen.
 *
 * Leads that were moved from one branch to another before the customer
 * converted. The "From Branch" is where the lead originally landed; the row
 * survives even after the lead is closed or transferred elsewhere.
 *
 * Branch names line up with the rows seeded by `seed-admin-showcase.ts` so
 * the branch dropdown filters this list in a sensible way out of the box.
 */

export interface LeadTransferRow {
  key: string;
  transferDate: string;     // ISO yyyy-mm-dd
  clientName: string;
  mobileNumber: string;
  fromBranch: string;
  remarks: string;
}

export const LEAD_TRANSFER_ROWS: LeadTransferRow[] = [
  {
    key: 'LT-0001',
    transferDate: '2026-02-04',
    clientName: 'Aarav Mehta',
    mobileNumber: '+91 98112 70011',
    fromBranch: 'Jubilee Hills',
    remarks: 'Customer requested closer branch',
  },
  {
    key: 'LT-0002',
    transferDate: '2026-02-12',
    clientName: 'Sneha Pillai',
    mobileNumber: '+91 99882 55566',
    fromBranch: 'Bandra West',
    remarks: 'Therapist preference at receiving branch',
  },
  {
    key: 'LT-0003',
    transferDate: '2026-02-19',
    clientName: 'Pooja Sharma',
    mobileNumber: '+91 98112 70010',
    fromBranch: 'Connaught Place',
    remarks: '-',
  },
  {
    key: 'LT-0004',
    transferDate: '2026-03-03',
    clientName: 'Karthik Iyer',
    mobileNumber: '+91 98200 10003',
    fromBranch: 'Bandra West',
    remarks: 'Caller mismatch — reassigned',
  },
  {
    key: 'LT-0005',
    transferDate: '2026-03-08',
    clientName: 'Anita Reddy',
    mobileNumber: '+91 98300 10004',
    fromBranch: 'Koramangala',
    remarks: 'Wrong branch entry by caller',
  },
  {
    key: 'LT-0006',
    transferDate: '2026-03-15',
    clientName: 'Vikram Singh',
    mobileNumber: '+91 98111 10005',
    fromBranch: 'Connaught Place',
    remarks: 'Customer moved cities',
  },
  {
    key: 'LT-0007',
    transferDate: '2026-03-22',
    clientName: 'Manish Gupta',
    mobileNumber: '+91 90110 33344',
    fromBranch: 'Powai',
    remarks: '-',
  },
  {
    key: 'LT-0008',
    transferDate: '2026-04-02',
    clientName: 'Rohan Kapoor',
    mobileNumber: '+91 98100 11111',
    fromBranch: 'Jubilee Hills',
    remarks: 'Branch consolidation',
  },
  {
    key: 'LT-0009',
    transferDate: '2026-04-09',
    clientName: 'Tanvi Shah',
    mobileNumber: '+91 90770 99988',
    fromBranch: 'Koramangala',
    remarks: 'Customer requested night-shift availability',
  },
  {
    key: 'LT-0010',
    transferDate: '2026-04-18',
    clientName: 'Rahul Verma',
    mobileNumber: '+91 99550 11122',
    fromBranch: 'Anna Nagar',
    remarks: 'Closer to workplace',
  },
  {
    key: 'LT-0011',
    transferDate: '2026-04-26',
    clientName: 'Ishita Nair',
    mobileNumber: '+91 90880 22233',
    fromBranch: 'Jubilee Hills',
    remarks: '-',
  },
  {
    key: 'LT-0012',
    transferDate: '2026-05-03',
    clientName: 'Deepak Menon',
    mobileNumber: '+91 98200 60005',
    fromBranch: 'Koramangala',
    remarks: 'Lead source attribution correction',
  },
  {
    key: 'LT-0013',
    transferDate: '2026-05-09',
    clientName: 'Neha Bansal',
    mobileNumber: '+91 99220 44444',
    fromBranch: 'Indiranagar',
    remarks: 'Branch capacity / scheduling conflict',
  },
  {
    key: 'LT-0014',
    transferDate: '2026-05-14',
    clientName: 'Sahil Khanna',
    mobileNumber: '+91 98111 60002',
    fromBranch: 'Bandra West',
    remarks: 'Equipment availability at destination',
  },
  {
    key: 'LT-0015',
    transferDate: '2026-05-19',
    clientName: 'Karan Malhotra',
    mobileNumber: '+91 90008 77788',
    fromBranch: 'Banjara Hills',
    remarks: '-',
  },
];
