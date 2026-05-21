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
    label: 'Customers',
    path: '/customers',
    moduleId: 'M01',
    description: 'Customer list and 360-degree profile view.',
  },
  {
    key: 'staff',
    label: 'Employees',
    path: '/staff',
    moduleId: 'M01',
    description: 'Employee directory with roles, branches and account details.',
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
    label: 'Reports',
    path: '/reports',
    moduleId: 'M10',
    description: 'Sales, customer, staff and inventory reports.',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    moduleId: 'M09',
    description: 'BI dashboards and AI-powered insights.',
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
  { key: 'overview', label: 'Overview', itemKeys: ['dashboard'] },
  { key: 'sales', label: 'Sales & Appointments', itemKeys: ['sales', 'bookings'] },
  { key: 'catalogue', label: 'Catalogue', itemKeys: ['services', 'products', 'inventory'] },
  { key: 'people', label: 'People', itemKeys: ['customers', 'staff', 'branches'] },
  {
    key: 'finance',
    label: 'Finance',
    itemKeys: ['finance', 'pending-payments', 'promotions'],
  },
  {
    key: 'cash',
    label: 'Cash Management',
    itemKeys: ['cash-denomination', 'petty-cash', 'voucher-entry', 'day-close'],
  },
  { key: 'insights', label: 'Insights', itemKeys: ['reports', 'analytics'] },
  { key: 'admin', label: 'Administration', itemKeys: ['support', 'notifications', 'settings'] },
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
