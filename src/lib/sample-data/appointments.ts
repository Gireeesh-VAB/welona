/**
 * Dummy data for the Admin → Admin → Appointments screen.
 *
 * Realistic cross-branch appointment book covering yesterday, today and the
 * next 6 days. "Today" is fixed at 2026-05-21 so the demo never goes stale.
 * Each appointment is tied to a consultant, branch, service and customer
 * that line up with the rest of the seeded sample data.
 */

export type AppointmentStatus =
  | 'Confirmed'
  | 'Pending'
  | 'Checked-In'
  | 'In Session'
  | 'Completed'
  | 'No-Show'
  | 'Cancelled'
  | 'Rescheduled';

export interface Appointment {
  key: string;
  bookingNo: string;
  /** ISO timestamp — appointment start. */
  startsAt: string;
  durationMins: number;
  customerName: string;
  mobileNumber: string;
  branchName: string;
  consultant: string;
  service: string;
  category: string;
  status: AppointmentStatus;
  /** Amount paid against this booking (paise). */
  amountPaid: number;
  amountDue: number;
  remarks: string;
}

const TODAY = '2026-05-21';

/** Local helper: combine yyyy-mm-dd + hh:mm into an ISO timestamp. */
function at(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

const r = (rupees: number) => rupees * 100;

export const APPOINTMENTS: Appointment[] = [
  // ----- Today (2026-05-21) -----
  { key: 'AP-0001', bookingNo: 'BKG-2601', startsAt: at(TODAY,'09:00'), durationMins: 45, customerName: 'Aarav Mehta',    mobileNumber: '+91 98112 70011', branchName: 'Jubilee Hills',   consultant: 'Dr. Priya Kapoor',  service: 'TCA Peel',                category: 'Skin Services', status: 'Completed', amountPaid: r(7000),  amountDue: 0,        remarks: 'No reaction; review in 4 weeks' },
  { key: 'AP-0002', bookingNo: 'BKG-2602', startsAt: at(TODAY,'09:30'), durationMins: 30, customerName: 'Priya Kapoor',   mobileNumber: '+91 98100 10002', branchName: 'Banjara Hills',   consultant: 'Karthik Iyer',      service: 'Laser - Full Legs',       category: 'LASER',         status: 'In Session', amountPaid: r(8000),  amountDue: r(4000),  remarks: 'Session 3 of 8' },
  { key: 'AP-0003', bookingNo: 'BKG-2603', startsAt: at(TODAY,'10:00'), durationMins: 60, customerName: 'Karthik Iyer',   mobileNumber: '+91 98200 10003', branchName: 'Bandra West',     consultant: 'Dr. Rajesh Kumar',  service: 'PRP Hair Therapy',         category: 'Hair Care',     status: 'Checked-In', amountPaid: r(7500),  amountDue: 0,        remarks: 'Session 4 of 4' },
  { key: 'AP-0004', bookingNo: 'BKG-2604', startsAt: at(TODAY,'10:30'), durationMins: 45, customerName: 'Anita Reddy',    mobileNumber: '+91 98300 10004', branchName: 'Koramangala',     consultant: 'Dr. Priya Kapoor',  service: 'Pumpkin Peel',             category: 'Skin Services', status: 'Confirmed', amountPaid: r(4000),  amountDue: 0,        remarks: '' },
  { key: 'AP-0005', bookingNo: 'BKG-2605', startsAt: at(TODAY,'11:00'), durationMins: 30, customerName: 'Sahil Khanna',   mobileNumber: '+91 98111 60002', branchName: 'Bandra West',     consultant: 'Karthik Iyer',      service: 'Laser - Upper Lip',        category: 'LASER',         status: 'Confirmed', amountPaid: r(1200),  amountDue: 0,        remarks: 'Session 2 of 6' },
  { key: 'AP-0006', bookingNo: 'BKG-2606', startsAt: at(TODAY,'11:30'), durationMins: 90, customerName: 'Vikram Singh',   mobileNumber: '+91 98111 10005', branchName: 'Connaught Place', consultant: 'Vikram Singh',      service: 'Wellness Consultation',    category: 'Wellness',      status: 'Confirmed', amountPaid: r(25000), amountDue: r(5000),  remarks: 'Annual programme review' },
  { key: 'AP-0007', bookingNo: 'BKG-2607', startsAt: at(TODAY,'12:00'), durationMins: 45, customerName: 'Meera Joshi',    mobileNumber: '+91 98220 10006', branchName: 'Powai',           consultant: 'Karthik Iyer',      service: 'Laser - Half Legs',        category: 'LASER',         status: 'No-Show',   amountPaid: r(4500),  amountDue: 0,        remarks: 'Did not show; rescheduling' },
  { key: 'AP-0008', bookingNo: 'BKG-2608', startsAt: at(TODAY,'12:30'), durationMins: 30, customerName: 'Arjun Mehta',    mobileNumber: '+91 98445 10007', branchName: 'Indiranagar',     consultant: 'Arjun Mehta',       service: 'Product Consultation',     category: 'Products',      status: 'Completed', amountPaid: r(3500),  amountDue: 0,        remarks: '' },
  { key: 'AP-0009', bookingNo: 'BKG-2609', startsAt: at(TODAY,'13:00'), durationMins: 45, customerName: 'Sneha Iyer',     mobileNumber: '+91 98445 10008', branchName: 'Anna Nagar',      consultant: 'Dr. Priya Kapoor',  service: 'Under-Eye Peel',           category: 'Skin Services', status: 'Confirmed', amountPaid: r(2500),  amountDue: r(1000),  remarks: '' },
  { key: 'AP-0010', bookingNo: 'BKG-2610', startsAt: at(TODAY,'13:30'), durationMins: 30, customerName: 'Rajesh Kumar',   mobileNumber: '+91 99004 10009', branchName: 'Jubilee Hills',   consultant: 'Dr. Rajesh Kumar',  service: 'Trichology Consultation',  category: 'Hair Care',     status: 'Confirmed', amountPaid: r(1500),  amountDue: 0,        remarks: 'Diet plan review' },
  { key: 'AP-0011', bookingNo: 'BKG-2611', startsAt: at(TODAY,'14:30'), durationMins: 60, customerName: 'Divya Rao',      mobileNumber: '+91 99004 10010', branchName: 'Banjara Hills',   consultant: 'Dr. Priya Kapoor',  service: 'Minor Skin Surgery',       category: 'Skin Services', status: 'Confirmed', amountPaid: r(15000), amountDue: r(3000),  remarks: 'Pre-op briefing complete' },
  { key: 'AP-0012', bookingNo: 'BKG-2612', startsAt: at(TODAY,'15:00'), durationMins: 30, customerName: 'Pooja Sharma',   mobileNumber: '+91 98112 70010', branchName: 'Connaught Place', consultant: 'Vikram Singh',      service: 'Wellness Membership',      category: 'Wellness',      status: 'Confirmed', amountPaid: r(0),     amountDue: r(30000), remarks: 'New family plan' },
  { key: 'AP-0013', bookingNo: 'BKG-2613', startsAt: at(TODAY,'15:30'), durationMins: 45, customerName: 'Neha Bansal',    mobileNumber: '+91 99220 44444', branchName: 'Indiranagar',     consultant: 'Dr. Priya Kapoor',  service: 'Pumpkin Peel',             category: 'Skin Services', status: 'Cancelled', amountPaid: r(0),     amountDue: 0,        remarks: 'Customer rescheduled to Friday' },
  { key: 'AP-0014', bookingNo: 'BKG-2614', startsAt: at(TODAY,'16:00'), durationMins: 60, customerName: 'Rohan Kapoor',   mobileNumber: '+91 98100 11111', branchName: 'Jubilee Hills',   consultant: 'Dr. Priya Kapoor',  service: 'TCA Peel',                 category: 'Skin Services', status: 'Confirmed', amountPaid: r(7000),  amountDue: 0,        remarks: 'Session 3 of 4' },
  { key: 'AP-0015', bookingNo: 'BKG-2615', startsAt: at(TODAY,'16:30'), durationMins: 30, customerName: 'Manish Gupta',   mobileNumber: '+91 90110 33344', branchName: 'Powai',           consultant: 'Meera Joshi',       service: 'TCA + Under-Eye combo',    category: 'Skin Services', status: 'Pending',   amountPaid: r(0),     amountDue: r(35000), remarks: 'Awaiting confirmation' },
  { key: 'AP-0016', bookingNo: 'BKG-2616', startsAt: at(TODAY,'17:00'), durationMins: 45, customerName: 'Rahul Verma',    mobileNumber: '+91 99550 11122', branchName: 'Anna Nagar',      consultant: 'Karthik Iyer',      service: 'Laser - Full Legs',        category: 'LASER',         status: 'Confirmed', amountPaid: r(10000), amountDue: r(2000),  remarks: 'Session 1 of 4' },
  { key: 'AP-0017', bookingNo: 'BKG-2617', startsAt: at(TODAY,'17:30'), durationMins: 30, customerName: 'Ishita Nair',    mobileNumber: '+91 90880 22233', branchName: 'Jubilee Hills',   consultant: 'Divya Rao',         service: 'Product Reorder',          category: 'Products',      status: 'Confirmed', amountPaid: r(2500),  amountDue: 0,        remarks: '' },
  { key: 'AP-0018', bookingNo: 'BKG-2618', startsAt: at(TODAY,'18:00'), durationMins: 90, customerName: 'Karan Malhotra', mobileNumber: '+91 90008 77788', branchName: 'Banjara Hills',   consultant: 'Vikram Singh',      service: 'Wellness — Family Plan',   category: 'Wellness',      status: 'Confirmed', amountPaid: r(15000), amountDue: r(30000), remarks: 'Onboarding session' },

  // ----- Tomorrow (2026-05-22) -----
  { key: 'AP-0019', bookingNo: 'BKG-2701', startsAt: at('2026-05-22','09:30'), durationMins: 45, customerName: 'Aarav Mehta',    mobileNumber: '+91 98112 70011', branchName: 'Jubilee Hills',   consultant: 'Dr. Priya Kapoor',  service: 'TCA Peel',                category: 'Skin Services', status: 'Confirmed', amountPaid: r(7000),  amountDue: 0,        remarks: 'Session 2 of 6' },
  { key: 'AP-0020', bookingNo: 'BKG-2702', startsAt: at('2026-05-22','10:00'), durationMins: 30, customerName: 'Tanvi Shah',     mobileNumber: '+91 90770 99988', branchName: 'Koramangala',     consultant: 'Karthik Iyer',      service: 'Laser - Half Legs',       category: 'LASER',         status: 'Confirmed', amountPaid: r(6000),  amountDue: r(2000),  remarks: '' },
  { key: 'AP-0021', bookingNo: 'BKG-2703', startsAt: at('2026-05-22','11:00'), durationMins: 60, customerName: 'Deepak Menon',   mobileNumber: '+91 98200 60005', branchName: 'Koramangala',     consultant: 'Dr. Rajesh Kumar',  service: 'PRP Hair Therapy',         category: 'Hair Care',     status: 'Confirmed', amountPaid: r(7500),  amountDue: r(7500),  remarks: 'Session 2 of 8' },
  { key: 'AP-0022', bookingNo: 'BKG-2704', startsAt: at('2026-05-22','14:00'), durationMins: 45, customerName: 'Sneha Pillai',   mobileNumber: '+91 99882 55566', branchName: 'Bandra West',     consultant: 'Dr. Priya Kapoor',  service: 'Skin Consultation',        category: 'Skin Services', status: 'Pending',   amountPaid: r(0),     amountDue: r(1500),  remarks: '' },

  // ----- Day after (2026-05-23) -----
  { key: 'AP-0023', bookingNo: 'BKG-2801', startsAt: at('2026-05-23','10:30'), durationMins: 60, customerName: 'Anita Desai',    mobileNumber: '+91 98200 33333', branchName: 'Powai',           consultant: 'Meera Joshi',       service: 'TCA Peel',                category: 'Skin Services', status: 'Confirmed', amountPaid: r(6000),  amountDue: 0,        remarks: 'Session 4 of 6' },
  { key: 'AP-0024', bookingNo: 'BKG-2802', startsAt: at('2026-05-23','15:00'), durationMins: 30, customerName: 'Vikram Singh',   mobileNumber: '+91 98111 10005', branchName: 'Connaught Place', consultant: 'Vikram Singh',      service: 'Wellness Follow-up',       category: 'Wellness',      status: 'Confirmed', amountPaid: r(0),     amountDue: 0,        remarks: 'Quarterly review' },
  { key: 'AP-0025', bookingNo: 'BKG-2803', startsAt: at('2026-05-23','16:00'), durationMins: 45, customerName: 'Karthik Iyer',   mobileNumber: '+91 98200 10003', branchName: 'Bandra West',     consultant: 'Dr. Rajesh Kumar',  service: 'PRP Hair Therapy',         category: 'Hair Care',     status: 'Confirmed', amountPaid: r(7500),  amountDue: r(7500),  remarks: '' },

  // ----- This Friday (2026-05-25) -----
  { key: 'AP-0026', bookingNo: 'BKG-2901', startsAt: at('2026-05-25','11:00'), durationMins: 45, customerName: 'Neha Bansal',    mobileNumber: '+91 99220 44444', branchName: 'Indiranagar',     consultant: 'Dr. Priya Kapoor',  service: 'Pumpkin Peel',            category: 'Skin Services', status: 'Rescheduled', amountPaid: r(0), amountDue: r(4000), remarks: 'Originally on Wed; moved to Fri' },
  { key: 'AP-0027', bookingNo: 'BKG-2902', startsAt: at('2026-05-25','14:30'), durationMins: 30, customerName: 'Sahil Khanna',   mobileNumber: '+91 98111 60002', branchName: 'Bandra West',     consultant: 'Karthik Iyer',      service: 'Laser - Upper Lip',        category: 'LASER',         status: 'Confirmed', amountPaid: r(1200),  amountDue: 0,        remarks: 'Session 3 of 6' },

  // ----- Yesterday (2026-05-20) -----
  { key: 'AP-0028', bookingNo: 'BKG-2501', startsAt: at('2026-05-20','10:00'), durationMins: 45, customerName: 'Priya Kapoor',   mobileNumber: '+91 98100 10002', branchName: 'Banjara Hills',   consultant: 'Karthik Iyer',      service: 'Laser - Full Legs',       category: 'LASER',         status: 'Completed', amountPaid: r(8000),  amountDue: r(4000),  remarks: 'Session 2 of 8' },
  { key: 'AP-0029', bookingNo: 'BKG-2502', startsAt: at('2026-05-20','15:30'), durationMins: 30, customerName: 'Arjun Mehta',    mobileNumber: '+91 98445 10007', branchName: 'Indiranagar',     consultant: 'Arjun Mehta',       service: 'Product Consultation',     category: 'Products',      status: 'Completed', amountPaid: r(3500),  amountDue: 0,        remarks: '' },
  { key: 'AP-0030', bookingNo: 'BKG-2503', startsAt: at('2026-05-20','17:00'), durationMins: 45, customerName: 'Rohan Kapoor',   mobileNumber: '+91 98100 11111', branchName: 'Jubilee Hills',   consultant: 'Dr. Priya Kapoor',  service: 'TCA Peel',                category: 'Skin Services', status: 'No-Show',   amountPaid: r(7000),  amountDue: 0,        remarks: 'Customer requested reschedule via WhatsApp' },
];

/** Today, in YYYY-MM-DD for the page's "today" comparisons. */
export const APPOINTMENTS_TODAY = TODAY;

/** Distinct consultant names in the dataset, alphabetised. */
export const APPOINTMENT_CONSULTANTS: string[] = Array.from(
  new Set(APPOINTMENTS.map((a) => a.consultant)),
).sort();

/** Distinct branch names present (used to seed the Today's Schedule columns). */
export const APPOINTMENT_BRANCHES: string[] = Array.from(
  new Set(APPOINTMENTS.map((a) => a.branchName)),
).sort();
