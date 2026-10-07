'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Package,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatMoney } from '@/core/domain/money';
import type { CartSummary } from '@/features/cart/domain/cart';
import { createOrderAction } from '../actions/order.actions';

interface CheckoutFormProps {
  summary: CartSummary;
  customerName: string;
  customerPhone: string;
}

export function CheckoutForm({
  summary,
  customerName,
  customerPhone,
}: CheckoutFormProps) {
  const router = useRouter();
  const [customerNotes, setCustomerNotes] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (summary.hasOutOfStockItems) {
      toast.error('يرجى تعديل السلة أولاً؛ بعض الأصناف تجاوزت المخزون المتوفر.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createOrderAction(customerNotes);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        toast.success(`تم استلام طلبك بنجاح! رقم الطلب: ${res.data.orderNumber}`, {
          duration: 5000,
        });

        router.push(`/account/orders/${res.data.id}`);
      } catch (err: unknown) {
        toast.error((err as Error).message || 'حدث خطأ أثناء إرسال الطلب');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-blue-700" />
            <span>تأكيد حجز البضاعة وإرسال الطلب</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            سيتم حجز الأصناف فورًا في المستودع وإحالة الطلب لقسم التجهيز
          </p>
        </div>
        <Link href="/cart">
          <Button type="button" variant="outline" size="sm">
            العودة للسلة
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Customer & Notes Info (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer Details Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              بيانات المستلم
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">اسم العميل:</span>
                <span className="font-bold text-slate-900">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الهاتف:</span>
                <span className="font-bold text-slate-900 font-mono" dir="ltr">
                  {customerPhone || 'غير محدد'}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              ملاحظات إضافية للطلب (اختياري)
            </h2>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="اكتب أي تعليمات خاصة بالتسليم أو مواعيد التجهيز أو التواصل..."
              rows={3}
              className="w-full text-xs rounded-xl border border-slate-200 p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            />
          </div>

          {/* Policy Box */}
          <div className="bg-blue-50/60 p-5 rounded-3xl border border-blue-100 space-y-2 text-xs text-blue-950">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="w-4 h-4 text-blue-800" />
              <span>ميزة التعديل المرن للفاتورة:</span>
            </div>
            <p className="text-[11px] text-blue-900 leading-relaxed">
              يحق لك زيادة أو تقليل الكميات، أو حذف وإضافة أصناف في فاتورتك حتى تبدأ الإدارة في تجهيز الطلب واعتماد جهوزيته (Ready).
            </p>
          </div>
        </div>

        {/* Order Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              الأصناف المحجوزة ({summary.items.length})
            </h2>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto space-y-2">
              {summary.items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="pt-2 pb-1 flex items-center justify-between text-xs"
                >
                  <div className="truncate max-w-44">
                    <span className="font-bold text-slate-800 block truncate">
                      {item.productName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.variantLabel} × {item.quantity}
                    </span>
                  </div>
                  <span className="font-bold font-mono text-slate-900">
                    {formatMoney(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-900 text-sm">
                <span>المبلغ الإجمالي:</span>
                <span className="text-blue-900 font-mono text-base font-black">
                  {formatMoney(summary.totalAmount)}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending || summary.hasOutOfStockItems}
              className="w-full py-4 font-bold text-sm flex items-center justify-center gap-2 mt-2"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>تأكيد وإرسال طلب الحجز</span>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

