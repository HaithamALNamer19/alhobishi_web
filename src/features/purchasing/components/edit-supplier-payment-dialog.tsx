'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Loader2, CreditCard, DollarSign, Building, Receipt, FileText, Hash } from 'lucide-react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { formatMoney } from '@/core/domain/money';
import { toast } from '@/shared/ui/toast';
import { updateSupplierPaymentAction } from '../actions/purchasing.actions';
import type { SupplierPaymentMethod } from '../domain/purchasing';

interface EditSupplierPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment: {
    id: string;
    voucher_number: string;
    supplier_id: string;
    supplier_name: string;
    amount: number;
    payment_method: SupplierPaymentMethod | string;
    reference_number?: string | null;
    bank_or_exchange?: string | null;
    notes?: string | null;
  } | null;
  supplierId: string;
  onSuccess?: () => void;
}

export function EditSupplierPaymentDialog({
  isOpen,
  onClose,
  payment,
  supplierId,
  onSuccess,
}: EditSupplierPaymentDialogProps) {
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<SupplierPaymentMethod>('CASH');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [bankOrExchange, setBankOrExchange] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (payment) {
      setAmount(String(payment.amount || ''));
      setPaymentMethod((payment.payment_method as SupplierPaymentMethod) || 'CASH');
      setReferenceNumber(payment.reference_number || '');
      setBankOrExchange(payment.bank_or_exchange || '');
      setNotes(payment.notes || '');
    }
  }, [payment]);

  if (!payment) return null;

  const originalAmount = Number(payment.amount || 0);
  const parsedAmount = Number(amount) || 0;
  const delta = parsedAmount - originalAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح لسند الصرف.');
      return;
    }

    startTransition(async () => {
      const res = await updateSupplierPaymentAction({
        paymentId: payment.id,
        amount: parsedAmount,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        bank_or_exchange: bankOrExchange.trim() || undefined,
        notes: notes.trim() || undefined,
        supplierId,
      });

      if (!res.ok) {
        toast.error(res.error.message || 'فشل تعديل سند الصرف.');
        return;
      }

      toast.success(
        `تم حفظ تعديلات سند الصرف رقم ${payment.voucher_number} وتحديث رصيد المورد بنجاح.`
      );
      onClose();
      if (onSuccess) onSuccess();
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="تعديل سند صرف المورد"
      description="تعديل مبلغ أو تفاصيل سند الصرف مع إعادة احتساب رصيد المورد تلقائياً."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-right" dir="rtl">
        {/* Header Summary */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-medium block">المورد:</span>
            <span className="text-sm font-black text-slate-900 mt-0.5 block">
              {payment.supplier_name}
            </span>
          </div>
          <div className="text-left">
            <span className="text-slate-500 font-medium block">رقم سند الصرف:</span>
            <span className="text-sm font-black font-mono text-emerald-700 mt-0.5 block" dir="ltr">
              {payment.voucher_number}
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>مبلغ السند (ر.ي) *</span>
          </label>
          <div className="relative">
            <Input
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="text-base font-black font-mono pl-12 text-slate-900"
              required
              autoFocus
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              ر.ي
            </span>
          </div>
          {delta !== 0 && parsedAmount > 0 && (
            <p className="text-[11px] text-slate-500 mt-1">
              المبلغ السابق: <span className="font-mono font-bold">{formatMoney(originalAmount)}</span>{' '}
              ({delta > 0 ? (
                <span className="text-emerald-700 font-bold">
                  زيادة سداد +{formatMoney(delta)} ستخصم من مستحقات المورد
                </span>
              ) : (
                <span className="text-amber-700 font-bold">
                  نقص سداد {formatMoney(Math.abs(delta))} ستضاف لمستحقات المورد
                </span>
              )})
            </p>
          )}
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            <span>طريقة الدفع *</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'CASH', label: 'نقداً (كاش)' },
              { id: 'TRANSFER', label: 'حوالة مصرفية' },
              { id: 'CHECK', label: 'شيك بنكي' },
              { id: 'OTHER', label: 'أخرى' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id as SupplierPaymentMethod)}
                className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                  paymentMethod === m.id
                    ? 'border-blue-600 bg-blue-50/80 text-blue-700 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reference / Transfer / Check Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-slate-400" />
              <span>رقم الحوالة / الإيداع / الشيك</span>
            </label>
            <Input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="مثال: REF-998811"
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>اسم البنك / الصراف</span>
            </label>
            <Input
              value={bankOrExchange}
              onChange={(e) => setBankOrExchange(e.target.value)}
              placeholder="مثال: الكريمي، بنك القطيبي..."
              className="text-xs"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>ملاحظات إضافية</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أية تفاصيل تخص السداد أو شروط الدفعة..."
            className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white bg-slate-50 min-h-[70px]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
            disabled={isPending}
            className="text-xs bg-blue-700 hover:bg-blue-800 text-white font-bold"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />}
            <span>حفظ تعديلات السند</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

