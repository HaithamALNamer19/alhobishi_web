import 'server-only';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { toBusinessDate } from '@/core/domain/dates';
import type { Order, OrderStatus } from '@/features/orders/domain/order';
import { Timestamp } from 'firebase-admin/firestore';

export interface StockAlert {
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  sku: string | null;
  stockQty: number;
  availableQty: number;
  threshold: number;
  state: 'out' | 'low';
}

export interface AdminDashboardMetrics {
  // Orders
  pendingOrdersCount: number;
  readyOrdersCount: number;
  confirmedOrdersCount: number;
  todayOrdersCount: number;
  todaySalesAmount: number;
  totalOrdersCount: number;
  recentOrders: Order[];

  // Inventory
  totalProductsCount: number;
  outOfStockProductsCount: number;
  lowStockProductsCount: number;
  inStockProductsCount: number;
  totalStockAlertsCount: number;
  stockAlerts: StockAlert[];

  // Customers & Balances
  totalCustomersCount: number;
  wholesaleCount: number;
  totalReceivables: number;

  // Unread Alerts
  unreadAlertsCount: number;
}

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const db = adminDb();
  const todayStr = toBusinessDate(new Date());

  // Run all primary queries in parallel
  const [
    ordersSnap,
    productsSnap,
    variantsSnap,
    usersSnap,
    notificationsSnap,
  ] = await Promise.all([
    db.collection(Collections.ORDERS).get(),
    db.collection(Collections.PRODUCTS).get(),
    db.collectionGroup(Collections.VARIANTS).get(),
    db.collection(Collections.USERS).get(),
    db.collection(Collections.NOTIFICATIONS)
      .where('userId', 'in', ['STAFF_BROADCAST', 'ADMIN_BROADCAST'])
      .where('isRead', '==', false)
      .get()
      .catch(() => ({ size: 0 })),
  ]);

  // 1. Process Orders
  const allOrders: Order[] = ordersSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      orderNumber: data.orderNumber || doc.id,
      customerId: data.customerId || '',
      customerName: data.customerName || 'عميل',
      customerPhone: data.customerPhone || '',
      customerRole: data.customerRole || 'customer',
      status: (data.status || 'PENDING') as OrderStatus,
      businessDate: data.businessDate || '',
      items: data.items || [],
      totalAmount: data.totalAmount || 0,
      customerNotes: data.customerNotes || null,
      isLocked: Boolean(data.isLocked),
      preparedBy: data.preparedBy || null,
      preparedAt: data.preparedAt instanceof Timestamp ? data.preparedAt.toDate() : null,
      confirmedBy: data.confirmedBy || null,
      confirmedAt: data.confirmedAt instanceof Timestamp ? data.confirmedAt.toDate() : null,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  });

  allOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  let pendingOrdersCount = 0;
  let readyOrdersCount = 0;
  let confirmedOrdersCount = 0;
  let todayOrdersCount = 0;
  let todaySalesAmount = 0;

  for (const o of allOrders) {
    if (o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'PARTIALLY_READY') {
      pendingOrdersCount++;
    } else if (o.status === 'READY') {
      readyOrdersCount++;
    } else if (o.status === 'CONFIRMED' || o.status === 'COMPLETED') {
      confirmedOrdersCount++;
    }

    if (o.businessDate === todayStr) {
      todayOrdersCount++;
      todaySalesAmount += o.totalAmount || 0;
    }
  }

  const recentOrders = allOrders.slice(0, 5);

  // 2. Process Products and Variants for Inventory Metrics
  interface VariantRecord {
    id: string;
    productId: string;
    label: string;
    sku: string | null;
    stockQty: number;
    availableQty: number;
    lowStockThreshold: number;
  }

  const variantsByProduct = new Map<string, VariantRecord[]>();

  variantsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const pid = (data.productId || doc.ref.parent.parent?.id || '') as string;
    if (!pid) return;

    if (!variantsByProduct.has(pid)) {
      variantsByProduct.set(pid, []);
    }

    const stockQty = (data.stockQty ?? 0) as number;
    const reservedQty = (data.reservedQty ?? 0) as number;
    const availableQty = (data.availableQty ?? Math.max(0, stockQty - reservedQty)) as number;
    const lowStockThreshold = (data.lowStockThreshold ?? 5) as number;

    variantsByProduct.get(pid)!.push({
      id: doc.id,
      productId: pid,
      label: data.label || 'الافتراضي',
      sku: data.sku || null,
      stockQty,
      availableQty,
      lowStockThreshold,
    });
  });

  const stockAlerts: StockAlert[] = [];
  let outOfStockProductsCount = 0;
  let lowStockProductsCount = 0;
  let inStockProductsCount = 0;

  for (const prodDoc of productsSnap.docs) {
    const pData = prodDoc.data();
    const pid = prodDoc.id;
    const pName = (pData.name || 'منتج') as string;
    const docInStock = pData.inStock !== false; // defaults to true if missing

    const variants = variantsByProduct.get(pid) || [];

    if (variants.length > 0) {
      const totalAvailable = variants.reduce((sum, v) => sum + v.availableQty, 0);
      const allOut = totalAvailable <= 0;
      const hasLow = variants.some((v) => v.availableQty > 0 && v.availableQty <= v.lowStockThreshold);

      if (allOut || !docInStock) {
        outOfStockProductsCount++;
      } else if (hasLow) {
        lowStockProductsCount++;
      } else {
        inStockProductsCount++;
      }

      // Collect specific variant alerts
      for (const v of variants) {
        if (v.availableQty <= 0) {
          stockAlerts.push({
            productId: pid,
            productName: pName,
            variantId: v.id,
            variantLabel: v.label,
            sku: v.sku,
            stockQty: v.stockQty,
            availableQty: v.availableQty,
            threshold: v.lowStockThreshold,
            state: 'out',
          });
        } else if (v.availableQty <= v.lowStockThreshold) {
          stockAlerts.push({
            productId: pid,
            productName: pName,
            variantId: v.id,
            variantLabel: v.label,
            sku: v.sku,
            stockQty: v.stockQty,
            availableQty: v.availableQty,
            threshold: v.lowStockThreshold,
            state: 'low',
          });
        }
      }
    } else {
      // Single product without separate variants subcollection
      if (!docInStock) {
        outOfStockProductsCount++;
        stockAlerts.push({
          productId: pid,
          productName: pName,
          variantId: 'default',
          variantLabel: 'الافتراضي',
          sku: pData.sku || null,
          stockQty: 0,
          availableQty: 0,
          threshold: 5,
          state: 'out',
        });
      } else {
        inStockProductsCount++;
      }
    }
  }

  // 3. Process Users and Receivables
  let totalCustomersCount = 0;
  let wholesaleCount = 0;
  let totalReceivables = 0;

  usersSnap.docs.forEach((uDoc) => {
    totalCustomersCount++;
    const uData = uDoc.data();
    if (uData.role === 'wholesale') {
      wholesaleCount++;
    }
    const balance = uData.account?.balance ?? uData.balance ?? 0;
    if (balance > 0) {
      totalReceivables += balance;
    }
  });

  return {
    pendingOrdersCount,
    readyOrdersCount,
    confirmedOrdersCount,
    todayOrdersCount,
    todaySalesAmount,
    totalOrdersCount: allOrders.length,
    recentOrders,

    totalProductsCount: productsSnap.size,
    outOfStockProductsCount,
    lowStockProductsCount,
    inStockProductsCount,
    totalStockAlertsCount: stockAlerts.length,
    stockAlerts,

    totalCustomersCount,
    wholesaleCount,
    totalReceivables,

    unreadAlertsCount: notificationsSnap.size,
  };
}
