'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ShoppingCart,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Package,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatMoney } from '@/core/domain/money';
import type { CartSummary, CartResolvedItem } from '../domain/cart';
import {
  updateCartQuantityAction,
  removeFromCartAction,
} from '../actions/cart.actions';

interface CartViewProps {
  initialSummary: CartSummary;
  isLoggedIn: boolean;
}

export function CartView({ initialSummary, isLoggedIn }: CartViewProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<CartSummary>(initialSummary);
  const [isPending, startTransition] = useTransition();

  const handleUpdateQty = (item: CartResolvedItem, newQty: number) => {
    if (newQty <= 0) {
      handleRemove(item);
      return;
    }

    if (newQty > item.availableQty) {
      if (item.availableQty <= 10) {
        toast.warning(`الكمية المتوفرة حاليًا في المخزون هي ${item.availableQty} قطعة فقط`);
      } else {
        toast.warning('الكمية المطلوبة تتجاوز المخزون المتوفر حالياً');
      }
    }

    startTransition(async () => {
      try {
        const res = await updateCartQuantityAction(item.productId, item.variantId, newQty);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || 'حدث خطأ أثناء تعديل الكمية');
      }
    });
  };

  const handleRemove = (item: CartResolvedItem) => {
    startTransition(async () => {
      try {
        const res = await removeFromCartAction(item.productId, item.variantId);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        toast.success(`تم حذف "${item.productName}" من السلة`);
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || 'حدث خطأ أثناء الحذف');
      }
    });
  };

  if (summary.items.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-12 sm:py-20 px-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-4xl border border-slate-200/90 p-8 sm:p-12 text-center space-y-5 shadow-xl shadow-slate-900/5 relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-20 h-20 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-center mx-auto text-blue-700 shadow-2xs">
            <ShoppingCart className="w-10 h-10 stroke-[1.5]" />
          </div>

          <div className="space-y-1.5 relative z-10">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              سلة التسوق فارغة
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              لم تقم بإضافة أي أصناف بعد. تصفح أقسام متجر الحبيشي واختر ما يناسبك مع إمكانية الحجز الفوري.
            </p>
          </div>

          {/* Quick Category Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 relative z-10">
            <Link
              href="/products?category=smart-watches"
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-all"
            >
              ساعات ذكية
            </Link>
            <Link
              href="/products?category=toys"
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-all"
            >
              ألعاب أطفال
            </Link>
            <Link
              href="/products?category=cookware"
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-all"
            >
              أواني منزلية
            </Link>
            <Link
              href="/products?category=tools"
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-all"
            >
              خردوات وأدوات
            </Link>
          </div>

          <div className="pt-4 relative z-10">
            <Link href="/products">
              <Button className="w-full sm:w-auto px-8 py-3.5 font-bold gap-2 text-sm rounded-2xl shadow-md hover:shadow-lg transition-all">
                <Package className="w-4 h-4" />
                <span>تصفح كل المنتجات الآن</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-700" />
            <span>سلة المشتريات وحجز البضائع</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إجمالي الأصناف: {summary.totalQuantity} قطعة
          </p>
        </div>
        <Link
          href="/"
          className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
        >
          <span>متابعة التسوق</span>
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      {/* Main Grid: Items List + Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Items List (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {summary.hasOutOfStockItems && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                تنبيه: بعض الأصناف في سلتك تتجاوز الكمية المتوفرة حاليًا في المستودع. يرجى تعديل الكميات للمتابعة.
              </span>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {summary.items.map((item) => {
              const isOverStock = item.quantity > item.availableQty;

              return (
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  {/* Product Info */}
                  <div className="flex items-center gap-3.5 flex-1">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <Link
                        href={`/p/${item.productSlug}`}
                        className="font-bold text-sm text-slate-900 hover:text-blue-700 transition-colors line-clamp-1"
                      >
                        {item.productName}
                      </Link>
                      <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.variantLabel}
                        </span>
                        <span className="font-mono text-slate-700">
                          {formatMoney(item.unitPrice)} للقطعة
                        </span>
                      </div>

                      {isOverStock && (
                        <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>
                            {item.availableQty <= 10
                              ? `المتوفر ${item.availableQty} فقط!`
                              : 'الكمية المطلوبة تتجاوز المخزون المتاح'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper & Subtotal */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    {/* Stepper */}
                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50/80 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item, item.quantity - 1)}
                        disabled={isPending}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-xs"
                      >
                        -
                      </button>
                      <span className="w-9 text-center font-bold text-slate-900 font-mono text-xs">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item, item.quantity + 1)}
                        disabled={isPending || item.quantity >= item.availableQty}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer text-xs"
                      >
                        +
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-left min-w-24">
                      <span className="text-sm font-black text-slate-900 font-mono">
                        {formatMoney(item.subtotal)}
                      </span>
                    </div>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      disabled={isPending}
                      className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer"
                      title="حذف من السلة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              ملخص الفاتورة والحجز
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>إجمالي عدد القطع:</span>
                <span className="font-bold font-mono text-slate-900">
                  {summary.totalQuantity} قطعة
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>المبلغ الإجمالي المعتمد:</span>
                <span className="font-bold font-mono text-slate-900">
                  {formatMoney(summary.totalAmount)}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                <span className="font-bold text-sm text-slate-900">المجموع النهائي:</span>
                <span className="text-xl font-black text-blue-900 font-mono">
                  {formatMoney(summary.totalAmount)}
                </span>
              </div>
            </div>

            {/* Lifecycle & Policy Notice */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                <span>سياسة حجز البضائع:</span>
              </div>
              <p>
                الطلب يُسجل كحجز فوري للبضاعة في المستودع. تستطيع تعديل الكميات أو حذف وإضافة أصناف بحرية حتى تقوم الإدارة بتأكيد جاهزية الطلب (Ready).
              </p>
            </div>

            {/* Checkout / Order Action */}
            {isLoggedIn ? (
              <Link href="/checkout" className="block">
                <Button
                  disabled={summary.hasOutOfStockItems || isPending}
                  className="w-full py-3.5 font-bold text-sm flex items-center justify-center gap-2"
                >
                  <span>متابعة إرسال طلب الحجز</span>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <div className="space-y-2">
                <Link href="/login?from=/cart" className="block">
                  <Button className="w-full py-3.5 font-bold text-sm">
                    تسجيل الدخول لإتمام طلب الحجز
                  </Button>
                </Link>
                <span className="text-[11px] text-slate-400 block text-center">
                  يتطلب حجز البضائع وجود حساب مسجل
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

