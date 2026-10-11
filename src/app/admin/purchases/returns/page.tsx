import React, { Suspense } from 'react';
import { connection } from 'next/server';
import { requireSession } from '@/core/auth/require-auth';
import { isBackOfficeRole } from '@/core/auth/roles';
import { redirect } from 'next/navigation';
import { purchasingRepository } from '@/features/purchasing/infrastructure/firestore-purchasing.repository';
import {
  PurchaseReturnsManager,
  type SerializedPurchaseReturn,
} from '@/features/purchasing/components/purchase-returns-manager';
import type { SerializedSupplier } from '@/features/purchasing/components/suppliers-manager';

export const metadata = {
  title: 'فواتير مردود المشتريات | إدارة المتجر',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PurchaseReturnsPageProps {
  searchParams?: Promise<{ supplierId?: string }>;
}

export default async function PurchaseReturnsPage({ searchParams }: PurchaseReturnsPageProps) {
  await connection();
  const session = await requireSession();
  if (!session || !isBackOfficeRole(session.role)) {
    redirect('/login?from=/admin/purchases/returns');
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const supplierId = resolvedParams?.supplierId || null;

  const [rawReturns, rawSuppliers] = await Promise.all([
    purchasingRepository.listPurchaseReturns(100),
    purchasingRepository.listSuppliers(100),
  ]);

  const serializedReturns: SerializedPurchaseReturn[] = (rawReturns || []).map((r) => ({
    id: r.id,
    return_number: r.return_number || r.id,
    purchase_id: r.purchase_id || '',
    supplier_id: r.supplier_id,
    supplier_name: r.supplier_name || 'مورد',
    return_date: r.return_date instanceof Date ? r.return_date.toISOString() : new Date().toISOString(),
    items: (r.items || []).map((it) => ({
      product_id: it.product_id,
      product_name: it.product_name || 'صنف',
      quantity: Number(it.quantity) || 0,
      cost_price: Number(it.cost_price) || 0,
    })),
    total_amount: Number(r.total_amount) || 0,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date().toISOString(),
  }));

  const serializedSuppliers: SerializedSupplier[] = (rawSuppliers || []).map((s) => ({
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
          <div className="inline-block w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p>جاري تحميل فواتير مردود المشتريات...</p>
        </div>
      }
    >
      <PurchaseReturnsManager
        initialReturns={serializedReturns}
        suppliers={serializedSuppliers}
        defaultSupplierId={supplierId}
      />
    </Suspense>
  );
}
