import React, { Suspense } from 'react';
import { connection } from 'next/server';
import { requireAuth } from '@/core/auth/require-auth';
import { ledgerRepository } from '@/features/accounting/infrastructure/firestore-ledger.repository';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';
import { CustomerStatementView } from '@/features/accounting/components/customer-statement-view';

export const metadata = {
  title: 'كشف الحساب المالي المفصل | حسابي',
  description: 'كشف حركة الحساب المالي المفصل، فواتير المبيعات، وسندات القبض المسددة مع إمكانية المعاينة والطباعة.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CustomerStatementPage() {
  await connection();
  const session = await requireAuth();

  const [profile, transactions] = await Promise.all([
    userRepository.findById(session.uid).catch(() => null),
    ledgerRepository.getTransactions(session.uid, 200).catch(() => []),
  ]);

  const balance = Number(profile?.account?.balance ?? (profile as any)?.balance ?? 0) || 0;

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
      recordedBy: t.recordedBy || 'النظام',
      createdAt: createdAtIso,
      orderId: t.orderId || null,
      paymentId: t.paymentId || null,
      returnId: t.returnId || null,
    };
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Suspense
        fallback={
          <div className="p-16 text-center text-slate-400 text-sm">
            <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p>جاري تحميل كشف حسابك المالي...</p>
          </div>
        }
      >
        <CustomerStatementView
          customer={{
            uid: session.uid,
            displayName: profile?.displayName || profile?.username || 'العميل',
            username: profile?.username || '',
            phone: profile?.phone || '',
            role: profile?.role || session.role,
            balance,
          }}
          transactions={serializedTransactions}
          isAdminView={false}
          backHref="/account"
        />
      </Suspense>
    </div>
  );
}
