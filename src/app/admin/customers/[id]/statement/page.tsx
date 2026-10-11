import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { requirePermission } from '@/core/auth/require-auth';
import { Permission } from '@/core/auth/roles';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';
import { ledgerRepository } from '@/features/accounting/infrastructure/firestore-ledger.repository';
import { CustomerStatementView } from '@/features/accounting/components/customer-statement-view';

export const metadata = {
  title: 'كشف حساب العميل | إدارة المتجر',
  description: 'كشف حساب مالي تفصيلي لحركات العميل مع إمكانية مراجعة الفواتير وسندات القبض وطباعة التقارير.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AdminCustomerStatementPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCustomerStatementPage({ params }: AdminCustomerStatementPageProps) {
  await connection();
  await requirePermission(Permission.ACCOUNTS_VIEW);

  const { id } = await params;

  const [customer, transactions] = await Promise.all([
    userRepository.findById(id).catch(() => null),
    ledgerRepository.getTransactions(id, 200).catch(() => []),
  ]);

  if (!customer) {
    notFound();
  }

  const balance = Number(customer.account?.balance ?? (customer as any)?.balance ?? 0) || 0;

  const serializedTransactions = (transactions || []).map((t) => {
    let createdAtIso = new Date().toISOString();
    try {
      if (t.createdAt instanceof Date && !isNaN(t.createdAt.getTime())) {
        createdAtIso = t.createdAt.toISOString();
      } else if (typeof t.createdAt === 'string') {
        const d = new Date(t.createdAt);
        if (!isNaN(d.getTime())) createdAtIso = d.toISOString();
      }
    } catch {
      createdAtIso = new Date().toISOString();
    }

    return {
      id: t.id,
      type: t.type || 'UNKNOWN',
      amount: Number(t.amount) || 0,
      previousBalance: Number(t.previousBalance) || 0,
      newBalance: Number(t.newBalance) || 0,
      description: t.description || '',
      recordedBy: t.recordedBy || 'إدارة المتجر',
      createdAt: createdAtIso,
      orderId: t.orderId || null,
      paymentId: t.paymentId || null,
      returnId: t.returnId || null,
    };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Suspense
        fallback={
          <div className="p-16 text-center text-slate-400 text-sm">
            <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p>جاري تحميل كشف الحساب المالي للعميل...</p>
          </div>
        }
      >
        <CustomerStatementView
          customer={{
            uid: customer.uid || id,
            displayName: customer.displayName || customer.username || 'العميل',
            username: customer.username || '',
            phone: customer.phone || '',
            role: customer.role || 'customer',
            balance,
          }}
          transactions={serializedTransactions}
          isAdminView={true}
          backHref="/admin/customers"
        />
      </Suspense>
    </div>
  );
}

