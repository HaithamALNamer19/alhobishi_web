import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { assertMoney, type Money } from '@/core/domain/money';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import { computeStockState } from '@/features/products/domain/variant';
import { businessYear } from '@/core/domain/dates';
import type { AccountTransaction, SalesReturn, SalesReturnItem } from '../domain/ledger';

export class FirestoreLedgerRepository {
  private get db() {
    return adminDb();
  }

  async getTransactions(customerId: string, limit = 200): Promise<AccountTransaction[]> {
    const snap = await this.db
      .collection(Collections.ACCOUNT_TRANSACTIONS)
      .where('customerId', '==', customerId)
      .get();

    const txs = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        customerId: data.customerId,
        orderId: data.orderId || null,
        paymentId: data.paymentId || null,
        returnId: data.returnId || null,
        type: data.type,
        amount: data.amount as Money,
        previousBalance: data.previousBalance as Money,
        newBalance: data.newBalance as Money,
        description: data.description || '',
        recordedBy: data.recordedBy || 'System',
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : typeof data.createdAt?.toDate === 'function'
              ? data.createdAt.toDate()
              : data.createdAt instanceof Date
                ? data.createdAt
                : typeof data.createdAt === 'string' && !isNaN(new Date(data.createdAt).getTime())
                  ? new Date(data.createdAt)
                  : new Date(),
      };
    });

    return txs.sort((a, b) => {
      const timeB = isNaN(b.createdAt.getTime()) ? 0 : b.createdAt.getTime();
      const timeA = isNaN(a.createdAt.getTime()) ? 0 : a.createdAt.getTime();
      return timeB - timeA;
    }).slice(0, limit);
  }

  async getPaymentById(paymentId: string): Promise<{
    id: string;
    customerId: string;
    amount: Money;
    method: 'CASH' | 'TRANSFER' | 'OTHER';
    referenceNumber: string | null;
    notes: string | null;
    recordedBy: string;
    createdAt: Date;
  } | null> {
    const snap = await this.db.collection(Collections.PAYMENTS).doc(paymentId).get();
    if (!snap.exists) return null;
    const data = snap.data()!;
    return {
      id: snap.id,
      customerId: data.customerId,
      amount: data.amount as Money,
      method: data.method,
      referenceNumber: data.referenceNumber || null,
      notes: data.notes || null,
      recordedBy: data.recordedByName || data.recordedBy || 'المحاسب',
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : typeof data.createdAt?.toDate === 'function'
            ? data.createdAt.toDate()
            : data.createdAt instanceof Date
              ? data.createdAt
              : typeof data.createdAt === 'string' && !isNaN(new Date(data.createdAt).getTime())
                ? new Date(data.createdAt)
                : new Date(),
    };
  }

  async recordPayment(params: {
    customerId: string;
    amount: Money;
    method: 'CASH' | 'TRANSFER' | 'OTHER';
    referenceNumber?: string | null;
    notes?: string | null;
    actorId: string;
    actorName: string;
  }): Promise<{ transactionId: string; newBalance: Money }> {
    return this.db.runTransaction(async (tx) => {
      const userRef = this.db.collection(Collections.USERS).doc(params.customerId);
      const userSnap = await tx.get(userRef);

      if (!userSnap.exists) {
        throw new AppError(ErrorCode.NOT_FOUND, { message: 'حساب العميل غير موجود.' });
      }

      const userData = userSnap.data()!;
      const currentBalance = (userData.balance ?? 0) as Money;
      // Payment reduces debt (balance decreases)
      const newBalance = (currentBalance - params.amount) as Money;

      // Create payment document
      const payRef = this.db.collection(Collections.PAYMENTS).doc();
      tx.set(payRef, {
        customerId: params.customerId,
        amount: params.amount,
        method: params.method,
        referenceNumber: params.referenceNumber || null,
        notes: params.notes || null,
        recordedBy: params.actorName,
        recordedByName: params.actorName,
        recordedById: params.actorId,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Append ledger transaction
      const txRef = this.db.collection(Collections.ACCOUNT_TRANSACTIONS).doc();
      tx.set(txRef, {
        customerId: params.customerId,
        orderId: null,
        paymentId: payRef.id,
        type: 'PAYMENT',
        amount: -params.amount,
        previousBalance: currentBalance,
        newBalance,
        description: `سداد دفعة نقدية / حوالة بقيمة ${params.amount} ر.ي`,
        recordedBy: params.actorName,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Update user current balance
      tx.update(userRef, {
        balance: newBalance,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Notification
      const notifRef = this.db.collection(Collections.NOTIFICATIONS).doc();
      tx.set(notifRef, {
        userId: params.customerId,
        title: 'تم تسجيل دفعة مالية',
        message: `تم تسجيل سند قبض على حسابك بمبلغ ${params.amount} ريال يمني. الرصيد المتبقي: ${newBalance} ريال.`,
        type: 'PAYMENT_RECORDED',
        referenceId: payRef.id,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Audit Log
      const auditRef = this.db.collection(Collections.AUDIT_LOGS).doc();
      tx.set(auditRef, {
        actorId: params.actorId,
        actorName: params.actorName,
        action: 'PAYMENT_RECORDED',
        entityType: 'ledger',
        entityId: txRef.id,
        oldData: { balance: currentBalance },
        newData: { amount: params.amount, newBalance },
        timestamp: FieldValue.serverTimestamp(),
      });

      return { transactionId: txRef.id, newBalance };
    });
  }

  async recordDisbursement(params: {
    customerId: string;
    amount: Money;
    method: 'CASH' | 'TRANSFER' | 'OTHER';
    referenceNumber?: string | null;
    notes?: string | null;
    actorId: string;
    actorName: string;
  }): Promise<{ transactionId: string; newBalance: Money }> {
    return this.db.runTransaction(async (tx) => {
      const userRef = this.db.collection(Collections.USERS).doc(params.customerId);
      const userSnap = await tx.get(userRef);

      if (!userSnap.exists) {
        throw new AppError(ErrorCode.NOT_FOUND, { message: 'حساب العميل غير موجود.' });
      }

      const userData = userSnap.data()!;
      const currentBalance = (userData.balance ?? 0) as Money;
      const newBalance = (currentBalance + params.amount) as Money;

      // Create payment document as disbursement
      const payRef = this.db.collection(Collections.PAYMENTS).doc();
      tx.set(payRef, {
        customerId: params.customerId,
        amount: params.amount,
        type: 'DISBURSEMENT',
        method: params.method,
        referenceNumber: params.referenceNumber || null,
        notes: params.notes || null,
        recordedBy: params.actorName,
        recordedByName: params.actorName,
        recordedById: params.actorId,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Append ledger transaction
      const txRef = this.db.collection(Collections.ACCOUNT_TRANSACTIONS).doc();
      tx.set(txRef, {
        customerId: params.customerId,
        orderId: null,
        paymentId: payRef.id,
        type: 'ADJUSTMENT',
        amount: params.amount,
        previousBalance: currentBalance,
        newBalance,
        description: `سند صرف نقدي / دفعة للعميل بقيمة ${params.amount} ر.ي`,
        recordedBy: params.actorName,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Update user current balance
      tx.update(userRef, {
        balance: newBalance,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Notification
      const notifRef = this.db.collection(Collections.NOTIFICATIONS).doc();
      tx.set(notifRef, {
        userId: params.customerId,
        title: 'تم تسجيل سند صرف مالي',
        message: `تم تسجيل سند صرف على حسابك بمبلغ ${params.amount} ريال يمني. الرصيد الحالي: ${newBalance} ريال.`,
        type: 'PAYMENT_RECORDED',
        referenceId: payRef.id,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      return { transactionId: txRef.id, newBalance };
    });
  }

  async getSalesReturnById(returnId: string): Promise<SalesReturn | null> {
    const snap = await this.db.collection(Collections.SALES_RETURNS).doc(returnId).get();
    if (!snap.exists) return null;
    const data = snap.data()!;
    return {
      id: snap.id,
      returnNumber: data.returnNumber || snap.id,
      customerId: data.customerId,
      customerName: data.customerName || 'عميل',
      customerPhone: data.customerPhone || '',
      items: Array.isArray(data.items) ? data.items : [],
      totalAmount: (data.totalAmount ?? 0) as Money,
      reason: data.reason || null,
      orderId: data.orderId || null,
      recordedBy: data.recordedByName || data.recordedBy || 'إدارة المتجر',
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : typeof data.createdAt?.toDate === 'function'
            ? data.createdAt.toDate()
            : data.createdAt instanceof Date
              ? data.createdAt
              : typeof data.createdAt === 'string' && !isNaN(new Date(data.createdAt).getTime())
                ? new Date(data.createdAt)
                : new Date(),
    };
  }

  async listSalesReturns(limit = 100): Promise<SalesReturn[]> {
    const snap = await this.db
      .collection(Collections.SALES_RETURNS)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        returnNumber: data.returnNumber || doc.id,
        customerId: data.customerId,
        customerName: data.customerName || 'عميل',
        customerPhone: data.customerPhone || '',
        items: Array.isArray(data.items) ? data.items : [],
        totalAmount: (data.totalAmount ?? 0) as Money,
        reason: data.reason || null,
        orderId: data.orderId || null,
        recordedBy: data.recordedByName || data.recordedBy || 'إدارة المتجر',
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : typeof data.createdAt?.toDate === 'function'
              ? data.createdAt.toDate()
              : data.createdAt instanceof Date
                ? data.createdAt
                : typeof data.createdAt === 'string' && !isNaN(new Date(data.createdAt).getTime())
                  ? new Date(data.createdAt)
                  : new Date(),
      };
    });
  }

  async recordSalesReturn(params: {
    customerId: string;
    items: Array<{
      productId: string;
      productName: string;
      variantId: string;
      variantLabel: string;
      quantity: number;
      unitPrice: Money;
    }>;
    reason?: string | null;
    orderId?: string | null;
    actorId: string;
    actorName: string;
  }): Promise<{ returnId: string; returnNumber: string; newBalance: Money; totalAmount: Money }> {
    if (!params.items || params.items.length === 0) {
      throw new AppError(ErrorCode.EMPTY_ORDER, { message: 'يجب اختيار صنف واحد على الأقل للمردود.' });
    }

    return this.db.runTransaction(async (tx) => {
      // 1. ALL READS FIRST (Firestore requires all reads before any writes)
      const userRef = this.db.collection(Collections.USERS).doc(params.customerId);
      const counterRef = this.db.collection(Collections.COUNTERS).doc('sales_returns');

      const [userSnap, counterSnap, loadedVariants] = await Promise.all([
        tx.get(userRef),
        tx.get(counterRef),
        Promise.all(
          params.items.map(async (item) => {
            const prodRef = this.db.collection(Collections.PRODUCTS).doc(item.productId);
            const varRef = prodRef.collection(Collections.VARIANTS).doc(item.variantId);
            const [prodSnap, varSnap] = await Promise.all([tx.get(prodRef), tx.get(varRef)]);
            return { item, prodRef, varRef, prodSnap, varSnap };
          })
        ),
      ]);

      if (!userSnap.exists) {
        throw new AppError(ErrorCode.NOT_FOUND, { message: 'حساب العميل غير موجود.' });
      }

      const userData = userSnap.data()!;
      const currentBalance = Number(userData.balance ?? userData.account?.balance ?? 0) as Money;
      const customerName = userData.displayName || userData.username || 'عميل';
      const customerPhone = userData.phone || '';

      // 2. Calculate Total Return Amount in Memory
      let totalAmount = 0;
      for (const item of params.items) {
        if (item.quantity <= 0) {
          throw new AppError(ErrorCode.INVALID_QUANTITY, {
            message: `الكمية المدخلة للصنف "${item.productName}" غير صحيحة.`,
          });
        }
        totalAmount += item.quantity * item.unitPrice;
      }
      const totalMoney = assertMoney(totalAmount);
      // Return reduces customer balance/debt
      const newBalance = (currentBalance - totalMoney) as Money;

      // 3. Compute Sequential Counter and Return Number
      const currentSeq = counterSnap.exists ? (counterSnap.data()?.seq || 0) : 0;
      const nextSeq = currentSeq + 1;
      const currentYear = businessYear(new Date());
      const returnNumber = `RET-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

      // 4. ALL WRITES START HERE (No reads below this point)
      // 4a. Update Counter
      tx.set(counterRef, { seq: nextSeq, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

      // 4b. Restore inventory and write movements
      for (const { item, prodRef, varRef, prodSnap, varSnap } of loadedVariants) {
        if (varSnap.exists) {
          const vData = varSnap.data()!;
          const currentStock = (vData.stockQty ?? 0) as number;
          const currentReserved = (vData.reservedQty ?? 0) as number;
          const newStock = currentStock + item.quantity;
          const newAvailable = Math.max(0, newStock - currentReserved);
          const thresh = (vData.lowStockThreshold ?? 5) as number;
          const newStockState = computeStockState(newAvailable, thresh);

          tx.update(varRef, {
            stockQty: newStock,
            availableQty: newAvailable,
            stockState: newStockState,
            updatedAt: FieldValue.serverTimestamp(),
          });

          tx.update(prodRef, {
            hasStock: true,
            updatedAt: FieldValue.serverTimestamp(),
          });

          const moveRef = this.db.collection(Collections.INVENTORY_MOVEMENTS).doc();
          tx.set(moveRef, {
            productId: item.productId,
            variantId: item.variantId,
            type: 'RETURN',
            delta: item.quantity,
            stockAfter: newStock,
            reservedAfter: currentReserved,
            orderId: returnNumber,
            reason: `مردود مبيعات للعميل ${customerName} (فاتورة ${returnNumber})`,
            actorId: params.actorId,
            createdAt: FieldValue.serverTimestamp(),
          });
        } else if (prodSnap.exists) {
          const pData = prodSnap.data()!;
          const currentStock = (pData.stockQty ?? 0) as number;
          const newStock = currentStock + item.quantity;

          tx.update(prodRef, {
            stockQty: newStock,
            hasStock: true,
            updatedAt: FieldValue.serverTimestamp(),
          });

          const moveRef = this.db.collection(Collections.INVENTORY_MOVEMENTS).doc();
          tx.set(moveRef, {
            productId: item.productId,
            variantId: item.variantId || 'default',
            type: 'RETURN',
            delta: item.quantity,
            stockAfter: newStock,
            reservedAfter: 0,
            orderId: returnNumber,
            reason: `مردود مبيعات للعميل ${customerName} (فاتورة ${returnNumber})`,
            actorId: params.actorId,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      }

      // 4c. Create Sales Return Document
      const retRef = this.db.collection(Collections.SALES_RETURNS).doc();
      const returnItems = params.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        variantId: i.variantId,
        variantLabel: i.variantLabel || '-',
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.quantity * i.unitPrice,
      }));

      tx.set(retRef, {
        id: retRef.id,
        returnNumber,
        customerId: params.customerId,
        customerName,
        customerPhone,
        items: returnItems,
        productIds: Array.from(new Set(returnItems.map((i) => i.productId))),
        totalAmount: totalMoney,
        reason: params.reason || null,
        orderId: params.orderId || null,
        recordedBy: params.actorName,
        recordedByName: params.actorName,
        recordedById: params.actorId,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 4d. Append Ledger Transaction
      const txRef = this.db.collection(Collections.ACCOUNT_TRANSACTIONS).doc();
      tx.set(txRef, {
        customerId: params.customerId,
        orderId: params.orderId || null,
        paymentId: null,
        returnId: retRef.id,
        type: 'RETURN',
        amount: -totalMoney,
        previousBalance: currentBalance,
        newBalance,
        description: `فاتورة مردود مبيعات رقم ${returnNumber}${params.reason ? ` (${params.reason})` : ''}`,
        recordedBy: params.actorName,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 4e. Update User Balance
      tx.update(userRef, {
        balance: newBalance,
        'account.balance': newBalance,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 4f. Notification
      const notifRef = this.db.collection(Collections.NOTIFICATIONS).doc();
      tx.set(notifRef, {
        userId: params.customerId,
        title: 'تم تسجيل فاتورة مردود مبيعات',
        message: `تم قيد مردود مبيعات برقم ${returnNumber} بمبلغ ${totalMoney} ريال لصالح حسابك. الرصيد الحالي: ${newBalance} ريال.`,
        type: 'RETURN_RECORDED',
        referenceId: retRef.id,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 4g. Audit Log
      const auditRef = this.db.collection(Collections.AUDIT_LOGS).doc();
      tx.set(auditRef, {
        actorId: params.actorId,
        actorName: params.actorName,
        action: 'SALES_RETURN_RECORDED',
        entityType: 'salesReturn',
        entityId: retRef.id,
        oldData: { balance: currentBalance },
        newData: { returnNumber, totalAmount: totalMoney, newBalance },
        timestamp: FieldValue.serverTimestamp(),
      });

      return { returnId: retRef.id, returnNumber, newBalance, totalAmount: totalMoney };
    });
  }

  async updateSalesReturn(params: {
    returnId: string;
    returnNumber?: string;
    reason?: string | null;
    createdAt?: Date;
    items?: Array<{
      productId: string;
      productName: string;
      variantId: string;
      variantLabel: string;
      quantity: number;
      unitPrice: Money;
    }>;
    actorId: string;
    actorName: string;
  }): Promise<{ returnId: string; returnNumber: string; totalAmount: Money }> {
    return this.db.runTransaction(async (tx) => {
      const returnRef = this.db.collection(Collections.SALES_RETURNS).doc(params.returnId);
      const snap = await tx.get(returnRef);
      if (!snap.exists) {
        throw new AppError(ErrorCode.NOT_FOUND, { message: 'فاتورة مردود المبيعات غير موجودة.' });
      }

      const rData = snap.data()!;
      const customerId = rData.customerId;
      const oldReturnNumber = rData.returnNumber || params.returnId;
      const finalReturnNumber = params.returnNumber?.trim() || oldReturnNumber;
      const oldTotal = Number(rData.totalAmount || 0);
      const oldItems: SalesReturnItem[] = Array.isArray(rData.items) ? rData.items : [];

      const userRef = this.db.collection(Collections.USERS).doc(customerId);
      const userSnap = await tx.get(userRef);

      if (!params.items) {
        const updates: any = { updatedAt: FieldValue.serverTimestamp() };
        if (params.returnNumber?.trim()) updates.returnNumber = params.returnNumber.trim();
        if (params.reason !== undefined) updates.reason = params.reason;
        if (params.createdAt) updates.createdAt = Timestamp.fromDate(params.createdAt);
        tx.update(returnRef, updates);
        return { returnId: params.returnId, returnNumber: finalReturnNumber, totalAmount: oldTotal as Money };
      }

      const newItems = params.items;
      if (newItems.length === 0) {
        throw new AppError(ErrorCode.EMPTY_ORDER, { message: 'يجب اختيار صنف واحد على الأقل للمردود.' });
      }

      const allItemKeys = new Set<string>();
      const makeKey = (pId: string, vId?: string) => `${pId}:::${vId?.trim() || 'default'}`;

      oldItems.forEach((i) => allItemKeys.add(makeKey(i.productId, i.variantId)));
      newItems.forEach((i) => allItemKeys.add(makeKey(i.productId, i.variantId)));

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

      // Sales return adds returned item back to stock.
      // Net stock change = newReturnedQty - oldReturnedQty (if customer returns less, stock decreases)
      const netChanges: any[] = [];
      for (const key of loadedKeys) {
        const d = docsMap.get(key)!;
        const [productId, variantId] = key.split(':::');
        const oldQty = oldItems
          .filter((i) => makeKey(i.productId, i.variantId) === key)
          .reduce((sum, i) => sum + Number(i.quantity || 0), 0);
        const newQty = newItems
          .filter((i) => makeKey(i.productId, i.variantId) === key)
          .reduce((sum, i) => sum + Number(i.quantity || 0), 0);

        const netStockChange = newQty - oldQty;
        const prodData = d.prodSnap.data() || {};
        const varData = d.varSnap.data() || {};

        const currentVarStock = Number(varData.stockQty ?? 0);
        const currentReserved = Number(varData.reservedQty ?? 0);
        const newVarStock = currentVarStock + netStockChange;

        if (newVarStock < 0) {
          throw new AppError(ErrorCode.OUT_OF_STOCK, {
            message: `لا يمكن تقليل كمية المردود للصنف "${prodData.name || productId}" بمقدار ${Math.abs(netStockChange)} لأن المخزون المتبقي حالياً لا يكفي.`,
          });
        }

        const newAvailable = Math.max(0, newVarStock - currentReserved);
        const threshold = Number(varData.lowStockThreshold ?? 5);
        const newStockState = computeStockState(newAvailable, threshold);
        const itemLabel =
          newItems.find((i) => makeKey(i.productId, i.variantId) === key)?.productName ||
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
        const p = Number(item.unitPrice || 0);
        if (q <= 0) throw new AppError(ErrorCode.INVALID_QUANTITY, { message: 'الكمية غير صالحة.' });
        newTotal += q * p;
      }
      const totalMoney = assertMoney(newTotal);

      // Return reduces customer balance/debt. Increasing return reduces balance further.
      // customerBalanceDelta = -(newTotal - oldTotal)
      const customerBalanceDelta = -(totalMoney - oldTotal);

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
            reason: `تعديل مردود مبيعات رقم ${finalReturnNumber} (${change.netStockChange > 0 ? '+' : ''}${change.netStockChange})`,
            actorId: params.actorId,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      }

      if (customerBalanceDelta !== 0 && userSnap.exists) {
        const userData = userSnap.data()!;
        const currentBalance = Number(userData.balance ?? userData.account?.balance ?? 0) as Money;
        const newBalance = (currentBalance + customerBalanceDelta) as Money;

        tx.update(userRef, {
          balance: newBalance,
          'account.balance': newBalance,
          updatedAt: FieldValue.serverTimestamp(),
        });

        const txRef = this.db.collection(Collections.ACCOUNT_TRANSACTIONS).doc();
        tx.set(txRef, {
          customerId,
          orderId: rData.orderId || null,
          paymentId: null,
          returnId: params.returnId,
          type: 'RETURN',
          amount: customerBalanceDelta,
          previousBalance: currentBalance,
          newBalance,
          description: `تعديل إجمالي فاتورة مردود مبيعات رقم ${finalReturnNumber}`,
          recordedBy: params.actorName,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      tx.set(
        returnRef,
        {
          returnNumber: finalReturnNumber,
          reason: params.reason !== undefined ? params.reason : (rData.reason || null),
          items: newItems.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            variantId: i.variantId,
            variantLabel: i.variantLabel || '-',
            quantity: Number(i.quantity || 0),
            unitPrice: Number(i.unitPrice || 0) as Money,
            subtotal: (Number(i.quantity || 0) * Number(i.unitPrice || 0)) as Money,
          })),
          productIds: Array.from(new Set(newItems.map((i) => i.productId))),
          totalAmount: totalMoney,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        returnId: params.returnId,
        returnNumber: finalReturnNumber,
        totalAmount: totalMoney,
      };
    });
  }
}

export const ledgerRepository = new FirestoreLedgerRepository();

