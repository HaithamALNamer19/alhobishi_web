'use client';

import React from 'react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { Printer, RotateCcw, User, Calendar, FileText, CheckCircle2, Package, Phone } from 'lucide-react';
import type { SerializedReturnDetail } from '../actions/ledger.actions';

interface ReturnDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  returnDoc: SerializedReturnDetail['returnDoc'] | null;
  isLoading?: boolean;
  onPrint: (returnDoc: SerializedReturnDetail['returnDoc']) => void;
}

export function ReturnDetailDialog({
  isOpen,
  onClose,
  returnDoc,
  isLoading = false,
  onPrint,
}: ReturnDetailDialogProps) {
  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={returnDoc ? `فاتورة مردود مبيعات #${returnDoc.returnNumber}` : 'تفاصيل مردود المبيعات'}
      maxWidth="3xl"
    >
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className="inline-block w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p>جاري تحميل تفاصيل فاتورة المردود...</p>
        </div>
      ) : !returnDoc ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          تعذر العثور على بيانات فاتورة مردود المبيعات المحددة.
        </div>
      ) : (
        <div className="space-y-5 text-right">
          {/* Main Amount Card */}
          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-800 block">
                صافي المبلغ المردود (مقيد دائنًا لحساب العميل)
              </span>
              <span className="text-2xl font-black font-mono text-rose-950">
                {formatMoney(returnDoc.totalAmount)}
              </span>
              <p className="text-[11px] text-rose-700 mt-0.5">
                {tafqeetRials(returnDoc.totalAmount)}
              </p>
            </div>
            <div className="text-left flex flex-col items-end gap-1">
              <Badge variant="rose" className="text-xs px-2.5 py-1 flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>مردود مبيعات معتمد</span>
              </Badge>
              <span className="text-[10px] text-slate-500 font-mono">
                {returnDoc.returnNumber}
              </span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>العميل</span>
              </span>
              <p className="font-black text-slate-900">{returnDoc.customerName}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>الهاتف</span>
              </span>
              <p className="font-mono font-bold text-slate-800" dir="ltr">
                {returnDoc.customerPhone || 'غير مسجل'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>تاريخ المردود</span>
              </span>
              <p className="font-mono text-slate-800">
                {new Date(returnDoc.createdAt).toLocaleDateString('ar-YE', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>أثر المخزون والحساب</span>
              </span>
              <div>
                <Badge variant="emerald" className="text-[11px]">
                  أعيد للمخزون وخُصم الدين
                </Badge>
              </div>
            </div>
          </div>

          {/* Reason & Reference Order */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs space-y-2">
            {returnDoc.orderId && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>الطلب المرجعي:</span>
                </span>
                <span className="font-mono font-bold text-slate-800">{returnDoc.orderId}</span>
              </div>
            )}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>المحرر / أمين المستودع:</span>
              </span>
              <span className="font-bold text-slate-800">{returnDoc.recordedBy}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">سبب المردود / البيان:</span>
              <p className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium">
                {returnDoc.reason || 'إرجاع بضاعة بحالة سليمة إلى المستودع وقيد قيمتها دائنًا في الحساب.'}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-500" />
                <span>الأصناف المردودة ({returnDoc.items.length})</span>
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                {returnDoc.items.reduce((s, i) => s + i.quantity, 0)} قطعة
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-8">#</th>
                    <th className="py-2.5 px-3">اسم المنتج</th>
                    <th className="py-2.5 px-3 w-32">المتغير</th>
                    <th className="py-2.5 px-3 text-center w-24">الكمية المردودة</th>
                    <th className="py-2.5 px-3 text-center w-28">سعر الوحدة</th>
                    <th className="py-2.5 px-3 text-left w-28">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {returnDoc.items.map((item, idx) => (
                    <tr key={item.variantId || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {item.productName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {item.variantLabel || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-900">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                        {formatMoney(item.unitPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                        {formatMoney(item.subtotal ?? (item.unitPrice * item.quantity))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <Button
              onClick={() => onPrint(returnDoc)}
              className="bg-rose-700 hover:bg-rose-600 text-white gap-2 px-5"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة فاتورة المردود</span>
            </Button>

            <Button variant="outline" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

