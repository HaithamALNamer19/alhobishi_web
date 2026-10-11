import React from 'react';
import { History, Package, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from '@/shared/ui/card';

export const metadata = {
  title: 'حركات وجرد المخزون | إدارة المتجر',
};

export default function InventoryMovementsPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <History className="w-7 h-7 text-blue-700" />
            <span>حركات وجرد المخزون</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            سجل وتتبع كافة حركات الوارد والمنصرف والتسويات وفواتير الشراء ومردوداتها على المخزون.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-3xl border-slate-200/80 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold">الوارد (مشتريات ومردود مبيع)</p>
              <h3 className="text-lg font-black text-slate-900 mt-0.5 font-mono">0 حركة</h3>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold">المنصرف (مبيعات ومردود شراء)</p>
              <h3 className="text-lg font-black text-slate-900 mt-0.5 font-mono">0 حركة</h3>
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
              <h3 className="text-lg font-black text-slate-900 mt-0.5 font-mono">0 حركة</h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-100">
          <History className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">سجل حركات المخزون جاهز للتتبع</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          يتم هنا قيد وتتبع حركات إدخال وإخراج الأصناف تلقائياً عند اعتماد فواتير الشراء ومردوداتها والمبيعات.
        </p>
      </div>
    </div>
  );
}

