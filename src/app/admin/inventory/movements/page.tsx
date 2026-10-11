import React, { Suspense } from 'react';
import { connection } from 'next/server';
import { requireSession } from '@/core/auth/require-auth';
import { isBackOfficeRole } from '@/core/auth/roles';
import { redirect } from 'next/navigation';
import { History, Package, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { purchasingRepository } from '@/features/purchasing/infrastructure/firestore-purchasing.repository';

export const metadata = {
  title: 'حركات وجرد المخزون | إدارة المتجر',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InventoryMovementsPage() {
  await connection();
  const session = await requireSession();
  if (!session || !isBackOfficeRole(session.role)) {
    redirect('/login?from=/admin/inventory/movements');
  }

  const movements = await purchasingRepository.listStockMovements(100);

  const inMovements = movements.filter((m) => m.type === 'PURCHASE_IN');
  const outMovements = movements.filter((m) => m.type === 'PURCHASE_RETURN_OUT');

  const totalInQty = inMovements.reduce((sum, m) => sum + (m.quantity || 0), 0);
  const totalOutQty = outMovements.reduce((sum, m) => sum + (m.quantity || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <History className="w-7 h-7 text-blue-700" />
            <span>حركات وجرد المخزون</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            سجل وتتبع كافة حركات الوارد والمنصرف وفواتير الشراء ومردوداتها على أصناف المخزون.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-3xl border-slate-200/80 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold">الوارد (مشتريات)</p>
              <h3 className="text-lg font-black text-slate-900 mt-0.5 font-mono">
                {inMovements.length} حركة ({totalInQty} قطعة)
              </h3>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold">المنصرف (مردودات شراء)</p>
              <h3 className="text-lg font-black text-slate-900 mt-0.5 font-mono">
                {outMovements.length} حركة ({totalOutQty} قطعة)
              </h3>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold">إجمالي الحركات المسجلة</p>
              <h3 className="text-lg font-black text-slate-900 mt-0.5 font-mono">
                {movements.length} حركة مخزون
              </h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {movements.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            <div className="w-16 h-16 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <History className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">لا توجد حركات مخزون مسجلة بعد</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              يتم قيد الحركات آلياً في هذا السجل عند إنشاء فواتير شراء أو تسجيل مردودات مشتريات.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">م</th>
                  <th className="py-3.5 px-4">الصنف / المنتج</th>
                  <th className="py-3.5 px-4 text-center">نوع الحركة</th>
                  <th className="py-3.5 px-4 text-center">الكمية</th>
                  <th className="py-3.5 px-4">رقم المرجع / الفاتورة</th>
                  <th className="py-3.5 px-4 text-center">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {movements.map((m, idx) => {
                  const isIncoming = m.type === 'PURCHASE_IN';
                  const dateObj = new Date(m.timestamp);
                  const isValidDate = !isNaN(dateObj.getTime());

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 text-center font-mono text-slate-400 font-bold">
                        {idx + 1}
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{m.product_name || 'صنف'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center font-bold">
                        {isIncoming ? (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                            وارد مشتريات (+)
                          </span>
                        ) : (
                          <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md">
                            منصرف مردود (-)
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-black text-sm">
                        <span className={isIncoming ? 'text-emerald-700' : 'text-rose-700'}>
                          {isIncoming ? `+${m.quantity}` : `-${m.quantity}`} قطعة
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-600">
                        {m.reference_id ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {m.reference_id}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="py-4 px-4 text-center font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {isValidDate ? (
                          <span suppressHydrationWarning>
                            {dateObj.toLocaleDateString('ar-YE', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
