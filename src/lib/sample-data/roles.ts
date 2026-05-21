/**
 * Dummy data for the Admin → Master → Role screen.
 *
 * Models a typical RBAC setup: every module exposes a fixed set of actions
 * (View / Create / Edit / Delete / Export / Approve). A role is a named
 * bundle of permissions plus a list of assigned staff members. System roles
 * are locked — they ship with the platform and can't be edited or deleted.
 */

export type Permission = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve';

export const ALL_PERMISSIONS: Permission[] = ['view', 'create', 'edit', 'delete', 'export', 'approve'];

export const PERMISSION_LABEL: Record<Permission, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  export: 'Export',
  approve: 'Approve',
};

export interface ModuleSpec {
  key: string;
  label: string;
  /** Which actions are applicable to this module. */
  permissions: Permission[];
}

export interface ModuleGroup {
  key: string;
  label: string;
  modules: ModuleSpec[];
}

/** The full permission matrix axes — modules grouped by domain. */
export const MODULE_GROUPS: ModuleGroup[] = [
  {
    key: 'sales', label: 'Sales',
    modules: [
      { key: 'customers',    label: 'Customers',    permissions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'leads',        label: 'Leads & Enquiries', permissions: ['view', 'create', 'edit', 'delete', 'export', 'approve'] },
      { key: 'quotations',   label: 'Quotations',   permissions: ['view', 'create', 'edit', 'delete', 'export', 'approve'] },
      { key: 'orders',       label: 'Orders',       permissions: ['view', 'create', 'edit', 'delete', 'export', 'approve'] },
      { key: 'invoices',     label: 'Invoices',     permissions: ['view', 'create', 'edit', 'delete', 'export', 'approve'] },
      { key: 'payments',     label: 'Payments',     permissions: ['view', 'create', 'edit', 'delete', 'export'] },
    ],
  },
  {
    key: 'customer-care', label: 'Customer Care',
    modules: [
      { key: 'bookings',         label: 'Bookings',         permissions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'appointments',     label: 'Appointments',     permissions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'packages',         label: 'Packages',         permissions: ['view', 'create', 'edit', 'delete'] },
      { key: 'offers',           label: 'Customer Offers',  permissions: ['view', 'create', 'edit', 'delete'] },
      { key: 'prescriptions',    label: 'Prescriptions',    permissions: ['view', 'create', 'edit', 'delete'] },
      { key: 'medical-reports',  label: 'Medical Reports',  permissions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'feedback',         label: 'Feedback',         permissions: ['view', 'create', 'edit', 'delete'] },
    ],
  },
  {
    key: 'operations', label: 'Cash & Operations',
    modules: [
      { key: 'cash-denomination', label: 'Cash Denomination', permissions: ['view', 'create', 'edit'] },
      { key: 'petty-cash',        label: 'Petty Cash',        permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
      { key: 'vouchers',          label: 'Voucher Entry',     permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
      { key: 'day-close',         label: 'Day Closer',        permissions: ['view', 'create', 'approve'] },
      { key: 'cancellation',      label: 'Cancellations',     permissions: ['view', 'create', 'approve'] },
      { key: 'change-paymode',    label: 'Change Pay Mode',   permissions: ['view', 'edit', 'approve'] },
    ],
  },
  {
    key: 'reports', label: 'Reports',
    modules: [
      { key: 'report-sales',    label: 'Sales Reports',       permissions: ['view', 'export'] },
      { key: 'report-services', label: 'Services Reports',    permissions: ['view', 'export'] },
      { key: 'report-cm',       label: 'Calls & Media Reports', permissions: ['view', 'export'] },
      { key: 'report-cash',     label: 'Cash Reports',        permissions: ['view', 'export'] },
      { key: 'report-incent',   label: 'Incentive Reports',   permissions: ['view', 'export'] },
    ],
  },
  {
    key: 'hr', label: 'HR',
    modules: [
      { key: 'employees',    label: 'Employees',    permissions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'departments',  label: 'Departments',  permissions: ['view', 'create', 'edit', 'delete'] },
      { key: 'designations', label: 'Designations', permissions: ['view', 'create', 'edit', 'delete'] },
      { key: 'system-users', label: 'System Users', permissions: ['view', 'create', 'edit', 'delete'] },
    ],
  },
  {
    key: 'master', label: 'Master Data',
    modules: [
      { key: 'branches',      label: 'Branches',      permissions: ['view', 'create', 'edit', 'delete'] },
      { key: 'zones',         label: 'Zones',         permissions: ['view', 'create', 'edit', 'delete'] },
      { key: 'services',      label: 'Services',      permissions: ['view', 'create', 'edit', 'delete'] },
      { key: 'categories',    label: 'Categories',    permissions: ['view', 'create', 'edit', 'delete'] },
      { key: 'ledgers',       label: 'Ledgers',       permissions: ['view', 'create', 'edit', 'delete'] },
      { key: 'taxes',         label: 'Taxes',         permissions: ['view', 'create', 'edit', 'delete'] },
      { key: 'payment-modes', label: 'Payment Modes', permissions: ['view', 'create', 'edit', 'delete'] },
      { key: 'media',         label: 'Media Channels', permissions: ['view', 'create', 'edit', 'delete'] },
    ],
  },
  {
    key: 'admin', label: 'Admin',
    modules: [
      { key: 'sms-integration',   label: 'SMS Integration',   permissions: ['view', 'edit'] },
      { key: 'message-scheduler', label: 'Message Scheduler', permissions: ['view', 'create', 'edit', 'delete'] },
      { key: 'settings',          label: 'Settings',          permissions: ['view', 'edit'] },
      { key: 'roles',             label: 'Roles & Permissions', permissions: ['view', 'create', 'edit', 'delete'] },
      { key: 'audit-log',         label: 'Audit Log',         permissions: ['view', 'export'] },
    ],
  },
];

/** Flat lookup so the page can sanity-check stored permissions. */
export const ALL_MODULES: ModuleSpec[] = MODULE_GROUPS.flatMap((g) => g.modules);

export interface RoleMember {
  key: string;
  name: string;
  designation: string;
  branchName: string;
  email: string;
  assignedAt: string;       // ISO date
}

export interface Role {
  key: string;
  name: string;
  description: string;
  /** A small emoji used as the role badge. */
  emoji: string;
  isSystem: boolean;          // system roles can't be edited / deleted
  isActive: boolean;
  /** module-key → set of granted permissions (as array, for JSON-friendliness). */
  permissions: Record<string, Permission[]>;
  members: RoleMember[];
  /** Audit. */
  createdBy: string;
  createdAt: string;
}

/** Convenience builder — grants every applicable permission on every module. */
function fullPermissions(): Record<string, Permission[]> {
  const out: Record<string, Permission[]> = {};
  for (const m of ALL_MODULES) out[m.key] = [...m.permissions];
  return out;
}

/** Convenience builder — grants only the listed permissions on each listed module. */
function permsFor(spec: Record<string, Permission[]>): Record<string, Permission[]> {
  return spec;
}

export const ROLES: Role[] = [
  {
    key: 'role-super-admin',
    name: 'Super Admin',
    description: 'Unrestricted access to every module and every action.',
    emoji: '🛡️',
    isSystem: true, isActive: true,
    permissions: fullPermissions(),
    members: [
      { key: 'm-1', name: 'Welona Super Admin', designation: 'Director', branchName: 'Jubilee Hills', email: 'superadmin@welona.com', assignedAt: '2024-08-01' },
    ],
    createdBy: 'System', createdAt: '2024-08-01',
  },
  {
    key: 'role-branch-manager',
    name: 'Branch Manager',
    description: 'Full operational control of a branch — sales, customers, ops, payments, reports.',
    emoji: '🏢',
    isSystem: false, isActive: true,
    permissions: permsFor({
      // Sales
      customers: ['view', 'create', 'edit', 'export'],
      leads: ['view', 'create', 'edit', 'approve', 'export'],
      quotations: ['view', 'create', 'edit', 'approve', 'export'],
      orders: ['view', 'create', 'edit', 'approve', 'export'],
      invoices: ['view', 'create', 'edit', 'approve', 'export'],
      payments: ['view', 'create', 'edit', 'export'],
      // Customer care
      bookings: ['view', 'create', 'edit', 'export'],
      appointments: ['view', 'create', 'edit', 'export'],
      packages: ['view', 'create', 'edit'],
      offers: ['view', 'create', 'edit'],
      'medical-reports': ['view', 'export'],
      feedback: ['view'],
      // Operations
      'cash-denomination': ['view', 'create', 'edit'],
      'petty-cash': ['view', 'create', 'edit', 'approve'],
      vouchers: ['view', 'create', 'edit', 'approve'],
      'day-close': ['view', 'create', 'approve'],
      cancellation: ['view', 'create', 'approve'],
      'change-paymode': ['view', 'edit', 'approve'],
      // Reports
      'report-sales': ['view', 'export'],
      'report-services': ['view', 'export'],
      'report-cm': ['view', 'export'],
      'report-cash': ['view', 'export'],
      // HR (read-only of own staff)
      employees: ['view'],
    }),
    members: [
      { key: 'm-2', name: 'Rohit Sharma',   designation: 'Sr Branch Manager', branchName: 'Jubilee Hills',   email: 'rohit.sharma@welona.com',   assignedAt: '2024-08-12' },
      { key: 'm-3', name: 'Vikram Singh',   designation: 'Operations Manager', branchName: 'Connaught Place', email: 'vikram.singh@welona.com',   assignedAt: '2024-09-05' },
    ],
    createdBy: 'Welona Super Admin', createdAt: '2024-08-10',
  },
  {
    key: 'role-sales-manager',
    name: 'Sales Manager',
    description: 'Lead & quotation pipeline, sales conversion, sales reports.',
    emoji: '📈',
    isSystem: false, isActive: true,
    permissions: permsFor({
      customers: ['view', 'create', 'edit', 'export'],
      leads: ['view', 'create', 'edit', 'approve', 'export'],
      quotations: ['view', 'create', 'edit', 'approve', 'export'],
      orders: ['view', 'create', 'edit', 'export'],
      invoices: ['view'],
      payments: ['view'],
      bookings: ['view'],
      appointments: ['view'],
      'report-sales': ['view', 'export'],
      'report-cm': ['view', 'export'],
    }),
    members: [
      { key: 'm-4', name: 'Priya Kapoor', designation: 'Doctor',           branchName: 'Banjara Hills', email: 'priya.kapoor@welona.com', assignedAt: '2024-10-01' },
    ],
    createdBy: 'Welona Super Admin', createdAt: '2024-08-15',
  },
  {
    key: 'role-front-desk',
    name: 'Front Desk',
    description: 'Walk-ins, appointment booking, receipts, basic customer record keeping.',
    emoji: '🏪',
    isSystem: false, isActive: true,
    permissions: permsFor({
      customers: ['view', 'create', 'edit'],
      leads: ['view', 'create', 'edit'],
      bookings: ['view', 'create', 'edit'],
      appointments: ['view', 'create', 'edit'],
      payments: ['view', 'create'],
      packages: ['view'],
      offers: ['view'],
      feedback: ['view', 'create'],
      'cash-denomination': ['view', 'create'],
      'petty-cash': ['view', 'create'],
    }),
    members: [
      { key: 'm-5', name: 'Anita Reddy', designation: 'Front desk',  branchName: 'Koramangala', email: 'anita.reddy@welona.com', assignedAt: '2024-11-04' },
      { key: 'm-6', name: 'Divya Rao',   designation: 'Receptionist', branchName: 'Banjara Hills', email: 'divya.rao@welona.com',  assignedAt: '2025-01-10' },
      { key: 'm-7', name: 'Sneha Iyer',  designation: 'Chat Support Executive', branchName: 'Anna Nagar', email: 'sneha.iyer@welona.com',   assignedAt: '2025-04-22' },
    ],
    createdBy: 'Welona Super Admin', createdAt: '2024-08-20',
  },
  {
    key: 'role-telecaller',
    name: 'Telecaller',
    description: 'Inbound + outbound call handling, lead capture, follow-ups, call reports.',
    emoji: '📞',
    isSystem: false, isActive: true,
    permissions: permsFor({
      customers: ['view'],
      leads: ['view', 'create', 'edit', 'export'],
      'report-cm': ['view', 'export'],
    }),
    members: [
      { key: 'm-8', name: 'Sneha Iyer', designation: 'Chat Support Executive', branchName: 'Anna Nagar', email: 'sneha.iyer@welona.com', assignedAt: '2025-04-22' },
    ],
    createdBy: 'Welona Super Admin', createdAt: '2024-09-01',
  },
  {
    key: 'role-doctor',
    name: 'Doctor / Consultant',
    description: 'Patient records, prescriptions, medical reports, appointment access.',
    emoji: '🩺',
    isSystem: false, isActive: true,
    permissions: permsFor({
      customers: ['view', 'edit'],
      appointments: ['view', 'edit'],
      prescriptions: ['view', 'create', 'edit', 'delete'],
      'medical-reports': ['view', 'create', 'edit', 'export'],
      packages: ['view'],
      'report-services': ['view', 'export'],
    }),
    members: [
      { key: 'm-9',  name: 'Priya Kapoor', designation: 'Doctor',        branchName: 'Banjara Hills', email: 'priya.kapoor@welona.com', assignedAt: '2024-10-01' },
      { key: 'm-10', name: 'Rajesh Kumar', designation: 'Junior Doctor', branchName: 'Jubilee Hills', email: 'rajesh.kumar@welona.com', assignedAt: '2025-07-22' },
    ],
    createdBy: 'Welona Super Admin', createdAt: '2024-09-10',
  },
  {
    key: 'role-therapist',
    name: 'Therapist',
    description: 'View assigned appointments, log session entries.',
    emoji: '💆',
    isSystem: false, isActive: true,
    permissions: permsFor({
      customers: ['view'],
      appointments: ['view', 'edit'],
      packages: ['view'],
      prescriptions: ['view'],
    }),
    members: [
      { key: 'm-11', name: 'Karthik Iyer', designation: 'Therapist',           branchName: 'Bandra West', email: 'karthik.iyer@welona.com', assignedAt: '2025-03-18' },
      { key: 'm-12', name: 'Arjun Mehta',  designation: 'Aesthetic Therapist', branchName: 'Indiranagar', email: 'arjun.mehta@welona.com',  assignedAt: '2025-03-18' },
    ],
    createdBy: 'Welona Super Admin', createdAt: '2024-09-12',
  },
  {
    key: 'role-accountant',
    name: 'Accountant',
    description: 'Cash management, vouchers, ledgers, taxes, finance reports.',
    emoji: '💰',
    isSystem: false, isActive: true,
    permissions: permsFor({
      payments: ['view', 'edit', 'export'],
      'cash-denomination': ['view', 'create', 'edit'],
      'petty-cash': ['view', 'create', 'edit', 'approve'],
      vouchers: ['view', 'create', 'edit', 'approve'],
      'day-close': ['view', 'create', 'approve'],
      ledgers: ['view', 'create', 'edit'],
      taxes: ['view', 'edit'],
      'payment-modes': ['view', 'edit'],
      cancellation: ['view', 'approve'],
      'change-paymode': ['view', 'edit', 'approve'],
      'report-sales': ['view', 'export'],
      'report-cash': ['view', 'export'],
      'audit-log': ['view', 'export'],
    }),
    members: [],
    createdBy: 'Welona Super Admin', createdAt: '2024-09-18',
  },
  {
    key: 'role-hr',
    name: 'HR Manager',
    description: 'Employee directory, departments, designations, login users.',
    emoji: '👥',
    isSystem: false, isActive: true,
    permissions: permsFor({
      employees: ['view', 'create', 'edit', 'export'],
      departments: ['view', 'create', 'edit'],
      designations: ['view', 'create', 'edit'],
      'system-users': ['view', 'create', 'edit', 'delete'],
    }),
    members: [],
    createdBy: 'Welona Super Admin', createdAt: '2024-10-05',
  },
  {
    key: 'role-viewer',
    name: 'Viewer',
    description: 'Read-only access to all modules and reports.',
    emoji: '👁️',
    isSystem: false, isActive: true,
    permissions: (() => {
      const out: Record<string, Permission[]> = {};
      for (const m of ALL_MODULES) {
        if (m.permissions.includes('view')) out[m.key] = ['view'];
        if (m.permissions.includes('export')) out[m.key] = [...(out[m.key] ?? []), 'export'];
      }
      return out;
    })(),
    members: [
      { key: 'm-13', name: 'Meera Joshi', designation: 'Counsellor', branchName: 'Powai', email: 'meera.joshi@welona.com', assignedAt: '2026-01-18' },
    ],
    createdBy: 'Welona Super Admin', createdAt: '2024-11-12',
  },
];
