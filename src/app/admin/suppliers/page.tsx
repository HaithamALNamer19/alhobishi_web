import React, { Suspense } from 'react';
import { connection } from 'next/server';
import { requireSession } from '@/core/auth/require-auth';
import { isBackOfficeRole } from '@/core/auth/roles';
import { redirect } from 'next/navigation';
import { purchasingRepository } from '@/features/purchasing/infrastructure/firestore-purchasing.repository';
import { SuppliersManager, type SerializedSupplier } from '@/features/purchasing/components/suppliers-manager';

export const metadata = {
  title: 'إدارة الموردين | إدارة المتجر',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SuppliersPage() {
  await connection();
  const session = await requireSession();
  if (!session || !isBackOfficeRole(session.role)) {
    redirect('/login?from=/admin/suppliers');
  }

  const suppliers = await purchasingRepository.listSuppliers(100);

  const serializedSuppliers: SerializedSupplier[] = (suppliers || []).map((s) => ({
    id: s.id,
    name: s.name || '',
    phone: s.phone || '',
    company_name: s.company_name || '',
    balance: Number(s.balance) || 0,
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : new Date().toISOString(),
  }));

  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-slate-400 text-sm">
          <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p>جاري تحميل سجل الموردين والشركات...</p>
        </div>
      }
    >
      <SuppliersManager initialSuppliers={serializedSuppliers} />
    </Suspense>
  );
}
