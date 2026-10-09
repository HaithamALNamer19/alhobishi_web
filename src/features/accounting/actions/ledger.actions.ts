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
          preparedAt: order.preparedAt ? order.preparedAt.toISOString() : null,
          confirmedBy: confirmedByName || 'مدير المتجر',
          confirmedAt: order.confirmedAt ? order.confirmedAt.toISOString() : null,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
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

      const customer = await userRepository.findById(returnDoc.customerId);

      let recorderName = returnDoc.recordedBy;
      if (recorderName && !recorderName.includes(' ') && recorderName.length >= 20) {
        const actorUser = await userRepository.findById(recorderName);
        recorderName = actorUser?.displayName || actorUser?.username || 'مدير المتجر';
      }

      return {
        type: 'RETURN',
        returnDoc: {
          id: returnDoc.id,
          returnNumber: returnDoc.returnNumber,
          customerId: returnDoc.customerId,
          customerName: customer?.displayName || returnDoc.customerName,
          customerPhone: customer?.phone || returnDoc.customerPhone || '',
          customerRole: customer?.role || 'customer',
          items: returnDoc.items,
          totalAmount: returnDoc.totalAmount,
          reason: returnDoc.reason ?? null,
          orderId: returnDoc.orderId ?? null,
          recordedBy: recorderName || 'مدير المتجر',
          createdAt: returnDoc.createdAt.toISOString(),
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
          createdAt: payment.createdAt.toISOString(),
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
    const session = await requirePermission(Permission.ORDERS_CONFIRM);
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
    await requirePermission(Permission.ORDERS_CONFIRM);
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
    await requirePermission(Permission.ORDERS_CONFIRM);
    const rawQ = (params.query || '').trim();
    const isWholesale = params.customerRole === 'wholesale';

    // Fetch active products
    let products = await productRepository.list({
      status: 'active',
      limit: rawQ ? 50 : 25,
      search: rawQ || undefined,
    });

    // In-memory fallback if keyword search had few results
    if (rawQ) {
      const normQ = normalizeArabic(rawQ);
      const allActive = await productRepository.list({ status: 'active', limit: 100 });
      const extraMatches = allActive.filter((p) => {
        const nameMatch = normalizeArabic(p.name).includes(normQ);
        const skuMatch = p.sku?.toLowerCase().includes(rawQ.toLowerCase());
        const barcodeMatch = p.barcode?.includes(rawQ);
        return nameMatch || skuMatch || barcodeMatch;
      });

      const seenIds = new Set(products.map((p) => p.id));
      for (const p of extraMatches) {
        if (!seenIds.has(p.id)) {
          products.push(p);
          seenIds.add(p.id);
        }
      }
    }

    products = products.slice(0, 25);

    const options: StoreProductReturnOption[] = [];

    for (const product of products) {
      const [variants, pricing] = await Promise.all([
        productRepository.getVariants(product.id),
        productRepository.findPricing(product.id).catch(() => null),
      ]);

      if (variants && variants.length > 0) {
        for (const v of variants) {
          if (!v.isActive) continue;

          let price = product.retailPrice;
          if (isWholesale) {
            price =
              pricing?.variantWholesalePrices?.[v.id] ??
              pricing?.wholesalePrice ??
              v.retailPriceOverride ??
              product.retailPrice;
          } else {
            price = v.retailPriceOverride ?? product.retailPrice;
          }

          options.push({
            productId: product.id,
            productName: product.name,
            variantId: v.id,
            variantLabel: v.label || 'الأساسي',
            sku: v.sku || product.sku,
            barcode: v.barcode || product.barcode,
            defaultPrice: price,
            availableStock: v.availableQty,
          });
        }
      } else {
        let price = product.retailPrice;
        if (isWholesale && pricing?.wholesalePrice) {
          price = pricing.wholesalePrice;
        }

        options.push({
          productId: product.id,
          productName: product.name,
          variantId: 'default',
          variantLabel: 'الأساسي',
          sku: product.sku,
          barcode: product.barcode,
          defaultPrice: price,
          availableStock: 0,
        });
      }
    }

    return options;
  });
}


