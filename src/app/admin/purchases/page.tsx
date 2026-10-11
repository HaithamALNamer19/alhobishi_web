import React from 'react';
import Link from 'next/link';
import { Receipt, Plus, Building2, ShoppingBag } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

export const metadata = {
  title: 'فواتير الشراء | إدارة المتجر',
};

export default function PurchasesPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-blue-700" />
            <span>فواتير الشراء والمشتريات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل فواتير الشراء من الموردين، زيادة كميات المخزون وحساب تكلفة البضاعة.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <Receipt className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">دورة المشتريات وفواتير التوريد</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          قسم فواتير الشراء جاهز، وسيتم ربطه مباشرة بمجموعة المشتريات وحسابات الموردين وتحديث المخزون عبر المعاملات المالية (runTransaction).
        </p>
      </div>
    </div>
  );
}

