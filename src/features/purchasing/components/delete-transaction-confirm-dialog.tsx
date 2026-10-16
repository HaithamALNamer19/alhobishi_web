'use client';

import React, { useTransition } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { formatMoney } from '@/core/domain/money';
import { toast } from '@/shared/ui/toast';
import {
  deletePurchaseInvoiceAction,
  deleteSupplierPaymentAction,
  deletePurchaseReturnAction,
} from '../actions/purchasing.actions';

interface DeleteTransactionConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    type: string;
    reference_id?: string | null;
    reference_number?: string | null;
    credit: number;
    debit: number;
    description: string;
    items?: Array<{
      product_name?: string;
      quantity: number;
      cost_price: number;
    }>;
  } | null;
  supplierId: string;
  onSuccess?: () => void;
}

export function DeleteTransactionConfirmDialog({
  isOpen,
  onClose,
  transaction,
  supplierId,
  onSuccess,
}: DeleteTransactionConfirmDialogProps) {
  const [isPending, startTransition] = useTransition();

  if (!transaction) return null;

  const isPurchase = transaction.type === 'PURCHASE';
  const isReturn = transaction.type === 'PURCHASE_RETURN';
  const isPayment = !isPurchase && !isReturn;

  const docId = transaction.reference_id || transaction.id;
  const docRef = transaction.reference_number || transaction.id;

  const handleDelete = () => {
    startTransition(async () => {
      if (isPurchase) {
        const res = await deletePurchaseInvoiceAction({
          purchaseId: docId,
          supplierId,
        });

        if (!res.ok) {
          toast.error(res.error.message || 'فشل حذف فاتورة الشراء.');
          return;
        }

        toast.success(`تم حذف فاتورة الشراء رقم ${docRef} وتحديث المخزون ورصيد المورد بنجاح.`);
      } else if (isReturn) {
        const res = await deletePurchaseReturnAction({
          returnId: docId,
          supplierId,
        });

        if (!res.ok) {
          toast.error(res.error.message || 'فشل حذف مردود المشتريات.');
          return;
        }

        toast.success(`تم حذف مردود المشتريات رقم ${docRef} وإعادة الأصناف للمخزون ورصيد المورد بنجاح.`);
      } else if (isPayment) {
        const res = await deleteSupplierPaymentAction({
          paymentId: docId,
          supplierId,
        });

        if (!res.ok) {
          toast.error(res.error.message || 'فشل حذف السند المالي.');
          return;
        }

        toast.success(`تم حذف السند المالي رقم ${docRef} وتعديل رصيد المورد بنجاح.`);
      }

      onClose();
      if (onSuccess) onSuccess();
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        isPurchase
          ? 'حذف فاتورة شراء نهائياً'
          : isReturn
            ? 'حذف مردود مشتريات نهائياً'
            : 'حذف سند صرف نهائياً'
      }
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
            {isPurchase && (
              <p className="text-rose-700 leading-relaxed">
                سيؤدي حذف فاتورة الشراء رقم <span className="font-mono font-bold" dir="ltr">{docRef}</span> بمبلغ إجمالي{' '}
                <span className="font-bold">{formatMoney(transaction.credit)}</span> إلى:{' '}
                <br />
                • استرجاع كميات الأصناف المشتراة وخصمها تلقائياً من أرصدة المخزون.
                <br />
                • خصم قيمة الفاتورة من رصيد المورد الدائن المستحق له.
              </p>
            )}
            {isReturn && (
              <p className="text-rose-700 leading-relaxed">
                سيؤدي حذف مردود المشتريات رقم <span className="font-mono font-bold" dir="ltr">{docRef}</span> بمبلغ إجمالي{' '}
                <span className="font-bold">{formatMoney(transaction.debit)}</span> إلى:{' '}
                <br />
                • استرجاع كميات الأصناف المرجعة وإضافتها تلقائياً إلى أرصدة المخزون الفعلي.
                <br />
                • إعادة قيد المبلغ كـ <span className="font-bold">مستحق للمورد</span> في حسابه التراكمي.
              </p>
            )}
            {isPayment && (
              <p className="text-rose-700 leading-relaxed">
                سيؤدي حذف سند الصرف رقم <span className="font-mono font-bold" dir="ltr">{docRef}</span> بمبلغ{' '}
                <span className="font-bold">{formatMoney(transaction.debit || transaction.credit)}</span> إلى إلغاء قيد السداد وإعادة قيد المبلغ
                كـ <span className="font-bold">مستحق للمورد</span> في حسابه التراكمي.
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
              {formatMoney(isPurchase ? transaction.credit : transaction.debit)}
            </span>
          </div>
          {isPurchase && transaction.items && transaction.items.length > 0 && (
            <div className="pt-1 border-t border-slate-200/60 text-[11px] text-slate-600">
              عدد الأصناف التي ستخصم من المخزون: {transaction.items.length} أصناف
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="text-xs"
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

