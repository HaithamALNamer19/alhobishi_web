import React, { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { requireSession } from '@/core/auth/require-auth';
import { isBackOfficeRole } from '@/core/auth/roles';
import { purchasingRepository } from '@/features/purchasing/infrastructure/firestore-purchasing.repository';
import { SupplierStatementView } from '@/features/purchasing/components/supplier-statement-view';

export const metadata = {
  title: 'كشف حساب المورد | إدارة المتجر',
  description: 'كشف حساب مالي تفصيلي للمورد يشمل فواتير الشراء، سندات الصرف، ومردودات المشتريات مع إمكانية الطباعة.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SupplierStatementPageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplierStatementPage({ params }: SupplierStatementPageProps) {
  await connection();
  const session = await requireSession();
  if (!session || !isBackOfficeRole(session.role)) {
    redirect('/login?from=/admin/suppliers');
  }

  const { id } = await params;

  let statementData;
  try {
    statementData = await purchasingRepository.getSupplierStatement(id);
  } catch (err) {
    notFound();
  }

  const { supplier, transactions, total_purchases, total_payments, total_returns, net_balance } =
    statementData;

  const serializedSupplier = {
    id: supplier.id,
    name: supplier.name,
    phone: supplier.phone || '',
    company_name: supplier.company_name || '',
    balance: Number(supplier.balance || 0),
    createdAt:
      supplier.createdAt instanceof Date
        ? supplier.createdAt.toISOString()
        : new Date().toISOString(),
  };

  const serializedTransactions = transactions.map((t) => ({
    id: t.id,
    supplier_id: t.supplier_id,
    type: t.type,
    amount: Number(t.amount || 0),
    debit: Number(t.debit || 0),
    credit: Number(t.credit || 0),
    balance_after: Number(t.balance_after || 0),
    description: t.description || '',
    reference_id: t.reference_id || null,
    reference_number: t.reference_number || null,
    recorded_by: t.recorded_by || 'إدارة المشتريات',
    createdAt:
      t.createdAt instanceof Date ? t.createdAt.toISOString() : new Date().toISOString(),
    items: t.items || [],
    payment_method: t.payment_method || undefined,
    bank_or_exchange: t.bank_or_exchange || null,
    notes: t.notes || null,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Suspense
        fallback={
          <div className="p-16 text-center text-slate-400 text-sm">
            <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p>جاري تحميل كشف الحساب المالي للمورد...</p>
          </div>
        }
      >
        <SupplierStatementView
          supplier={serializedSupplier}
          transactions={serializedTransactions}
          totalPurchases={total_purchases}
          totalPayments={total_payments}
          totalReturns={total_returns}
          netBalance={net_balance}
          backHref="/admin/suppliers"
        />
      </Suspense>
    </div>
  );
}

