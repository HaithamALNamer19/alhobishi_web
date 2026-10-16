'use client';

import React from 'react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { Undo2, Printer, X, Calendar, Building2, FileText, CheckCircle2, Edit } from 'lucide-react';
import type { SerializedPurchaseReturn } from './purchase-returns-manager';

interface PurchaseReturnDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  returnDoc: SerializedPurchaseReturn | null;
  onPrint?: (doc: SerializedPurchaseReturn) => void;
  onEdit?: (doc: SerializedPurchaseReturn) => void;
}

export function PurchaseReturnDetailDialog({
  isOpen,
  onClose,
  returnDoc,
  onPrint,
  onEdit,
}: PurchaseReturnDetailDialogProps) {
  if (!returnDoc) return null;

  const returnDate = new Date(returnDoc.return_date || returnDoc.createdAt);
  const formattedDate = !isNaN(returnDate.getTime())
    ? returnDate.toLocaleDateString('ar-YE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const totalQty = (returnDoc.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="3xl" hideCloseButton>
      <div className="space-y-5 text-right font-sans" dir="rtl">
        {/* Header */}
        <div className="sticky -top-5 sm:-top-6 -mt-5 sm:-mt-6 -mx-5 sm:-mx-6 px-5 sm:px-6 py-3.5 bg-white/95 backdrop-blur-xs border-b border-slate-200 flex items-center justify-between z-20">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
              <Undo2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>فاتورة مردود مشتريات</span>
                <span className="text-xs font-mono bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                  {returnDoc.return_number}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">تفاصيل الأصناف المسترجعة للمورد والمبلغ المخصوم</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[10px]">المورد</span>
              <span className="font-bold text-slate-900">{returnDoc.supplier_name || 'مورد'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[10px]">تاريخ المردود</span>
              <span className="font-mono font-medium text-slate-800">{formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[10px]">مرجع فاتورة الشراء</span>
              <span className="font-mono font-bold text-slate-800">
                {returnDoc.purchase_id || '-'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[10px]">إجمالي الأصناف المعادة</span>
              <span className="font-bold text-slate-800">
                {(returnDoc.items || []).length} صنف ({totalQty} قطعة)
              </span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-100/80 px-3.5 py-2 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between items-center">
            <span>الأصناف المسترجعة ({(returnDoc.items || []).length})</span>
            <span className="text-[11px] text-slate-500 font-mono">إجمالي {totalQty} وحدة</span>
          </div>

          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">الصنف المرجع</th>
                  <th className="py-2 px-3 text-center">الكمية</th>
                  <th className="py-2 px-3 text-center">سعر التكلفة</th>
                  <th className="py-2 px-3 text-center">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(returnDoc.items || []).map((item, idx) => (
                  <tr key={`${item.product_id}-${idx}`} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{item.product_name || 'صنف'}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{formatMoney(item.cost_price)}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                      {formatMoney((item.quantity || 0) * (item.cost_price || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total Box */}
        <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-slate-600 block">إجمالي قيمة المردود</span>
            <span className="text-[10px] text-rose-800 font-bold">
              {tafqeetRials(returnDoc.total_amount)}
            </span>
          </div>
          <span className="text-xl font-black font-mono text-rose-700">
            {formatMoney(returnDoc.total_amount)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <Button variant="outline" onClick={onClose} className="px-4 text-xs cursor-pointer">
            إغلاق
          </Button>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                type="button"
                onClick={() => onEdit(returnDoc)}
                className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 text-xs font-bold px-4 cursor-pointer"
              >
                <Edit className="w-4 h-4" />
                <span>تعديل السند</span>
              </Button>
            )}
            {onPrint && (
              <Button
                onClick={() => onPrint(returnDoc)}
                className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2 text-xs font-bold px-4 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة السند</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
