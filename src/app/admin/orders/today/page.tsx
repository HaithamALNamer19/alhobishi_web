import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { orderRepository } from '@/features/orders/infrastructure/firestore-order.repository';
import { toBusinessDate } from '@/core/domain/dates';
import { formatMoney } from '@/core/domain/money';
import { Badge, RoleBadge } from '@/shared/ui/badge';
import { ORDER_STATUS_LABELS } from '@/features/orders/domain/order';
import {
  CalendarCheck2,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Package,
  User,
  SlidersHorizontal,
} from 'lucide-react';

export const metadata = {
  title: 'طلبات اليوم للتجهيز | إدارة المتجر',
};

export const instant = false;

export default async function TodayOrdersPage() {
  await connection();
  const todayStr = toBusinessDate(new Date());
  const orders = await orderRepository.listTodayOrders(todayStr);

  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING' || o.status === 'PARTIALLY_READY');
  const readyOrders = orders.filter((o) => o.status === 'READY');
  const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'COMPLETED');

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <CalendarCheck2 className="w-7 h-7 text-blue-700" />
            <span>شاشة طلبات اليوم للتجهيز</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            متابعة طلبات اليوم ({todayStr}) وتجهيز الأصناف بندًا بندًا وتأكيد الجاهزية.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="indigo" className="font-mono font-bold text-xs">
            إجمالي طلبات اليوم: {orders.length}
          </Badge>
        </div>
      </div>

      {/* Kanban / Grouped Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Column 1: PENDING */}
        <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h2 className="font-bold text-sm text-slate-900">بانتظار التجهيز</h2>
            </div>
            <Badge variant="amber" className="text-xs font-mono font-bold">
              {pendingOrders.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {pendingOrders.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">لا توجد طلبات جديدة</p>
            ) : (
              pendingOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="block bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-600 hover:shadow-md transition-all text-right space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-sm text-slate-900">
                      {o.orderNumber}
                    </span>
                    <Badge variant="slate" className="text-[10px]">
                      {o.items.length} أصناف
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{o.customerName}</span>
                    <RoleBadge role={o.customerRole} />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="font-black font-mono text-slate-900">
                      {formatMoney(o.totalAmount)}
                    </span>
                    <span className="text-blue-800 font-bold flex items-center gap-1 text-[11px]">
                      <span>بدء التجهيز</span>
                      <ArrowLeft className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Column 2: PREPARING */}
        <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
              <h2 className="font-bold text-sm text-slate-900">قيد التجهيز الفعلي</h2>
            </div>
            <Badge variant="indigo" className="text-xs font-mono font-bold">
              {preparingOrders.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {preparingOrders.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">لا توجد طلبات قيد التجهيز</p>
            ) : (
              preparingOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="block bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all text-right space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-sm text-slate-900">
                      {o.orderNumber}
                    </span>
                    <Badge variant="indigo" className="text-[10px]">
                      {ORDER_STATUS_LABELS[o.status]}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{o.customerName}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="font-black font-mono text-slate-900">
                      {formatMoney(o.totalAmount)}
                    </span>
                    <span className="text-indigo-700 font-bold flex items-center gap-1 text-[11px]">
                      <span>متابعة التجهيز</span>
                      <ArrowLeft className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Column 3: READY */}
        <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-700" />
              <h2 className="font-bold text-sm text-slate-900">جاهزة للاعتماد / التسليم</h2>
            </div>
            <Badge variant="emerald" className="text-xs font-mono font-bold">
              {readyOrders.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {readyOrders.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">لا توجد طلبات جاهزة</p>
            ) : (
              readyOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="block bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 hover:border-blue-600 hover:shadow-md transition-all text-right space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-sm text-slate-900">
                      {o.orderNumber}
                    </span>
                    <Badge variant="indigo" className="text-[10px]">
                      جاهز للاستلام
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{o.customerName}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="font-black font-mono text-slate-900">
                      {formatMoney(o.totalAmount)}
                    </span>
                    <span className="text-blue-700 font-bold flex items-center gap-1 text-[11px]">
                      <span>اعتماد الفاتورة</span>
                      <ArrowLeft className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

