'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { runAction } from '@/core/actions/run-action';
import type { Result } from '@/core/domain/result';
import { requireSession, requirePermission } from '@/core/auth/require-auth';
import { isBackOfficeRole, Permission } from '@/core/auth/roles';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import { orderRepository } from '@/features/orders/infrastructure/firestore-order.repository';
import { ledgerRepository } from '../infrastructure/firestore-ledger.repository';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';
import { productRepository } from '@/features/products/infrastructure/firestore-product.repository';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { normalizeArabic } from '@/core/text/arabic-normalize';
import type { OrderItem } from '@/features/orders/domain/order';
import type { SalesReturnItem } from '../domain/ledger';
import { assertMoney, type Money } from '@/core/domain/money';

const detailSchema = z.object({
  type: z.enum(['INVOICE', 'PAYMENT', 'RETURN']),
  id: z.string().min(1),
});

export type SerializedInvoiceDetail = {
  type: 'INVOICE';
  order: {
    id: string;
    orderNumber: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerRole: string;
    status: string;
    businessDate: string;
    items: OrderItem[];
    totalAmount: number;
    customerNotes: string | null;
    preparedBy: string | null;
    preparedAt: string | null;
    confirmedBy: string | null;
    confirmedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export type SerializedPaymentDetail = {
  type: 'PAYMENT';
  payment: {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerRole: string;
    amount: number;
    method: 'CASH' | 'TRANSFER' | 'OTHER';
    referenceNumber: string | null;
    notes: string | null;
    recordedBy: string;
    createdAt: string;
  };
};

export type SerializedReturnDetail = {
  type: 'RETURN';
  returnDoc: {
    id: string;
    returnNumber: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerRole: string;
    items: SalesReturnItem[];
    totalAmount: number;
    reason: string | null;
    orderId: string | null;
    recordedBy: string;
    createdAt: string;
  };
};

export type LedgerDocumentDetail = SerializedInvoiceDetail | SerializedPaymentDetail | SerializedReturnDetail;

export async function getLedgerDocumentDetailAction(params: {
  type: 'INVOICE' | 'PAYMENT' | 'RETURN';
  id: string;
}): Promise<Result<LedgerDocumentDetail>> {
  return runAction(async () => {
    const input = detailSchema.parse(params);
    const session = await requireSession();
    const isBackOffice = isBackOfficeRole(session.role);

    if (input.type === 'INVOICE') {
      const order = await orderRepository.findById(input.id);
      if (!order) {
        throw new AppError(ErrorCode.NOT_FOUND, { message: 'فاتورة الطلب غير موجودة في النظام.' });
      }

      if (!isBackOffice && order.customerId !== session.uid) {
        throw new AppError(ErrorCode.FORBIDDEN, { message: 'ليس لديك صلاحية لعرض هذه الفاتورة.' });
      }

      let customerDisplayName = order.customerName;
      if (order.customerId) {
        try {
          const customer = await userRepository.findById(order.customerId);
          if (customer?.displayName) {
            customerDisplayName = customer.displayName;
          }
        } catch {
          // fallback
        }
      }

      // Resolve and sanitize preparedBy
      let preparedByName = order.preparedBy;
      if (preparedByName && preparedByName.includes('@')) {
        const uname = preparedByName.split('@')[0];
        try {
          const u = await userRepository.findByUsername(uname);
          preparedByName = u?.displayName || (uname === 'admin' ? 'مدير المتجر' : 'أمين المستودع');
        } catch {
          preparedByName = uname === 'admin' ? 'مدير المتجر' : 'أمين المستودع';
        }
      } else if (preparedByName && !preparedByName.includes(' ') && preparedByName.length >= 20) {
        try {
          const u = await userRepository.findById(preparedByName);
          preparedByName = u?.displayName || 'أمين المستودع';
        } catch {
          preparedByName = 'أمين المستودع';
        }
      }

      // Resolve and sanitize confirmedBy
      let confirmedByName = order.confirmedBy;
      if (confirmedByName && confirmedByName.includes('@')) {
        const uname = confirmedByName.split('@')[0];
        try {
          const u = await userRepository.findByUsername(uname);
          confirmedByName = u?.displayName || (uname === 'admin' ? 'مدير المتجر' : 'إدارة المتجر');
        } catch {
          confirmedByName = uname === 'admin' ? 'مدير المتجر' : 'إدارة المتجر';
        }
      } else if (confirmedByName && !confirmedByName.includes(' ') && confirmedByName.length >= 20) {
        try {
          const u = await userRepository.findById(confirmedByName);
          confirmedByName = u?.displayName || 'مدير المتجر';
        } catch {
          confirmedByName = 'مدير المتجر';
        }
      }

      return {
        type: 'INVOICE',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          customerName: customerDisplayName,
          customerPhone: order.customerPhone,
          customerRole: order.customerRole,
          status: order.status,
          businessDate: order.businessDate,
          items: order.items,
          totalAmount: order.totalAmount,
          customerNotes: order.customerNotes,
          preparedBy: preparedByName || 'أمين المستودع',
          preparedAt: order.preparedAt && !isNaN(order.preparedAt.getTime()) ? order.preparedAt.toISOString() : null,
          confirmedBy: confirmedByName || 'مدير المتجر',
          confirmedAt: order.confirmedAt && !isNaN(order.confirmedAt.getTime()) ? order.confirmedAt.toISOString() : null,
          createdAt: order.createdAt instanceof Date && !isNaN(order.createdAt.getTime()) ? order.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: order.updatedAt instanceof Date && !isNaN(order.updatedAt.getTime()) ? order.updatedAt.toISOString() : new Date().toISOString(),
        },
      };
    } else if (input.type === 'RETURN') {
      const returnDoc = await ledgerRepository.getSalesReturnById(input.id);
      if (!returnDoc) {
        throw new AppError(ErrorCode.NOT_FOUND, { message: 'فاتورة مردود المبيعات غير موجودة.' });
      }

      if (!isBackOffice && returnDoc.customerId !== session.uid) {
        throw new AppError(ErrorCode.FORBIDDEN, { message: 'ليس لديك صلاحية لعرض هذا المردود.' });
      }

      let customer = null;
      try {
        if (returnDoc.customerId) {
          customer = await userRepository.findById(returnDoc.customerId);
        }
      } catch {
        // ignore
      }

      let recorderName = returnDoc.recordedBy;
      if (recorderName && !recorderName.includes(' ') && recorderName.length >= 20) {
        try {
          const actorUser = await userRepository.findById(recorderName);
          recorderName = actorUser?.displayName || actorUser?.username || 'مدير المتجر';
        } catch {
          // ignore
        }
      }

      const createdAtIso =
        returnDoc.createdAt instanceof Date && !isNaN(returnDoc.createdAt.getTime())
          ? returnDoc.createdAt.toISOString()
          : new Date().toISOString();

      return {
        type: 'RETURN',
        returnDoc: {
          id: returnDoc.id,
          returnNumber: returnDoc.returnNumber,
          customerId: returnDoc.customerId,
          customerName: customer?.displayName || returnDoc.customerName || 'العميل',
          customerPhone: customer?.phone || returnDoc.customerPhone || '',
          customerRole: customer?.role || 'customer',
          items: returnDoc.items || [],
          totalAmount: returnDoc.totalAmount || 0,
          reason: returnDoc.reason ?? null,
          orderId: returnDoc.orderId ?? null,
          recordedBy: recorderName || 'مدير المتجر',
          createdAt: createdAtIso,
        },
      };
    } else {
      const payment = await ledgerRepository.getPaymentById(input.id);
      if (!payment) {
        throw new AppError(ErrorCode.NOT_FOUND, { message: 'سند القبض المالي غير موجود.' });
      }

      if (!isBackOffice && payment.customerId !== session.uid) {
        throw new AppError(ErrorCode.FORBIDDEN, { message: 'ليس لديك صلاحية لعرض هذا السند.' });
      }

      const customer = await userRepository.findById(payment.customerId);

      let collectorName = payment.recordedBy;
      // If recordedBy looks like a Firebase UID (>= 20 chars without spaces), resolve real user name
      if (payment.recordedBy && !payment.recordedBy.includes(' ') && payment.recordedBy.length >= 20) {
        const actorUser = await userRepository.findById(payment.recordedBy);
        if (actorUser?.displayName) {
          collectorName = actorUser.displayName;
        } else if (actorUser?.username) {
          collectorName = actorUser.username;
        } else {
          collectorName = 'إدارة المتجر / المحاسب';
        }
      }

      return {
        type: 'PAYMENT',
        payment: {
          id: payment.id,
          customerId: payment.customerId,
          customerName: customer?.displayName || 'العميل',
          customerPhone: customer?.phone || '',
          customerRole: customer?.role || 'customer',
          amount: payment.amount,
          method: payment.method,
          referenceNumber: payment.referenceNumber,
          notes: payment.notes,
          recordedBy: collectorName || 'إدارة المتجر / المحاسب',
          createdAt:
            payment.createdAt instanceof Date && !isNaN(payment.createdAt.getTime())
              ? payment.createdAt.toISOString()
              : new Date().toISOString(),
        },
      };
    }
  });
}

export const salesReturnSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      productName: z.string().min(1),
      variantId: z.string().min(1),
      variantLabel: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPrice: z.number().min(0),
    })
  ).min(1),
  reason: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
});

export async function recordSalesReturnAction(
  rawInput: z.infer<typeof salesReturnSchema>
): Promise<Result<{ returnId: string; returnNumber: string; newBalance: Money }>> {
  return runAction(async () => {
    const session = await requireSession();
    if (!isBackOfficeRole(session.role)) {
      throw new AppError(ErrorCode.FORBIDDEN, { message: 'ليس لديك صلاحية لتسجيل فواتير المردود.' });
    }
    const input = salesReturnSchema.parse(rawInput);

    const actorUser = await userRepository.findById(session.uid);
    const actorName =
      actorUser?.displayName ||
      actorUser?.username ||
      'مدير المتجر';

    const result = await ledgerRepository.recordSalesReturn({
      customerId: input.customerId,
      items: input.items.map((i) => ({
        ...i,
        unitPrice: assertMoney(i.unitPrice),
      })),
      reason: input.reason?.trim() || null,
      orderId: input.orderId?.trim() || null,
      actorId: session.uid,
      actorName,
    });

    revalidatePath('/admin/customers');
    revalidatePath(`/admin/customers/${input.customerId}/statement`);
    revalidatePath('/admin/products');
    revalidatePath('/account');
    revalidatePath('/account/statement');

    return result;
  });
}

export async function getCustomerReturnableItemsAction(
  customerId: string
): Promise<Result<Array<{
  orderNumber: string;
  orderId: string;
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  purchasedQty: number;
  unitPrice: number;
  orderDate: string;
}>>> {
  return runAction(async () => {
    const session = await requireSession();
    if (!isBackOfficeRole(session.role)) {
      throw new AppError(ErrorCode.FORBIDDEN, { message: 'ليس لديك صلاحية لعرض مشتريات العميل.' });
    }
    const orders = await orderRepository.listByCustomer(customerId);
    const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'READY');
    const items: Array<{
      orderNumber: string;
      orderId: string;
      productId: string;
      productName: string;
      variantId: string;
      variantLabel: string;
      purchasedQty: number;
      unitPrice: number;
      orderDate: string;
    }> = [];

    for (const o of confirmedOrders) {
      for (const item of o.items) {
        items.push({
          orderNumber: o.orderNumber,
          orderId: o.id,
          productId: item.productId,
          productName: item.productName,
          variantId: item.variantId,
          variantLabel: item.variantLabel || '-',
          purchasedQty: item.preparedQty ?? item.requestedQty ?? 1,
          unitPrice: item.unitPrice,
          orderDate: o.createdAt.toLocaleDateString('ar-YE'),
        });
      }
    }

    return items;
  });
}

export interface StoreProductReturnOption {
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  sku: string | null;
  barcode: string | null;
  defaultPrice: number;
  availableStock: number;
}

export async function searchStoreProductsForReturnAction(params: {
  query?: string;
  customerRole?: string;
}): Promise<Result<StoreProductReturnOption[]>> {
  return runAction(async () => {
    const session = await requireSession();
    const isBackOffice =
      session.role === 'admin' ||
      session.role === 'staff' ||
      isBackOfficeRole(session.role);
    if (!isBackOffice) {
      throw new AppError(ErrorCode.FORBIDDEN, { message: 'ليس لديك صلاحية لعرض منتجات المحل.' });
    }
    const rawQ = (params.query || '').trim();
    // Do not return products if search query is empty
    if (!rawQ) {
      return [];
    }

    const isWholesale = params.customerRole === 'wholesale';
    const db = adminDb();

    // 1. Fetch products from Firestore directly without index restrictions
    const snap = await db.collection(Collections.PRODUCTS).get();
    if (snap.empty) {
      return [];
    }

    const allProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
    const activeProducts = allProducts.filter((p) => p.status !== 'archived');

    // 2. Prepare search criteria
    const normQ = normalizeArabic(rawQ);
    const searchWords = normQ.split(' ').filter(Boolean);
    const cleanLowerQ = rawQ.toLowerCase().trim();

    // 3. Match products in-memory (Name, Arabic normalized, SKU, Barcode, Keywords)
    const matchedProducts = activeProducts.filter((p) => {
      const name = String(p.name || '');
      const normName = normalizeArabic(name);
      const sku = String(p.sku || '').toLowerCase();
      const barcode = String(p.barcode || '').trim();
      const desc = String(p.description || '');
      const normDesc = normalizeArabic(desc);

      // Direct full or substring match
      if (normName.includes(normQ) || name.toLowerCase().includes(cleanLowerQ)) {
        return true;
      }

      // Word-by-word match
      if (searchWords.length > 0 && searchWords.every((w) => normName.includes(w) || normDesc.includes(w))) {
        return true;
      }

      // SKU or barcode match
      if (cleanLowerQ && (sku.includes(cleanLowerQ) || barcode.includes(cleanLowerQ))) {
        return true;
      }

      // searchKeywords match
      if (Array.isArray(p.searchKeywords)) {
        if (p.searchKeywords.some((k: string) => k.includes(normQ) || normQ.includes(k) || k.includes(cleanLowerQ))) {
          return true;
        }
      }

      return false;
    });

    // Limit to top 30 products to keep responses fast
    const topProducts = matchedProducts.slice(0, 30);

    // 4. Fetch variants and pricing for matched products only
    const options: StoreProductReturnOption[] = [];

    await Promise.all(
      topProducts.map(async (product) => {
        try {
          const [variantsSnap, pricingDoc] = await Promise.all([
            db
              .collection(Collections.PRODUCTS)
              .doc(product.id)
              .collection(Collections.VARIANTS)
              .get()
              .catch(() => null),
            db
              .collection(Collections.PRODUCT_PRICING)
              .doc(product.id)
              .get()
              .catch(() => null),
          ]);

          const pricing = pricingDoc?.exists ? pricingDoc.data() : null;
          const variants =
            variantsSnap && !variantsSnap.empty
              ? variantsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any))
              : [];

          const activeVariants = variants.filter((v) => v.isActive !== false);

          if (activeVariants.length > 0) {
            for (const v of activeVariants) {
              let price = Number(product.retailPrice) || 0;
              if (isWholesale) {
                price = Number(
                  pricing?.variantWholesalePrices?.[v.id] ??
                    pricing?.wholesalePrice ??
                    v.retailPriceOverride ??
                    product.retailPrice ??
                    0
                );
              } else {
                price = Number(v.retailPriceOverride ?? product.retailPrice ?? 0);
              }

              options.push({
                productId: product.id,
                productName: String(product.name || ''),
                variantId: v.id,
                variantLabel: String(v.label || 'الافتراضي'),
                sku: v.sku || product.sku || null,
                barcode: v.barcode || product.barcode || null,
                defaultPrice: Math.round(price) || 0,
                availableStock: Number(v.availableQty ?? v.stockQty ?? 0),
              });
            }
          } else {
            let price = Number(product.retailPrice) || 0;
            if (isWholesale && pricing?.wholesalePrice) {
              price = Number(pricing.wholesalePrice) || 0;
            }

            options.push({
              productId: product.id,
              productName: String(product.name || ''),
              variantId: 'default',
              variantLabel: 'الافتراضي',
              sku: product.sku || null,
              barcode: product.barcode || null,
              defaultPrice: Math.round(price) || 0,
              availableStock: Number(product.stockQty ?? 0),
            });
          }
        } catch (err) {
          console.error(`Error loading return options for product ${product.id}:`, err);
        }
      })
    );

    // Sort options: products matching name first
    options.sort((a, b) => {
      const aName = normalizeArabic(a.productName);
      const bName = normalizeArabic(b.productName);
      const aStarts = aName.startsWith(normQ) ? 0 : 1;
      const bStarts = bName.startsWith(normQ) ? 0 : 1;
      return aStarts - bStarts;
    });

    return options.slice(0, 50);
  });
}


