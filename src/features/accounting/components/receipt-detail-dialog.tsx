'use client';

import React from 'react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { Printer, CreditCard, User, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import type { SerializedPaymentDetail } from '../actions/ledger.actions';

interface ReceiptDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment: SerializedPaymentDetail['payment'] | null;
  isLoading?: boolean;
  onPrint: (payment: SerializedPaymentDetail['payment']) => void;
}

export function ReceiptDetailDialog({
  isOpen,
  onClose,
  payment,
  isLoading = false,
  onPrint,
}: ReceiptDetailDialogProps) {
  if (!isOpen) return null;

  const methodLabel =
    payment?.method === 'CASH'
      ? 'نقدًا'
      : payment?.method === 'TRANSFER'
        ? 'حوالة بنكية / صرافة'
        : 'أخرى';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="تفاصيل سند القبض المالي"
      maxWidth="lg"
    >
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p>جاري تحميل تفاصيل السند...</p>
        </div>
      ) : !payment ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          تعذر العثور على بيانات سند القبض المحدد.
        </div>
      ) : (
        <div className="space-y-5 text-right">
          {/* Main Amount Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 block">المبلغ المسدد</span>
              <span className="text-2xl font-black font-mono text-emerald-950">
                {formatMoney(payment.amount)}
              </span>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                {tafqeetRials(payment.amount)}
              </p>
            </div>
            <div className="text-left">
              <Badge variant="emerald" className="text-xs px-2.5 py-1">
                {methodLabel}
              </Badge>
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>حساب العميل</span>
              </span>
              <span className="font-bold text-slate-900">{payment.customerName}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>تاريخ وتوقيت السند</span>
              </span>
              <span className="font-mono text-slate-800">
                {new Date(payment.createdAt).toLocaleDateString('ar-YE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>طريقة السداد</span>
              </span>
              <span className="font-bold text-slate-800">{methodLabel}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>رقم الإشعار / الحوالة</span>
              </span>
              <span className="font-mono font-bold text-blue-900">
                {payment.referenceNumber || 'لا يوجد'}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                <span>المحرر / المحاسب</span>
              </span>
              <span className="text-slate-700">{payment.recordedBy || 'النظام'}</span>
            </div>

            <div className="pt-1">
              <span className="text-slate-500 block mb-1">البيان والملاحظات:</span>
              <p className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-800">
                {payment.notes || 'تسديد دفعة لحساب العميل المالي'}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <Button
              onClick={() => onPrint(payment)}
              className="bg-emerald-700 hover:bg-emerald-600 text-white gap-2 px-5"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة سند القبض</span>
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

