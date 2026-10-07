import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { requireAuth } from '@/core/auth/require-auth';
import { orderRepository } from '@/features/orders/infrastructure/firestore-order.repository';
import { formatMoney } from '@/core/domain/money';
import { Badge } from '@/shared/ui/badge';
import { Pagination } from '@/shared/ui/pagination';
import { ORDER_STATUS_LABELS } from '@/features/orders/domain/order';
import { ShoppingBag, ArrowLeft, ArrowRight, Package } from 'lucide-react';
import { Button } from '@/shared/ui/button';

export const metadata = {
  title: 'طلباتي | حسابي',
};

export const instant = false;

interface CustomerOrdersPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function CustomerOrdersPage({ searchParams }: CustomerOrdersPageProps) {
  await connection();
  const PAGE_SIZE = 15;
  const { page: pageStr } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageStr || '1', 10) || 1);

  const session = await requireAuth();
  const allOrders = await orderRepository.listByCustomer(session.uid);

  const totalOrders = allOrders.length;
  const totalPages = Math.ceil(totalOrders / PAGE_SIZE) || 1;
  const orders = allOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const buildPageHref = (p: number) => {
    return `/account/orders${p > 1 ? `?page=${p}` : ''}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-blue-700" />
              <span>طلباتي وحجوزاتي</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              استعراض طلبات الحجز الحالية والسابقة ومتابعة وتعديل الأصناف
            </p>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center space-y-3">
            <Package className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="text-base font-bold text-slate-800">لا توجد طلبات سابقة</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              تصفح منتجات المتجر واحجز بضاعتك الآن بسهولة تامة.
            </p>
            <div className="pt-2">
              <Link href="/">
                <Button size="sm">تصفح المنتجات</Button>
              </Link>
            </div>
          </div>
        ) : (
          orders.map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.id}`}
              className="block bg-white p-5 rounded-3xl border border-slate-200/80 hover:border-blue-600 hover:shadow-md transition-all text-right space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold font-mono text-base text-slate-900">
                  {o.orderNumber}
                </span>
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
                  className="font-bold text-xs"
                >
                  {ORDER_STATUS_LABELS[o.status]}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <span>تاريخ الطلب: {o.businessDate}</span>
                  <span>•</span>
                  <span>{o.items.length} أصناف</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-slate-900 font-mono">
                    {formatMoney(o.totalAmount)}
                  </span>
                  <ArrowLeft className="w-4 h-4 text-blue-700" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {totalOrders > 0 && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalOrders}
            pageSize={PAGE_SIZE}
            itemName="طلب"
            getPageHref={buildPageHref}
          />
        </div>
      )}
    </div>
  );
}

