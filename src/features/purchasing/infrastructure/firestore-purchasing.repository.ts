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
  SupplierPayment,
  SupplierTransaction,
  SupplierStatement,
  SupplierPaymentMethod,
} from '../domain/purchasing';

function toDate(val: any): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (typeof val?.toDate === 'function') return val.toDate();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

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
    const balanceNum = Number(data.initialBalance || 0);

    const record = {
      name: data.name.trim(),
      phone: data.phone.trim(),
      company_name: data.company_name.trim(),
      balance: balanceNum,
      createdAt: Timestamp.fromDate(now),
    };

    await docRef.set(record);

    if (balanceNum > 0) {
      const txRef = this.db.collection(Collections.SUPPLIER_TRANSACTIONS).doc();
      await txRef.set({
        supplier_id: docRef.id,
        type: 'INITIAL_BALANCE',
        amount: balanceNum,
        debit: 0,
        credit: balanceNum,
        balance_after: balanceNum,
        description: 'رصيد افتتاحي سابق للمورد',
        reference_id: null,
        reference_number: null,
        recorded_by: 'إدارة المشتريات',
        createdAt: Timestamp.fromDate(now),
      });
    }

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

  async updateSupplier(
    id: string,
    data: { name: string; phone: string; company_name: string }
  ): Promise<Supplier> {
    const supplierRef = this.db.collection(Collections.SUPPLIERS).doc(id);
    const supplierSnap = await supplierRef.get();
    if (!supplierSnap.exists) {
      throw new Error('المورد المحدد غير موجود.');
    }

    const trimmedName = (data.name || '').trim();
    const trimmedPhone = (data.phone || '').trim();
    const trimmedCompany = (data.company_name || '').trim();

    if (!trimmedName) {
      throw new Error('يرجى إدخال اسم المورد.');
    }
    if (!trimmedPhone) {
      throw new Error('يرجى إدخال رقم هاتف المورد.');
    }

    await supplierRef.update({
      name: trimmedName,
      phone: trimmedPhone,
      company_name: trimmedCompany,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const d = supplierSnap.data()!;
    return {
      id,
      name: trimmedName,
      phone: trimmedPhone,
      company_name: trimmedCompany,
      balance: Number(d.balance || 0),
      createdAt: toDate(d.createdAt),
    };
  }

  async deleteSupplier(id: string): Promise<void> {
    const supplierRef = this.db.collection(Collections.SUPPLIERS).doc(id);
    const supplierSnap = await supplierRef.get();
    if (!supplierSnap.exists) {
      throw new Error('المورد غير موجود أو تم حذفه مسبقاً.');
    }

    const supplierData = supplierSnap.data()!;
    const balance = Number(supplierData.balance || 0);

    // 1. Check if supplier has any purchases
    const purchasesSnap = await this.db
      .collection(Collections.PURCHASES)
      .where('supplier_id', '==', id)
      .limit(1)
      .get();

    if (!purchasesSnap.empty) {
      throw new Error('لا يمكن حذف المورد لوجود فواتير شراء مسجلة باسمه في النظام.');
    }

    // 2. Check if supplier has any purchase returns
    const returnsSnap = await this.db
      .collection(Collections.PURCHASE_RETURNS)
      .where('supplier_id', '==', id)
      .limit(1)
      .get();

    if (!returnsSnap.empty) {
      throw new Error('لا يمكن حذف المورد لوجود مردودات مشتريات مسجلة باسمه في النظام.');
    }

    // 3. Check if supplier has any payment vouchers
    const paymentsSnap = await this.db
      .collection(Collections.SUPPLIER_PAYMENTS)
      .where('supplier_id', '==', id)
      .limit(1)
      .get();

    if (!paymentsSnap.empty) {
      throw new Error('لا يمكن حذف المورد لوجود سندات صرف مسجلة باسمه في النظام.');
    }

    // 4. Check if supplier has non-zero balance
    if (balance !== 0) {
      throw new Error('لا يمكن حذف المورد لأن لديه رصيداً مالياً مسجلاً.');
    }

    // 5. Clean up any initial balance transaction and delete supplier doc
    const initTxSnap = await this.db
      .collection(Collections.SUPPLIER_TRANSACTIONS)
      .where('supplier_id', '==', id)
      .get();

    const batch = this.db.batch();
    initTxSnap.forEach((doc) => batch.delete(doc.ref));
    batch.delete(supplierRef);
    await batch.commit();
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
        productIds: Array.from(new Set(params.items.map((it) => it.product_id))),
        total_amount: totalAmount,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 2d. Update Supplier Balance (credit / accounts payable)
      const currentSupBalance = Number(supplierSnap.data()?.balance || 0);
      const newSupBalance = currentSupBalance + totalAmount;
      tx.update(supplierRef, {
        balance: FieldValue.increment(totalAmount),
      });

      // 2e. Record Supplier Ledger Transaction
      const supTxRef = this.db.collection(Collections.SUPPLIER_TRANSACTIONS).doc();
      tx.set(supTxRef, {
        supplier_id: params.supplier_id,
        type: 'PURCHASE',
        amount: totalAmount,
        debit: 0,
        credit: totalAmount,
        balance_after: newSupBalance,
        description: `فاتورة شراء رقم ${finalInvoiceNumber}`,
        reference_id: purchaseId,
        reference_number: finalInvoiceNumber,
        recorded_by: 'إدارة المشتريات',
        createdAt: FieldValue.serverTimestamp(),
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

  async updatePurchaseInvoice(params: {
    purchaseId: string;
    invoice_number?: string;
    purchase_date?: Date;
    items?: PurchaseItem[];
  }): Promise<{ purchaseId: string; invoiceNumber: string; totalAmount: number }> {
    return this.db.runTransaction(async (tx) => {
      const purchaseRef = this.db.collection(Collections.PURCHASES).doc(params.purchaseId);
      const snap = await tx.get(purchaseRef);
      if (!snap.exists) {
        throw new Error('فاتورة الشراء غير موجودة.');
      }

      const pData = snap.data()!;
      const supplierId = pData.supplier_id;
      const oldInvoiceNumber = pData.invoice_number || params.purchaseId;
      const finalInvoiceNumber = params.invoice_number?.trim() || oldInvoiceNumber;
      const oldTotal = Number(pData.total_amount || 0);
      const oldItems: PurchaseItem[] = Array.isArray(pData.items) ? pData.items : [];

      const supplierRef = this.db.collection(Collections.SUPPLIERS).doc(supplierId);
      const supplierSnap = await tx.get(supplierRef);

      // If items are NOT modified, only update metadata
      if (!params.items) {
        const updates: any = {
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (params.invoice_number?.trim()) {
          updates.invoice_number = params.invoice_number.trim();
        }
        if (params.purchase_date) {
          updates.purchase_date = Timestamp.fromDate(params.purchase_date);
        }
        tx.update(purchaseRef, updates);
        return {
          purchaseId: params.purchaseId,
          invoiceNumber: finalInvoiceNumber,
          totalAmount: oldTotal,
        };
      }

      // Comprehensive update: items, quantities, prices
      const newItems = params.items;
      if (newItems.length === 0) {
        throw new Error('يجب أن تحتوي فاتورة الشراء على صنف واحد على الأقل.');
      }

      // 1. Collect all distinct (productId, variantId) keys
      const allItemKeys = new Set<string>();
      const makeKey = (pId: string, vId?: string) => `${pId}:::${vId?.trim() || 'default'}`;

      oldItems.forEach((i) => allItemKeys.add(makeKey(i.product_id, i.variant_id)));
      newItems.forEach((i) => allItemKeys.add(makeKey(i.product_id, i.variant_id)));

      // 2. Load all affected products and variants in transaction (ALL READS FIRST)
      const loadedKeys = Array.from(allItemKeys);
      const docRefs = loadedKeys.map((key) => {
        const [productId, variantId] = key.split(':::');
        const prodRef = this.db.collection(Collections.PRODUCTS).doc(productId);
        const varRef = prodRef.collection(Collections.VARIANTS).doc(variantId);
        return { key, productId, variantId, prodRef, varRef };
      });

      const loadedDocs = await Promise.all(
        docRefs.map(async (ref) => {
          const [prodSnap, varSnap] = await Promise.all([tx.get(ref.prodRef), tx.get(ref.varRef)]);
          return { ...ref, prodSnap, varSnap };
        })
      );

      const docsMap = new Map(loadedDocs.map((d) => [d.key, d]));

      // 3. Compute net stock changes and validate stock sufficiency
      const netChanges: Array<{
        key: string;
        productId: string;
        variantId: string;
        prodRef: FirebaseFirestore.DocumentReference;
        varRef: FirebaseFirestore.DocumentReference;
        prodData: any;
        varData: any;
        oldQty: number;
        newQty: number;
        netStockChange: number;
        newVarStock: number;
        newAvailable: number;
        newStockState: string;
        itemLabel: string;
      }> = [];

      for (const key of loadedKeys) {
        const d = docsMap.get(key)!;
        const [productId, variantId] = key.split(':::');
        const oldQty = oldItems
          .filter((i) => makeKey(i.product_id, i.variant_id) === key)
          .reduce((sum, i) => sum + Number(i.quantity || 0), 0);
        const newQty = newItems
          .filter((i) => makeKey(i.product_id, i.variant_id) === key)
          .reduce((sum, i) => sum + Number(i.quantity || 0), 0);

        const netStockChange = newQty - oldQty;
        const prodData = d.prodSnap.data() || {};
        const varData = d.varSnap.data() || {};

        const currentVarStock = Number(varData.stockQty ?? 0);
        const currentReserved = Number(varData.reservedQty ?? 0);
        const newVarStock = currentVarStock + netStockChange;

        if (newVarStock < 0) {
          throw new Error(
            `لا يمكن إنقاص كمية الصنف "${prodData.name || productId}" بمقدار ${Math.abs(netStockChange)} لأن المخزون المتبقي حالياً (${currentVarStock}) أقل من المطلوب تنقيصه.`
          );
        }

        const newAvailable = Math.max(0, newVarStock - currentReserved);
        const threshold = Number(varData.lowStockThreshold ?? 5);
        const newStockState = computeStockState(newAvailable, threshold);
        const itemLabel =
          newItems.find((i) => makeKey(i.product_id, i.variant_id) === key)?.product_name ||
          prodData.name ||
          'صنف';

        netChanges.push({
          key,
          productId,
          variantId,
          prodRef: d.prodRef,
          varRef: d.varRef,
          prodData,
          varData,
          oldQty,
          newQty,
          netStockChange,
          newVarStock,
          newAvailable,
          newStockState,
          itemLabel,
        });
      }

      // 4. Calculate new total amount and balance delta
      let newTotal = 0;
      for (const item of newItems) {
        const q = Number(item.quantity || 0);
        const c = Number(item.cost_price || 0);
        if (q <= 0) throw new Error('يجب أن تكون كمية كل صنف أكبر من صفر.');
        if (c < 0) throw new Error('لا يمكن أن يكون سعر التكلفة سالباً.');
        newTotal += q * c;
      }

      const balanceDelta = newTotal - oldTotal;

      // 5. Apply Writes: Update stock, movements, supplier, and purchase doc
      for (const change of netChanges) {
        if (change.netStockChange !== 0) {
          tx.set(
            change.varRef,
            {
              id: change.variantId,
              productId: change.productId,
              stockQty: change.newVarStock,
              availableQty: change.newAvailable,
              stockState: change.newStockState,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          const currentProdStock = Number(change.prodData.current_stock ?? change.prodData.stockQty ?? 0);
          const updatedProdStock = Math.max(0, currentProdStock + change.netStockChange);
          tx.update(change.prodRef, {
            current_stock: updatedProdStock,
            stockQty: updatedProdStock,
            inStock: updatedProdStock > 0 || change.newVarStock > 0,
            hasStock: updatedProdStock > 0 || change.newVarStock > 0,
            updatedAt: FieldValue.serverTimestamp(),
          });

          const invMoveRef = this.db.collection(Collections.INVENTORY_MOVEMENTS).doc();
          tx.set(invMoveRef, {
            productId: change.productId,
            variantId: change.variantId,
            type: change.netStockChange > 0 ? 'RESTOCK' : 'ADJUSTMENT',
            delta: change.netStockChange,
            stockAfter: change.newVarStock,
            reservedAfter: Number(change.varData.reservedQty ?? 0),
            orderId: finalInvoiceNumber,
            reason: `تعديل فاتورة شراء رقم ${finalInvoiceNumber} (${change.netStockChange > 0 ? '+' : ''}${change.netStockChange})`,
            actorId: null,
            createdAt: FieldValue.serverTimestamp(),
          });

          const moveRef = this.db.collection(Collections.STOCK_MOVEMENTS).doc();
          tx.set(moveRef, {
            product_id: change.productId,
            product_name: change.itemLabel,
            type: change.netStockChange > 0 ? 'PURCHASE_IN' : 'PURCHASE_RETURN_OUT',
            quantity: Math.abs(change.netStockChange),
            reference_id: params.purchaseId,
            description: `تعديل كمية فاتورة شراء رقم ${finalInvoiceNumber}`,
            timestamp: FieldValue.serverTimestamp(),
          });
        }
      }

      if (balanceDelta !== 0 && supplierSnap.exists) {
        tx.update(supplierRef, {
          balance: FieldValue.increment(balanceDelta),
        });

        const supTxRef = this.db.collection(Collections.SUPPLIER_TRANSACTIONS).doc();
        tx.set(supTxRef, {
          supplier_id: supplierId,
          type: 'PURCHASE_EDIT',
          amount: Math.abs(balanceDelta),
          debit: balanceDelta < 0 ? Math.abs(balanceDelta) : 0,
          credit: balanceDelta > 0 ? balanceDelta : 0,
          balance_after: Number(supplierSnap.data()?.balance || 0) + balanceDelta,
          description: `تعديل إجمالي فاتورة شراء رقم ${finalInvoiceNumber}`,
          reference_id: params.purchaseId,
          reference_number: finalInvoiceNumber,
          recorded_by: 'إدارة المشتريات',
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      tx.set(
        purchaseRef,
        {
          invoice_number: finalInvoiceNumber,
          purchase_date: params.purchase_date
            ? Timestamp.fromDate(params.purchase_date)
            : pData.purchase_date,
          items: newItems.map((it) => ({
            product_id: it.product_id,
            variant_id: it.variant_id || 'default',
            product_name: it.product_name || '',
            variant_label: it.variant_label || '',
            quantity: Number(it.quantity || 0),
            cost_price: Number(it.cost_price || 0),
          })),
          productIds: Array.from(new Set(newItems.map((it) => it.product_id))),
          total_amount: newTotal,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        purchaseId: params.purchaseId,
        invoiceNumber: finalInvoiceNumber,
        totalAmount: newTotal,
      };
    });
  }

  async updatePurchaseReturn(params: {
    returnId: string;
    return_number?: string;
    return_date?: Date;
    reason?: string | null;
    items?: PurchaseReturnItem[];
  }): Promise<{ returnId: string; returnNumber: string; totalAmount: number }> {
    return this.db.runTransaction(async (tx) => {
      const returnRef = this.db.collection(Collections.PURCHASE_RETURNS).doc(params.returnId);
      const snap = await tx.get(returnRef);
      if (!snap.exists) {
        throw new Error('سند مردود المشتريات غير موجود.');
      }

      const rData = snap.data()!;
      const supplierId = rData.supplier_id;
      const oldReturnNumber = rData.return_number || params.returnId;
      const finalReturnNumber = params.return_number?.trim() || oldReturnNumber;
      const oldTotal = Number(rData.total_amount || 0);
      const oldItems: PurchaseReturnItem[] = Array.isArray(rData.items) ? rData.items : [];

      const supplierRef = this.db.collection(Collections.SUPPLIERS).doc(supplierId);
      const supplierSnap = await tx.get(supplierRef);

      if (!params.items) {
        const updates: any = { updatedAt: FieldValue.serverTimestamp() };
        if (params.return_number?.trim()) updates.return_number = params.return_number.trim();
        if (params.return_date) updates.return_date = Timestamp.fromDate(params.return_date);
        if (params.reason !== undefined) updates.reason = params.reason;
        tx.update(returnRef, updates);
        return { returnId: params.returnId, returnNumber: finalReturnNumber, totalAmount: oldTotal };
      }

      const newItems = params.items;
      if (newItems.length === 0) {
        throw new Error('يجب أن يحتوي مردود المشتريات على صنف واحد على الأقل.');
      }

      const allItemKeys = new Set<string>();
      const makeKey = (pId: string, vId?: string) => `${pId}:::${vId?.trim() || 'default'}`;

      oldItems.forEach((i) => allItemKeys.add(makeKey(i.product_id, i.variant_id)));
      newItems.forEach((i) => allItemKeys.add(makeKey(i.product_id, i.variant_id)));

      const loadedKeys = Array.from(allItemKeys);
      const docRefs = loadedKeys.map((key) => {
        const [productId, variantId] = key.split(':::');
        const prodRef = this.db.collection(Collections.PRODUCTS).doc(productId);
        const varRef = prodRef.collection(Collections.VARIANTS).doc(variantId);
        return { key, productId, variantId, prodRef, varRef };
      });

      const loadedDocs = await Promise.all(
        docRefs.map(async (ref) => {
          const [prodSnap, varSnap] = await Promise.all([tx.get(ref.prodRef), tx.get(ref.varRef)]);
          return { ...ref, prodSnap, varSnap };
        })
      );

      const docsMap = new Map(loadedDocs.map((d) => [d.key, d]));

      // Purchase Return reduces warehouse stock.
      // netStockChange = oldReturnedQty - newReturnedQty (more returned means less stock)
      const netChanges: any[] = [];
      for (const key of loadedKeys) {
        const d = docsMap.get(key)!;
        const [productId, variantId] = key.split(':::');
        const oldQty = oldItems
          .filter((i) => makeKey(i.product_id, i.variant_id) === key)
          .reduce((sum, i) => sum + Number(i.quantity || 0), 0);
        const newQty = newItems
          .filter((i) => makeKey(i.product_id, i.variant_id) === key)
          .reduce((sum, i) => sum + Number(i.quantity || 0), 0);

        const netStockChange = oldQty - newQty;
        const prodData = d.prodSnap.data() || {};
        const varData = d.varSnap.data() || {};

        const currentVarStock = Number(varData.stockQty ?? 0);
        const currentReserved = Number(varData.reservedQty ?? 0);
        const newVarStock = currentVarStock + netStockChange;

        if (newVarStock < 0) {
          throw new Error(
            `لا يمكن زيادة كمية المردود للصنف "${prodData.name || productId}" بمقدار ${Math.abs(netStockChange)} لأن المخزون الحالي لا يكفي لإرجاعه.`
          );
        }

        const newAvailable = Math.max(0, newVarStock - currentReserved);
        const threshold = Number(varData.lowStockThreshold ?? 5);
        const newStockState = computeStockState(newAvailable, threshold);
        const itemLabel =
          newItems.find((i) => makeKey(i.product_id, i.variant_id) === key)?.product_name ||
          prodData.name ||
          'صنف';

        netChanges.push({
          productId,
          variantId,
          prodRef: d.prodRef,
          varRef: d.varRef,
          prodData,
          varData,
          netStockChange,
          newVarStock,
          newAvailable,
          newStockState,
          itemLabel,
        });
      }

      let newTotal = 0;
      for (const item of newItems) {
        const q = Number(item.quantity || 0);
        const c = Number(item.cost_price || 0);
        if (q <= 0) throw new Error('يجب أن تكون كمية كل صنف أكبر من صفر.');
        newTotal += q * c;
      }

      // Return reduces supplier balance. Increasing return reduces balance further.
      const supplierBalanceDelta = -(newTotal - oldTotal);

      for (const change of netChanges) {
        if (change.netStockChange !== 0) {
          tx.set(
            change.varRef,
            {
              id: change.variantId,
              productId: change.productId,
              stockQty: change.newVarStock,
              availableQty: change.newAvailable,
              stockState: change.newStockState,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          const currentProdStock = Number(change.prodData.current_stock ?? change.prodData.stockQty ?? 0);
          const updatedProdStock = Math.max(0, currentProdStock + change.netStockChange);
          tx.update(change.prodRef, {
            current_stock: updatedProdStock,
            stockQty: updatedProdStock,
            inStock: updatedProdStock > 0 || change.newVarStock > 0,
            hasStock: updatedProdStock > 0 || change.newVarStock > 0,
            updatedAt: FieldValue.serverTimestamp(),
          });

          const invMoveRef = this.db.collection(Collections.INVENTORY_MOVEMENTS).doc();
          tx.set(invMoveRef, {
            productId: change.productId,
            variantId: change.variantId,
            type: 'RETURN',
            delta: change.netStockChange,
            stockAfter: change.newVarStock,
            reservedAfter: Number(change.varData.reservedQty ?? 0),
            orderId: finalReturnNumber,
            reason: `تعديل مردود مشتريات رقم ${finalReturnNumber} (${change.netStockChange > 0 ? '+' : ''}${change.netStockChange})`,
            actorId: null,
            createdAt: FieldValue.serverTimestamp(),
          });

          const moveRef = this.db.collection(Collections.STOCK_MOVEMENTS).doc();
          tx.set(moveRef, {
            product_id: change.productId,
            product_name: change.itemLabel,
            type: change.netStockChange < 0 ? 'PURCHASE_RETURN_OUT' : 'PURCHASE_IN',
            quantity: Math.abs(change.netStockChange),
            reference_id: params.returnId,
            description: `تعديل كمية مردود مشتريات رقم ${finalReturnNumber}`,
            timestamp: FieldValue.serverTimestamp(),
          });
        }
      }

      if (supplierBalanceDelta !== 0 && supplierSnap.exists) {
        tx.update(supplierRef, {
          balance: FieldValue.increment(supplierBalanceDelta),
        });

        const supTxRef = this.db.collection(Collections.SUPPLIER_TRANSACTIONS).doc();
        tx.set(supTxRef, {
          supplier_id: supplierId,
          type: 'PURCHASE_RETURN_EDIT',
          amount: Math.abs(supplierBalanceDelta),
          debit: supplierBalanceDelta < 0 ? Math.abs(supplierBalanceDelta) : 0,
          credit: supplierBalanceDelta > 0 ? supplierBalanceDelta : 0,
          balance_after: Number(supplierSnap.data()?.balance || 0) + supplierBalanceDelta,
          description: `تعديل إجمالي مردود مشتريات رقم ${finalReturnNumber}`,
          reference_id: params.returnId,
          reference_number: finalReturnNumber,
          recorded_by: 'إدارة المشتريات',
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      tx.set(
        returnRef,
        {
          return_number: finalReturnNumber,
          return_date: params.return_date ? Timestamp.fromDate(params.return_date) : rData.return_date,
          reason: params.reason !== undefined ? params.reason : (rData.reason || null),
          items: newItems.map((it) => ({
            product_id: it.product_id,
            variant_id: it.variant_id || 'default',
            product_name: it.product_name || '',
            variant_label: it.variant_label || '',
            quantity: Number(it.quantity || 0),
            cost_price: Number(it.cost_price || 0),
          })),
          productIds: Array.from(new Set(newItems.map((it) => it.product_id))),
          total_amount: newTotal,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        returnId: params.returnId,
        returnNumber: finalReturnNumber,
        totalAmount: newTotal,
      };
    });
  }

  async deletePurchaseInvoice(purchaseId: string): Promise<void> {
    await this.db.runTransaction(async (tx) => {
      const purchaseRef = this.db.collection(Collections.PURCHASES).doc(purchaseId);
      const purchaseSnap = await tx.get(purchaseRef);
      if (!purchaseSnap.exists) {
        throw new Error('فاتورة الشراء غير موجودة أو تم حذفها مسبقاً.');
      }

      const pData = purchaseSnap.data()!;
      const supplierId = pData.supplier_id;
      const totalAmount = Number(pData.total_amount || 0);
      const invoiceNumber = pData.invoice_number || purchaseId;
      const items: PurchaseItem[] = Array.isArray(pData.items) ? pData.items : [];

      const supplierRef = this.db.collection(Collections.SUPPLIERS).doc(supplierId);
      const supplierSnap = await tx.get(supplierRef);

      const loadedItems = await Promise.all(
        items.map(async (it) => {
          const prodRef = this.db.collection(Collections.PRODUCTS).doc(it.product_id);
          const variantId = it.variant_id?.trim() || 'default';
          const varRef = prodRef.collection(Collections.VARIANTS).doc(variantId);
          const [prodSnap, varSnap] = await Promise.all([tx.get(prodRef), tx.get(varRef)]);
          return { item: it, prodRef, varRef, prodSnap, varSnap, variantId };
        })
      );

      // Deduct stock that was added by this purchase invoice
      for (const { item, prodRef, varRef, prodSnap, varSnap, variantId } of loadedItems) {
        if (prodSnap.exists && varSnap.exists) {
          const prodData = prodSnap.data() || {};
          const vData = varSnap.data() || {};

          const currentVarStock = Number(vData.stockQty ?? 0);
          const currentReserved = Number(vData.reservedQty ?? 0);
          const newVarStock = Math.max(0, currentVarStock - item.quantity);
          const newAvailable = Math.max(0, newVarStock - currentReserved);
          const threshold = Number(vData.lowStockThreshold ?? 5);
          const newStockState = computeStockState(newAvailable, threshold);

          tx.set(
            varRef,
            {
              stockQty: newVarStock,
              availableQty: newAvailable,
              stockState: newStockState,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          const currentProdStock = Number(prodData.current_stock ?? prodData.stockQty ?? 0);
          const newProdStock = Math.max(0, currentProdStock - item.quantity);
          tx.update(prodRef, {
            current_stock: newProdStock,
            stockQty: newProdStock,
            inStock: newVarStock > 0 || newProdStock > 0,
            hasStock: newVarStock > 0 || newProdStock > 0,
            updatedAt: FieldValue.serverTimestamp(),
          });

          // Record inventory movement for audit
          const invMoveRef = this.db.collection(Collections.INVENTORY_MOVEMENTS).doc();
          tx.set(invMoveRef, {
            productId: item.product_id,
            variantId,
            type: 'ADJUSTMENT',
            delta: -item.quantity,
            stockAfter: newVarStock,
            reservedAfter: currentReserved,
            orderId: invoiceNumber,
            reason: `حذف فاتورة شراء رقم ${invoiceNumber}`,
            actorId: null,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      }

      // Deduct totalAmount from supplier balance
      if (supplierSnap.exists) {
        tx.update(supplierRef, {
          balance: FieldValue.increment(-totalAmount),
        });
      }

      // Delete purchase doc
      tx.delete(purchaseRef);
    });

    // Clean up outside transaction
    const [txSnap, stockMoveSnap] = await Promise.all([
      this.db
        .collection(Collections.SUPPLIER_TRANSACTIONS)
        .where('reference_id', '==', purchaseId)
        .get(),
      this.db
        .collection(Collections.STOCK_MOVEMENTS)
        .where('reference_id', '==', purchaseId)
        .get(),
    ]);

    const batch = this.db.batch();
    txSnap.forEach((d) => batch.delete(d.ref));
    stockMoveSnap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
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
        productIds: Array.from(new Set(params.items.map((it) => it.product_id))),
        total_amount: totalAmount,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Deduct from supplier balance
      const currentSupBalance = Number(supplierSnap.data()?.balance || 0);
      const newSupBalance = currentSupBalance - totalAmount;
      tx.update(supplierRef, {
        balance: FieldValue.increment(-totalAmount),
      });

      // Record Supplier Ledger Transaction
      const supTxRef = this.db.collection(Collections.SUPPLIER_TRANSACTIONS).doc();
      tx.set(supTxRef, {
        supplier_id: params.supplier_id,
        type: 'PURCHASE_RETURN',
        amount: -totalAmount,
        debit: totalAmount,
        credit: 0,
        balance_after: newSupBalance,
        description: `مردود مشتريات رقم ${returnNumber}`,
        reference_id: returnId,
        reference_number: returnNumber,
        recorded_by: 'إدارة المشتريات',
        createdAt: FieldValue.serverTimestamp(),
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

  // ==========================================
  // 5. SUPPLIER PAYMENTS & STATEMENTS
  // ==========================================

  async recordSupplierPayment(params: {
    supplier_id: string;
    amount: number;
    payment_method: SupplierPaymentMethod;
    reference_number?: string | null;
    bank_or_exchange?: string | null;
    notes?: string | null;
    actor_name: string;
  }): Promise<SupplierPayment> {
    const payAmount = Number(params.amount);
    if (!payAmount || payAmount <= 0) {
      throw new Error('مبلغ السند يجب أن يكون أكبر من الصفر.');
    }

    return this.db.runTransaction(async (tx) => {
      // 1. Reads
      const supplierRef = this.db.collection(Collections.SUPPLIERS).doc(params.supplier_id);
      const counterRef = this.db.collection(Collections.COUNTERS).doc('supplier_payments');

      const [supplierSnap, counterSnap] = await Promise.all([
        tx.get(supplierRef),
        tx.get(counterRef),
      ]);

      if (!supplierSnap.exists) {
        throw new Error('المورد المحدد غير موجود.');
      }

      const supplierData = supplierSnap.data()!;
      const currentBalance = Number(supplierData.balance || 0);
      const newBalance = currentBalance - payAmount;

      const currentSeq = counterSnap.exists ? (counterSnap.data()?.seq || 0) : 0;
      const nextSeq = currentSeq + 1;
      const currentYear = businessYear(new Date());
      const voucherNumber = `PAY-SUP-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

      const paymentRef = this.db.collection(Collections.SUPPLIER_PAYMENTS).doc();
      const paymentId = paymentRef.id;

      // 2. Writes
      tx.set(counterRef, { seq: nextSeq, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

      const paymentRecord = {
        voucher_number: voucherNumber,
        supplier_id: params.supplier_id,
        supplier_name: supplierData.name || '',
        amount: payAmount,
        payment_method: params.payment_method,
        reference_number: params.reference_number?.trim() || null,
        bank_or_exchange: params.bank_or_exchange?.trim() || null,
        notes: params.notes?.trim() || null,
        recorded_by: params.actor_name,
        createdAt: FieldValue.serverTimestamp(),
      };
      tx.set(paymentRef, paymentRecord);

      // Deduct from supplier balance
      tx.update(supplierRef, {
        balance: newBalance,
      });

      // Record Supplier Transaction
      const txRef = this.db.collection(Collections.SUPPLIER_TRANSACTIONS).doc();
      tx.set(txRef, {
        supplier_id: params.supplier_id,
        type: 'PAYMENT',
        amount: -payAmount,
        debit: payAmount,
        credit: 0,
        balance_after: newBalance,
        description: `سند صرف دفعة للمورد رقم ${voucherNumber}`,
        reference_id: paymentId,
        reference_number: voucherNumber,
        recorded_by: params.actor_name,
        payment_method: params.payment_method,
        bank_or_exchange: params.bank_or_exchange?.trim() || null,
        notes: params.notes?.trim() || null,
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        id: paymentId,
        voucher_number: voucherNumber,
        supplier_id: params.supplier_id,
        supplier_name: supplierData.name || '',
        amount: payAmount,
        payment_method: params.payment_method,
        reference_number: params.reference_number?.trim() || null,
        bank_or_exchange: params.bank_or_exchange?.trim() || null,
        notes: params.notes?.trim() || null,
        recorded_by: params.actor_name,
        createdAt: new Date(),
      };
    });
  }

  async getSupplierPaymentById(id: string): Promise<SupplierPayment | null> {
    const doc = await this.db.collection(Collections.SUPPLIER_PAYMENTS).doc(id).get();
    if (!doc.exists) return null;
    const d = doc.data()!;
    return {
      id: doc.id,
      voucher_number: d.voucher_number || doc.id,
      supplier_id: d.supplier_id,
      supplier_name: d.supplier_name || '',
      amount: Number(d.amount || 0),
      payment_method: (d.payment_method as SupplierPaymentMethod) || 'CASH',
      reference_number: d.reference_number || null,
      bank_or_exchange: d.bank_or_exchange || null,
      notes: d.notes || null,
      recorded_by: d.recorded_by || 'إدارة المشتريات',
      createdAt: toDate(d.createdAt),
    };
  }

  async updateSupplierPayment(params: {
    paymentId: string;
    amount: number;
    payment_method: SupplierPaymentMethod;
    reference_number?: string | null;
    bank_or_exchange?: string | null;
    notes?: string | null;
  }): Promise<{ paymentId: string; voucherNumber: string }> {
    const newAmount = Number(params.amount);
    if (!newAmount || newAmount <= 0) {
      throw new Error('مبلغ السند يجب أن يكون أكبر من الصفر.');
    }

    const result = await this.db.runTransaction(async (tx) => {
      const paymentRef = this.db.collection(Collections.SUPPLIER_PAYMENTS).doc(params.paymentId);
      const paymentSnap = await tx.get(paymentRef);
      if (!paymentSnap.exists) {
        throw new Error('سند الصرف غير موجود.');
      }

      const pData = paymentSnap.data()!;
      const supplierId = pData.supplier_id;
      const oldAmount = Number(pData.amount || 0);
      const voucherNumber = pData.voucher_number || params.paymentId;

      const supplierRef = this.db.collection(Collections.SUPPLIERS).doc(supplierId);
      const supplierSnap = await tx.get(supplierRef);

      // Delta: if oldAmount was 100 and newAmount is 150, diff is +50 => supplier balance decreases by 50
      const diff = newAmount - oldAmount;
      if (supplierSnap.exists && diff !== 0) {
        tx.update(supplierRef, {
          balance: FieldValue.increment(-diff),
        });
      }

      tx.update(paymentRef, {
        amount: newAmount,
        payment_method: params.payment_method,
        reference_number: params.reference_number?.trim() || null,
        bank_or_exchange: params.bank_or_exchange?.trim() || null,
        notes: params.notes?.trim() || null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        paymentId: params.paymentId,
        voucherNumber,
      };
    });

    // Also update any matching SUPPLIER_TRANSACTIONS record for reference
    const txSnap = await this.db
      .collection(Collections.SUPPLIER_TRANSACTIONS)
      .where('reference_id', '==', params.paymentId)
      .get();

    if (!txSnap.empty) {
      const batch = this.db.batch();
      txSnap.forEach((doc) => {
        batch.update(doc.ref, {
          amount: -newAmount,
          debit: newAmount,
          payment_method: params.payment_method,
          bank_or_exchange: params.bank_or_exchange?.trim() || null,
          notes: params.notes?.trim() || null,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    return result;
  }

  async deleteSupplierPayment(paymentId: string): Promise<void> {
    await this.db.runTransaction(async (tx) => {
      const paymentRef = this.db.collection(Collections.SUPPLIER_PAYMENTS).doc(paymentId);
      const paymentSnap = await tx.get(paymentRef);
      if (!paymentSnap.exists) {
        throw new Error('سند الصرف غير موجود أو تم حذفه مسبقاً.');
      }

      const pData = paymentSnap.data()!;
      const supplierId = pData.supplier_id;
      const amount = Number(pData.amount || 0);

      const supplierRef = this.db.collection(Collections.SUPPLIERS).doc(supplierId);
      const supplierSnap = await tx.get(supplierRef);

      // Revert the deduction: supplier balance increases by amount
      if (supplierSnap.exists && amount > 0) {
        tx.update(supplierRef, {
          balance: FieldValue.increment(amount),
        });
      }

      tx.delete(paymentRef);
    });

    // Clean up SUPPLIER_TRANSACTIONS
    const txSnap = await this.db
      .collection(Collections.SUPPLIER_TRANSACTIONS)
      .where('reference_id', '==', paymentId)
      .get();

    if (!txSnap.empty) {
      const batch = this.db.batch();
      txSnap.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  }

  async getSupplierStatement(supplierId: string): Promise<SupplierStatement> {
    const supplier = await this.getSupplierById(supplierId);
    if (!supplier) {
      throw new Error('المورد غير موجود.');
    }

    // Fetch all related entities in parallel
    const [purchasesSnap, returnsSnap, paymentsSnap, initTxSnap] = await Promise.all([
      this.db
        .collection(Collections.PURCHASES)
        .where('supplier_id', '==', supplierId)
        .get(),
      this.db
        .collection(Collections.PURCHASE_RETURNS)
        .where('supplier_id', '==', supplierId)
        .get(),
      this.db
        .collection(Collections.SUPPLIER_PAYMENTS)
        .where('supplier_id', '==', supplierId)
        .get(),
      this.db
        .collection(Collections.SUPPLIER_TRANSACTIONS)
        .where('supplier_id', '==', supplierId)
        .where('type', '==', 'INITIAL_BALANCE')
        .get(),
    ]);

    const txList: SupplierTransaction[] = [];

    // 1. Initial Balance
    let hasInitialRecorded = false;
    initTxSnap.forEach((doc) => {
      hasInitialRecorded = true;
      const d = doc.data();
      const amt = Number(d.amount || 0);
      txList.push({
        id: doc.id,
        supplier_id: supplierId,
        type: 'INITIAL_BALANCE',
        amount: amt,
        debit: 0,
        credit: amt,
        balance_after: amt,
        description: d.description || 'رصيد افتتاحي سابق للمورد',
        reference_id: null,
        reference_number: null,
        recorded_by: d.recorded_by || 'إدارة المشتريات',
        createdAt: toDate(d.createdAt),
      });
    });

    // 2. Purchases
    let totalPurchases = 0;
    purchasesSnap.forEach((doc) => {
      const d = doc.data();
      const amt = Number(d.total_amount || 0);
      totalPurchases += amt;
      const invNum = d.invoice_number || doc.id;
      const date = d.purchase_date ? toDate(d.purchase_date) : toDate(d.createdAt);

      const items = Array.isArray(d.items)
        ? d.items.map((it: any) => ({
            product_id: it.product_id,
            product_name: it.product_name || '',
            variant_id: it.variant_id || 'default',
            variant_label: it.variant_label || '',
            quantity: Number(it.quantity || 0),
            cost_price: Number(it.cost_price || 0),
          }))
        : [];

      txList.push({
        id: `purchase_${doc.id}`,
        supplier_id: supplierId,
        type: 'PURCHASE',
        amount: amt,
        debit: 0,
        credit: amt,
        balance_after: 0, // Calculated later in chronological order
        description: `فاتورة شراء رقم ${invNum}`,
        reference_id: doc.id,
        reference_number: invNum,
        recorded_by: 'إدارة المشتريات',
        createdAt: date,
        items,
      });
    });

    // 3. Purchase Returns
    let totalReturns = 0;
    returnsSnap.forEach((doc) => {
      const d = doc.data();
      const amt = Number(d.total_amount || 0);
      totalReturns += amt;
      const retNum = d.return_number || doc.id;
      const date = d.return_date ? toDate(d.return_date) : toDate(d.createdAt);

      const items = Array.isArray(d.items)
        ? d.items.map((it: any) => ({
            product_id: it.product_id,
            product_name: it.product_name || '',
            variant_id: it.variant_id || 'default',
            variant_label: it.variant_label || '',
            quantity: Number(it.quantity || 0),
            cost_price: Number(it.cost_price || 0),
          }))
        : [];

      txList.push({
        id: `return_${doc.id}`,
        supplier_id: supplierId,
        type: 'PURCHASE_RETURN',
        amount: -amt,
        debit: amt,
        credit: 0,
        balance_after: 0,
        description: `مردود مشتريات رقم ${retNum}`,
        reference_id: doc.id,
        reference_number: retNum,
        recorded_by: 'إدارة المشتريات',
        createdAt: date,
        items,
      });
    });

    // 4. Supplier Payments / Vouchers
    let totalPayments = 0;
    paymentsSnap.forEach((doc) => {
      const d = doc.data();
      const amt = Number(d.amount || 0);
      totalPayments += amt;
      const vNum = d.voucher_number || doc.id;

      txList.push({
        id: `payment_${doc.id}`,
        supplier_id: supplierId,
        type: 'PAYMENT',
        amount: -amt,
        debit: amt,
        credit: 0,
        balance_after: 0,
        description: `سند صرف دفعة للمورد رقم ${vNum}`,
        reference_id: doc.id,
        reference_number: vNum,
        recorded_by: d.recorded_by || 'إدارة المشتريات',
        payment_method: (d.payment_method as SupplierPaymentMethod) || 'CASH',
        bank_or_exchange: d.bank_or_exchange || null,
        notes: d.notes || null,
        createdAt: toDate(d.createdAt),
      });
    });

    // Handle legacy initial balance if not recorded in txList
    if (!hasInitialRecorded && txList.length === 0 && supplier.balance > 0) {
      txList.push({
        id: `init_${supplier.id}`,
        supplier_id: supplierId,
        type: 'INITIAL_BALANCE',
        amount: supplier.balance,
        debit: 0,
        credit: supplier.balance,
        balance_after: supplier.balance,
        description: 'رصيد افتتاحي سابق للمورد',
        reference_id: null,
        reference_number: null,
        recorded_by: 'إدارة المشتريات',
        createdAt: supplier.createdAt,
      });
    }

    // Sort chronologically (oldest to newest) to calculate progressive balance
    txList.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    let runningBalance = 0;
    for (const tx of txList) {
      runningBalance += tx.credit - tx.debit;
      tx.balance_after = runningBalance;
    }

    // Reverse so newest appears first in UI view
    const sortedTransactions = [...txList].reverse();

    return {
      supplier: {
        ...supplier,
        balance: runningBalance,
      },
      transactions: sortedTransactions,
      total_purchases: totalPurchases,
      total_payments: totalPayments,
      total_returns: totalReturns,
      net_balance: runningBalance,
    };
  }
}

export const purchasingRepository = new FirestorePurchasingRepository();

