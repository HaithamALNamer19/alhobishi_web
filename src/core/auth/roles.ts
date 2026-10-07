/**
 * Roles are stored in Firebase Auth custom claims (`role`) — the source of
 * truth used by Security Rules — and mirrored on `users/{uid}.role` for queries.
 * A missing claim means `customer`.
 */
export const Role = {
  CUSTOMER: 'customer',
  WHOLESALE: 'wholesale',
  STAFF: 'staff',
  ADMIN: 'admin',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLES: readonly Role[] = Object.values(Role);

export function parseRole(value: unknown): Role {
  return ROLES.includes(value as Role) ? (value as Role) : Role.CUSTOMER;
}

export const roleLabelsAr: Record<Role, string> = {
  customer: 'عميل',
  wholesale: 'تاجر',
  staff: 'موظف تجهيز',
  admin: 'مدير',
};

/**
 * Permission catalogue. UI and server both check `can(role, permission)`;
 * the server check is authoritative.
 */
export const Permission = {
  // Pricing
  PRICES_VIEW_WHOLESALE: 'prices.viewWholesale',
  // Shopping (customer-facing)
  ORDERS_PLACE: 'orders.place',
  // Back office
  BACKOFFICE_ACCESS: 'backoffice.access',
  ORDERS_VIEW_ALL: 'orders.viewAll',
  ORDERS_PREPARE: 'orders.prepare',
  ORDERS_MARK_READY: 'orders.markReady',
  ORDERS_CONFIRM: 'orders.confirm',
  ORDERS_CANCEL: 'orders.cancel',
  CATALOG_MANAGE: 'catalog.manage',
  INVENTORY_MANAGE: 'inventory.manage',
  CUSTOMERS_VIEW: 'customers.view',
  USERS_MANAGE_ROLES: 'users.manageRoles',
  USERS_MANAGE_STATUS: 'users.manageStatus',
  ACCOUNTS_VIEW: 'accounts.view',
  PAYMENTS_RECORD: 'payments.record',
  ACCOUNTS_ADJUST: 'accounts.adjust',
  DASHBOARD_FINANCE: 'dashboard.finance',
  AUDIT_VIEW: 'audit.view',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const ALL = Object.values(Permission);

const STAFF_PERMISSIONS: Permission[] = [
  Permission.BACKOFFICE_ACCESS,
  Permission.ORDERS_VIEW_ALL,
  Permission.ORDERS_PREPARE,
  Permission.ORDERS_MARK_READY,
  Permission.INVENTORY_MANAGE,
];

const rolePermissions: Record<Role, ReadonlySet<Permission>> = {
  customer: new Set([Permission.ORDERS_PLACE]),
  wholesale: new Set([Permission.ORDERS_PLACE, Permission.PRICES_VIEW_WHOLESALE]),
  staff: new Set(STAFF_PERMISSIONS),
  admin: new Set(ALL.filter((p) => p !== Permission.ORDERS_PLACE)),
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return rolePermissions[role].has(permission);
}

export function isBackOfficeRole(role: Role): boolean {
  return can(role, Permission.BACKOFFICE_ACCESS);
}

/** Roles an admin is allowed to assign from the UI. */
export const ASSIGNABLE_ROLES: readonly Role[] = [Role.CUSTOMER, Role.WHOLESALE, Role.STAFF, Role.ADMIN];

