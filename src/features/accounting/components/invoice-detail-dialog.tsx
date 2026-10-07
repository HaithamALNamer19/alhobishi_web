'use client';

import React from 'react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { Printer, CheckCircle2, User, Phone, Package, Calendar } from 'lucide-react';
import type { SerializedInvoiceDetail } from '../actions/ledger.actions';

interface InvoiceDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: SerializedInvoiceDetail['order'] | null;
  isLoading?: boolean;
  onPrint: (order: SerializedInvoiceDetail['order']) => void;
}

export function InvoiceDetailDialog({
  isOpen,
  onClose,
  order,
  isLoading = false,
  onPrint,
}: InvoiceDetailDialogProps) {
  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={order ? `تفاصيل فاتورة المبيعات #${order.orderNumber}` : 'تفاصيل الفاتورة'}
      maxWidth="3xl"
    >
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p>جاري تحميل تفاصيل الفاتورة والأصناف...</p>
        </div>
      ) : !order ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          تعذر العثور على بيانات الفاتورة المحددة.
        </div>
      ) : (
        <div className="space-y-5 text-right">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>العميل</span>
              </span>
              <p className="font-black text-slate-900">{order.customerName}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>رقم الهاتف</span>
              </span>
              <p className="font-mono font-bold text-slate-800" dir="ltr">
                {order.customerPhone || 'غير مسجل'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>تاريخ الفاتورة</span>
              </span>
              <p className="font-mono text-slate-800">
                {new Date(order.confirmedAt || order.createdAt).toLocaleDateString('ar-YE', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>الحالة المحاسبية</span>
              </span>
              <div>
                <Badge variant="emerald" className="text-[11px]">
                  معتمدة ومقيدة بالحساب
                </Badge>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-500" />
                <span>الأصناف المجهزة في الفاتورة ({order.items.length})</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                إجمالي القطع: {order.items.reduce((s, i) => s + (i.preparedQty ?? i.requestedQty ?? 0), 0)}
              </span>
            </div>

            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">الصنف / المنتج</th>
                    <th className="py-2.5 px-3">المواصفات</th>
                    <th className="py-2.5 px-3 text-center">الكمية</th>
                    <th className="py-2.5 px-3 text-center">سعر الوحدة</th>
                    <th className="py-2.5 px-3 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {order.items.map((item, idx) => {
                    const qty = item.preparedQty ?? item.requestedQty ?? 0;
                    const subtotal = item.subtotal ?? (item.unitPrice * qty);

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {item.productName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {item.variantLabel || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                          {qty}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                          {formatMoney(item.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                          {formatMoney(subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total & Notes */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-400 block font-medium">المبلغ الإجمالي للفاتورة</span>
              <p className="text-xs text-blue-200">
                {tafqeetRials(order.totalAmount)}
              </p>
            </div>
            <div className="text-left font-mono font-black text-2xl text-white tracking-tight">
              {formatMoney(order.totalAmount)}
            </div>
          </div>

          {order.customerNotes && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-900">
              <span className="font-bold">ملاحظات الطلب: </span>
              <span>{order.customerNotes}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <Button
              onClick={() => onPrint(order)}
              className="bg-blue-700 hover:bg-blue-600 text-white gap-2 px-5"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الفاتورة</span>
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

