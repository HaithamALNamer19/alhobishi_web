'use client';

import React, { useState, useTransition } from 'react';
import { Loader2, CreditCard, DollarSign, Building, Receipt, FileText } from 'lucide-react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { formatMoney } from '@/core/domain/money';
import { toast } from '@/shared/ui/toast';
import { recordSupplierPaymentAction } from '../actions/purchasing.actions';
import type { SupplierPaymentMethod } from '../domain/purchasing';

interface RecordSupplierPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: {
    id: string;
    name: string;
    company_name?: string;
    balance: number;
  };
  onSuccess?: (payment: any) => void;
}

export function RecordSupplierPaymentDialog({
  isOpen,
  onClose,
  supplier,
  onSuccess,
}: RecordSupplierPaymentDialogProps) {
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<SupplierPaymentMethod>('CASH');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [bankOrExchange, setBankOrExchange] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const currentBalance = Number(supplier.balance || 0);

  const handleFillFullBalance = () => {
    if (currentBalance > 0) {
      setAmount(String(currentBalance));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح لسند الصرف.');
      return;
    }

    startTransition(async () => {
      const res = await recordSupplierPaymentAction({
        supplier_id: supplier.id,
        amount: parsedAmount,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        bank_or_exchange: bankOrExchange.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (!res.ok) {
        toast.error(res.error.message || 'فشل تسجيل سند الصرف.');
        return;
      }

      toast.success(
        `تم تسجيل سند الصرف رقم ${res.data.voucher_number} بمبلغ ${formatMoney(parsedAmount)} وقيده في حساب المورد بنجاح!`
      );
      onClose();
      if (onSuccess) {
        onSuccess(res.data);
      }
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="تسجيل سند صرف / سداد دفعة للمورد"
      description="إصدار سند صرف مالي وقيد السداد في كشف حساب المورد وخصمه من مستحقاته."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-right" dir="rtl">
        {/* Supplier Info Summary */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-medium block">المورد / الشركة:</span>
            <span className="text-sm font-black text-slate-900 mt-0.5 block">
              {supplier.name}
              {supplier.company_name ? ` (${supplier.company_name})` : ''}
            </span>
          </div>
          <div className="text-left">
            <span className="text-slate-500 font-medium block">المستحق الحالي:</span>
            <span
              className={`font-black font-mono text-sm mt-0.5 block ${
                currentBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {formatMoney(currentBalance)}
            </span>
          </div>
        </div>

        {/* Amount Input with Quick Action */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">مبلغ السند (ريال يمني) *</label>
            {currentBalance > 0 && (
              <button
                type="button"
                onClick={handleFillFullBalance}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-800 hover:underline cursor-pointer"
              >
                سداد كامل المستحق ({formatMoney(currentBalance)})
              </button>
            )}
          </div>
          <Input
            type="number"
            min="1"
            step="any"
            placeholder="أدخل المبلغ المسدد للمورد..."
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
            className="font-mono text-base font-bold"
          />
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">طريقة الصرف والسداد *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'CASH', label: 'نقداً (كاش)' },
              { id: 'TRANSFER', label: 'حوالة / صرافة' },
              { id: 'CHECK', label: 'شيك بنكي' },
              { id: 'OTHER', label: 'أخرى' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id as SupplierPaymentMethod)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                  paymentMethod === m.id
                    ? 'border-blue-600 bg-blue-50/70 text-blue-800 shadow-xs ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reference Number & Exchange/Bank Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="رقم الحوالة / السند / الشيك (اختياري)"
            placeholder="مثال: 9482715"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            dir="ltr"
          />
          <Input
            label="اسم الصراف / البنك (اختياري)"
            placeholder="مثال: شركة العمقي للصرافة / بنك القطيبي"
            value={bankOrExchange}
            onChange={(e) => setBankOrExchange(e.target.value)}
          />
        </div>

        {/* Notes / Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">بيان وملاحظات السند (اختياري)</label>
          <textarea
            placeholder="مثال: دفعة تحت حساب فاتورة التوريد لشهر أكتوبر..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-slate-800 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
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
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center gap-2 text-xs"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري قيد السند...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>إصدار سند الصرف وقيد الرصيد</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

