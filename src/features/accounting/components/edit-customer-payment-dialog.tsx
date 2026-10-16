'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Loader2, CreditCard, DollarSign, User, Receipt, FileText, Hash } from 'lucide-react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { toast } from '@/shared/ui/toast';
import { updateCustomerPaymentAction } from '../actions/ledger.actions';

export interface CustomerPaymentEditData {
  id: string;
  amount: number;
  method: 'CASH' | 'TRANSFER' | 'OTHER' | string;
  referenceNumber?: string | null;
  notes?: string | null;
  customerName?: string;
  type?: 'RECEIPT' | 'DISBURSEMENT' | string;
}

interface EditCustomerPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment: CustomerPaymentEditData | null;
  customerId: string;
  onSuccess?: () => void;
}

export function EditCustomerPaymentDialog({
  isOpen,
  onClose,
  payment,
  customerId,
  onSuccess,
}: EditCustomerPaymentDialogProps) {
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<'CASH' | 'TRANSFER' | 'OTHER'>('CASH');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (payment) {
      setAmount(String(payment.amount || ''));
      const m = payment.method;
      setMethod(m === 'TRANSFER' ? 'TRANSFER' : m === 'OTHER' ? 'OTHER' : 'CASH');
      setReferenceNumber(payment.referenceNumber || '');
      setNotes(payment.notes || '');
    }
  }, [payment]);

  if (!payment) return null;

  const isDisbursement = payment.type === 'DISBURSEMENT';
  const originalAmount = Number(payment.amount || 0);
  const parsedAmount = Number(amount) || 0;
  const delta = parsedAmount - originalAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateCustomerPaymentAction({
          paymentId: payment.id,
          customerId,
          amount: parsedAmount,
          method,
          referenceNumber: referenceNumber.trim() || null,
          notes: notes.trim() || null,
        });

        if (res.ok) {
          toast.success(
            isDisbursement ? 'تم تعديل سند الصرف بنجاح' : 'تم تعديل سند القبض بنجاح'
          );
          onClose();
          onSuccess?.();
        } else {
          toast.error(res.error.message || 'فشل تعديل السند');
        }
      } catch (err: any) {
        toast.error(err.message || 'حدث خطأ أثناء تعديل السند');
      }
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isDisbursement ? 'تعديل سند الصرف المالي' : 'تعديل سند القبض المالي'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-right">
        {/* Info Header */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-800">{payment.customerName || 'العميل'}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-slate-500">
            <Receipt className="w-3.5 h-3.5" />
            <span>معرف: {payment.id.slice(-6).toUpperCase()}</span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>مبلغ السند (ر.ي) *</span>
            </span>
            <span className="text-[11px] font-normal text-slate-400">
              السابق: {formatMoney(originalAmount)}
            </span>
          </label>
          <div className="relative">
            <Input
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="font-mono text-lg font-bold text-slate-900 pr-3 pl-14"
              dir="ltr"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
              ر.ي
            </span>
          </div>
          {parsedAmount > 0 && (
            <p className="text-[11px] text-emerald-700 font-medium bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
              فقط: {tafqeetRials(parsedAmount)}
            </p>
          )}
        </div>

        {/* Difference indicator */}
        {delta !== 0 && parsedAmount > 0 && (
          <div
            className={`p-2.5 rounded-xl text-xs font-medium border flex items-center justify-between ${
              delta > 0
                ? isDisbursement
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : isDisbursement
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <span>الفارق عن المبلغ السابق:</span>
            <span className="font-bold font-mono dir-ltr">
              {delta > 0 ? `+${formatMoney(delta)}` : formatMoney(delta)}
            </span>
          </div>
        )}

        {/* Payment Method */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            <span>طريقة الدفع / التحصيل *</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'CASH', label: 'نقداً' },
              { id: 'TRANSFER', label: 'حوالة بنكية / صرافة' },
              { id: 'OTHER', label: 'أخرى' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id as any)}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  method === m.id
                    ? 'bg-blue-50 text-blue-800 border-blue-400 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reference Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-indigo-600" />
            <span>رقم الإشعار / الحوالة / المرجع (اختياري)</span>
          </label>
          <Input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="مثال: REF-98432 أو رقم الحوالة"
            className="text-xs"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>البيان والملاحظات (اختياري)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أدخل أي ملاحظات إضافية حول هذا السند..."
            rows={2}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Footer Buttons */}
        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="text-xs"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={isPending || parsedAmount <= 0}
            className="text-xs bg-amber-600 hover:bg-amber-500 text-white gap-1.5 font-bold px-5"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <span>حفظ التعديلات</span>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
