import React, { Suspense } from 'react';
import { connection } from 'next/server';
import { getCurrentSession } from '@/core/auth/require-auth';
import { isBackOfficeRole } from '@/core/auth/roles';
import { ledgerRepository } from '@/features/accounting/infrastructure/firestore-ledger.repository';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';
import {
  AdminReturnsManager,
  type ReturnListItem,
} from '@/features/accounting/components/admin-returns-manager';

export const metadata = {
  title: 'فواتير مردود المبيعات | إدارة المتجر',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminReturnsPage() {
  await connection();
  const session = await getCurrentSession();

  // 1. Fetch sales returns from repository
  const rawReturns = await ledgerRepository.listSalesReturns(100);

  // 2. Fetch customers for new return invoice selector
  const users = await userRepository.listUsers(undefined, 150);
  const customers = users.map((u) => ({
    uid: u.uid,
    displayName: u.displayName || u.username || 'عميل',
    role: u.role,
    phone: u.phone || undefined,
    balance: Number(u.account?.balance) || 0,
  }));

  // 3. Serialize return items safely for Client Component
  const returnListItems: ReturnListItem[] = rawReturns.map((r) => {
    const totalUnits = (r.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    const createdAtIso =
      r.createdAt instanceof Date && !isNaN(r.createdAt.getTime())
        ? r.createdAt.toISOString()
        : new Date().toISOString();

    const serializedDoc = {
      id: r.id,
      returnNumber: r.returnNumber,
      customerId: r.customerId,
      customerName: r.customerName,
      customerPhone: r.customerPhone || '',
      items: (r.items || []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantLabel: item.variantLabel || '-',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        subtotal: Number(item.subtotal) || (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
      })),
      totalAmount: Number(r.totalAmount) || 0,
      reason: r.reason || null,
      orderId: r.orderId || null,
      recordedBy: r.recordedBy,
      createdAt: createdAtIso,
    };

    return {
      id: r.id,
      returnNumber: r.returnNumber,
      customerId: r.customerId,
      customerName: r.customerName,
      customerPhone: r.customerPhone || '',
      itemsCount: (r.items || []).length,
      totalUnits,
      totalAmount: Number(r.totalAmount) || 0,
      reason: r.reason || null,
      recordedBy: r.recordedBy,
      createdAt: createdAtIso,
      rawDoc: serializedDoc,
    };
  });

  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-slate-400 text-sm">
          <div className="inline-block w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p>جاري تحميل فواتير مردود المبيعات...</p>
        </div>
      }
    >
      <AdminReturnsManager initialReturns={returnListItems} customers={customers} />
    </Suspense>
  );
}
