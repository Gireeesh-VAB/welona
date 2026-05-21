/**
 * Dummy data for the Admin → Admin → SMS Integration screen.
 *
 * Models the typical Indian SMS gateway setup: a primary provider (MSG91 /
 * Gupshup / Kaleyra), DLT-registered sender IDs ("headers"), DLT-approved
 * template IDs, and a credit wallet whose history is auditable.
 */

export type ProviderKey = 'msg91' | 'gupshup' | 'kaleyra' | 'twilio' | 'aws-sns';
export type SenderStatus = 'Active' | 'Pending Approval' | 'Rejected';
export type SenderChannel = 'SMS' | 'WhatsApp';
export type SenderCategory = 'Transactional' | 'Promotional' | 'OTP' | 'Service-Implicit';
export type TemplateType = 'Transactional' | 'Promotional' | 'OTP' | 'Service-Implicit';
export type TemplateStatus = 'Approved' | 'Pending' | 'Rejected';
export type RechargeStatus = 'Successful' | 'Pending' | 'Failed';

export interface SmsGatewayConfig {
  provider: ProviderKey;
  providerLabel: string;
  baseUrl: string;
  apiKey: string;           // masked in UI
  senderName: string;       // default sender used when no override
  isConnected: boolean;
  lastTestedAt: string;     // ISO timestamp
  webhookUrl: string;
  inboundUrl: string;
}

export interface SenderId {
  key: string;
  senderId: string;         // e.g. "WELONA"
  channel: SenderChannel;
  category: SenderCategory;
  dltPrincipalEntityId: string;   // PE ID
  status: SenderStatus;
  registeredAt: string;
  approvedAt: string | null;
}

export interface DltTemplate {
  key: string;
  templateId: string;       // DLT-issued template ID
  name: string;
  type: TemplateType;
  channel: SenderChannel;
  senderId: string;
  body: string;             // includes {variable} placeholders
  variables: string[];
  status: TemplateStatus;
  createdAt: string;
}

export interface RechargeEntry {
  key: string;
  rechargedAt: string;      // ISO
  amount: number;           // paise
  credits: number;          // SMS credits granted
  transactionRef: string;
  paymentMethod: string;
  status: RechargeStatus;
  rechargedBy: string;
}

export interface WalletState {
  balanceCredits: number;
  lowBalanceThreshold: number;
  usedThisMonth: number;
  averageCostPerSms: number;   // paise per SMS
}

const PROVIDERS: Record<ProviderKey, { label: string; baseUrl: string }> = {
  msg91: { label: 'MSG91', baseUrl: 'https://api.msg91.com/api/v5' },
  gupshup: { label: 'Gupshup', baseUrl: 'https://api.gupshup.io/wa/api/v1' },
  kaleyra: { label: 'Kaleyra', baseUrl: 'https://api-voice.kaleyra.io/v1' },
  twilio: { label: 'Twilio', baseUrl: 'https://api.twilio.com/2010-04-01' },
  'aws-sns': { label: 'AWS SNS', baseUrl: 'https://sns.ap-south-1.amazonaws.com' },
};

export const PROVIDER_OPTIONS = (Object.entries(PROVIDERS) as Array<
  [ProviderKey, { label: string; baseUrl: string }]
>).map(([k, v]) => ({ value: k, label: v.label, baseUrl: v.baseUrl }));

export const DEFAULT_GATEWAY: SmsGatewayConfig = {
  provider: 'msg91',
  providerLabel: 'MSG91',
  baseUrl: 'https://api.msg91.com/api/v5',
  apiKey: '405789AbcDeFgHiJkLmNoPqRsTuV',
  senderName: 'WELONA',
  isConnected: true,
  lastTestedAt: '2026-05-21T09:42:00',
  webhookUrl: 'https://welona.in/api/webhooks/sms/delivery',
  inboundUrl: 'https://welona.in/api/webhooks/sms/inbound',
};

export const SENDER_IDS: SenderId[] = [
  { key: 'SID-001', senderId: 'WELONA', channel: 'SMS', category: 'Transactional', dltPrincipalEntityId: '1701159274123456', status: 'Active',           registeredAt: '2024-08-12', approvedAt: '2024-08-15' },
  { key: 'SID-002', senderId: 'VELOFR', channel: 'SMS', category: 'OTP',           dltPrincipalEntityId: '1701159274123456', status: 'Active',           registeredAt: '2024-08-12', approvedAt: '2024-08-15' },
  { key: 'SID-003', senderId: 'VLNPRO', channel: 'SMS', category: 'Promotional',   dltPrincipalEntityId: '1701159274123456', status: 'Active',           registeredAt: '2024-10-01', approvedAt: '2024-10-04' },
  { key: 'SID-004', senderId: 'VELWLN', channel: 'SMS', category: 'Service-Implicit', dltPrincipalEntityId: '1701159274123456', status: 'Active',        registeredAt: '2025-02-19', approvedAt: '2025-02-22' },
  { key: 'SID-005', senderId: 'Welona Wellness', channel: 'WhatsApp', category: 'Transactional', dltPrincipalEntityId: 'WABA-918123456789', status: 'Active', registeredAt: '2025-04-08', approvedAt: '2025-04-15' },
  { key: 'SID-006', senderId: 'VELHRU', channel: 'SMS', category: 'Promotional', dltPrincipalEntityId: '1701159274123456', status: 'Pending Approval', registeredAt: '2026-05-05', approvedAt: null },
];

export const DLT_TEMPLATES: DltTemplate[] = [
  {
    key: 'TPL-001',
    templateId: '1707170398123456101',
    name: 'Appointment Confirmation',
    type: 'Transactional',
    channel: 'SMS',
    senderId: 'WELONA',
    body: 'Dear {name}, your appointment for {service} on {date} at {time} is confirmed at {branch}. Reply CANCEL to cancel. - WELONA',
    variables: ['name', 'service', 'date', 'time', 'branch'],
    status: 'Approved',
    createdAt: '2024-08-20',
  },
  {
    key: 'TPL-002',
    templateId: '1707170398123456102',
    name: 'Receipt OTP',
    type: 'OTP',
    channel: 'SMS',
    senderId: 'VELOFR',
    body: 'Your Welona verification code is {otp}. Valid for 5 minutes. Do not share. - WELONA',
    variables: ['otp'],
    status: 'Approved',
    createdAt: '2024-08-22',
  },
  {
    key: 'TPL-003',
    templateId: '1707170398123456103',
    name: 'Payment Receipt',
    type: 'Transactional',
    channel: 'SMS',
    senderId: 'WELONA',
    body: 'Hi {name}, we received {amount} towards {package} on {date}. Receipt: {receiptNo}. Thank you. - WELONA',
    variables: ['name', 'amount', 'package', 'date', 'receiptNo'],
    status: 'Approved',
    createdAt: '2024-09-01',
  },
  {
    key: 'TPL-004',
    templateId: '1707170398123456104',
    name: 'Festive Promo - Skin',
    type: 'Promotional',
    channel: 'SMS',
    senderId: 'VLNPRO',
    body: 'Hi {name}! Flat 20% off on all peels this week at {branch}. T&C apply. Book: bit.ly/welona-skin - WELONA',
    variables: ['name', 'branch'],
    status: 'Approved',
    createdAt: '2024-10-10',
  },
  {
    key: 'TPL-005',
    templateId: '1707170398123456105',
    name: 'Session Reminder',
    type: 'Service-Implicit',
    channel: 'SMS',
    senderId: 'VELWLN',
    body: 'Reminder: your {service} session is tomorrow ({date}) at {time}, {branch}. Reply RESCHEDULE to change. - WELONA',
    variables: ['service', 'date', 'time', 'branch'],
    status: 'Approved',
    createdAt: '2025-02-25',
  },
  {
    key: 'TPL-006',
    templateId: '1707170398123456106',
    name: 'Follow-up Call',
    type: 'Service-Implicit',
    channel: 'SMS',
    senderId: 'WELONA',
    body: 'Hi {name}, our consultant {consultant} will call you on {date} to follow up on your enquiry. - WELONA',
    variables: ['name', 'consultant', 'date'],
    status: 'Approved',
    createdAt: '2025-03-12',
  },
  {
    key: 'TPL-007',
    templateId: '1707170398123456107',
    name: 'WhatsApp - Appointment',
    type: 'Transactional',
    channel: 'WhatsApp',
    senderId: 'Welona Wellness',
    body: '*Welona Wellness*\n\nHi {name}, your *{service}* session is confirmed for *{date} at {time}* at our {branch} branch.\n\nLocation: {locationUrl}',
    variables: ['name', 'service', 'date', 'time', 'branch', 'locationUrl'],
    status: 'Approved',
    createdAt: '2025-04-20',
  },
  {
    key: 'TPL-008',
    templateId: '1707170398123456108',
    name: 'Birthday Wish',
    type: 'Promotional',
    channel: 'SMS',
    senderId: 'VLNPRO',
    body: 'Happy Birthday {name}! Enjoy a complimentary skin consultation this month at {branch}. - WELONA',
    variables: ['name', 'branch'],
    status: 'Pending',
    createdAt: '2026-05-08',
  },
];

export const WALLET: WalletState = {
  balanceCredits: 42_580,
  lowBalanceThreshold: 5_000,
  usedThisMonth: 18_420,
  averageCostPerSms: 18, // 0.18 INR
};

const rupees = (rs: number) => rs * 100;

export const RECHARGE_HISTORY: RechargeEntry[] = [
  { key: 'RC-0001', rechargedAt: '2026-05-15T10:35:00', amount: rupees(10000), credits: 55_000, transactionRef: 'TXN-2026051535201', paymentMethod: 'Net Banking', status: 'Successful', rechargedBy: 'Welona Super Admin' },
  { key: 'RC-0002', rechargedAt: '2026-04-12T14:20:00', amount: rupees(5000),  credits: 27_500, transactionRef: 'TXN-2026041242018', paymentMethod: 'UPI',          status: 'Successful', rechargedBy: 'Welona Super Admin' },
  { key: 'RC-0003', rechargedAt: '2026-03-08T11:00:00', amount: rupees(10000), credits: 55_000, transactionRef: 'TXN-2026030811006', paymentMethod: 'Net Banking', status: 'Successful', rechargedBy: 'Welona Super Admin' },
  { key: 'RC-0004', rechargedAt: '2026-02-20T09:45:00', amount: rupees(5000),  credits: 27_500, transactionRef: 'TXN-2026022009451', paymentMethod: 'Credit Card', status: 'Successful', rechargedBy: 'Welona Super Admin' },
  { key: 'RC-0005', rechargedAt: '2026-02-04T16:10:00', amount: rupees(2000),  credits: 11_000, transactionRef: 'TXN-2026020416108', paymentMethod: 'UPI',          status: 'Failed',     rechargedBy: 'Welona Super Admin' },
  { key: 'RC-0006', rechargedAt: '2026-01-18T13:25:00', amount: rupees(10000), credits: 55_000, transactionRef: 'TXN-2026011813250', paymentMethod: 'Net Banking', status: 'Successful', rechargedBy: 'Welona Super Admin' },
  { key: 'RC-0007', rechargedAt: '2025-12-22T15:50:00', amount: rupees(5000),  credits: 27_500, transactionRef: 'TXN-2025122215509', paymentMethod: 'UPI',          status: 'Successful', rechargedBy: 'Welona Super Admin' },
  { key: 'RC-0008', rechargedAt: '2025-11-14T12:00:00', amount: rupees(10000), credits: 55_000, transactionRef: 'TXN-2025111412004', paymentMethod: 'Net Banking', status: 'Successful', rechargedBy: 'Welona Super Admin' },
];
