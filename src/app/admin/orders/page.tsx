import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { orderRepository } from '@/features/orders/infrastructure/firestore-order.repository';
import { formatMoney } from '@/core/domain/money';
import { Badge, RoleBadge } from '@/shared/ui/badge';
import { Pagination } from '@/shared/ui/pagination';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/features/orders/domain/order';
import { ClipboardList, ArrowLeft, CalendarCheck2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';

export const metadata = {
  title: 'جميع الطلبات | إدارة المتجر',
};

export const instant = false;

interface AdminOrdersPageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  await connection();
  const PAGE_SIZE = 15;
  const { page: pageStr, status } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageStr || '1', 10) || 1);

  const allOrders = await orderRepository.listAll({
    status: status as OrderStatus | undefined,
    limit: 1000,
  });

  const totalOrders = allOrders.length;
  const totalPages = Math.ceil(totalOrders / PAGE_SIZE) || 1;
  const orders = allOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/admin/orders${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-blue-700" />
            <span>سجل جميع الطلبات والفواتير</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            استعراض كافة طلبات الحجز السابقة والحالية وحالات التجهيز والاعتماد
          </p>
        </div>
        <Link href="/admin/orders/today">
          <Button className="flex items-center gap-2">
            <CalendarCheck2 className="w-4 h-4" />
            <span>طلبات اليوم للتجهيز</span>
          </Button>
        </Link>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            لا توجد طلبات مسجلة بعد في النظام
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">رقم الطلب</th>
                  <th className="py-3.5 px-4">العميل</th>
                  <th className="py-3.5 px-4">تاريخ العمل</th>
                  <th className="py-3.5 px-4 text-center">عدد الأصناف</th>
                  <th className="py-3.5 px-4">المبلغ الإجمالي</th>
                  <th className="py-3.5 px-4 text-center">الحالة</th>
                  <th className="py-3.5 px-4 text-left">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      {o.orderNumber}
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span>{o.customerName}</span>
                        <RoleBadge role={o.customerRole} />
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-500">
                      {o.businessDate}
                    </td>

                    <td className="py-4 px-4 text-center font-mono font-bold text-slate-700">
                      {o.items.length}
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-slate-900 text-sm">
                      {formatMoney(o.totalAmount)}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <Badge
                        variant={
                          o.status === 'READY'
                            ? 'emerald'
                            : o.status === 'CONFIRMED'
                              ? 'sky'
                              : o.status === 'PREPARING'
                                ? 'amber'
                                : 'slate'
                        }
                      >
                        {ORDER_STATUS_LABELS[o.status]}
                      </Badge>
                    </td>

                    <td className="py-4 px-4 text-left">
                      <Link href={`/admin/orders/${o.id}`}>
                        <Button variant="outline" size="sm" className="text-xs h-8">
                          <span>فتح التجهيز</span>
                          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50/50">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalOrders}
              pageSize={PAGE_SIZE}
              itemName="طلب"
              getPageHref={buildPageHref}
            />
          </div>
        </>
      )}
      </div>
    </div>
  );
}

