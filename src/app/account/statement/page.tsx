import React from 'react';
import { connection } from 'next/server';
import { requireAuth } from '@/core/auth/require-auth';
import { ledgerRepository } from '@/features/accounting/infrastructure/firestore-ledger.repository';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';
import { CustomerStatementView } from '@/features/accounting/components/customer-statement-view';

export const metadata = {
  title: 'كشف الحساب المالي المفصل | حسابي',
  description: 'كشف حركة الحساب المالي المفصل، فواتير المبيعات، وسندات القبض المسددة مع إمكانية المعاينة والطباعة.',
};

export const instant = false;

export default async function CustomerStatementPage() {
  await connection();
  const session = await requireAuth();

  const [profile, transactions] = await Promise.all([
    userRepository.findById(session.uid),
    ledgerRepository.getTransactions(session.uid, 200),
  ]);

  const balance = profile?.account?.balance ?? 0;

  const serializedTransactions = transactions.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    previousBalance: t.previousBalance,
    newBalance: t.newBalance,
    description: t.description,
    recordedBy: t.recordedBy,
    createdAt: t.createdAt.toISOString(),
    orderId: t.orderId,
    paymentId: t.paymentId,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <CustomerStatementView
        customer={{
          uid: session.uid,
          displayName: profile?.displayName || 'العميل',
          username: profile?.username || '',
          phone: profile?.phone || '',
          role: profile?.role || session.role,
          balance,
        }}
        transactions={serializedTransactions}
        isAdminView={false}
        backHref="/account"
      />
    </div>
  );
}
