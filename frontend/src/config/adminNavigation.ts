/**
 * Admin Panel — admin-side navigation (super-admin / management console).
 * Separate from the employee-side `navigation.ts`; lives at /admin/*.
 */
export interface AdminNavItem {
  /** Unique key, also used as the icon identifier. */
  key: string;
  label: string;
  /** Route under /admin; '' resolves to /admin itself. */
  path: string;
  description: string;
  /** Optional sub-items. Present on items that act as a parent (e.g. Master). */
  children?: AdminNavItem[];
}

export const adminNavigation: AdminNavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/admin',
    description: 'Admin overview — organisation health, key metrics and approvals.',
  },
  {
    key: 'master',
    label: 'Master',
    path: '/admin/master',
    description: 'Master data: zones, branches, services, ledgers, taxes and reference lists.',
    children: [
      {
        key: 'master-zone',
        label: 'Zone',
        path: '/admin/master/zone',
        description: 'Geographic / operational zones grouping multiple branches.',
      },
      {
        key: 'master-branches',
        label: 'Branches',
        path: '/admin/master/branches',
        description: 'Branch directory — open, close and edit branch configuration.',
      },
      {
        key: 'master-services',
        label: 'Services',
        path: '/admin/master/services',
        description: 'Service catalogue used in bookings, quotations and invoices.',
      },
      {
        key: 'master-ledgers',
        label: 'Ledgers',
        path: '/admin/master/ledgers',
        description: 'Accounting ledgers (sales, expense, party, cash, bank).',
      },
      {
        key: 'master-payment-mode',
        label: 'Payment Mode',
        path: '/admin/master/payment-mode',
        description: 'Payment methods (cash, UPI, card, bank transfer, cheque…).',
      },
      {
        key: 'master-tax',
        label: 'Tax',
        path: '/admin/master/tax',
        description: 'Tax codes and slabs (GST, CGST, SGST, IGST, cess).',
      },
      {
        key: 'master-media',
        label: 'Media',
        path: '/admin/master/media',
        description: 'Lead/enquiry source channels (website, walk-in, referral, campaign…).',
      },
      {
        key: 'master-role',
        label: 'Role',
        path: '/admin/master/role',
        description: 'Staff roles and the module permissions each role carries.',
      },
      {
        key: 'master-create-offer',
        label: 'Create Offer',
        path: '/admin/master/create-offer',
        description: 'Define organisation-wide offers and discount templates.',
      },
      {
        key: 'master-category',
        label: 'Category',
        path: '/admin/master/category',
        description: 'Categories used to group services, products and treatments.',
      },
      {
        key: 'master-products',
        label: 'Products',
        path: '/admin/master/products',
        description: 'Retail product master — SKU, brand, prices, tax and stock thresholds.',
      },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    path: '/admin/inventory',
    description: 'Per-branch stock levels, opening stock, and the movement ledger.',
    children: [
      {
        key: 'inventory-warehouses',
        label: 'Warehouses',
        path: '/admin/inventory/warehouses',
        description: 'Storage locations within each branch; stock is tracked per warehouse.',
      },
      {
        key: 'inventory-suppliers',
        label: 'Suppliers',
        path: '/admin/inventory/suppliers',
        description: 'Vendor master — contacts, GSTIN and payment terms for procurement.',
      },
      {
        key: 'inventory-purchase-orders',
        label: 'Purchase Orders',
        path: '/admin/inventory/purchase-orders',
        description: 'Raise and track purchase orders; receive stock against them.',
      },
      {
        key: 'inventory-grn',
        label: 'Goods Receipts',
        path: '/admin/inventory/grn',
        description: 'Goods Receipt Notes — incoming stock received against purchase orders.',
      },
      {
        key: 'inventory-transfers',
        label: 'Stock Transfers',
        path: '/admin/inventory/transfers',
        description: 'Move stock between branches — dispatch from source, receive at destination.',
      },
      {
        key: 'inventory-reports',
        label: 'Reports',
        path: '/admin/inventory/reports',
        description: 'Stock valuation, low-stock, and fast / slow / dead-moving analysis.',
      },
      {
        key: 'inventory-batches',
        label: 'Batches',
        path: '/admin/inventory/batches',
        description: 'Batch numbers, expiry dates and per-batch on-hand quantity.',
      },
      {
        key: 'inventory-alerts',
        label: 'Alerts',
        path: '/admin/inventory/alerts',
        description: 'Low-stock, out-of-stock, expiry and overdue purchase-order alerts.',
      },
      {
        key: 'inventory-tracking',
        label: 'Tracking',
        path: '/admin/inventory/tracking',
        description: 'Track inbound shipments through stages — ordered, in-transit, received, QC, stocked.',
      },
      {
        key: 'inventory-audit',
        label: 'Audit Log',
        path: '/admin/inventory/audit',
        description: 'Who changed what — suppliers, purchase orders, receipts, transfers, warehouses.',
      },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    path: '/admin/customers',
    description: 'Customer directory — profiles, relationship modules and sales history.',
  },
  {
    key: 'sales',
    label: 'Sales',
    path: '/admin/sales',
    description: 'Sales pipeline — enquiries, quotations, orders, invoices and payments.',
  },
  {
    key: 'hr',
    label: 'HR',
    path: '/admin/hr',
    description: 'Employee records, attendance, leaves and payroll inputs.',
    children: [
      {
        key: 'hr-dashboard',
        label: 'HR Dashboard',
        path: '/admin/hr/dashboard',
        description: 'Headcount, presence, leave queue, birthdays and upcoming holidays.',
      },
      {
        key: 'hr-employee',
        label: 'Employee',
        path: '/admin/hr/employee',
        description: 'Employee master — personal details, designation, department, branch.',
      },
      {
        key: 'hr-attendance',
        label: 'Attendance',
        path: '/admin/hr/attendance',
        description: 'Daily attendance grid — mark Present / Absent / Half-day / WFH / Leave.',
      },
      {
        key: 'hr-leaves',
        label: 'Leaves',
        path: '/admin/hr/leaves',
        description: 'Leave applications with approval workflow and per-employee balance.',
      },
      {
        key: 'hr-leave-types',
        label: 'Leave Types',
        path: '/admin/hr/leave-types',
        description: 'Configure leave categories (Casual, Sick, Earned, Maternity…).',
      },
      {
        key: 'hr-holidays',
        label: 'Holidays',
        path: '/admin/hr/holidays',
        description: 'Public, regional and optional holidays for the company calendar.',
      },
      {
        key: 'hr-departments',
        label: 'Departments',
        path: '/admin/hr/departments',
        description: 'Organisational departments (Front Desk, Clinical, Finance, Marketing…).',
      },
      {
        key: 'hr-designations',
        label: 'Designations',
        path: '/admin/hr/designations',
        description: 'Job titles assigned to employees (Receptionist, Manager, Therapist…).',
      },
      {
        key: 'hr-user',
        label: 'User',
        path: '/admin/hr/user',
        description: 'System users with login access (roles, permissions, status).',
      },
    ],
  },
  {
    key: 'cancellation',
    label: 'Cancellation',
    path: '/admin/cancellation',
    description: 'Approve booking, order and invoice cancellations with reason tracking.',
    children: [
      {
        key: 'cancellation-customers',
        label: 'Customers',
        path: '/admin/cancellation/customers',
        description: 'Customer master used by the cancellation workflow.',
      },
      {
        key: 'cancellation-package',
        label: 'Package Cancel',
        path: '/admin/cancellation/package-cancel',
        description: 'Pending package-cancellation requests.',
      },
      {
        key: 'cancellation-receipt',
        label: 'Receipt Cancel',
        path: '/admin/cancellation/receipt-cancel',
        description: 'Pending receipt-cancellation requests / refunds.',
      },
      {
        key: 'cancellation-voucher',
        label: 'Voucher Cancel',
        path: '/admin/cancellation/voucher-cancel',
        description: 'Pending expense-voucher cancellation requests.',
      },
    ],
  },
  {
    key: 'report',
    label: 'Branch Report',
    path: '/admin/report',
    description: 'Cross-branch financial, sales, staff and inventory reports.',
    children: [
      {
        key: 'report-sales',
        label: 'Sales',
        path: '/admin/report/sales',
        description: 'Sales, revenue, branch-wise and product/treatment reports.',
        children: [
          { key: 'report-sales-sales', label: 'Sales Report', path: '/admin/report/sales/sales-report', description: 'Overall sales performance summary.' },
          { key: 'report-sales-revenue', label: 'Revenue', path: '/admin/report/sales/revenue', description: 'Revenue breakdown by period and segment.' },
          { key: 'report-sales-branch', label: 'Branch Wise Sales', path: '/admin/report/sales/branch-wise-sales', description: 'Branch-level sales comparison.' },
          { key: 'report-sales-balances', label: 'Balances Report', path: '/admin/report/sales/balances-report', description: 'Outstanding balance per customer / package.' },
          { key: 'report-sales-duplicate-receipt', label: 'Duplicate Receipt', path: '/admin/report/sales/duplicate-receipt', description: 'Re-print of issued receipts.' },
          { key: 'report-sales-client-wise-ppt', label: 'Client Wise PPT', path: '/admin/report/sales/client-wise-ppt', description: 'Client-wise package/payment ledger.' },
          { key: 'report-sales-treatment-wise', label: 'Treatment Wise Sales', path: '/admin/report/sales/treatment-wise-sales', description: 'Sales grouped by treatment.' },
          { key: 'report-sales-product-sales', label: 'Product Sales Report', path: '/admin/report/sales/product-sales-report', description: 'Retail product sales summary.' },
        ],
      },
      {
        key: 'report-services',
        label: 'Services',
        path: '/admin/report/services',
        description: 'Operational service & client lifecycle reports.',
        children: [
          { key: 'report-services-client-transfer', label: 'Client Transfer', path: '/admin/report/services/client-transfer', description: 'Customers transferred between branches.' },
          { key: 'report-services-client-medical', label: 'Client Medical', path: '/admin/report/services/client-medical', description: 'Medical records / prescriptions per client.' },
          { key: 'report-services-client-enrolments', label: 'Client Enrolments', path: '/admin/report/services/client-enrolments', description: 'New client sign-ups by period.' },
          { key: 'report-services-package-completion', label: 'Package Completion', path: '/admin/report/services/package-completion', description: 'Package sessions completed vs remaining.' },
          { key: 'report-services-client-regularity', label: 'Client Regularity', path: '/admin/report/services/client-regularity', description: 'Visit frequency and attendance.' },
          { key: 'report-services-session-entries', label: 'Session Entries', path: '/admin/report/services/session-entries', description: 'Logged therapy / consultation sessions.' },
          { key: 'report-services-weight-loss', label: 'Weight Loss', path: '/admin/report/services/weight-loss', description: 'Weight-loss programme outcomes.' },
          { key: 'report-services-success-unsuccess', label: 'Success / Unsuccess Report', path: '/admin/report/services/success-unsuccess-report', description: 'Treatment success / failure tracking.' },
        ],
      },
      {
        key: 'report-calls-media',
        label: 'Calls & Media',
        path: '/admin/report/calls-media',
        description: 'Lead, walk-in, phone and telecaller activity.',
        children: [
          { key: 'report-cm-lead-transfer', label: 'Lead Transfer', path: '/admin/report/calls-media/lead-transfer', description: 'Leads reassigned across owners / branches.' },
          { key: 'report-cm-walk-in', label: 'Walk-In Details', path: '/admin/report/calls-media/walk-in-details', description: 'Walk-in customer log.' },
          { key: 'report-cm-phone-enquiry', label: 'Phone Enquiry', path: '/admin/report/calls-media/phone-enquiry', description: 'Inbound phone enquiry record.' },
          { key: 'report-cm-telecaller-call', label: 'Telecaller Call Report', path: '/admin/report/calls-media/telecaller-call-report', description: 'Outbound call activity per telecaller.' },
          { key: 'report-cm-enquiry', label: 'Enquiry Report', path: '/admin/report/calls-media/enquiry-report', description: 'Enquiries by source, status and outcome.' },
        ],
      },
      {
        key: 'report-cash',
        label: 'Cash',
        path: '/admin/report/cash',
        description: 'Cash balance, statements and expenses.',
        children: [
          { key: 'report-cash-balance', label: 'Cash Balance', path: '/admin/report/cash/cash-balance', description: 'Current cash position per branch.' },
          { key: 'report-cash-statement', label: 'Cash Statement', path: '/admin/report/cash/cash-statement', description: 'Day-wise cash inflow/outflow.' },
          { key: 'report-cash-expense', label: 'Expense Report', path: '/admin/report/cash/expense-report', description: 'Expense ledger summary.' },
        ],
      },
      {
        key: 'report-incentives',
        label: 'Incentives',
        path: '/admin/report/incentives',
        description: 'EPM, sales incentives and telecaller incentives.',
        children: [
          { key: 'report-inc-epm-sales', label: 'EPM / Sales Incentive %', path: '/admin/report/incentives/epm-sales-incentive', description: 'EPM and salesperson incentive percentages.' },
          { key: 'report-inc-telecaller', label: 'Telecaller Report', path: '/admin/report/incentives/telecaller-report', description: 'Telecaller incentive calculation.' },
        ],
      },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    path: '/admin/admin',
    description: 'Admin users, roles, permissions and audit log.',
    children: [
      {
        key: 'admin-sms',
        label: 'Sms Integration',
        path: '/admin/admin/sms-integration',
        description: 'Connect SMS gateway, manage sender IDs and credit balance.',
      },
      {
        key: 'admin-scheduler',
        label: 'Message Scheduler',
        path: '/admin/admin/message-scheduler',
        description: 'Schedule one-off and recurring SMS / WhatsApp campaigns.',
      },
      {
        key: 'admin-appointments',
        label: 'Appointments',
        path: '/admin/admin/appointments',
        description: 'Centralised appointment monitoring across branches.',
      },
    ],
  },
  {
    key: 'change-paymode',
    label: 'Change Paymode',
    path: '/admin/change-paymode',
    description: 'Override the payment method on a recorded payment with audit trail.',
  },
  {
    key: 'settings',
    label: 'Settings',
    path: '/admin/settings',
    description: 'Appearance, theme colours and other admin-side preferences.',
  },
];

/** Flatten the admin tree to one list (top-level + every child). */
function flattenAdminNav(items: AdminNavItem[] = adminNavigation): AdminNavItem[] {
  return items.flatMap((item) =>
    item.children && item.children.length > 0
      ? [item, ...flattenAdminNav(item.children)]
      : [item],
  );
}

/** Lookup an admin nav item by its key (searches children too). */
export function getAdminNavItem(key: string): AdminNavItem | undefined {
  return flattenAdminNav().find((item) => item.key === key);
}

/**
 * Find the admin nav item that owns a given route. Uses longest-prefix matching
 * across the flattened tree so deep routes (e.g. /admin/master/zone/123)
 * resolve to the most specific item.
 */
export function getAdminNavItemByPath(path: string): AdminNavItem | undefined {
  return flattenAdminNav()
    .filter((item) => (item.path === '/admin' ? path === '/admin' : path.startsWith(item.path)))
    .sort((a, b) => b.path.length - a.path.length)[0];
}
