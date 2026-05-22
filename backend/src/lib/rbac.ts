/**
 * Role-Based Access Control catalogue.
 * Source: Developer Reference Architecture v2.0, section 7.3.
 *
 * Permissions follow the `module:action` pattern. `*` grants everything.
 * These guards are mirrored on the API; the UI uses them only to hide
 * controls the signed-in staff member cannot use.
 */

export type RoleScope = 'organization' | 'branch';

/** Every Admin Panel module that can be permissioned (section 4.4). */
export const MODULES = [
  'dashboard',
  'sales',
  'bookings',
  'services',
  'products',
  'inventory',
  'customers',
  'staff',
  'branches',
  'finance',
  'promotions',
  'support',
  'reports',
  'analytics',
  'notifications',
  'settings',
] as const;

export type ModuleKey = (typeof MODULES)[number];
export type Action = 'read' | 'create' | 'update' | 'delete';

export interface SystemRole {
  key: string;
  name: string;
  scope: RoleScope;
  description: string;
  /** `module:action` strings, or `['*']` for full access. */
  permissions: string[];
}

/** Read-only permission on every module. */
const readEverything = MODULES.map((m) => `${m}:read`);

/** Full CRUD permission on the given modules. */
const fullAccess = (modules: ModuleKey[]): string[] =>
  modules.flatMap((m) => ['read', 'create', 'update', 'delete'].map((a) => `${m}:${a}`));

/**
 * The eight built-in roles. Seeded for every organization; `isSystem` roles
 * cannot be deleted from the Settings module.
 */
export const SYSTEM_ROLES: SystemRole[] = [
  {
    key: 'super_admin',
    name: 'Super Admin',
    scope: 'organization',
    description: 'All permissions across all modules and branches.',
    permissions: ['*'],
  },
  {
    key: 'ho_manager',
    name: 'HO Manager',
    scope: 'organization',
    description:
      'Full access to bookings, services, inventory, customers, finance, reports and AI insights.',
    permissions: [
      ...fullAccess([
        'sales',
        'bookings',
        'services',
        'products',
        'inventory',
        'customers',
        'finance',
        'promotions',
        'notifications',
      ]),
      'dashboard:read',
      'staff:read',
      'branches:read',
      'reports:read',
      'analytics:read',
      'support:read',
      'support:update',
      'settings:read',
    ],
  },
  {
    key: 'branch_manager',
    name: 'Branch Manager',
    scope: 'branch',
    description:
      'Bookings, inventory (read/adjust/indent), customers (read), staff attendance and own-branch reports.',
    permissions: [
      'dashboard:read',
      ...fullAccess(['bookings']),
      'sales:read',
      'sales:create',
      'sales:update',
      'inventory:read',
      'inventory:update',
      'customers:read',
      'customers:create',
      'staff:read',
      'support:read',
      'support:update',
      'reports:read',
    ],
  },
  {
    key: 'receptionist',
    name: 'Receptionist',
    scope: 'branch',
    description: 'Bookings (read/create/update), services (read) and customers (read).',
    permissions: [
      'dashboard:read',
      'bookings:read',
      'bookings:create',
      'bookings:update',
      'sales:read',
      'sales:create',
      'sales:update',
      'services:read',
      'customers:read',
      'customers:create',
    ],
  },
  {
    key: 'therapist',
    name: 'Therapist / Stylist',
    scope: 'branch',
    description: 'Own bookings (read), services (read) and own customers (read).',
    permissions: ['dashboard:read', 'bookings:read', 'services:read', 'customers:read'],
  },
  {
    key: 'inventory_staff',
    name: 'Inventory Staff',
    scope: 'branch',
    description: 'Full inventory, purchase orders and indent requests.',
    permissions: [
      'dashboard:read',
      ...fullAccess(['inventory', 'products']),
      'reports:read',
    ],
  },
  {
    key: 'finance',
    name: 'Finance',
    scope: 'organization',
    description: 'Full finance: transactions, invoices, expenses and GST reports.',
    permissions: [
      'dashboard:read',
      ...fullAccess(['finance']),
      'reports:read',
      'analytics:read',
    ],
  },
  {
    key: 'auditor',
    name: 'Auditor',
    scope: 'organization',
    description: 'Organization-wide read-only access, including the audit trail.',
    permissions: readEverything,
  },
];
