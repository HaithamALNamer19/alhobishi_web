'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Loader2, FileText, Calendar, Building2, Hash } from 'lucide-react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { formatMoney } from '@/core/domain/money';
import { toast } from '@/shared/ui/toast';
import { updatePurchaseInvoiceAction } from '../actions/purchasing.actions';

interface EditPurchaseInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    id: string;
    invoice_number: string;
    supplier_name: string;
    total_amount: number;
    createdAt?: string;
    items?: Array<{
      product_name?: string;
      quantity: number;
      cost_price: number;
    }>;
  } | null;
  supplierId: string;
  onSuccess?: () => void;
}

export function EditPurchaseInvoiceDialog({
  isOpen,
  onClose,
  invoice,
  supplierId,
  onSuccess,
}: EditPurchaseInvoiceDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');

  useEffect(() => {
    if (invoice) {
      setInvoiceNumber(invoice.invoice_number || '');
      if (invoice.createdAt) {
        const d = new Date(invoice.createdAt);
        if (!isNaN(d.getTime())) {
          setPurchaseDate(d.toISOString().slice(0, 10));
        } else {
          setPurchaseDate('');
        }
      } else {
        setPurchaseDate('');
      }
    }
  }, [invoice]);

  if (!invoice) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) {
      toast.error('يرجى إدخال رقم الفاتورة.');
      return;
    }

    startTransition(async () => {
      const res = await updatePurchaseInvoiceAction({
        purchaseId: invoice.id,
        invoice_number: invoiceNumber.trim(),
        purchase_date: purchaseDate ? purchaseDate : undefined,
        supplierId,
      });

      if (!res.ok) {
        toast.error(res.error.message || 'فشل تعديل فاتورة الشراء.');
        return;
      }

      toast.success('تم حفظ تعديلات فاتورة الشراء بنجاح.');
      onClose();
      if (onSuccess) onSuccess();
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="تعديل بيانات فاتورة الشراء"
      description="تعديل الرقم المرجعي وتاريخ فاتورة الشراء وتحديث كشف الحساب."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-right" dir="rtl">
        {/* Invoice Summary */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-medium block">المورد:</span>
            <span className="text-sm font-black text-slate-900 mt-0.5 block">
              {invoice.supplier_name}
            </span>
          </div>
          <div className="text-left">
            <span className="text-slate-500 font-medium block">إجمالي الفاتورة:</span>
            <span className="text-sm font-black font-mono text-blue-700 mt-0.5 block">
              {formatMoney(invoice.total_amount)}
            </span>
          </div>
        </div>

        {/* Invoice Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-blue-600" />
            <span>رقم الفاتورة *</span>
          </label>
          <Input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="مثال: PUR-2026-0001 أو رقم الفاتورة الورقية"
            className="text-xs font-mono font-bold"
            required
            autoFocus
          />
        </div>

        {/* Purchase Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>تاريخ الفاتورة</span>
          </label>
          <Input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="text-xs font-mono"
          />
        </div>

        {/* Items Summary Preview */}
        {invoice.items && invoice.items.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-500 block">
              الأصناف المشمولة بالفاتورة ({invoice.items.length} أصناف):
            </span>
            <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100 text-xs">
              {invoice.items.map((it, idx) => (
                <div key={idx} className="p-2 flex items-center justify-between bg-slate-50/50">
                  <span className="font-medium text-slate-800">{it.product_name || 'صنف'}</span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-blue-700 font-bold">{it.quantity} قطعة</span>
                    <span className="text-slate-400">×</span>
                    <span>{formatMoney(it.cost_price)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            <span>حفظ التعديلات</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

