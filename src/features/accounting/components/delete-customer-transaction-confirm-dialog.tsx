'use client';

import React, { useTransition } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { formatMoney } from '@/core/domain/money';
import { toast } from '@/shared/ui/toast';
import {
  deleteCustomerInvoiceAction,
  deleteCustomerPaymentAction,
} from '../actions/ledger.actions';

interface DeleteCustomerTransactionConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    type: string;
    orderId?: string | null;
    paymentId?: string | null;
    amount: number;
    description: string;
  } | null;
  customerId: string;
  onSuccess?: () => void;
}

export function DeleteCustomerTransactionConfirmDialog({
  isOpen,
  onClose,
  transaction,
  customerId,
  onSuccess,
}: DeleteCustomerTransactionConfirmDialogProps) {
  const [isPending, startTransition] = useTransition();

  if (!transaction) return null;

  const isInvoice = transaction.type === 'INVOICE' && Boolean(transaction.orderId);
  const isPayment = transaction.type === 'PAYMENT' && Boolean(transaction.paymentId);

  const docId = transaction.orderId || transaction.paymentId || transaction.id;

  const handleDelete = () => {
    startTransition(async () => {
      try {
        if (isInvoice && transaction.orderId) {
          const res = await deleteCustomerInvoiceAction({
            orderId: transaction.orderId,
            customerId,
          });

          if (!res.ok) {
            toast.error(res.error.message || 'فشل حذف فاتورة المبيعات.');
            return;
          }

          toast.success('تم حذف فاتورة المبيعات واسترجاع كميات المخزون وتعديل رصيد العميل بنجاح.');
        } else if (isPayment && transaction.paymentId) {
          const res = await deleteCustomerPaymentAction({
            paymentId: transaction.paymentId,
            customerId,
          });

          if (!res.ok) {
            toast.error(res.error.message || 'فشل حذف سند القبض.');
            return;
          }

          toast.success('تم حذف سند القبض وإعادة قيد المبلغ كمديونية على العميل بنجاح.');
        }

        onClose();
        if (onSuccess) onSuccess();
      } catch (err: any) {
        toast.error(err.message || 'حدث خطأ غير متوقع أثناء الحذف.');
      }
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isInvoice ? 'حذف فاتورة مبيعات نهائياً' : 'حذف سند قبض نهائياً'}
      description="يرجى قراءة التحذير التالي بعناية قبل تأكيد عملية الحذف."
      maxWidth="md"
    >
      <div className="space-y-4 pt-2 text-right" dir="rtl">
        {/* Warning Banner */}
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-rose-100 rounded-xl text-rose-700 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <p className="font-black text-rose-900 text-sm">
              تحذير: هذه العملية لا يمكن التراجع عنها!
            </p>
            {isInvoice && (
              <p className="text-rose-700 leading-relaxed">
                سيؤدي حذف هذه الفاتورة بمبلغ إجمالي{' '}
                <span className="font-bold">{formatMoney(Math.abs(transaction.amount))}</span> إلى:
                <br />
                • خصم قيمة الفاتورة من مديونية العميل وتحديث حسابه المالي تلقائياً.
                <br />
                • استرجاع الأصناف وإعادتها فوراً للمخزون الفعلي المتاح.
              </p>
            )}
            {isPayment && (
              <p className="text-rose-700 leading-relaxed">
                سيؤدي حذف سند القبض بمبلغ{' '}
                <span className="font-bold">{formatMoney(Math.abs(transaction.amount))}</span> إلى إلغاء
                قيد السداد وإعادة قيد المبلغ كـ <span className="font-bold">مديونية مستحقة</span> على
                العميل في كشف حسابه.
              </p>
            )}
          </div>
        </div>

        {/* Transaction Summary Card */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">البيان:</span>
            <span className="font-bold text-slate-800">{transaction.description}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">المبلغ:</span>
            <span className="font-mono font-black text-slate-900 text-sm">
              {formatMoney(Math.abs(transaction.amount))}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="text-xs cursor-pointer"
          >
            إلغاء الأمر
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>تأكيد الحذف النهائي</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
