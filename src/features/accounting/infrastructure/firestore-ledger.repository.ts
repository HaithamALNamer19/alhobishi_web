import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { assertMoney, addMoney, type Money } from '@/core/domain/money';
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
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      };
    });

    return txs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
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
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
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
      totalAmount: data.totalAmount as Money,
      reason: data.reason || null,
      orderId: data.orderId || null,
      recordedBy: data.recordedByName || data.recordedBy || 'إدارة المتجر',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
    };
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
  }): Promise<{ returnId: string; returnNumber: string; newBalance: Money }> {
    if (!params.items || params.items.length === 0) {
      throw new AppError(ErrorCode.EMPTY_ORDER, { message: 'يجب اختيار صنف واحد على الأقل للمردود.' });
    }

    return this.db.runTransaction(async (tx) => {
      // 1. Read Customer
      const userRef = this.db.collection(Collections.USERS).doc(params.customerId);
      const userSnap = await tx.get(userRef);

      if (!userSnap.exists) {
        throw new AppError(ErrorCode.NOT_FOUND, { message: 'حساب العميل غير موجود.' });
      }

      const userData = userSnap.data()!;
      const currentBalance = (userData.balance ?? 0) as Money;
      const customerName = userData.displayName || userData.username || 'عميل';
      const customerPhone = userData.phone || '';

      // 2. Calculate Total Return Amount
      let totalAmount = 0;
      for (const item of params.items) {
        if (item.quantity <= 0) {
          throw new AppError(ErrorCode.INVALID_QUANTITY, { message: `الكمية المدخلة للصنف "${item.productName}" غير صحيحة.` });
        }
        totalAmount += item.quantity * item.unitPrice;
      }
      const totalMoney = assertMoney(totalAmount);
      // Return reduces customer balance/debt
      const newBalance = (currentBalance - totalMoney) as Money;

      // 3. Sequential Counter for Sales Returns
      const counterRef = this.db.collection(Collections.COUNTERS).doc('sales_returns');
      const counterSnap = await tx.get(counterRef);
      const currentSeq = counterSnap.exists ? (counterSnap.data()?.seq || 0) : 0;
      const nextSeq = currentSeq + 1;
      tx.set(counterRef, { seq: nextSeq, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

      const currentYear = businessYear(new Date());
      const returnNumber = `RET-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

      // 4. Pre-read variants for inventory restoration
      const loadedVariants = await Promise.all(
        params.items.map(async (item) => {
          const prodRef = this.db.collection(Collections.PRODUCTS).doc(item.productId);
          const varRef = prodRef.collection(Collections.VARIANTS).doc(item.variantId);
          const varSnap = await tx.get(varRef);
          return { item, prodRef, varRef, varSnap };
        })
      );

      // Restore inventory and write movements
      for (const { item, prodRef, varRef, varSnap } of loadedVariants) {
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
        }
      }

      // 5. Create Sales Return Document
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
        totalAmount: totalMoney,
        reason: params.reason || null,
        orderId: params.orderId || null,
        recordedBy: params.actorName,
        recordedByName: params.actorName,
        recordedById: params.actorId,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 6. Append Ledger Transaction
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

      // 7. Update User Balance
      tx.update(userRef, {
        balance: newBalance,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 8. Notification
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

      // 9. Audit Log
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

      return { returnId: retRef.id, returnNumber, newBalance };
    });
  }
}

export const ledgerRepository = new FirestoreLedgerRepository();

