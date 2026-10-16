import React from 'react';
import { connection } from 'next/server';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import {
  FinancialVouchersManager,
  type SerializedFinancialVoucher,
} from '@/features/accounting/components/financial-vouchers-manager';

export const metadata = {
  title: 'المالية والحسابات | سندات القبض والصرف | إدارة المتجر',
  description: 'إدارة وتسجيل سندات القبض والصرف، وتتبع حركة السيولة النقدية والمقبوضات والمدفوعات',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPaymentsPage() {
  await connection();
  const db = adminDb();

  // 1. Fetch both Customer Payments and Supplier Payments concurrently
  const [customerPaymentsSnap, supplierPaymentsSnap] = await Promise.all([
    db.collection(Collections.PAYMENTS).orderBy('createdAt', 'desc').limit(100).get(),
    db.collection(Collections.SUPPLIER_PAYMENTS).orderBy('createdAt', 'desc').limit(100).get(),
  ]);

  // 2. Collect unique user IDs for Customers & Collectors
  const userIds = new Set<string>();
  customerPaymentsSnap.docs.forEach((doc) => {
    const d = doc.data();
    if (d.customerId) userIds.add(d.customerId);
    if (d.recordedBy && !d.recordedBy.includes(' ') && d.recordedBy.length >= 20) {
      userIds.add(d.recordedBy);
    }
  });

  const userMap = new Map<string, { name: string; role: string; phone?: string }>();
  if (userIds.size > 0) {
    const userDocs = await Promise.allSettled(
      Array.from(userIds).map((id) => db.collection(Collections.USERS).doc(id).get())
    );
    userDocs.forEach((res) => {
      if (res.status === 'fulfilled' && res.value.exists) {
        const u = res.value.data()!;
        userMap.set(res.value.id, {
          name: u.displayName || u.username || res.value.id,
          role: u.role || 'customer',
          phone: u.phone || undefined,
        });
      }
    });
  }

  // 3. Normalize Customer Payments
  const customerVouchers: SerializedFinancialVoucher[] = customerPaymentsSnap.docs.map((doc) => {
    const data = doc.data();
    const uInfo = data.customerId ? userMap.get(data.customerId) : undefined;
    const customerName = uInfo?.name || (data.customerId ? `عميل #${data.customerId.slice(0, 6)}` : 'عميل');
    const isWholesale = uInfo?.role === 'wholesale';
    const partyType: 'CUSTOMER' | 'WHOLESALE' = isWholesale ? 'WHOLESALE' : 'CUSTOMER';
    const partyTypeLabel = isWholesale ? 'تاجر جملة' : 'عميل';

    let collector = data.recordedByName || data.recordedBy || 'المحاسب';
    if (collector && userMap.has(collector)) {
      collector = userMap.get(collector)!.name;
    }

    const isDisb = data.type === 'DISBURSEMENT';
    const voucherType: 'RECEIPT' | 'DISBURSEMENT' = isDisb ? 'DISBURSEMENT' : 'RECEIPT';
    const voucherNumber =
      data.voucherNumber ||
      (isDisb ? `PAY-CUST-${doc.id.slice(-6).toUpperCase()}` : `REC-CUST-${doc.id.slice(-6).toUpperCase()}`);

    const date = data.createdAt?.toDate?.() || new Date();

    const method = data.method || 'CASH';
    const methodLabel =
      method === 'CASH'
        ? 'نقدًا'
        : method === 'TRANSFER'
          ? 'حوالة مصرفية'
          : method === 'CHECK'
            ? 'شيك بنكي'
            : 'أخرى';

    return {
      id: doc.id,
      voucherNumber,
      voucherType,
      partyId: data.customerId || '',
      partyName: customerName,
      partyType,
      partyTypeLabel,
      partyPhone: uInfo?.phone || null,
      statementUrl: data.customerId ? `/admin/customers/${data.customerId}/statement` : '/admin/customers',
      amount: Number(data.amount) || 0,
      paymentMethod: method,
      paymentMethodLabel: methodLabel,
      referenceNumber: data.referenceNumber || null,
      bankOrExchange: data.bankOrExchange || null,
      notes: data.notes || null,
      collectorName: collector,
      createdAt: date.toISOString(),
    };
  });

  // 4. Normalize Supplier Payments
  const supplierVouchers: SerializedFinancialVoucher[] = supplierPaymentsSnap.docs.map((doc) => {
    const data = doc.data();
    const isRefund = data.voucher_type === 'RECEIPT' || data.type === 'REFUND';
    const voucherType: 'RECEIPT' | 'DISBURSEMENT' = isRefund ? 'RECEIPT' : 'DISBURSEMENT';
    const voucherNumber =
      data.voucher_number ||
      (isRefund ? `REC-SUP-${doc.id.slice(-6).toUpperCase()}` : `PAY-SUP-${doc.id.slice(-6).toUpperCase()}`);

    const date = data.createdAt?.toDate?.() || new Date();

    const method = data.payment_method || 'CASH';
    const methodLabel =
      method === 'CASH'
        ? 'نقدًا'
        : method === 'TRANSFER'
          ? 'حوالة مصرفية'
          : method === 'CHECK'
            ? 'شيك بنكي'
            : 'أخرى';

    return {
      id: doc.id,
      voucherNumber,
      voucherType,
      partyId: data.supplier_id || '',
      partyName: data.supplier_name || 'مورد',
      partyType: 'SUPPLIER',
      partyTypeLabel: 'مورد',
      partyPhone: null,
      statementUrl: data.supplier_id ? `/admin/suppliers/${data.supplier_id}/statement` : '/admin/suppliers',
      amount: Number(data.amount) || 0,
      paymentMethod: method,
      paymentMethodLabel: methodLabel,
      referenceNumber: data.reference_number || null,
      bankOrExchange: data.bank_or_exchange || null,
      notes: data.notes || null,
      collectorName: data.recorded_by || 'إدارة المالية',
      createdAt: date.toISOString(),
    };
  });

  // 5. Merge and sort descending by date
  const combinedVouchers = [...customerVouchers, ...supplierVouchers].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return <FinancialVouchersManager initialVouchers={combinedVouchers} />;
}
