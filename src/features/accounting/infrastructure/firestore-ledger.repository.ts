import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { assertMoney, addMoney, type Money } from '@/core/domain/money';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import type { AccountTransaction } from '../domain/ledger';

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
      recordedBy: data.recordedBy || 'System',
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
        recordedBy: params.actorId,
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
}

export const ledgerRepository = new FirestoreLedgerRepository();

