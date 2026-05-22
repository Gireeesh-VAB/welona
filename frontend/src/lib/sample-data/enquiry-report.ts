/**
 * Dummy data for the Admin → Reports → Calls & Media → Enquiry Report.
 *
 * Consolidated enquiry log — every potential customer interaction regardless
 * of channel (phone, walk-in, digital). One row per enquiry. Status mirrors
 * the Lead pipeline (new/contacted/qualified/lost/converted) so the same
 * enquiry can be tracked through to a booking.
 */

export type EnquiryStatus = 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost';
export type EnquiryChannel = 'Phone' | 'Walk-in' | 'Digital';

export interface EnquiryReportRow {
  key: string;
  enquiryDate: string;          // ISO yyyy-mm-dd
  branchName: string;
  customerName: string;
  mobileNumber: string;
  source: string;               // Free text — Instagram, Whatsapp, Website, …
  channel: EnquiryChannel;      // Coarse channel grouping
  treatmentInterest: string;
  category: string;
  status: EnquiryStatus;
  owner: string;                // Assigned staff
  lastActivityDate: string;     // ISO yyyy-mm-dd
}

export const ENQUIRY_REPORT_ROWS: EnquiryReportRow[] = [
  { key: 'EN-0001', enquiryDate: '2026-05-21', branchName: 'Jubilee Hills',   customerName: 'Aarav Mehta',    mobileNumber: '+91 98112 70011', source: 'Instagram',        channel: 'Phone',   treatmentInterest: 'TCA Peel',                category: 'Skin Services', status: 'Converted', owner: 'Anita Reddy',  lastActivityDate: '2026-05-21' },
  { key: 'EN-0002', enquiryDate: '2026-05-21', branchName: 'Banjara Hills',   customerName: 'Priya Kapoor',   mobileNumber: '+91 98100 10002', source: 'Website',          channel: 'Phone',   treatmentInterest: 'Laser - Full Legs',       category: 'LASER',          status: 'Qualified', owner: 'Divya Rao',    lastActivityDate: '2026-05-21' },
  { key: 'EN-0003', enquiryDate: '2026-05-21', branchName: 'Bandra West',     customerName: 'Karthik Iyer',   mobileNumber: '+91 98200 10003', source: 'Referral',         channel: 'Phone',   treatmentInterest: 'PRP Hair Therapy',         category: 'Hair Care',      status: 'Contacted', owner: 'Karthik Iyer', lastActivityDate: '2026-05-21' },
  { key: 'EN-0004', enquiryDate: '2026-05-21', branchName: 'Jubilee Hills',   customerName: 'Aarav Mehta',    mobileNumber: '+91 98112 70011', source: 'Instagram',        channel: 'Walk-in', treatmentInterest: 'TCA Peel',                category: 'Skin Services', status: 'Converted', owner: 'Anita Reddy',  lastActivityDate: '2026-05-21' },
  { key: 'EN-0005', enquiryDate: '2026-05-20', branchName: 'Koramangala',     customerName: 'Anita Reddy',    mobileNumber: '+91 98300 10004', source: 'Whatsapp',         channel: 'Phone',   treatmentInterest: 'Pumpkin Peel',             category: 'Skin Services', status: 'Converted', owner: 'Anita Reddy',  lastActivityDate: '2026-05-20' },
  { key: 'EN-0006', enquiryDate: '2026-05-20', branchName: 'Connaught Place', customerName: 'Vikram Singh',   mobileNumber: '+91 98111 10005', source: 'Referral',         channel: 'Phone',   treatmentInterest: 'Wellness Membership',     category: 'Wellness',       status: 'Converted', owner: 'Vikram Singh', lastActivityDate: '2026-05-20' },
  { key: 'EN-0007', enquiryDate: '2026-05-20', branchName: 'Powai',           customerName: 'Meera Joshi',    mobileNumber: '+91 98220 10006', source: 'Instagram',        channel: 'Phone',   treatmentInterest: 'Laser - Half Legs',       category: 'LASER',          status: 'Converted', owner: 'Meera Joshi',  lastActivityDate: '2026-05-20' },
  { key: 'EN-0008', enquiryDate: '2026-05-20', branchName: 'Indiranagar',     customerName: 'Arjun Mehta',    mobileNumber: '+91 98445 10007', source: 'Walk-in',          channel: 'Walk-in', treatmentInterest: 'Product Consultation',     category: 'Products',       status: 'Converted', owner: 'Arjun Mehta',  lastActivityDate: '2026-05-20' },
  { key: 'EN-0009', enquiryDate: '2026-05-19', branchName: 'Anna Nagar',      customerName: 'Sneha Iyer',     mobileNumber: '+91 98445 10008', source: 'Sms',              channel: 'Phone',   treatmentInterest: 'Under-Eye Peel',           category: 'Skin Services', status: 'Contacted', owner: 'Sneha Iyer',   lastActivityDate: '2026-05-20' },
  { key: 'EN-0010', enquiryDate: '2026-05-19', branchName: 'Jubilee Hills',   customerName: 'Rajesh Kumar',   mobileNumber: '+91 99004 10009', source: 'Youtube',          channel: 'Phone',   treatmentInterest: 'Trichology Consultation',  category: 'Hair Care',      status: 'Qualified', owner: 'Anita Reddy',  lastActivityDate: '2026-05-19' },
  { key: 'EN-0011', enquiryDate: '2026-05-19', branchName: 'Banjara Hills',   customerName: 'Divya Rao',      mobileNumber: '+91 99004 10010', source: 'Referral',         channel: 'Phone',   treatmentInterest: 'Minor Skin Surgery',       category: 'Skin Services', status: 'Converted', owner: 'Divya Rao',    lastActivityDate: '2026-05-19' },
  { key: 'EN-0012', enquiryDate: '2026-05-18', branchName: 'Jubilee Hills',   customerName: 'Rohan Kapoor',   mobileNumber: '+91 98100 11111', source: 'Whatsapp',         channel: 'Phone',   treatmentInterest: 'TCA Peel',                 category: 'Skin Services', status: 'Lost',      owner: 'Anita Reddy',  lastActivityDate: '2026-05-19' },
  { key: 'EN-0013', enquiryDate: '2026-05-18', branchName: 'Powai',           customerName: 'Anita Desai',    mobileNumber: '+91 98200 33333', source: 'Instagram',        channel: 'Phone',   treatmentInterest: 'Take-home Products',       category: 'Products',       status: 'Converted', owner: 'Meera Joshi',  lastActivityDate: '2026-05-18' },
  { key: 'EN-0014', enquiryDate: '2026-05-17', branchName: 'Bandra West',     customerName: 'Sahil Khanna',   mobileNumber: '+91 98111 60002', source: 'Website',          channel: 'Digital', treatmentInterest: 'Laser - Upper Lip',        category: 'LASER',          status: 'Converted', owner: 'Karthik Iyer', lastActivityDate: '2026-05-17' },
  { key: 'EN-0015', enquiryDate: '2026-05-17', branchName: 'Koramangala',     customerName: 'Deepak Menon',   mobileNumber: '+91 98200 60005', source: 'Pamphlet',         channel: 'Walk-in', treatmentInterest: 'PRP Hair Therapy',         category: 'Hair Care',      status: 'Converted', owner: 'Anita Reddy',  lastActivityDate: '2026-05-17' },
  { key: 'EN-0016', enquiryDate: '2026-05-16', branchName: 'Connaught Place', customerName: 'Pooja Sharma',   mobileNumber: '+91 98112 70010', source: 'Referral',         channel: 'Phone',   treatmentInterest: 'Wellness Membership',     category: 'Wellness',       status: 'Converted', owner: 'Vikram Singh', lastActivityDate: '2026-05-16' },
  { key: 'EN-0017', enquiryDate: '2026-05-16', branchName: 'Indiranagar',     customerName: 'Neha Bansal',    mobileNumber: '+91 99220 44444', source: 'Instagram',        channel: 'Walk-in', treatmentInterest: 'Pumpkin Peel',             category: 'Skin Services', status: 'Lost',      owner: 'Arjun Mehta',  lastActivityDate: '2026-05-16' },
  { key: 'EN-0018', enquiryDate: '2026-05-15', branchName: 'Anna Nagar',      customerName: 'Rahul Verma',    mobileNumber: '+91 99550 11122', source: 'Lead in Landline', channel: 'Phone',   treatmentInterest: 'Laser - Full Legs',        category: 'LASER',          status: 'Qualified', owner: 'Sneha Iyer',   lastActivityDate: '2026-05-19' },
  { key: 'EN-0019', enquiryDate: '2026-05-15', branchName: 'Jubilee Hills',   customerName: 'Ishita Nair',    mobileNumber: '+91 90880 22233', source: 'Walk-in',          channel: 'Walk-in', treatmentInterest: 'Take-home Products',       category: 'Products',       status: 'Converted', owner: 'Anita Reddy',  lastActivityDate: '2026-05-15' },
  { key: 'EN-0020', enquiryDate: '2026-05-14', branchName: 'Powai',           customerName: 'Manish Gupta',   mobileNumber: '+91 90110 33344', source: 'Whatsapp',         channel: 'Phone',   treatmentInterest: 'TCA + Under-Eye combo',    category: 'Skin Services', status: 'Contacted', owner: 'Meera Joshi',  lastActivityDate: '2026-05-19' },
  { key: 'EN-0021', enquiryDate: '2026-05-14', branchName: 'Bandra West',     customerName: 'Sneha Pillai',   mobileNumber: '+91 99882 55566', source: 'Referral',         channel: 'Digital', treatmentInterest: 'Trichology + PRP combo',   category: 'Hair Care',      status: 'Qualified', owner: 'Karthik Iyer', lastActivityDate: '2026-05-18' },
  { key: 'EN-0022', enquiryDate: '2026-05-13', branchName: 'Banjara Hills',   customerName: 'Karan Malhotra', mobileNumber: '+91 90008 77788', source: 'Instagram',        channel: 'Walk-in', treatmentInterest: 'Wellness — Family Plan',   category: 'Wellness',       status: 'Converted', owner: 'Divya Rao',    lastActivityDate: '2026-05-13' },
  { key: 'EN-0023', enquiryDate: '2026-05-13', branchName: 'Koramangala',     customerName: 'Tanvi Shah',     mobileNumber: '+91 90770 99988', source: 'Website',          channel: 'Digital', treatmentInterest: 'Laser - Half Legs',        category: 'LASER',          status: 'New',       owner: 'Anita Reddy',  lastActivityDate: '2026-05-13' },
  { key: 'EN-0024', enquiryDate: '2026-05-12', branchName: 'Anna Nagar',      customerName: 'Aarav Mehta',    mobileNumber: '+91 98112 70011', source: 'Instagram',        channel: 'Digital', treatmentInterest: 'Skin assessment',          category: 'Skin Services', status: 'New',       owner: 'Sneha Iyer',   lastActivityDate: '2026-05-12' },
  { key: 'EN-0025', enquiryDate: '2026-05-12', branchName: 'Indiranagar',     customerName: 'Rohan Kapoor',   mobileNumber: '+91 98100 11111', source: 'Whatsapp',         channel: 'Digital', treatmentInterest: 'Product Consultation',     category: 'Products',       status: 'Lost',      owner: 'Arjun Mehta',  lastActivityDate: '2026-05-14' },
];
