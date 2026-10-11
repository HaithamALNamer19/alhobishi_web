import React from 'react';
import { Undo2, RotateCcw } from 'lucide-react';

export const metadata = {
  title: 'فواتير مردود المشتريات | إدارة المتجر',
};

export default function PurchaseReturnsPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Undo2 className="w-7 h-7 text-rose-700" />
            <span>فواتير مردود المشتريات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إرجاع بضاعة تالفة أو غير مطابقة للموردين وخصم الكميات من المخزون وتخفيض حساب المورد.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <Undo2 className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">إرجاع المشتريات للموردين</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          يتم هنا قيد فواتير الإرجاع إلى الموردين، وإنقاص رصيد المخزون وقيد الحركة في سجل حركات المخزون وحساب المورد.
        </p>
      </div>
    </div>
  );
}

