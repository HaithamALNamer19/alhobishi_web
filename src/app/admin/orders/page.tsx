import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { orderRepository } from '@/features/orders/infrastructure/firestore-order.repository';
import { formatMoney } from '@/core/domain/money';
import { Badge, RoleBadge } from '@/shared/ui/badge';
import { UrlPagination } from '@/shared/ui/url-pagination';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/features/orders/domain/order';
import { ClipboardList, ArrowLeft, CalendarCheck2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/shared/ui/button';

export const metadata = {
  title: 'جميع الطلبات | إدارة المتجر',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AdminOrdersPageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

const STATUS_TABS: Array<{ id: string | null; label: string }> = [
  { id: null, label: 'الكل' },
  { id: 'PENDING', label: 'بانتظار التجهيز' },
  { id: 'PREPARING', label: 'جاري التجهيز' },
  { id: 'READY', label: 'جاهز للاستلام' },
  { id: 'CONFIRMED', label: 'معتمد' },
  { id: 'COMPLETED', label: 'مكتمل ومسلّم' },
  { id: 'CANCELLED', label: 'ملغي' },
];

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  await connection();
  const PAGE_SIZE = 15;
  const { page: pageStr, status } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageStr || '1', 10) || 1);

  // Fetch all orders to compute tab counts accurately
  const allOrdersList = await orderRepository.listAll({
    limit: 1000,
  });

  const counts: Record<string, number> = {
    ALL: allOrdersList.length,
    PENDING: allOrdersList.filter((o) => o.status === 'PENDING').length,
    PREPARING: allOrdersList.filter((o) => o.status === 'PREPARING' || o.status === 'PARTIALLY_READY').length,
    READY: allOrdersList.filter((o) => o.status === 'READY').length,
    CONFIRMED: allOrdersList.filter((o) => o.status === 'CONFIRMED').length,
    COMPLETED: allOrdersList.filter((o) => o.status === 'COMPLETED').length,
    CANCELLED: allOrdersList.filter((o) => o.status === 'CANCELLED').length,
  };

  const filteredOrders = status
    ? allOrdersList.filter((o) => {
        if (status === 'PREPARING') return o.status === 'PREPARING' || o.status === 'PARTIALLY_READY';
        return o.status === status;
      })
    : allOrdersList;

  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / PAGE_SIZE) || 1;
  const orders = filteredOrders.slice(
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

      {/* Filter Tabs by Status */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 pl-3 border-l border-slate-200 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <span>تصفية الحالة:</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {STATUS_TABS.map((tab) => {
            const isActive = tab.id === null ? !status : status === tab.id;
            const count = tab.id === null ? counts.ALL : (counts[tab.id] ?? 0);
            const href = tab.id ? `/admin/orders?status=${tab.id}` : '/admin/orders';

            return (
              <Link
                key={tab.label}
                href={href}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/70'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm space-y-3">
            <p>
              {status
                ? `لا توجد طلبات مسجلة بحالة "${ORDER_STATUS_LABELS[status as OrderStatus] || status}" حالياً`
                : 'لا توجد طلبات مسجلة بعد في النظام'}
            </p>
            {status && (
              <div>
                <Link href="/admin/orders">
                  <Button variant="outline" size="sm" className="text-xs">
                    عرض جميع الطلبات
                  </Button>
                </Link>
              </div>
            )}
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
            <UrlPagination
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

