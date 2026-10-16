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
import { assertMoney } from '@/core/domain/money';
import { ledgerRepository } from '../infrastructure/firestore-ledger.repository';
import { purchasingRepository } from '@/features/purchasing/infrastructure/firestore-purchasing.repository';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';

export interface FinancialPartyOption {
  id: string;
  name: string;
  type: 'CUSTOMER' | 'WHOLESALE' | 'SUPPLIER';
  typeLabel: string;
  phone?: string;
  companyName?: string;
  balance: number;
  balanceLabel: string;
}

export async function searchFinancialPartiesAction(params: {
  query?: string;
  voucherType?: 'RECEIPT' | 'DISBURSEMENT';
}): Promise<Result<FinancialPartyOption[]>> {
  return runAction(async () => {
    const session = await requireSession();
    if (!isBackOfficeRole(session.role)) {
      throw new AppError(ErrorCode.FORBIDDEN, { message: 'غير مصرح لك بالبحث في الحسابات المالية.' });
    }

    const q = (params.query || '').trim().toLowerCase();
    if (!q) {
      return [];
    }

    const db = adminDb();

    // 1. Fetch Candidates from USERS (Customers and Wholesalers)
    const usersSnap = await db
      .collection(Collections.USERS)
      .limit(100)
      .get();

    const matchedUsers: FinancialPartyOption[] = [];
    usersSnap.docs.forEach((doc) => {
      const u = doc.data();
      const role = u.role || 'customer';
      if (role !== 'customer' && role !== 'wholesale') return;

      const name = (u.displayName || u.username || '').toLowerCase();
      const phone = String(u.phone || '');
      const username = (u.username || '').toLowerCase();

      if (!q || name.includes(q) || phone.includes(q) || username.includes(q)) {
        const isWholesale = role === 'wholesale';
        const bal = Number(u.balance ?? 0);
        matchedUsers.push({
          id: doc.id,
          name: u.displayName || u.username || 'عميل',
          type: isWholesale ? 'WHOLESALE' : 'CUSTOMER',
          typeLabel: isWholesale ? 'تاجر جملة' : 'عميل',
          phone: u.phone || undefined,
          balance: bal,
          balanceLabel: bal > 0 ? 'مدين للمتجر (عليه)' : bal < 0 ? 'دائن (له رصيد)' : 'رصيده متزن (0)',
        });
      }
    });

    // 2. Fetch Candidates from SUPPLIERS
    const suppliersSnap = await db
      .collection(Collections.SUPPLIERS)
      .limit(100)
      .get();

    const matchedSuppliers: FinancialPartyOption[] = [];
    suppliersSnap.docs.forEach((doc) => {
      const s = doc.data();
      const name = (s.name || '').toLowerCase();
      const comp = (s.company_name || '').toLowerCase();
      const phone = String(s.phone || '');

      if (!q || name.includes(q) || comp.includes(q) || phone.includes(q)) {
        const bal = Number(s.balance ?? 0);
        matchedSuppliers.push({
          id: doc.id,
          name: s.name || 'مورد',
          type: 'SUPPLIER',
          typeLabel: 'مورد',
          phone: s.phone || undefined,
          companyName: s.company_name || undefined,
          balance: bal,
          balanceLabel: bal > 0 ? 'مستحق للمورد (له)' : bal < 0 ? 'رصيد دائن للمتجر' : 'حسابه مسدد (0)',
        });
      }
    });

    // Sort order:
    // If RECEIPT (سند قبض): prioritize Customers / Wholesale
    // If DISBURSEMENT (سند صرف): prioritize Suppliers
    let combined: FinancialPartyOption[];
    if (params.voucherType === 'DISBURSEMENT') {
      combined = [...matchedSuppliers, ...matchedUsers];
    } else {
      combined = [...matchedUsers, ...matchedSuppliers];
    }

    return combined.slice(0, 30);
  });
}

export async function recordFinancialVoucherAction(params: {
  voucherType: 'RECEIPT' | 'DISBURSEMENT';
  partyType: 'CUSTOMER' | 'WHOLESALE' | 'SUPPLIER';
  partyId: string;
  amount: number;
  paymentMethod: 'CASH' | 'TRANSFER' | 'CHECK' | 'OTHER';
  referenceNumber?: string | null;
  bankOrExchange?: string | null;
  notes?: string | null;
  collectorName?: string | null;
}): Promise<
  Result<{
    voucherId: string;
    voucherNumber: string;
    voucherType: 'RECEIPT' | 'DISBURSEMENT';
    amount: number;
    partyName: string;
  }>
> {
  return runAction(async () => {
    const session = await requireSession();
    if (!isBackOfficeRole(session.role)) {
      throw new AppError(ErrorCode.FORBIDDEN, { message: 'ليس لديك صلاحية تسجيل السندات المالية.' });
    }

    if (!params.partyId) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, { message: 'يرجى تحديد العميل أو التاجر أو المورد.' });
    }

    const amountNum = Number(params.amount);
    if (!amountNum || amountNum <= 0) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, { message: 'مبلغ السند يجب أن يكون أكبر من الصفر.' });
    }

    const currentActor = await userRepository.findById(session.uid).catch(() => null);
    const actorName =
      params.collectorName?.trim() ||
      currentActor?.displayName ||
      currentActor?.username ||
      'إدارة المالية';

    if (params.partyType === 'SUPPLIER') {
      if (params.voucherType === 'DISBURSEMENT') {
        const payment = await purchasingRepository.recordSupplierPayment({
          supplier_id: params.partyId,
          amount: amountNum,
          payment_method: params.paymentMethod,
          reference_number: params.referenceNumber?.trim() || null,
          bank_or_exchange: params.bankOrExchange?.trim() || null,
          notes: params.notes?.trim() || null,
          actor_name: actorName,
        });

        revalidatePath('/admin/payments');
        revalidatePath('/admin/suppliers');
        revalidatePath(`/admin/suppliers/${params.partyId}/statement`);

        return {
          voucherId: payment.id,
          voucherNumber: payment.voucher_number,
          voucherType: 'DISBURSEMENT',
          amount: amountNum,
          partyName: payment.supplier_name,
        };
      } else {
        const refund = await purchasingRepository.recordSupplierRefund({
          supplier_id: params.partyId,
          amount: amountNum,
          payment_method: params.paymentMethod,
          reference_number: params.referenceNumber?.trim() || null,
          bank_or_exchange: params.bankOrExchange?.trim() || null,
          notes: params.notes?.trim() || null,
          actor_name: actorName,
        });

        revalidatePath('/admin/payments');
        revalidatePath('/admin/suppliers');
        revalidatePath(`/admin/suppliers/${params.partyId}/statement`);

        return {
          voucherId: refund.id,
          voucherNumber: refund.voucher_number,
          voucherType: 'RECEIPT',
          amount: amountNum,
          partyName: refund.supplier_name,
        };
      }
    } else {
      // Customer or Wholesale Merchant
      const customer = await userRepository.findById(params.partyId);
      const customerName = customer?.displayName || customer?.username || 'العميل';

      if (params.voucherType === 'RECEIPT') {
        const res = await ledgerRepository.recordPayment({
          customerId: params.partyId,
          amount: assertMoney(amountNum),
          method: params.paymentMethod === 'CHECK' ? 'OTHER' : params.paymentMethod,
          referenceNumber: params.referenceNumber?.trim() || null,
          notes: params.notes?.trim() || null,
          actorId: session.uid,
          actorName,
        });

        revalidatePath('/admin/payments');
        revalidatePath('/admin/customers');
        revalidatePath(`/admin/customers/${params.partyId}/statement`);
        revalidatePath('/account');

        return {
          voucherId: res.transactionId,
          voucherNumber: `REC-CUST-${res.transactionId.slice(-6).toUpperCase()}`,
          voucherType: 'RECEIPT',
          amount: amountNum,
          partyName: customerName,
        };
      } else {
        // Disbursement to customer
        const res = await ledgerRepository.recordDisbursement({
          customerId: params.partyId,
          amount: assertMoney(amountNum),
          method: params.paymentMethod === 'CHECK' ? 'OTHER' : params.paymentMethod,
          referenceNumber: params.referenceNumber?.trim() || null,
          notes: params.notes?.trim() || null,
          actorId: session.uid,
          actorName,
        });

        revalidatePath('/admin/payments');
        revalidatePath('/admin/customers');
        revalidatePath(`/admin/customers/${params.partyId}/statement`);
        revalidatePath('/account');

        return {
          voucherId: res.transactionId,
          voucherNumber: `PAY-CUST-${res.transactionId.slice(-6).toUpperCase()}`,
          voucherType: 'DISBURSEMENT',
          amount: amountNum,
          partyName: customerName,
        };
      }
    }
  });
}
