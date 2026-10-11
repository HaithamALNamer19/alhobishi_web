'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  RotateCcw,
  Search,
  Plus,
  Printer,
  Eye,
  Calendar,
  User,
  Package,
  CreditCard,
  FileText,
  AlertCircle,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Pagination } from '@/shared/ui/pagination';
import { formatMoney } from '@/core/domain/money';
import { CreateReturnDialog, type CustomerOption } from './create-return-dialog';
import { ReturnDetailDialog } from './return-detail-dialog';
import { PrintableReturnInvoice } from './printable-return-invoice';
import type { SerializedReturnDetail } from '../actions/return.actions';

export interface ReturnListItem {
  id: string;
  returnNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  itemsCount: number;
  totalUnits: number;
  totalAmount: number;
  reason: string | null;
  recordedBy: string;
  createdAt: string;
  rawDoc: SerializedReturnDetail;
}

interface AdminReturnsManagerProps {
  initialReturns: ReturnListItem[];
  customers: CustomerOption[];
}

export function AdminReturnsManager({
  initialReturns,
  customers,
}: AdminReturnsManagerProps) {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SerializedReturnDetail | null>(null);
  const [printDoc, setPrintDoc] = useState<SerializedReturnDetail | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filter returns
  const filteredReturns = useMemo(() => {
    if (!search.trim()) return initialReturns;
    const q = search.toLowerCase();
    return initialReturns.filter(
      (r) =>
        r.returnNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        (r.customerPhone || '').includes(q) ||
        (r.reason || '').toLowerCase().includes(q) ||
        r.recordedBy.toLowerCase().includes(q)
    );
  }, [initialReturns, search]);

  // Paginated returns
  const totalPages = Math.ceil(filteredReturns.length / pageSize) || 1;
  const paginatedReturns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReturns.slice(start, start + pageSize);
  }, [filteredReturns, currentPage, pageSize]);

  // KPIs
  const { totalInvoicesCount, totalReturnsAmount, totalReturnedUnits } = useMemo(() => {
    const totalAmount = initialReturns.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalUnits = initialReturns.reduce((sum, r) => sum + r.totalUnits, 0);
    return {
      totalInvoicesCount: initialReturns.length,
      totalReturnsAmount: totalAmount,
      totalReturnedUnits: totalUnits,
    };
  }, [initialReturns]);

  const handlePrint = (doc: SerializedReturnDetail) => {
    setPrintDoc(doc);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 font-sans" dir="rtl">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <span className="p-2 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200">
              <RotateCcw className="w-6 h-6" />
            </span>
            <span>فواتير مردود المبيعات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل وإدارة فواتير مردودات المبيعات وإعادة الأصناف للمخزون وقيد الحسابات
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl shadow-xs text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل فاتورة مردود جديدة</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Total Invoices */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">
              عدد فواتير المردود
            </span>
            <span className="text-2xl font-black font-mono text-slate-900">
              {totalInvoicesCount}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">فاتورة مسجلة</span>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl border border-slate-100">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Total Units */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">
              الأصناف المسترجعة للمخزن
            </span>
            <span className="text-2xl font-black font-mono text-slate-900">
              {totalReturnedUnits}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">قطعة مسترجعة</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Total Amount */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">
              إجمالي مبالغ المردودات
            </span>
            <span className="text-2xl font-black font-mono text-rose-700">
              {formatMoney(totalReturnsAmount)}
            </span>
            <span className="text-[11px] text-rose-600 font-medium block mt-0.5">
              مخصومة من أرصدة العملاء
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl border border-rose-100">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="البحث برقم الفاتورة، اسم العميل، رقم الهاتف، أو الملاحظات..."
              className="pr-9 text-xs"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredReturns.length} فاتورة
          </span>
        </div>

        {/* Returns Table */}
        {paginatedReturns.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs space-y-2">
            <RotateCcw className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-bold text-sm text-slate-600">لا توجد فواتير مردود مبيعات</p>
            <p className="text-[11px] text-slate-400">
              يمكنك الضغط على زر "تسجيل فاتورة مردود جديدة" للبدء بتسجيل المردودات.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">رقم الفاتورة</th>
                  <th className="py-3.5 px-4">التاريخ</th>
                  <th className="py-3.5 px-4">العميل</th>
                  <th className="py-3.5 px-4 text-center">الأصناف والقطع</th>
                  <th className="py-3.5 px-4 text-center">إجمالي المبلغ</th>
                  <th className="py-3.5 px-4">مسجل الفاتورة</th>
                  <th className="py-3.5 px-4">السبب / الملاحظات</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedReturns.map((r) => {
                  const dateObj = new Date(r.createdAt);
                  const formattedDate = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString('ar-YE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Return Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md">
                          {r.returnNumber}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {formattedDate}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <Link
                          href={`/admin/customers/${r.customerId}/statement`}
                          className="hover:text-blue-700 transition-colors"
                        >
                          {r.customerName}
                        </Link>
                        {r.customerPhone && (
                          <span className="block text-[10px] text-slate-400 font-mono font-normal">
                            {r.customerPhone}
                          </span>
                        )}
                      </td>

                      {/* Items & Units */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-800">{r.itemsCount} صنف</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          ({r.totalUnits} قطعة)
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-center font-mono font-black text-rose-700 text-sm">
                        {formatMoney(r.totalAmount)}
                      </td>

                      {/* Recorded By */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium text-[11px]">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-800 font-bold">
                          {r.recordedBy}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {r.reason || '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedReturn(r.rawDoc)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrint(r.rawDoc)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="طباعة الفاتورة"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Create Return Dialog */}
      <CreateReturnDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        customers={customers}
        onSuccess={({ returnId, returnNumber }) => {
          // Open detail or print
          const found = initialReturns.find((r) => r.id === returnId);
          if (found) {
            setSelectedReturn(found.rawDoc);
          }
        }}
      />

      {/* Return Detail Dialog */}
      <ReturnDetailDialog
        isOpen={Boolean(selectedReturn)}
        onClose={() => setSelectedReturn(null)}
        returnDoc={selectedReturn}
        onPrint={handlePrint}
      />

      {/* Hidden Print Portal */}
      {printDoc && (
        <div className="hidden print:block fixed inset-0 bg-white z-50">
          <PrintableReturnInvoice returnDoc={printDoc} />
        </div>
      )}
    </div>
  );
}
