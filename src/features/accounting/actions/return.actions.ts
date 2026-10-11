'use server';

import { revalidatePath } from 'next/cache';
import { runAction } from '@/core/actions/run-action';
import type { Result } from '@/core/domain/result';
import { requireSession } from '@/core/auth/require-auth';
import { isBackOfficeRole } from '@/core/auth/roles';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { normalizeArabic, toSearchToken } from '@/core/text/arabic-normalize';
import { assertMoney, type Money } from '@/core/domain/money';
import { ledgerRepository } from '../infrastructure/firestore-ledger.repository';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';
import { type CreateSalesReturnInput, createSalesReturnSchema } from '../schemas/return.schemas';

export type { CreateSalesReturnInput } from '../schemas/return.schemas';

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

export async function searchStoreProductsAction(params: {
  query?: string;
  customerRole?: string;
}): Promise<Result<StoreProductReturnOption[]>> {
  return runAction(async () => {
    const session = await requireSession();
    if (!isBackOfficeRole(session.role)) {
      throw new AppError(ErrorCode.FORBIDDEN, { message: 'ليس لديك صلاحية لعرض منتجات المحل.' });
    }

    const rawQ = (params.query || '').trim();
    // Do not return any products if query is empty or less than 2 characters
    if (rawQ.length < 2) {
      return [];
    }

    const isWholesale = params.customerRole === 'wholesale';
    const db = adminDb();

    const normQ = normalizeArabic(rawQ);
    const searchWords = normQ.split(' ').filter(Boolean);
    const cleanLowerQ = rawQ.toLowerCase().trim();
    const token = toSearchToken(rawQ);

    let candidateProducts: any[] = [];

    // 1. Try querying with searchKeywords array-contains if token is available
    if (token) {
      try {
        const snap = await db
          .collection(Collections.PRODUCTS)
          .where('searchKeywords', 'array-contains', token)
          .limit(30)
          .get();

        if (!snap.empty) {
          candidateProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }
      } catch (err) {
        console.warn('Index search failed, falling back to full collection query:', err);
      }
    }

    // 2. If token search returned few or no products (e.g. barcode/SKU direct search), fetch active products
    if (candidateProducts.length === 0) {
      const snap = await db.collection(Collections.PRODUCTS).limit(150).get();
      if (!snap.empty) {
        candidateProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    }

    const activeProducts = candidateProducts.filter((p) => p.status !== 'archived');

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

    const topProducts = matchedProducts.slice(0, 20);
    const options: StoreProductReturnOption[] = [];

    // 4. Fetch variants and pricing for matched products
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

    // Sort options: exact start matches first
    options.sort((a, b) => {
      const aName = normalizeArabic(a.productName);
      const bName = normalizeArabic(b.productName);
      const aStarts = aName.startsWith(normQ) ? 0 : 1;
      const bStarts = bName.startsWith(normQ) ? 0 : 1;
      return aStarts - bStarts;
    });

    return options.slice(0, 30);
  });
}

export async function createSalesReturnAction(
  rawInput: CreateSalesReturnInput
): Promise<Result<{ returnId: string; returnNumber: string; newBalance: number; totalAmount: number }>> {
  return runAction(async () => {
    const session = await requireSession();
    if (!isBackOfficeRole(session.role)) {
      throw new AppError(ErrorCode.FORBIDDEN, { message: 'ليس لديك صلاحية لتسجيل فواتير المردود.' });
    }

    const input = createSalesReturnSchema.parse(rawInput);

    const actorUser = await userRepository.findById(session.uid);
    const actorName = actorUser?.displayName || actorUser?.username || 'مدير المتجر';

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

    revalidatePath('/admin/returns');
    revalidatePath('/admin/customers');
    revalidatePath(`/admin/customers/${input.customerId}/statement`);
    revalidatePath('/admin/products');
    revalidatePath('/account');
    revalidatePath('/account/statement');

    return {
      returnId: result.returnId,
      returnNumber: result.returnNumber,
      newBalance: Number(result.newBalance),
      totalAmount: Number(result.totalAmount),
    };
  });
}

export interface SerializedReturnDetail {
  id: string;
  returnNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    productId: string;
    productName: string;
    variantId: string;
    variantLabel: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  totalAmount: number;
  reason: string | null;
  orderId: string | null;
  recordedBy: string;
  createdAt: string;
}

export async function getSalesReturnDetailAction(
  returnId: string
): Promise<Result<SerializedReturnDetail>> {
  return runAction(async () => {
    const session = await requireSession();
    const isBackOffice = isBackOfficeRole(session.role);

    const returnDoc = await ledgerRepository.getSalesReturnById(returnId);
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
      id: returnDoc.id,
      returnNumber: returnDoc.returnNumber,
      customerId: returnDoc.customerId,
      customerName: customer?.displayName || returnDoc.customerName || 'العميل',
      customerPhone: customer?.phone || returnDoc.customerPhone || '',
      items: returnDoc.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        variantId: i.variantId,
        variantLabel: i.variantLabel || '-',
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.unitPrice) || 0,
        subtotal: Number(i.subtotal) || (Number(i.quantity) || 1) * (Number(i.unitPrice) || 0),
      })),
      totalAmount: Number(returnDoc.totalAmount) || 0,
      reason: returnDoc.reason ?? null,
      orderId: returnDoc.orderId ?? null,
      recordedBy: recorderName || 'مدير المتجر',
      createdAt: createdAtIso,
    };
  });
}
