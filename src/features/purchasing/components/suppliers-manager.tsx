'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Briefcase,
  Calendar,
  Loader2,
  FileText,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Dialog } from '@/shared/ui/dialog';
import { Badge } from '@/shared/ui/badge';
import { formatMoney } from '@/core/domain/money';
import { createSupplierAction } from '../actions/purchasing.actions';
import type { Supplier } from '../domain/purchasing';

export interface SerializedSupplier {
  id: string;
  name: string;
  phone: string;
  company_name: string;
  balance: number;
  createdAt: string;
}

interface SuppliersManagerProps {
  initialSuppliers: SerializedSupplier[];
}

export function SuppliersManager({ initialSuppliers }: SuppliersManagerProps) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SerializedSupplier[]>(initialSuppliers);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // New Supplier Form State
  const [newName, setNewName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBalance, setNewBalance] = useState('0');

  // Filter suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchName = (s.name || '').toLowerCase().includes(q);
    const matchCompany = (s.company_name || '').toLowerCase().includes(q);
    const matchPhone = (s.phone || '').includes(q);
    return matchName || matchCompany || matchPhone;
  });

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('يرجى إدخال اسم المورد.');
      return;
    }
    if (!newPhone.trim()) {
      toast.error('يرجى إدخال رقم هاتف المورد.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createSupplierAction({
          name: newName.trim(),
          company_name: newCompany.trim(),
          phone: newPhone.trim(),
          initialBalance: Number(newBalance) || 0,
        });

        if (!res.ok) {
          toast.error(res.error.message || 'فشل إضافة المورد.');
          return;
        }

        toast.success(`تمت إضافة المورد "${newName}" بنجاح!`);
        const added = res.data;
        const serializedAdded: SerializedSupplier = {
          id: added.id,
          name: added.name,
          phone: added.phone,
          company_name: added.company_name,
          balance: added.balance,
          createdAt: added.createdAt instanceof Date ? added.createdAt.toISOString() : new Date().toISOString(),
        };

        setSuppliers((prev) => [serializedAdded, ...prev]);
        setIsAddModalOpen(false);
        setNewName('');
        setNewCompany('');
        setNewPhone('');
        setNewBalance('0');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'حدث خطأ أثناء حفظ بيانات المورد.');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-blue-700" />
            <span>إدارة الموردين والشركات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            سجل الموردين، بيانات الاتصال، وأرصدة المستحقات وفواتير التوريد للمتجر.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-2xl px-4 py-2.5 shadow-xs text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مورد جديد</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث باسم المورد، اسم الشركة، أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:bg-white transition-all text-slate-800"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredSuppliers.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            {suppliers.length === 0
              ? 'لا يوجد موردون مسجلون حالياً. اضغط "إضافة مورد جديد" للبدء.'
              : 'لا توجد نتائج مطابقة لبحثك الحالي.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">م</th>
                  <th className="py-3.5 px-4">المورد والشركة</th>
                  <th className="py-3.5 px-4">رقم الهاتف</th>
                  <th className="py-3.5 px-4 text-center">الرصيد / المستحقات</th>
                  <th className="py-3.5 px-4 text-center">تاريخ الإضافة</th>
                  <th className="py-3.5 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSuppliers.map((s, idx) => {
                  const balance = Number(s.balance) || 0;
                  const dateObj = new Date(s.createdAt);
                  const isValidDate = !isNaN(dateObj.getTime());

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 text-center font-mono text-slate-400 font-bold">
                        {idx + 1}
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block text-slate-950 font-bold text-sm">
                              {s.name}
                            </span>
                            {s.company_name ? (
                              <span className="text-[11px] text-slate-500 font-normal flex items-center gap-1">
                                <Briefcase className="w-3 h-3 text-slate-400" />
                                <span>{s.company_name}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-normal">
                                فردي / بدون شركة
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-slate-700" dir="ltr">
                        {s.phone ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            <span>{s.phone}</span>
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-bold">
                        {balance > 0 ? (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md">
                            مستحق: {formatMoney(balance)}
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                            0 ر.ي (خالص)
                          </span>
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

                      <td className="py-4 px-4 text-left">
                        <div className="flex items-center justify-end">
                          <Link
                            href={`/admin/suppliers/${s.id}/statement`}
                            className="inline-flex items-center justify-center font-medium rounded-lg transition-colors border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-[11px] h-7 px-2.5 gap-1.5 select-none"
                            title="عرض كشف حساب المورد المفصل وفواتيره وسنداته"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>كشف حساب</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Supplier Dialog */}
      {isAddModalOpen && (
        <Dialog
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="إضافة مورد أو شركة موردة جديدة"
          description="تسجيل بيانات المورد للتوريد وإصدار فواتير الشراء وقيد المستحقات المالية."
          maxWidth="md"
        >
          <form onSubmit={handleCreateSupplier} className="space-y-4 pt-2">
            <Input
              label="اسم المورد أو المسؤول *"
              placeholder="مثال: محمد عبدالله باوزير"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="اسم الشركة أو المؤسسة (اختياري)"
              placeholder="مثال: شركة حضرموت للتجارة والاستيراد"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
            />

            <Input
              label="رقم الهاتف أو الواتساب *"
              placeholder="مثال: 777123456"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              dir="ltr"
              required
            />

            <Input
              label="الرصيد الافتتاحي (مستحقات سابقة إن وجدت)"
              type="number"
              placeholder="0"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              min="0"
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isPending}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isPending} className="flex items-center gap-2">
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>حفظ المورد</span>
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
