import React from 'react';
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

export const instant = false;

interface AdminCustomerStatementPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCustomerStatementPage({ params }: AdminCustomerStatementPageProps) {
  await connection();
  await requirePermission(Permission.ACCOUNTS_VIEW);

  const { id } = await params;

  const [customer, transactions] = await Promise.all([
    userRepository.findById(id),
    ledgerRepository.getTransactions(id, 200),
  ]);

  if (!customer) {
    notFound();
  }

  const balance = customer.account?.balance ?? 0;

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
    returnId: t.returnId ?? null,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <CustomerStatementView
        customer={{
          uid: customer.uid,
          displayName: customer.displayName,
          username: customer.username,
          phone: customer.phone,
          role: customer.role,
          balance,
        }}
        transactions={serializedTransactions}
        isAdminView={true}
        backHref="/admin/customers"
      />
    </div>
  );
}

