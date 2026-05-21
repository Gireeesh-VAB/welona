/**
 * Dummy data for the Admin → Admin → Message Scheduler screen.
 *
 * A campaign is a planned message blast. It targets an audience segment, uses
 * one DLT-approved template (see `sms-integration.ts`), runs at a scheduled
 * time, and may recur. Delivery stats accumulate as the campaign runs.
 */

export type MessageChannel = 'SMS' | 'WhatsApp' | 'Both';
export type CampaignStatus = 'Scheduled' | 'Running' | 'Completed' | 'Failed' | 'Paused' | 'Cancelled';
export type Recurrence = 'One-off' | 'Daily' | 'Weekly' | 'Monthly';
export type AudienceSegment =
  | 'All Customers'
  | 'Active Customers'
  | 'Dormant Customers'
  | 'Birthday This Month'
  | 'Skin Services'
  | 'LASER'
  | 'Hair Care'
  | 'Wellness'
  | 'New Enquiries'
  | 'Specific Branch';

export interface MessageCampaign {
  key: string;
  name: string;
  channel: MessageChannel;
  templateName: string;
  audience: AudienceSegment;
  branchName: string | null;        // populated when audience = 'Specific Branch'
  audienceSize: number;
  scheduledAt: string;              // ISO timestamp
  recurrence: Recurrence;
  status: CampaignStatus;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  createdBy: string;
  createdAt: string;
}

export const CAMPAIGN_AUDIENCES: AudienceSegment[] = [
  'All Customers', 'Active Customers', 'Dormant Customers', 'Birthday This Month',
  'Skin Services', 'LASER', 'Hair Care', 'Wellness',
  'New Enquiries', 'Specific Branch',
];

export const MESSAGE_CAMPAIGNS: MessageCampaign[] = [
  {
    key: 'CMP-0001',
    name: 'May Festive Skin Offer',
    channel: 'SMS',
    templateName: 'Festive Promo - Skin',
    audience: 'Skin Services',
    branchName: null,
    audienceSize: 2_420,
    scheduledAt: '2026-05-22T10:00:00',
    recurrence: 'One-off',
    status: 'Scheduled',
    sent: 0, delivered: 0, failed: 0, pending: 2_420,
    createdBy: 'Welona Super Admin',
    createdAt: '2026-05-20T15:20:00',
  },
  {
    key: 'CMP-0002',
    name: 'Daily Session Reminders',
    channel: 'SMS',
    templateName: 'Session Reminder',
    audience: 'Active Customers',
    branchName: null,
    audienceSize: 145,
    scheduledAt: '2026-05-21T18:00:00',
    recurrence: 'Daily',
    status: 'Running',
    sent: 145, delivered: 138, failed: 4, pending: 3,
    createdBy: 'Welona Super Admin',
    createdAt: '2025-03-01T10:00:00',
  },
  {
    key: 'CMP-0003',
    name: 'Dormant Customer Reactivation',
    channel: 'WhatsApp',
    templateName: 'WhatsApp - Appointment',
    audience: 'Dormant Customers',
    branchName: null,
    audienceSize: 580,
    scheduledAt: '2026-05-21T11:30:00',
    recurrence: 'One-off',
    status: 'Completed',
    sent: 580, delivered: 548, failed: 32, pending: 0,
    createdBy: 'Welona Super Admin',
    createdAt: '2026-05-19T16:45:00',
  },
  {
    key: 'CMP-0004',
    name: 'Birthday Wishes — May',
    channel: 'SMS',
    templateName: 'Birthday Wish',
    audience: 'Birthday This Month',
    branchName: null,
    audienceSize: 88,
    scheduledAt: '2026-05-21T09:00:00',
    recurrence: 'Monthly',
    status: 'Completed',
    sent: 88, delivered: 85, failed: 3, pending: 0,
    createdBy: 'Welona Super Admin',
    createdAt: '2026-05-01T09:00:00',
  },
  {
    key: 'CMP-0005',
    name: 'Jubilee Hills Walk-in Drive',
    channel: 'SMS',
    templateName: 'Festive Promo - Skin',
    audience: 'Specific Branch',
    branchName: 'Jubilee Hills',
    audienceSize: 320,
    scheduledAt: '2026-05-23T11:00:00',
    recurrence: 'One-off',
    status: 'Scheduled',
    sent: 0, delivered: 0, failed: 0, pending: 320,
    createdBy: 'Welona Super Admin',
    createdAt: '2026-05-20T11:15:00',
  },
  {
    key: 'CMP-0006',
    name: 'Weekly Wellness Tips',
    channel: 'WhatsApp',
    templateName: 'WhatsApp - Appointment',
    audience: 'Wellness',
    branchName: null,
    audienceSize: 220,
    scheduledAt: '2026-05-22T08:30:00',
    recurrence: 'Weekly',
    status: 'Scheduled',
    sent: 0, delivered: 0, failed: 0, pending: 220,
    createdBy: 'Welona Super Admin',
    createdAt: '2025-09-15T10:00:00',
  },
  {
    key: 'CMP-0007',
    name: 'New Enquiry Welcome',
    channel: 'SMS',
    templateName: 'Follow-up Call',
    audience: 'New Enquiries',
    branchName: null,
    audienceSize: 35,
    scheduledAt: '2026-05-21T10:30:00',
    recurrence: 'Daily',
    status: 'Running',
    sent: 35, delivered: 33, failed: 2, pending: 0,
    createdBy: 'Welona Super Admin',
    createdAt: '2024-12-10T10:00:00',
  },
  {
    key: 'CMP-0008',
    name: 'LASER Package Promotion',
    channel: 'Both',
    templateName: 'Festive Promo - Skin',
    audience: 'LASER',
    branchName: null,
    audienceSize: 410,
    scheduledAt: '2026-05-18T11:00:00',
    recurrence: 'One-off',
    status: 'Failed',
    sent: 410, delivered: 0, failed: 410, pending: 0,
    createdBy: 'Welona Super Admin',
    createdAt: '2026-05-17T17:30:00',
  },
  {
    key: 'CMP-0009',
    name: 'Hair Care Renewal Drive',
    channel: 'SMS',
    templateName: 'Follow-up Call',
    audience: 'Hair Care',
    branchName: null,
    audienceSize: 178,
    scheduledAt: '2026-05-20T11:00:00',
    recurrence: 'One-off',
    status: 'Completed',
    sent: 178, delivered: 172, failed: 6, pending: 0,
    createdBy: 'Welona Super Admin',
    createdAt: '2026-05-19T10:00:00',
  },
  {
    key: 'CMP-0010',
    name: 'Banjara Hills Re-Open Promo',
    channel: 'WhatsApp',
    templateName: 'WhatsApp - Appointment',
    audience: 'Specific Branch',
    branchName: 'Banjara Hills',
    audienceSize: 412,
    scheduledAt: '2026-05-24T10:00:00',
    recurrence: 'One-off',
    status: 'Paused',
    sent: 0, delivered: 0, failed: 0, pending: 412,
    createdBy: 'Welona Super Admin',
    createdAt: '2026-05-20T09:00:00',
  },
];
