'use client';

import React from 'react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { RotateCcw, Printer, X, Calendar, User, FileText, CheckCircle2 } from 'lucide-react';
import type { SerializedReturnDetail } from '../actions/return.actions';

interface ReturnDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  returnDoc: SerializedReturnDetail | null;
  onPrint?: (doc: SerializedReturnDetail) => void;
}

export function ReturnDetailDialog({
  isOpen,
  onClose,
  returnDoc,
  onPrint,
}: ReturnDetailDialogProps) {
  if (!returnDoc) return null;

  const returnDate = new Date(returnDoc.createdAt);
  const formattedDate = !isNaN(returnDate.getTime())
    ? returnDate.toLocaleDateString('ar-YE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const totalQty = returnDoc.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="">
      <div className="space-y-5 text-right font-sans" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
              <RotateCcw className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>فاتورة مردود مبيعات</span>
                <span className="text-xs font-mono bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                  {returnDoc.returnNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">تفاصيل الأصناف المسترجعة والمبلغ المقيد</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-slate-500 block text-[10px]">العميل</span>
              <span className="font-bold text-slate-900">{returnDoc.customerName}</span>
              {returnDoc.customerPhone && (
                <span className="text-[10px] text-slate-500 block font-mono">
                  {returnDoc.customerPhone}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-slate-500 block text-[10px]">تاريخ المردود</span>
              <span className="font-mono font-medium text-slate-800">{formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-slate-500 block text-[10px]">المسجل بواسطة</span>
              <span className="font-bold text-slate-800">{returnDoc.recordedBy}</span>
            </div>
          </div>

          {returnDoc.reason && (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-slate-500 block text-[10px]">سبب الإرجاع</span>
                <span className="font-medium text-slate-700">{returnDoc.reason}</span>
              </div>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-100/80 px-3.5 py-2 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between items-center">
            <span>الأصناف المسترجعة ({returnDoc.items.length})</span>
            <span className="text-[11px] text-slate-500">إجمالي {totalQty} وحدة</span>
          </div>

          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">الصنف</th>
                  <th className="py-2 px-3 text-center">المتغير</th>
                  <th className="py-2 px-3 text-center">الكمية</th>
                  <th className="py-2 px-3 text-center">السعر</th>
                  <th className="py-2 px-3 text-center">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {returnDoc.items.map((item, idx) => (
                  <tr key={`${item.productId}-${item.variantId}-${idx}`} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{item.productName}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600 text-[11px]">
                      {item.variantLabel || 'الافتراضي'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{formatMoney(item.unitPrice)}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                      {formatMoney(item.subtotal)}
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
              {tafqeetRials(returnDoc.totalAmount)}
            </span>
          </div>
          <span className="text-xl font-black font-mono text-rose-700">
            {formatMoney(returnDoc.totalAmount)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
          <Button variant="outline" onClick={onClose} className="px-4 text-xs">
            إغلاق
          </Button>
          {onPrint && (
            <Button
              onClick={() => onPrint(returnDoc)}
              className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2 text-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الفاتورة</span>
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
