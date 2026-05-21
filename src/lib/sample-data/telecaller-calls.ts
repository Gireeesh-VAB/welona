/**
 * Dummy data for the Admin → Reports → Calls & Media → Telecaller Call Report.
 *
 * Outbound calls placed by the call-centre / telecallers. One row per call
 * attempt. A single customer may appear multiple times across days.
 */

export type CallType = 'Cold' | 'Follow-Up' | 'Reminder' | 'Reactivation';
export type ConnectionStatus = 'Connected' | 'Not Reachable' | 'Busy' | 'Wrong Number' | 'Switched Off';
export type CallOutcome = 'Interested' | 'Not Interested' | 'Call Back' | 'Booked' | 'Do Not Disturb' | 'No Response';

export interface TelecallerCallRow {
  key: string;
  callAt: string;                // ISO timestamp
  telecaller: string;
  branchName: string;
  customerName: string;
  mobileNumber: string;
  callType: CallType;
  attempts: number;
  connectionStatus: ConnectionStatus;
  durationMins: number;
  outcome: CallOutcome;
  remarks: string;
}

export const TELECALLER_CALL_ROWS: TelecallerCallRow[] = [
  { key: 'TC-0001', callAt: '2026-05-21T10:00:00', telecaller: 'Anita Reddy',  branchName: 'Jubilee Hills',   customerName: 'Aarav Mehta',   mobileNumber: '+91 98112 70011', callType: 'Follow-Up',   attempts: 1, connectionStatus: 'Connected',    durationMins: 6, outcome: 'Booked',          remarks: 'Booked 4-session course' },
  { key: 'TC-0002', callAt: '2026-05-21T10:25:00', telecaller: 'Anita Reddy',  branchName: 'Jubilee Hills',   customerName: 'Rohan Kapoor',  mobileNumber: '+91 98100 11111', callType: 'Reactivation',attempts: 2, connectionStatus: 'Not Reachable', durationMins: 0, outcome: 'No Response',     remarks: 'Will retry tomorrow' },
  { key: 'TC-0003', callAt: '2026-05-21T11:10:00', telecaller: 'Divya Rao',    branchName: 'Banjara Hills',   customerName: 'Priya Kapoor',  mobileNumber: '+91 98100 10002', callType: 'Follow-Up',   attempts: 1, connectionStatus: 'Connected',    durationMins: 9, outcome: 'Interested',      remarks: 'Wants Saturday slot' },
  { key: 'TC-0004', callAt: '2026-05-21T11:45:00', telecaller: 'Karthik Iyer', branchName: 'Bandra West',     customerName: 'Sahil Khanna',  mobileNumber: '+91 98111 60002', callType: 'Cold',        attempts: 1, connectionStatus: 'Connected',    durationMins: 5, outcome: 'Call Back',       remarks: 'Asked to call after 6pm' },
  { key: 'TC-0005', callAt: '2026-05-21T12:15:00', telecaller: 'Meera Joshi',  branchName: 'Powai',           customerName: 'Manish Gupta',  mobileNumber: '+91 90110 33344', callType: 'Follow-Up',   attempts: 1, connectionStatus: 'Connected',    durationMins: 11, outcome: 'Booked',         remarks: 'TCA + Under-Eye combo' },
  { key: 'TC-0006', callAt: '2026-05-21T12:40:00', telecaller: 'Anita Reddy',  branchName: 'Jubilee Hills',   customerName: 'Ishita Nair',   mobileNumber: '+91 90880 22233', callType: 'Reminder',    attempts: 1, connectionStatus: 'Connected',    durationMins: 3, outcome: 'Booked',          remarks: 'Product reorder confirmed' },
  { key: 'TC-0007', callAt: '2026-05-21T14:05:00', telecaller: 'Vikram Singh', branchName: 'Connaught Place', customerName: 'Karan Malhotra', mobileNumber: '+91 90008 77788', callType: 'Cold',        attempts: 1, connectionStatus: 'Connected',    durationMins: 14, outcome: 'Booked',         remarks: 'Wellness family plan signed' },
  { key: 'TC-0008', callAt: '2026-05-21T14:30:00', telecaller: 'Sneha Iyer',   branchName: 'Anna Nagar',      customerName: 'Rahul Verma',   mobileNumber: '+91 99550 11122', callType: 'Follow-Up',   attempts: 3, connectionStatus: 'Busy',         durationMins: 0, outcome: 'No Response',     remarks: 'Line busy, retry tomorrow' },
  { key: 'TC-0009', callAt: '2026-05-21T15:00:00', telecaller: 'Arjun Mehta',  branchName: 'Indiranagar',     customerName: 'Neha Bansal',   mobileNumber: '+91 99220 44444', callType: 'Reactivation',attempts: 2, connectionStatus: 'Connected',    durationMins: 4, outcome: 'Not Interested',  remarks: 'No longer interested in clinic' },
  { key: 'TC-0010', callAt: '2026-05-21T15:30:00', telecaller: 'Divya Rao',    branchName: 'Banjara Hills',   customerName: 'Divya Rao',     mobileNumber: '+91 99004 10010', callType: 'Reminder',    attempts: 1, connectionStatus: 'Connected',    durationMins: 4, outcome: 'Booked',          remarks: 'Surgery date confirmed' },
  { key: 'TC-0011', callAt: '2026-05-20T09:30:00', telecaller: 'Anita Reddy',  branchName: 'Jubilee Hills',   customerName: 'Rajesh Kumar',  mobileNumber: '+91 99004 10009', callType: 'Follow-Up',   attempts: 1, connectionStatus: 'Connected',    durationMins: 8, outcome: 'Interested',      remarks: 'Booked first consultation' },
  { key: 'TC-0012', callAt: '2026-05-20T10:00:00', telecaller: 'Karthik Iyer', branchName: 'Bandra West',     customerName: 'Karthik Iyer',  mobileNumber: '+91 98200 10003', callType: 'Follow-Up',   attempts: 2, connectionStatus: 'Connected',    durationMins: 7, outcome: 'Call Back',       remarks: 'Wants to discuss with spouse' },
  { key: 'TC-0013', callAt: '2026-05-20T10:45:00', telecaller: 'Meera Joshi',  branchName: 'Powai',           customerName: 'Anita Desai',   mobileNumber: '+91 98200 33333', callType: 'Reminder',    attempts: 1, connectionStatus: 'Connected',    durationMins: 2, outcome: 'Booked',          remarks: 'Shampoo + vitamins' },
  { key: 'TC-0014', callAt: '2026-05-20T11:30:00', telecaller: 'Vikram Singh', branchName: 'Connaught Place', customerName: 'Pooja Sharma',  mobileNumber: '+91 98112 70010', callType: 'Follow-Up',   attempts: 1, connectionStatus: 'Connected',    durationMins: 12, outcome: 'Booked',         remarks: 'Family annual plan' },
  { key: 'TC-0015', callAt: '2026-05-20T13:00:00', telecaller: 'Sneha Iyer',   branchName: 'Anna Nagar',      customerName: 'Sneha Iyer',    mobileNumber: '+91 98445 10008', callType: 'Cold',        attempts: 1, connectionStatus: 'Wrong Number', durationMins: 0, outcome: 'No Response',     remarks: 'Number belongs to another person' },
  { key: 'TC-0016', callAt: '2026-05-20T13:30:00', telecaller: 'Arjun Mehta',  branchName: 'Indiranagar',     customerName: 'Arjun Mehta',   mobileNumber: '+91 98445 10007', callType: 'Reminder',    attempts: 1, connectionStatus: 'Connected',    durationMins: 3, outcome: 'Booked',          remarks: 'Product reorder' },
  { key: 'TC-0017', callAt: '2026-05-19T09:45:00', telecaller: 'Anita Reddy',  branchName: 'Jubilee Hills',   customerName: 'Rohan Kapoor',  mobileNumber: '+91 98100 11111', callType: 'Reactivation',attempts: 1, connectionStatus: 'Connected',    durationMins: 5, outcome: 'Do Not Disturb',  remarks: 'Asked not to call again' },
  { key: 'TC-0018', callAt: '2026-05-19T10:20:00', telecaller: 'Divya Rao',    branchName: 'Banjara Hills',   customerName: 'Karan Malhotra', mobileNumber: '+91 90008 77788', callType: 'Follow-Up',   attempts: 1, connectionStatus: 'Connected',    durationMins: 10, outcome: 'Interested',     remarks: 'Wants demo session' },
  { key: 'TC-0019', callAt: '2026-05-19T11:10:00', telecaller: 'Karthik Iyer', branchName: 'Bandra West',     customerName: 'Deepak Menon',  mobileNumber: '+91 98200 60005', callType: 'Cold',        attempts: 2, connectionStatus: 'Switched Off', durationMins: 0, outcome: 'No Response',     remarks: 'Phone switched off' },
  { key: 'TC-0020', callAt: '2026-05-19T12:00:00', telecaller: 'Meera Joshi',  branchName: 'Powai',           customerName: 'Meera Joshi',   mobileNumber: '+91 98220 10006', callType: 'Reminder',    attempts: 1, connectionStatus: 'Connected',    durationMins: 4, outcome: 'Booked',          remarks: 'Confirmed 5-session laser' },
  { key: 'TC-0021', callAt: '2026-05-19T14:15:00', telecaller: 'Vikram Singh', branchName: 'Connaught Place', customerName: 'Vikram Singh',  mobileNumber: '+91 98111 10005', callType: 'Reminder',    attempts: 1, connectionStatus: 'Connected',    durationMins: 6, outcome: 'Booked',          remarks: 'Annual wellness plan' },
  { key: 'TC-0022', callAt: '2026-05-19T15:00:00', telecaller: 'Sneha Iyer',   branchName: 'Anna Nagar',      customerName: 'Rahul Verma',   mobileNumber: '+91 99550 11122', callType: 'Follow-Up',   attempts: 4, connectionStatus: 'Connected',    durationMins: 8, outcome: 'Interested',      remarks: 'Comparing prices, will decide' },
  { key: 'TC-0023', callAt: '2026-05-19T16:00:00', telecaller: 'Arjun Mehta',  branchName: 'Indiranagar',     customerName: 'Neha Bansal',   mobileNumber: '+91 99220 44444', callType: 'Cold',        attempts: 1, connectionStatus: 'Connected',    durationMins: 4, outcome: 'Not Interested',  remarks: 'No longer in city' },
  { key: 'TC-0024', callAt: '2026-05-18T10:30:00', telecaller: 'Anita Reddy',  branchName: 'Jubilee Hills',   customerName: 'Aarav Mehta',   mobileNumber: '+91 98112 70011', callType: 'Follow-Up',   attempts: 1, connectionStatus: 'Connected',    durationMins: 5, outcome: 'Call Back',       remarks: 'Will book by end of week' },
  { key: 'TC-0025', callAt: '2026-05-18T11:00:00', telecaller: 'Divya Rao',    branchName: 'Banjara Hills',   customerName: 'Anita Desai',   mobileNumber: '+91 98200 33333', callType: 'Reactivation',attempts: 3, connectionStatus: 'Not Reachable', durationMins: 0, outcome: 'No Response',     remarks: 'Will mark inactive if next attempt fails' },
];
