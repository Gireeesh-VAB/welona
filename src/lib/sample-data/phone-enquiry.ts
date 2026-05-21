/**
 * Dummy data for the Admin → Reports → Calls & Media → Phone Enquiry screen.
 *
 * Inbound enquiry calls answered at a branch's reception. Each row is one
 * call. Outcome describes what happened on the line (booked, scheduled a
 * follow-up, just asked for info, etc.).
 */

export type PhoneEnquiryOutcome = 'Booked' | 'Lead Created' | 'Information Only' | 'Follow-Up' | 'Lost';

export interface PhoneEnquiryRow {
  key: string;
  callAt: string;                // ISO timestamp
  branchName: string;
  callerName: string;
  mobileNumber: string;
  treatmentInterest: string;
  category: string;
  source: string;                // Media: how caller got the number
  receivedBy: string;            // Telecaller / front desk
  durationMins: number;
  outcome: PhoneEnquiryOutcome;
  remarks: string;
}

export const PHONE_ENQUIRY_ROWS: PhoneEnquiryRow[] = [
  { key: 'PE-0001', callAt: '2026-05-21T09:35:00', branchName: 'Jubilee Hills', callerName: 'Aarav Mehta',  mobileNumber: '+91 98112 70011', treatmentInterest: 'TCA Peel',                category: 'Skin Services', source: 'Instagram',     receivedBy: 'Anita Reddy',  durationMins: 8,  outcome: 'Booked',           remarks: 'Booked 4-session course' },
  { key: 'PE-0002', callAt: '2026-05-21T10:05:00', branchName: 'Banjara Hills', callerName: 'Priya Kapoor', mobileNumber: '+91 98100 10002', treatmentInterest: 'Laser - Full Legs',       category: 'LASER',          source: 'Website',       receivedBy: 'Divya Rao',    durationMins: 12, outcome: 'Lead Created',     remarks: 'Patch test scheduled' },
  { key: 'PE-0003', callAt: '2026-05-21T11:15:00', branchName: 'Bandra West',   callerName: 'Karthik Iyer', mobileNumber: '+91 98200 10003', treatmentInterest: 'PRP Hair Therapy',         category: 'Hair Care',      source: 'Referral',      receivedBy: 'Karthik Iyer', durationMins: 6,  outcome: 'Follow-Up',        remarks: 'Wants to discuss with family' },
  { key: 'PE-0004', callAt: '2026-05-21T14:00:00', branchName: 'Koramangala',   callerName: 'Anita Reddy',  mobileNumber: '+91 98300 10004', treatmentInterest: 'Pumpkin Peel',             category: 'Skin Services', source: 'Whatsapp',      receivedBy: 'Anita Reddy',  durationMins: 5,  outcome: 'Booked',           remarks: '-' },
  { key: 'PE-0005', callAt: '2026-05-20T10:25:00', branchName: 'Connaught Place', callerName: 'Vikram Singh', mobileNumber: '+91 98111 10005', treatmentInterest: 'Wellness Membership',     category: 'Wellness',       source: 'Referral',      receivedBy: 'Vikram Singh', durationMins: 14, outcome: 'Booked',           remarks: 'Annual plan signed' },
  { key: 'PE-0006', callAt: '2026-05-20T13:10:00', branchName: 'Powai',          callerName: 'Meera Joshi',  mobileNumber: '+91 98220 10006', treatmentInterest: 'Laser - Half Legs',       category: 'LASER',          source: 'Instagram',     receivedBy: 'Meera Joshi',  durationMins: 9,  outcome: 'Booked',           remarks: '5-session course' },
  { key: 'PE-0007', callAt: '2026-05-20T16:40:00', branchName: 'Indiranagar',    callerName: 'Arjun Mehta',  mobileNumber: '+91 98445 10007', treatmentInterest: 'Product Enquiry',          category: 'Products',       source: 'Walk-in',       receivedBy: 'Arjun Mehta',  durationMins: 4,  outcome: 'Information Only', remarks: 'Asked about Cerascape range' },
  { key: 'PE-0008', callAt: '2026-05-19T11:55:00', branchName: 'Anna Nagar',     callerName: 'Sneha Iyer',   mobileNumber: '+91 98445 10008', treatmentInterest: 'Under-Eye Peel',           category: 'Skin Services', source: 'Sms',           receivedBy: 'Sneha Iyer',   durationMins: 7,  outcome: 'Follow-Up',        remarks: 'Wants to compare prices' },
  { key: 'PE-0009', callAt: '2026-05-19T14:30:00', branchName: 'Jubilee Hills',  callerName: 'Rajesh Kumar', mobileNumber: '+91 99004 10009', treatmentInterest: 'Trichology Consultation',  category: 'Hair Care',      source: 'Youtube',       receivedBy: 'Anita Reddy',  durationMins: 11, outcome: 'Booked',           remarks: 'First session at consultation' },
  { key: 'PE-0010', callAt: '2026-05-19T17:00:00', branchName: 'Banjara Hills',  callerName: 'Divya Rao',    mobileNumber: '+91 99004 10010', treatmentInterest: 'Minor Skin Surgery',       category: 'Skin Services', source: 'Referral',      receivedBy: 'Divya Rao',    durationMins: 16, outcome: 'Lead Created',     remarks: 'Procedure date being discussed' },
  { key: 'PE-0011', callAt: '2026-05-18T10:20:00', branchName: 'Jubilee Hills',  callerName: 'Rohan Kapoor', mobileNumber: '+91 98100 11111', treatmentInterest: 'TCA Peel',                 category: 'Skin Services', source: 'Whatsapp',      receivedBy: 'Anita Reddy',  durationMins: 5,  outcome: 'Lost',             remarks: 'Decided against treatment' },
  { key: 'PE-0012', callAt: '2026-05-18T15:00:00', branchName: 'Powai',          callerName: 'Anita Desai',  mobileNumber: '+91 98200 33333', treatmentInterest: 'Take-home Products',       category: 'Products',       source: 'Instagram',     receivedBy: 'Meera Joshi',  durationMins: 3,  outcome: 'Booked',           remarks: 'Shampoo + vitamins' },
  { key: 'PE-0013', callAt: '2026-05-17T09:50:00', branchName: 'Bandra West',    callerName: 'Sahil Khanna', mobileNumber: '+91 98111 60002', treatmentInterest: 'Laser - Upper Lip',        category: 'LASER',          source: 'Website',       receivedBy: 'Karthik Iyer', durationMins: 6,  outcome: 'Booked',           remarks: '-' },
  { key: 'PE-0014', callAt: '2026-05-17T12:30:00', branchName: 'Koramangala',    callerName: 'Deepak Menon', mobileNumber: '+91 98200 60005', treatmentInterest: 'PRP Hair Therapy',         category: 'Hair Care',      source: 'Pamphlet',      receivedBy: 'Anita Reddy',  durationMins: 10, outcome: 'Booked',           remarks: '8-session bundle' },
  { key: 'PE-0015', callAt: '2026-05-16T13:45:00', branchName: 'Connaught Place', callerName: 'Pooja Sharma', mobileNumber: '+91 98112 70010', treatmentInterest: 'Wellness Membership',     category: 'Wellness',       source: 'Referral',      receivedBy: 'Vikram Singh', durationMins: 13, outcome: 'Booked',           remarks: 'Family annual plan' },
  { key: 'PE-0016', callAt: '2026-05-16T17:20:00', branchName: 'Indiranagar',    callerName: 'Neha Bansal',  mobileNumber: '+91 99220 44444', treatmentInterest: 'Pumpkin Peel',             category: 'Skin Services', source: 'Instagram',     receivedBy: 'Arjun Mehta',  durationMins: 4,  outcome: 'Lost',             remarks: 'Price concern' },
  { key: 'PE-0017', callAt: '2026-05-15T10:35:00', branchName: 'Anna Nagar',     callerName: 'Rahul Verma',  mobileNumber: '+91 99550 11122', treatmentInterest: 'Laser - Full Legs',        category: 'LASER',          source: 'Lead in Landline', receivedBy: 'Sneha Iyer',   durationMins: 9,  outcome: 'Follow-Up',        remarks: 'Comparing with another clinic' },
  { key: 'PE-0018', callAt: '2026-05-15T13:50:00', branchName: 'Jubilee Hills',  callerName: 'Ishita Nair',  mobileNumber: '+91 90880 22233', treatmentInterest: 'Take-home Products',       category: 'Products',       source: 'Walk-in',       receivedBy: 'Anita Reddy',  durationMins: 3,  outcome: 'Booked',           remarks: 'Routine reorder' },
  { key: 'PE-0019', callAt: '2026-05-14T11:00:00', branchName: 'Powai',          callerName: 'Manish Gupta', mobileNumber: '+91 90110 33344', treatmentInterest: 'TCA + Under-Eye combo',    category: 'Skin Services', source: 'Whatsapp',      receivedBy: 'Meera Joshi',  durationMins: 12, outcome: 'Follow-Up',        remarks: 'Spouse will join next call' },
  { key: 'PE-0020', callAt: '2026-05-14T15:25:00', branchName: 'Banjara Hills',  callerName: 'Karan Malhotra', mobileNumber: '+91 90008 77788', treatmentInterest: 'Wellness — Family Plan', category: 'Wellness',       source: 'Instagram',     receivedBy: 'Divya Rao',    durationMins: 15, outcome: 'Booked',           remarks: 'Annual family plan' },
];
