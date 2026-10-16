'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Undo2,
  Plus,
  Search,
  Building2,
  Calendar,
  Eye,
  Printer,
  FileText,
  X,
  Edit,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Dialog } from '@/shared/ui/dialog';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { CreatePurchaseReturnDialog } from './create-purchase-return-dialog';
import { EditPurchaseReturnDialog } from './edit-purchase-return-dialog';
import { PrintablePurchaseReturnInvoice } from './printable-purchase-return-invoice';
import type { SerializedSupplier } from './suppliers-manager';

export interface SerializedPurchaseReturn {
  id: string;
  return_number: string;
  purchase_id: string;
  supplier_id: string;
  supplier_name: string;
  return_date: string;
  items: Array<{
    product_id: string;
    product_name?: string;
    quantity: number;
    cost_price: number;
  }>;
  total_amount: number;
  createdAt: string;
}

interface PurchaseReturnsManagerProps {
  initialReturns: SerializedPurchaseReturn[];
  suppliers: SerializedSupplier[];
  defaultSupplierId?: string | null;
}

export function PurchaseReturnsManager({
  initialReturns,
  suppliers,
  defaultSupplierId,
}: PurchaseReturnsManagerProps) {
  const router = useRouter();
  const [returns, setReturns] = useState<SerializedPurchaseReturn[]>(initialReturns);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(Boolean(defaultSupplierId));
  const [selectedReturn, setSelectedReturn] = useState<SerializedPurchaseReturn | null>(null);
  const [editingReturn, setEditingReturn] = useState<SerializedPurchaseReturn | null>(null);

  useEffect(() => {
    setReturns(initialReturns);
  }, [initialReturns]);

  const filteredReturns = returns.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchNumber = (r.return_number || '').toLowerCase().includes(q);
    const matchSupplier = (r.supplier_name || '').toLowerCase().includes(q);
    const matchPurchaseId = (r.purchase_id || '').toLowerCase().includes(q);
    return matchNumber || matchSupplier || matchPurchaseId;
  });

  const [mounted, setMounted] = useState(false);
  const [printDoc, setPrintDoc] = useState<SerializedPurchaseReturn | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrint = (ret: SerializedPurchaseReturn) => {
    setPrintDoc(ret);
    document.body.classList.add('print-active');
    const originalTitle = document.title;
    document.title = ' ';

    const handleAfterPrint = () => {
      document.title = originalTitle;
      document.body.classList.remove('print-active');
      setPrintDoc(null);
      window.removeEventListener('afterprint', handleAfterPrint);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Undo2 className="w-7 h-7 text-rose-700" />
            <span>فواتير مردود المشتريات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إرجاع بضاعة تالفة أو غير مطابقة للموردين، خصم المخزون وتخفيض مديونية المورد تلقائياً.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl px-4 py-2.5 shadow-xs text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء مردود مشتريات جديد</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث برقم المردود أو اسم المورد أو رقم الفاتورة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pr-9 pl-4 py-2.5 rounded-xl border border-slate-200/80 focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Returns List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredReturns.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <Undo2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-700 text-sm">لا توجد فواتير مردود مشتريات</p>
            <p className="mt-1">
              {search ? 'لا توجد نتائج تطابق بحثك الحالي.' : 'اضغط على "إنشاء مردود مشتريات جديد" لإرجاع بضاعة إلى مورد.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80 font-bold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">رقم المردود</th>
                  <th className="py-3.5 px-4">المورد</th>
                  <th className="py-3.5 px-4">تاريخ الإرجاع</th>
                  <th className="py-3.5 px-4">المرجع</th>
                  <th className="py-3.5 px-4 text-center">عدد الأصناف</th>
                  <th className="py-3.5 px-4 text-left">إجمالي المبلغ</th>
                  <th className="py-3.5 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredReturns.map((ret) => {
                  const itemsCount = (ret.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
                  const returnDateFormatted = new Date(ret.return_date).toLocaleDateString('ar-YE', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr key={ret.id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-700">
                        {ret.return_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800">{ret.supplier_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{returnDateFormatted}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {ret.purchase_id ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            {ret.purchase_id}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="outline" className="text-[11px] font-bold">
                          {itemsCount} قطعة ({ret.items?.length || 0} صنف)
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono font-black text-rose-700 text-sm">
                        {formatMoney(ret.total_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedReturn(ret)}
                            className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>عرض</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingReturn(ret)}
                            className="h-8 px-2.5 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg flex items-center gap-1"
                            title="تعديل المردود"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrint(ret)}
                            className="h-8 px-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                            title="طباعة السند"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
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

      {/* Invoice Detail Dialog */}
      {selectedReturn && (
        <Dialog
          isOpen={Boolean(selectedReturn)}
          onClose={() => setSelectedReturn(null)}
          maxWidth="2xl"
          hideCloseButton
        >
          <div className="space-y-5 text-right font-sans" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-rose-50 text-rose-700 rounded-xl">
                  <Undo2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    مردود مشتريات #{selectedReturn.return_number}
                  </h3>
                  <p className="text-xs text-slate-500">
                    المورد: {selectedReturn.supplier_name} | التاريخ:{' '}
                    {new Date(selectedReturn.return_date).toLocaleDateString('ar-YE')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReturn(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedReturn.purchase_id && (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs flex items-center gap-2">
                <span className="text-slate-500">المرجع لفاتورة الشراء:</span>
                <span className="font-mono font-bold text-slate-800">{selectedReturn.purchase_id}</span>
              </div>
            )}

            {/* Items Table */}
            <div className="rounded-xl border border-slate-200/80 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">الصنف</th>
                    <th className="py-2.5 px-3 text-center">الكمية</th>
                    <th className="py-2.5 px-3 text-center">سعر التكلفة</th>
                    <th className="py-2.5 px-3 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(selectedReturn.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {it.product_name || 'صنف'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">{it.quantity}</td>
                      <td className="py-2.5 px-3 text-center">{formatMoney(it.cost_price)}</td>
                      <td className="py-2.5 px-3 text-left font-black text-rose-700">
                        {formatMoney(it.quantity * it.cost_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total and Print button */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">إجمالي قيمة المردود:</span>
                <span className="text-xl font-black text-rose-400">
                  {formatMoney(selectedReturn.total_amount)}
                </span>
                <p className="text-[11px] text-slate-300 mt-1">
                  فقط: {tafqeetRials(selectedReturn.total_amount)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    const ret = selectedReturn;
                    setSelectedReturn(null);
                    setEditingReturn(ret);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 px-4 h-9"
                >
                  <Edit className="w-4 h-4" />
                  <span>تعديل السند</span>
                </Button>
                <Button
                  onClick={() => handlePrint(selectedReturn)}
                  className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl flex items-center gap-1.5 px-4 h-9"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة السند</span>
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Create Return Dialog */}
      <CreatePurchaseReturnDialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        suppliers={suppliers}
        preselectedSupplierId={defaultSupplierId}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Edit Return Dialog */}
      {editingReturn && (
        <EditPurchaseReturnDialog
          isOpen={Boolean(editingReturn)}
          onClose={() => setEditingReturn(null)}
          returnDoc={editingReturn}
          supplierId={editingReturn.supplier_id}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* Printable Document Root (Rendered via Portal onto document.body for clean isolation and official styling) */}
      {mounted &&
        printDoc &&
        createPortal(
          <div className="print-only-portal">
            <PrintablePurchaseReturnInvoice returnDoc={printDoc} />
          </div>,
          document.body
        )}
    </div>
  );
}

