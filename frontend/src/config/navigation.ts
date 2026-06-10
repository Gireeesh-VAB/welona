/**
 * Admin Panel navigation structure.
 * Each module maps to a route under the (dashboard) layout group.
 * Source: Developer Reference Architecture v2.0, section 4.4.
 */
export interface NavItem {
  /** Unique key, also used as the icon identifier. */
  key: string;
  label: string;
  path: string;
  /** Module ID from the reference architecture (section 1.4), if applicable. */
  moduleId?: string;
  /** Short description shown on placeholder pages. */
  description: string;
  /** Optional sub-items for hierarchical nav (e.g., Reports with children). */
  children?: NavItem[];
}

export const navigation: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/',
    description: 'Organisation-wide KPIs, revenue charts and quick insights.',
  },
  {
    key: 'sales',
    label: 'Sales',
    path: '/sales',
    moduleId: 'M13',
    description:
      'Sales pipeline: leads, quotations, orders, deliveries, invoices and salesperson performance.',
  },
  {
    key: 'bookings',
    label: 'Service Appointments',
    path: '/bookings',
    moduleId: 'M03',
    description: 'Service appointment calendar with scheduling.',
  },
  {
    key: 'services',
    label: 'Services',
    path: '/services',
    moduleId: 'M02',
    description: 'Service catalogue, categories and variants management.',
  },
  {
    key: 'products',
    label: 'Products',
    path: '/products',
    moduleId: 'M05',
    description: 'Product catalogue CRUD.',
  },
  {
    key: 'inventory',
    label: 'Inventory',
    path: '/inventory',
    moduleId: 'M05',
    description: 'Multi-branch stock dashboard, indents and purchase orders.',
  },
  {
    key: 'customers',
    label: 'Customer & History',
    path: '/customers',
    moduleId: 'M01',
    description: 'Customer list and 360-degree profile view.',
  },
  {
    key: 'admin-assigned',
    label: 'Admin Assigned',
    path: '/admin-assigned',
    description: 'All data assigned to this branch by the administrator.',
  },
  {
    key: 'staff',
    label: 'Branch Employees',
    path: '/staff',
    moduleId: 'M01',
    description: 'Branch employee directory with roles and account details.',
  },
  {
    key: 'enquiry',
    label: 'Enquiry & Followup',
    path: '/sales/enquiries',
    moduleId: 'M13',
    description: 'Manage customer enquiries and follow-ups.',
  },
  {
    key: 'session-management',
    label: 'Session Management',
    path: '/session-management',
    moduleId: 'M15',
    description: 'Track and log customer package sessions.',
  },
  {
    key: 'duplicate-receipt',
    label: 'Duplicate Receipt',
    path: '/duplicate-receipt',
    description: 'Generate duplicate receipts for customer records.',
  },
  {
    key: 'bank-deposit',
    label: 'BankDeposit',
    path: '/bank-deposit',
    description: 'Bank deposit management and reconciliation.',
  },
  {
    key: 'branches',
    label: 'Branches',
    path: '/branches',
    moduleId: 'M12',
    description: 'Branch management.',
  },
  {
    key: 'finance',
    label: 'Finance',
    path: '/finance',
    moduleId: 'M07',
    description: 'Transactions, invoices, expenses and GST.',
  },
  {
    key: 'pending-payments',
    label: 'Pending Payments',
    path: '/pending-payments',
    moduleId: 'M07',
    description: 'Invoices with an outstanding balance to collect.',
  },
  {
    key: 'cash-denomination',
    label: 'Cash Denomination',
    path: '/cash-denomination',
    moduleId: 'M07',
    description: 'Count physical cash note-by-note.',
  },
  {
    key: 'petty-cash',
    label: 'Petty Cash Entry',
    path: '/petty-cash',
    moduleId: 'M07',
    description: 'Petty cash receipts and expenses.',
  },
  {
    key: 'voucher-entry',
    label: 'Voucher Entry',
    path: '/voucher-entry',
    moduleId: 'M07',
    description: 'Payment, receipt, journal and contra vouchers.',
  },
  {
    key: 'day-close',
    label: 'Day Closer',
    path: '/day-close',
    moduleId: 'M07',
    description: 'End-of-day cash reconciliation.',
  },
  {
    key: 'promotions',
    label: 'Promotions',
    path: '/promotions',
    moduleId: 'M06',
    description: 'Offers, loyalty configuration and referral tracking.',
  },
  {
    key: 'support',
    label: 'Support',
    path: '/support',
    moduleId: 'M08',
    description: 'Ticket management with SLA tracking.',
  },
  {
    key: 'reports',
    label: 'Report',
    path: '/reports',
    moduleId: 'M10',
    description: 'Sales, customer, staff and inventory reports.',
    children: [
      {
        key: 'reports-main',
        label: 'Reports',
        path: '/reports',
        description: 'Sales, customer, staff and inventory reports.',
      },
      {
        key: 'analytics',
        label: 'Analytics',
        path: '/analytics',
        moduleId: 'M09',
        description: 'BI dashboards and AI-powered insights.',
      },
    ],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    moduleId: 'M11',
    description: 'Templates, broadcast campaigns and delivery analytics.',
  },
  {
    key: 'settings',
    label: 'Settings',
    path: '/settings',
    moduleId: 'M12',
    description: 'Organisation, roles and third-party integrations.',
  },
];

/**
 * Sidebar grouping. Modules are organised into labelled sections; `itemKeys`
 * references `NavItem.key` values and also fixes their display order.
 */
export interface NavGroup {
  key: string;
  label: string;
  itemKeys: string[];
}

export const navGroups: NavGroup[] = [
  {
    key: 'operations',
    label: 'Operations',
    itemKeys: [
      'dashboard',
      'customers',
      'bookings',
      'enquiry',
      'session-management',
    ],
  },
  {
    key: 'catalog',
    label: 'Catalog',
    itemKeys: [
      'products',
      'inventory',
      'services',
    ],
  },
  {
    key: 'sales-finance',
    label: 'Sales & Finance',
    itemKeys: [
      'pending-payments',
      'duplicate-receipt',
      'bank-deposit',
      'cash-denomination',
      'petty-cash',
      'voucher-entry',
      'day-close',
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    itemKeys: [
      'analytics',
      'reports',
      'promotions',
    ],
  },
  {
    key: 'branch',
    label: 'Branch',
    itemKeys: [
      'admin-assigned',
      'branches',
      'staff',
    ],
  },
  {
    key: 'more',
    label: 'More',
    itemKeys: [
      'notifications',
      'support',
      'settings',
    ],
  },
];

/** Lookup a nav item by its key. */
export function getNavItem(key: string): NavItem | undefined {
  return navigation.find((item) => item.key === key);
}

/**
 * Resolve the navigation, grouped into sidebar sections. Unknown keys are
 * skipped; empty groups are omitted.
 */
export function getGroupedNavigation(): Array<{ group: NavGroup; items: NavItem[] }> {
  return navGroups
    .map((group) => ({
      group,
      items: group.itemKeys
        .map(getNavItem)
        .filter((item): item is NavItem => item !== undefined),
    }))
    .filter((entry) => entry.items.length > 0);
}

/**
 * Find the nav item that owns a given route. Uses longest-prefix matching so
 * detail routes (e.g. `/sales/leads/123`) resolve to their module.
 */
export function getNavItemByPath(path: string): NavItem | undefined {
  return [...navigation]
    .filter((item) => (item.path === '/' ? path === '/' : path.startsWith(item.path)))
    .sort((a, b) => b.path.length - a.path.length)[0];
}
