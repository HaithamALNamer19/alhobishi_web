import React, { Suspense } from 'react';
import { connection } from 'next/server';
import { requireSession } from '@/core/auth/require-auth';
import { isBackOfficeRole } from '@/core/auth/roles';
import { redirect } from 'next/navigation';
import { purchasingRepository } from '@/features/purchasing/infrastructure/firestore-purchasing.repository';
import {
  PurchasesManager,
  type SerializedPurchaseInvoice,
} from '@/features/purchasing/components/purchases-manager';
import type { SerializedSupplier } from '@/features/purchasing/components/suppliers-manager';

export const metadata = {
  title: 'فواتير الشراء والتوريد | إدارة المتجر',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PurchasesPageProps {
  searchParams?: Promise<{ supplierId?: string }>;
}

export default async function PurchasesPage({ searchParams }: PurchasesPageProps) {
  await connection();
  const session = await requireSession();
  if (!session || !isBackOfficeRole(session.role)) {
    redirect('/login?from=/admin/purchases');
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const supplierId = resolvedParams?.supplierId || null;

  // Optimize initial fetch limit to reduce Firestore reads
  const [rawPurchases, rawSuppliers] = await Promise.all([
    purchasingRepository.listPurchases(50),
    purchasingRepository.listSuppliers(50),
  ]);

  const serializedPurchases: SerializedPurchaseInvoice[] = (rawPurchases || []).map((p) => ({
    id: p.id,
    invoice_number: p.invoice_number,
    supplier_id: p.supplier_id,
    supplier_name: p.supplier_name || 'مورد',
    purchase_date: p.purchase_date instanceof Date ? p.purchase_date.toISOString() : new Date().toISOString(),
    items: (p.items || []).map((it) => ({
      product_id: it.product_id,
      product_name: it.product_name || 'صنف',
      quantity: Number(it.quantity) || 0,
      cost_price: Number(it.cost_price) || 0,
    })),
    total_amount: Number(p.total_amount) || 0,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : new Date().toISOString(),
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
          <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p>جاري تحميل فواتير الشراء والتوريد...</p>
        </div>
      }
    >
      <PurchasesManager
        initialPurchases={serializedPurchases}
        suppliers={serializedSuppliers}
        defaultSupplierId={supplierId}
      />
    </Suspense>
  );
}
