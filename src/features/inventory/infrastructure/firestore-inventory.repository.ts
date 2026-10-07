import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import { computeStockState } from '@/features/products/domain/variant';
import type { AdjustStockInput, InventoryMovement } from '../domain/inventory';

export class FirestoreInventoryRepository {
  private get db() {
    return adminDb();
  }

  async adjustStock(
    input: AdjustStockInput,
    actorId: string,
    actorName: string
  ): Promise<{
    previousStockQty: number;
    newStockQty: number;
    delta: number;
    availableQty: number;
  }> {
    return this.db.runTransaction(async (tx) => {
      const prodRef = this.db.collection(Collections.PRODUCTS).doc(input.productId);
      const varRef = prodRef.collection(Collections.VARIANTS).doc(input.variantId);
      const variantsColRef = prodRef.collection(Collections.VARIANTS);

      // 1. ALL READS MUST OCCUR BEFORE ANY WRITES IN FIRESTORE TRANSACTIONS
      const [prodSnap, varSnap, siblingVariantsSnap] = await Promise.all([
        tx.get(prodRef),
        tx.get(varRef),
        tx.get(variantsColRef),
      ]);

      if (!prodSnap.exists) {
        throw new AppError(ErrorCode.NOT_FOUND, { message: 'المنتج غير موجود.' });
      }

      if (!varSnap.exists) {
        throw new AppError(ErrorCode.NOT_FOUND, { message: 'خيار المنتج المطلوب غير موجود.' });
      }

      const varData = varSnap.data()!;
      const currentStock = (varData.stockQty ?? 0) as number;
      const currentReserved = (varData.reservedQty ?? 0) as number;
      const threshold = (varData.lowStockThreshold ?? 5) as number;

      if (input.newStockQty < currentReserved) {
        throw new AppError(ErrorCode.STOCK_BELOW_RESERVED, {
          message: `لا يمكن تقليل المخزون إلى أقل من الكمية المحجوزة الحالية (${currentReserved} قطعة).`,
        });
      }

      const delta = input.newStockQty - currentStock;
      const newAvailable = Math.max(0, input.newStockQty - currentReserved);
      const newStockState = computeStockState(newAvailable, threshold);

      // Recomputing rollups on the product using pre-fetched sibling variants
      let isAnyInStock = false;
      const availableOptionKeysSet = new Set<string>();

      for (const doc of siblingVariantsSnap.docs) {
        const d = doc.data();
        const available = doc.id === input.variantId ? newAvailable : (d.availableQty ?? 0);
        if (available > 0) {
          isAnyInStock = true;
          const optVals = (d.optionValues || {}) as Record<string, string>;
          for (const [k, v] of Object.entries(optVals)) {
            availableOptionKeysSet.add(`${k}:${v}`);
          }
        }
      }

      // 2. NOW EXECUTE ALL WRITES TOGETHER
      tx.update(varRef, {
        stockQty: input.newStockQty,
        availableQty: newAvailable,
        stockState: newStockState,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Log movement
      const moveRef = this.db.collection(Collections.INVENTORY_MOVEMENTS).doc();
      tx.set(moveRef, {
        productId: input.productId,
        variantId: input.variantId,
        type: 'ADJUSTMENT',
        delta,
        stockAfter: input.newStockQty,
        reservedAfter: currentReserved,
        orderId: null,
        reason: input.reason,
        actorId,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Audit log
      const auditRef = this.db.collection(Collections.AUDIT_LOGS).doc();
      tx.set(auditRef, {
        actorId,
        actorName,
        action: 'INVENTORY_ADJUSTED',
        entityType: 'inventory',
        entityId: `${input.productId}:${input.variantId}`,
        oldData: { stockQty: currentStock, availableQty: varData.availableQty },
        newData: { stockQty: input.newStockQty, availableQty: newAvailable, reason: input.reason },
        timestamp: FieldValue.serverTimestamp(),
      });

      tx.update(prodRef, {
        inStock: isAnyInStock,
        availableOptionKeys: Array.from(availableOptionKeysSet),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        previousStockQty: currentStock,
        newStockQty: input.newStockQty,
        delta,
        availableQty: newAvailable,
      };
    });
  }

  async getMovements(params: {
    productId?: string;
    variantId?: string;
    limit?: number;
  } = {}): Promise<InventoryMovement[]> {
    let snap: FirebaseFirestore.QuerySnapshot;
    try {
      let query: FirebaseFirestore.Query = this.db.collection(Collections.INVENTORY_MOVEMENTS);

      if (params.productId) {
        query = query.where('productId', '==', params.productId);
      }
      if (params.variantId) {
        query = query.where('variantId', '==', params.variantId);
      }

      query = query.orderBy('createdAt', 'desc');

      if (params.limit) {
        query = query.limit(params.limit);
      }

      snap = await query.get();
    } catch {
      let fallbackQuery: FirebaseFirestore.Query = this.db.collection(Collections.INVENTORY_MOVEMENTS);
      if (params.productId) {
        fallbackQuery = fallbackQuery.where('productId', '==', params.productId);
      }
      if (params.variantId) {
        fallbackQuery = fallbackQuery.where('variantId', '==', params.variantId);
      }
      snap = await fallbackQuery.limit(params.limit || 100).get();
    }

    const movements = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        productId: data.productId,
        variantId: data.variantId,
        type: data.type,
        delta: data.delta,
        stockAfter: data.stockAfter,
        reservedAfter: data.reservedAfter,
        orderId: data.orderId || null,
        reason: data.reason || null,
        actorId: data.actorId,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
      };
    });

    movements.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return movements;
  }
}

export const inventoryRepository = new FirestoreInventoryRepository();
