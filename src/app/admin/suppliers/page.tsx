import React from 'react';
import { Building2, Plus, Phone } from 'lucide-react';
import { Button } from '@/shared/ui/button';

export const metadata = {
  title: 'إدارة الموردين | إدارة المتجر',
};

export default function SuppliersPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-blue-700" />
            <span>إدارة الموردين والشركات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            سجل الموردين، بيانات الاتصال، الأرصدة المالية ومتابعة دفعات ومستحقات المشتريات.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <Building2 className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">دليل الموردين والشركات الموردة</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          يتم هنا حفظ بيانات الموردين، أرقام الهواتف، وأرصدة الدائنية والمديونية لكل مورد.
        </p>
      </div>
    </div>
  );
}

