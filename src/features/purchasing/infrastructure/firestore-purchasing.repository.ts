import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { businessYear } from '@/core/domain/dates';
import { computeStockState } from '@/features/products/domain/variant';
import type {
  Supplier,
  PurchaseInvoice,
  PurchaseReturn,
  StockMovement,
  PurchaseItem,
  PurchaseReturnItem,
} from '../domain/purchasing';

export class FirestorePurchasingRepository {
  private get db() {
    return adminDb();
  }

  // ==========================================
  // 1. SUPPLIERS MANAGEMENT
  // ==========================================

  async createSupplier(data: {
    name: string;
    phone: string;
    company_name: string;
    initialBalance?: number;
  }): Promise<Supplier> {
    const colRef = this.db.collection(Collections.SUPPLIERS);
    const docRef = colRef.doc();
    const now = new Date();

    const record = {
      name: data.name.trim(),
      phone: data.phone.trim(),
      company_name: data.company_name.trim(),
      balance: Number(data.initialBalance || 0),
      createdAt: Timestamp.fromDate(now),
    };

    await docRef.set(record);

    return {
      id: docRef.id,
      name: record.name,
      phone: record.phone,
      company_name: record.company_name,
      balance: record.balance,
      createdAt: now,
    };
  }

  async listSuppliers(limit = 100): Promise<Supplier[]> {
    const snap = await this.db
      .collection(Collections.SUPPLIERS)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name || '',
        phone: d.phone || '',
        company_name: d.company_name || '',
        balance: Number(d.balance || 0),
        createdAt:
          d.createdAt instanceof Timestamp
            ? d.createdAt.toDate()
            : typeof d.createdAt?.toDate === 'function'
              ? d.createdAt.toDate()
              : d.createdAt instanceof Date
                ? d.createdAt
                : new Date(),
      };
    });
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    const doc = await this.db.collection(Collections.SUPPLIERS).doc(id).get();
    if (!doc.exists) return null;
    const d = doc.data()!;
    return {
      id: doc.id,
      name: d.name || '',
      phone: d.phone || '',
      company_name: d.company_name || '',
      balance: Number(d.balance || 0),
      createdAt:
        d.createdAt instanceof Timestamp
          ? d.createdAt.toDate()
          : typeof d.createdAt?.toDate === 'function'
            ? d.createdAt.toDate()
            : d.createdAt instanceof Date
              ? d.createdAt
              : new Date(),
    };
  }

  // ==========================================
  // 2. PURCHASES INVOICES (runTransaction)
  // ==========================================

  async createPurchaseInvoice(params: {
    supplier_id: string;
    invoice_number?: string;
    purchase_date?: Date;
    items: PurchaseItem[];
  }): Promise<{ purchaseId: string; invoiceNumber: string; totalAmount: number }> {
    if (!params.items || params.items.length === 0) {
      throw new Error('يجب إضافة صنف واحد على الأقل لفاتورة الشراء.');
    }

    return this.db.runTransaction(async (tx) => {
      // 1. ALL READS FIRST
      const supplierRef = this.db.collection(Collections.SUPPLIERS).doc(params.supplier_id);
      const counterRef = this.db.collection(Collections.COUNTERS).doc('purchases');

      const [supplierSnap, counterSnap, loadedItems] = await Promise.all([
        tx.get(supplierRef),
        tx.get(counterRef),
        Promise.all(
          params.items.map(async (it) => {
            const prodRef = this.db.collection(Collections.PRODUCTS).doc(it.product_id);
            const variantId = it.variant_id?.trim() || 'default';
            const varRef = prodRef.collection(Collections.VARIANTS).doc(variantId);
            const [prodSnap, varSnap] = await Promise.all([tx.get(prodRef), tx.get(varRef)]);
            return {
              item: it,
              prodRef,
              varRef,
              prodSnap,
              varSnap,
              variantId,
            };
          })
        ),
      ]);

      if (!supplierSnap.exists) {
        throw new Error('المورد المحدد غير موجود.');
      }

      // Check products exist
      for (const { item, prodSnap } of loadedItems) {
        if (!prodSnap.exists) {
          throw new Error(`المنتج بالمعرف ${item.product_id} غير موجود.`);
        }
      }

      // Calculate total
      let totalAmount = 0;
      for (const item of params.items) {
        if (item.quantity <= 0) {
          throw new Error('كمية الصنف يجب أن تكون أكبر من الصفر.');
        }
        totalAmount += item.quantity * Number(item.cost_price || 0);
      }

      // Sequence numbering
      const currentSeq = counterSnap.exists ? (counterSnap.data()?.seq || 0) : 0;
      const nextSeq = currentSeq + 1;
      const currentYear = businessYear(new Date());
      const generatedInvoiceNumber = `PUR-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
      const finalInvoiceNumber = params.invoice_number?.trim() || generatedInvoiceNumber;

      // New Purchase doc reference
      const purchaseRef = this.db.collection(Collections.PURCHASES).doc();
      const purchaseId = purchaseRef.id;

      // 2. ALL WRITES AFTER READS
      // 2a. Update sequential counter
      tx.set(counterRef, { seq: nextSeq, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

      // 2b. Update stock for variant subcollection, product document, and record movements
      for (const { item, prodRef, varRef, prodSnap, varSnap, variantId } of loadedItems) {
        const prodData = prodSnap.data() || {};
        const vData = varSnap.exists ? varSnap.data()! : {};

        const currentVarStock = Number(vData.stockQty ?? 0);
        const currentReserved = Number(vData.reservedQty ?? 0);
        const newVarStock = currentVarStock + item.quantity;
        const newAvailable = Math.max(0, newVarStock - currentReserved);
        const threshold = Number(vData.lowStockThreshold ?? 5);
        const newStockState = computeStockState(newAvailable, threshold);

        // 1. Update variant document in subcollection
        tx.set(
          varRef,
          {
            id: variantId,
            productId: item.product_id,
            label: item.variant_label || vData.label || 'الافتراضي',
            stockQty: newVarStock,
            availableQty: newAvailable,
            stockState: newStockState,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        // 2. Update product document
        const currentProdStock = Number(prodData.current_stock ?? prodData.stockQty ?? 0);
        const newProdStock = currentProdStock + item.quantity;

        tx.update(prodRef, {
          current_stock: newProdStock,
          stockQty: newProdStock,
          inStock: true,
          hasStock: true,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // 3. Record official inventory movement (for product details screen)
        const invMoveRef = this.db.collection(Collections.INVENTORY_MOVEMENTS).doc();
        tx.set(invMoveRef, {
          productId: item.product_id,
          variantId,
          type: 'RESTOCK',
          delta: item.quantity,
          stockAfter: newVarStock,
          reservedAfter: currentReserved,
          orderId: finalInvoiceNumber,
          reason: `فاتورة شراء رقم ${finalInvoiceNumber}`,
          actorId: null,
          createdAt: FieldValue.serverTimestamp(),
        });

        // 4. Record stock movement (PURCHASE_IN)
        const moveRef = this.db.collection(Collections.STOCK_MOVEMENTS).doc();
        tx.set(moveRef, {
          product_id: item.product_id,
          product_name: item.product_name || prodData.name || '',
          type: 'PURCHASE_IN',
          quantity: item.quantity,
          reference_id: purchaseId,
          timestamp: FieldValue.serverTimestamp(),
        });
      }

      // 2c. Save Purchase Invoice
      tx.set(purchaseRef, {
        invoice_number: finalInvoiceNumber,
        supplier_id: params.supplier_id,
        supplier_name: supplierSnap.data()?.name || '',
        purchase_date: params.purchase_date
          ? Timestamp.fromDate(params.purchase_date)
          : FieldValue.serverTimestamp(),
        items: params.items.map((it) => ({
          product_id: it.product_id,
          variant_id: it.variant_id || 'default',
          product_name: it.product_name || '',
          variant_label: it.variant_label || '',
          quantity: it.quantity,
          cost_price: Number(it.cost_price || 0),
        })),
        total_amount: totalAmount,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 2d. Update Supplier Balance (credit / accounts payable)
      tx.update(supplierRef, {
        balance: FieldValue.increment(totalAmount),
      });

      return {
        purchaseId,
        invoiceNumber: finalInvoiceNumber,
        totalAmount,
      };
    });
  }

  async listPurchases(limit = 100): Promise<PurchaseInvoice[]> {
    const snap = await this.db
      .collection(Collections.PURCHASES)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        invoice_number: d.invoice_number || doc.id,
        supplier_id: d.supplier_id,
        supplier_name: d.supplier_name || '',
        purchase_date:
          d.purchase_date instanceof Timestamp
            ? d.purchase_date.toDate()
            : typeof d.purchase_date?.toDate === 'function'
              ? d.purchase_date.toDate()
              : d.purchase_date instanceof Date
                ? d.purchase_date
                : new Date(),
        items: Array.isArray(d.items)
          ? d.items.map((it: any) => ({
              product_id: it.product_id,
              variant_id: it.variant_id || 'default',
              product_name: it.product_name || '',
              variant_label: it.variant_label || '',
              quantity: Number(it.quantity || 0),
              cost_price: Number(it.cost_price || 0),
            }))
          : [],
        total_amount: Number(d.total_amount || 0),
        createdAt:
          d.createdAt instanceof Timestamp
            ? d.createdAt.toDate()
            : typeof d.createdAt?.toDate === 'function'
              ? d.createdAt.toDate()
              : d.createdAt instanceof Date
                ? d.createdAt
                : new Date(),
      };
    });
  }

  // ==========================================
  // 3. PURCHASE RETURNS (runTransaction)
  // ==========================================

  async createPurchaseReturn(params: {
    purchase_id?: string;
    supplier_id: string;
    return_date?: Date;
    items: PurchaseReturnItem[];
  }): Promise<{ returnId: string; returnNumber: string; totalAmount: number }> {
    if (!params.items || params.items.length === 0) {
      throw new Error('يجب اختيار صنف واحد على الأقل لمردود المشتريات.');
    }

    return this.db.runTransaction(async (tx) => {
      // 1. ALL READS FIRST
      const supplierRef = this.db.collection(Collections.SUPPLIERS).doc(params.supplier_id);
      const counterRef = this.db.collection(Collections.COUNTERS).doc('purchase_returns');
      const [supplierSnap, counterSnap, loadedItems] = await Promise.all([
        tx.get(supplierRef),
        tx.get(counterRef),
        Promise.all(
          params.items.map(async (it) => {
            const prodRef = this.db.collection(Collections.PRODUCTS).doc(it.product_id);
            const variantId = it.variant_id?.trim() || 'default';
            const varRef = prodRef.collection(Collections.VARIANTS).doc(variantId);
            const [prodSnap, varSnap] = await Promise.all([tx.get(prodRef), tx.get(varRef)]);
            return {
              item: it,
              prodRef,
              varRef,
              prodSnap,
              varSnap,
              variantId,
            };
          })
        ),
      ]);

      if (!supplierSnap.exists) {
        throw new Error('المورد المحدد غير موجود.');
      }

      let totalAmount = 0;
      for (const item of params.items) {
        if (item.quantity <= 0) {
          throw new Error('الكمية المرجعة يجب أن تكون أكبر من الصفر.');
        }
        totalAmount += item.quantity * Number(item.cost_price || 0);
      }

      const currentSeq = counterSnap.exists ? (counterSnap.data()?.seq || 0) : 0;
      const nextSeq = currentSeq + 1;
      const currentYear = businessYear(new Date());
      const returnNumber = `RET-PUR-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

      const returnRef = this.db.collection(Collections.PURCHASE_RETURNS).doc();
      const returnId = returnRef.id;

      // 2. ALL WRITES AFTER READS
      tx.set(counterRef, { seq: nextSeq, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

      for (const { item, prodRef, varRef, prodSnap, varSnap, variantId } of loadedItems) {
        const prodData = prodSnap.data() || {};
        const vData = varSnap.exists ? varSnap.data()! : {};

        const currentVarStock = Number(vData.stockQty ?? 0);
        const currentReserved = Number(vData.reservedQty ?? 0);
        const newVarStock = Math.max(0, currentVarStock - item.quantity);
        const newAvailable = Math.max(0, newVarStock - currentReserved);
        const threshold = Number(vData.lowStockThreshold ?? 5);
        const newStockState = computeStockState(newAvailable, threshold);

        // 1. Update variant in subcollection
        tx.set(
          varRef,
          {
            id: variantId,
            productId: item.product_id,
            stockQty: newVarStock,
            availableQty: newAvailable,
            stockState: newStockState,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        // 2. Update product document
        const currentProdStock = Number(prodData.current_stock ?? prodData.stockQty ?? 0);
        const newProdStock = Math.max(0, currentProdStock - item.quantity);

        tx.update(prodRef, {
          current_stock: newProdStock,
          stockQty: newProdStock,
          inStock: newVarStock > 0 || newProdStock > 0,
          hasStock: newVarStock > 0 || newProdStock > 0,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // 3. Record official inventory movement (for product details screen)
        const invMoveRef = this.db.collection(Collections.INVENTORY_MOVEMENTS).doc();
        tx.set(invMoveRef, {
          productId: item.product_id,
          variantId,
          type: 'RETURN',
          delta: -item.quantity,
          stockAfter: newVarStock,
          reservedAfter: currentReserved,
          orderId: returnNumber,
          reason: `مردود مشتريات رقم ${returnNumber}`,
          actorId: null,
          createdAt: FieldValue.serverTimestamp(),
        });

        // 4. Record stock movement (PURCHASE_RETURN_OUT)
        const moveRef = this.db.collection(Collections.STOCK_MOVEMENTS).doc();
        tx.set(moveRef, {
          product_id: item.product_id,
          product_name: item.product_name || prodData.name || '',
          type: 'PURCHASE_RETURN_OUT',
          quantity: item.quantity,
          reference_id: returnId,
          timestamp: FieldValue.serverTimestamp(),
        });
      }

      // Save Purchase Return Document
      tx.set(returnRef, {
        return_number: returnNumber,
        purchase_id: params.purchase_id || null,
        supplier_id: params.supplier_id,
        supplier_name: supplierSnap.data()?.name || '',
        return_date: params.return_date
          ? Timestamp.fromDate(params.return_date)
          : FieldValue.serverTimestamp(),
        items: params.items.map((it) => ({
          product_id: it.product_id,
          variant_id: it.variant_id || 'default',
          product_name: it.product_name || '',
          variant_label: it.variant_label || '',
          quantity: it.quantity,
          cost_price: Number(it.cost_price || 0),
        })),
        total_amount: totalAmount,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Deduct from supplier balance
      tx.update(supplierRef, {
        balance: FieldValue.increment(-totalAmount),
      });

      return {
        returnId,
        returnNumber,
        totalAmount,
      };
    });
  }

  async listPurchaseReturns(limit = 100): Promise<PurchaseReturn[]> {
    const snap = await this.db
      .collection(Collections.PURCHASE_RETURNS)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        return_number: d.return_number || doc.id,
        purchase_id: d.purchase_id || '',
        supplier_id: d.supplier_id,
        supplier_name: d.supplier_name || '',
        return_date:
          d.return_date instanceof Timestamp
            ? d.return_date.toDate()
            : typeof d.return_date?.toDate === 'function'
              ? d.return_date.toDate()
              : d.return_date instanceof Date
                ? d.return_date
                : new Date(),
        items: Array.isArray(d.items)
          ? d.items.map((it: any) => ({
              product_id: it.product_id,
              variant_id: it.variant_id || 'default',
              product_name: it.product_name || '',
              variant_label: it.variant_label || '',
              quantity: Number(it.quantity || 0),
              cost_price: Number(it.cost_price || 0),
            }))
          : [],
        total_amount: Number(d.total_amount || 0),
        createdAt:
          d.createdAt instanceof Timestamp
            ? d.createdAt.toDate()
            : typeof d.createdAt?.toDate === 'function'
              ? d.createdAt.toDate()
              : d.createdAt instanceof Date
                ? d.createdAt
                : new Date(),
      };
    });
  }

  // ==========================================
  // 4. STOCK MOVEMENTS
  // ==========================================

  async listStockMovements(limit = 100): Promise<StockMovement[]> {
    const snap = await this.db
      .collection(Collections.STOCK_MOVEMENTS)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        product_id: d.product_id,
        product_name: d.product_name || '',
        type: d.type as 'PURCHASE_IN' | 'PURCHASE_RETURN_OUT',
        quantity: Number(d.quantity || 0),
        reference_id: d.reference_id || '',
        timestamp:
          d.timestamp instanceof Timestamp
            ? d.timestamp.toDate()
            : typeof d.timestamp?.toDate === 'function'
              ? d.timestamp.toDate()
              : d.timestamp instanceof Date
                ? d.timestamp
                : new Date(),
      };
    });
  }
}

export const purchasingRepository = new FirestorePurchasingRepository();

