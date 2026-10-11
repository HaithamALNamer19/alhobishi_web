'use client';

import React from 'react';
import { CreditCard, Printer, Calendar, Building, FileText, User } from 'lucide-react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';

interface SupplierPaymentVoucherDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment: {
    id: string;
    voucher_number: string;
    supplier_id: string;
    supplier_name: string;
    company_name?: string;
    amount: number;
    payment_method: string;
    reference_number?: string | null;
    bank_or_exchange?: string | null;
    notes?: string | null;
    recorded_by?: string;
    createdAt: string | Date;
  } | null;
  onPrint?: () => void;
}

export function SupplierPaymentVoucherDialog({
  isOpen,
  onClose,
  payment,
  onPrint,
}: SupplierPaymentVoucherDialogProps) {
  if (!payment) return null;

  const dateObj =
    payment.createdAt instanceof Date ? payment.createdAt : new Date(payment.createdAt);

  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('ar-YE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const methodLabel =
    payment.payment_method === 'CASH'
      ? 'نقدًا (كاش)'
      : payment.payment_method === 'TRANSFER'
        ? 'حوالة مصرفية / صرافة'
        : payment.payment_method === 'CHECK'
          ? 'شيك بنكي'
          : 'أخرى';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`سند صرف مالي رقم #${payment.voucher_number}`}
      description="تفاصيل سند السداد المصروف للمورد وقيده المحاسبي."
      maxWidth="lg"
    >
      <div className="space-y-4 pt-2 text-right" dir="rtl">
        {/* Amount Card */}
        <div className="p-4 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-900 block">المبلغ المصروف:</span>
            <span className="text-2xl font-black font-mono text-blue-950 mt-0.5 block">
              {formatMoney(payment.amount)}
            </span>
            <span className="text-[11px] text-blue-800 font-semibold block mt-1">
              {tafqeetRials(payment.amount)}
            </span>
          </div>
          <div className="text-left">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">طريقة الصرف</span>
            <Badge variant="outline" className="font-bold text-blue-800 bg-white border-blue-300">
              {methodLabel}
            </Badge>
          </div>
        </div>

        {/* Details Grid */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
          <div className="p-3 bg-slate-50 flex items-center justify-between">
            <span className="font-bold text-slate-500 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-slate-400" />
              <span>المورد / المستفيد:</span>
            </span>
            <span className="font-black text-slate-900">
              {payment.supplier_name}
              {payment.company_name ? ` (${payment.company_name})` : ''}
            </span>
          </div>

          <div className="p-3 flex items-center justify-between">
            <span className="font-bold text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>تاريخ وتوقيت الصرف:</span>
            </span>
            <span className="font-mono font-bold text-slate-800" dir="ltr">
              {formattedDate}
            </span>
          </div>

          {(payment.reference_number || payment.bank_or_exchange) && (
            <div className="p-3 bg-slate-50 flex items-center justify-between">
              <span className="font-bold text-slate-500 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span>المرجع / الجهة المصرفية:</span>
              </span>
              <span className="font-bold text-slate-800">
                {payment.bank_or_exchange && <span>{payment.bank_or_exchange} </span>}
                {payment.reference_number && (
                  <span className="font-mono text-slate-600">({payment.reference_number})</span>
                )}
              </span>
            </div>
          )}

          {payment.notes && (
            <div className="p-3">
              <span className="font-bold text-slate-500 block mb-1 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-400" />
                <span>البيان والملاحظات:</span>
              </span>
              <p className="text-slate-800 font-medium whitespace-pre-wrap">{payment.notes}</p>
            </div>
          )}

          <div className="p-3 bg-slate-50 flex items-center justify-between">
            <span className="font-bold text-slate-500 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              <span>المسؤول المسجل:</span>
            </span>
            <span className="font-bold text-slate-800">
              {payment.recorded_by || 'إدارة المشتريات'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} className="text-xs">
            إغلاق
          </Button>

          {onPrint && (
            <Button
              type="button"
              onClick={onPrint}
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center gap-2 text-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة سند الصرف</span>
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

