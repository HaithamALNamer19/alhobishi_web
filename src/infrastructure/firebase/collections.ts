/**
 * Single source of truth for Firestore collection names.
 * Never hard-code collection strings elsewhere.
 */
export const Collections = {
  USERS: 'users',
  USERNAMES: 'usernames',
  CARTS: 'carts',
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  VARIANTS: 'variants', // subcollection of products
  PRODUCT_PRICING: 'productPricing',
  ORDERS: 'orders',
  ACCOUNT_TRANSACTIONS: 'accountTransactions',
  PAYMENTS: 'payments',
  INVENTORY_MOVEMENTS: 'inventoryMovements',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'auditLogs',
  COUNTERS: 'counters',
  SETTINGS: 'settings',
  BANNERS: 'banners',
  SALES_RETURNS: 'salesReturns',
  SUPPLIERS: 'suppliers',
  PURCHASES: 'purchases',
  PURCHASE_RETURNS: 'purchase_returns',
  STOCK_MOVEMENTS: 'stock_movements',
  SUPPLIER_PAYMENTS: 'supplier_payments',
  SUPPLIER_TRANSACTIONS: 'supplier_transactions',
} as const;

export type CollectionName = (typeof Collections)[keyof typeof Collections];

