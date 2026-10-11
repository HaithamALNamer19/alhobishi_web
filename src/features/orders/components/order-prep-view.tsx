'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Package,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  ArrowRight,
  ShieldCheck,
  Loader2,
  FileText,
  User,
  Phone,
  DollarSign,
  Check,
  X,
  CreditCard,
  Ban,
  XCircle,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge, RoleBadge } from '@/shared/ui/badge';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { formatMoney } from '@/core/domain/money';
import {
  ORDER_STATUS_LABELS,
  ORDER_ITEM_STATUS_LABELS,
  type Order,
  type OrderItem,
  type OrderItemStatus,
} from '../domain/order';
import {
  staffUpdateItemPrepAction,
  staffMarkOrderReadyAction,
  adminConfirmOrderAction,
  cancelOrderAction,
} from '../actions/order.actions';

interface OrderPrepViewProps {
  initialOrder: Order;
  isAdmin: boolean;
}

export function OrderPrepView({ initialOrder, isAdmin }: OrderPrepViewProps) {
  const router = useRouter();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [isPending, startTransition] = useTransition();

  // Confirmation dialogs
  const [confirmReadyOpen, setConfirmReadyOpen] = useState(false);
  const [confirmInvoiceOpen, setConfirmInvoiceOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const isCancelled = order.status === 'CANCELLED';
  const isLocked = order.isLocked || isCancelled;

  const handleCancelOrder = () => {
    startTransition(async () => {
      try {
        const res = await cancelOrderAction(order.id, cancelReason);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        toast.success('تم إلغاء الطلب وتحرير حجز المخزون بنجاح!');
        setOrder(res.data);
        setConfirmCancelOpen(false);
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || 'حدث خطأ أثناء إلغاء الطلب');
      }
    });
  };

  const handleUpdateItem = (
    variantId: string,
    preparedQty: number,
    status: OrderItemStatus
  ) => {
    startTransition(async () => {
      try {
        const res = await staffUpdateItemPrepAction(
          order.id,
          variantId,
          preparedQty,
          status
        );

        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        toast.success('تم تحديث حالة الصنف');
        setOrder(res.data);
      } catch (err: unknown) {
        toast.error((err as Error).message || 'حدث خطأ غير متوقع');
      }
    });
  };

  const handleQuickComplete = (item: OrderItem) => {
    handleUpdateItem(item.variantId, item.requestedQty, 'prepared');
  };

  const handleMarkReady = () => {
    startTransition(async () => {
      try {
        const res = await staffMarkOrderReadyAction(order.id);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        toast.success('تم تأكيد جهوزية الطلب وقفل الفاتورة وتحديث المخزون بنجاح!');
        setOrder(res.data);
        setConfirmReadyOpen(false);
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || 'حدث خطأ أثناء تأكيد الجهوزية');
      }
    });
  };

  const handleConfirmOrder = () => {
    startTransition(async () => {
      try {
        const res = await adminConfirmOrderAction(order.id);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        toast.success(
          `تم اعتماد الفاتورة وقيد مبلغ ${formatMoney(order.totalAmount)} كمديونية على حساب العميل بنجاح!`
        );
        setOrder(res.data);
        setConfirmInvoiceOpen(false);
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || 'حدث خطأ أثناء اعتماد الفاتورة');
      }
    });
  };

  const allItemsPrepared = order.items.every(
    (i) => i.status === 'prepared' || i.status === 'unavailable'
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders/today"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {order.orderNumber}
              </h1>
              <Badge
                variant={
                  order.status === 'READY'
                    ? 'emerald'
                    : order.status === 'CONFIRMED'
                      ? 'sky'
                      : order.status === 'CANCELLED'
                        ? 'rose'
                        : order.status === 'PREPARING'
                          ? 'amber'
                          : 'slate'
                }
                className="font-bold text-xs"
              >
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
              {order.isLocked && !isCancelled && (
                <Badge variant="rose" className="gap-1 text-[11px] font-bold">
                  <Lock className="w-3 h-3" /> مقفل
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              تاريخ العمل: <span className="font-mono font-bold">{order.businessDate}</span>
            </p>
          </div>
        </div>

        {/* Customer Quick Summary */}
        <div className="flex items-center gap-4 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs text-right">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>{order.customerName}</span>
              <RoleBadge role={order.customerRole} />
            </div>
            {order.customerPhone && (
              <span className="text-[11px] text-slate-500 font-mono block mt-0.5" dir="ltr">
                {order.customerPhone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cancelled Alert Banner */}
      {isCancelled && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-3xl text-xs text-rose-900 flex items-start gap-3">
          <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-rose-950">تم إلغاء هذا الطلب وتحرير حجز المخزون بالكامل</h3>
            <p className="text-slate-600">
              تم الإلغاء بواسطة: <strong className="text-slate-800">{order.cancelledBy || 'الإدارة'}</strong>
              {order.cancelledAt && (
                <span className="font-mono text-slate-500 mr-2">
                  ({new Date(order.cancelledAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })})
                </span>
              )}
            </p>
            {order.cancelReason && (
              <p className="text-rose-800">
                <span className="font-bold">سبب الإلغاء: </span>{order.cancelReason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Customer Notes if provided */}
      {order.customerNotes && (
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-900 flex items-start gap-2.5">
          <FileText className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">ملاحظات العميل:</span>
            <p className="mt-0.5">{order.customerNotes}</p>
          </div>
        </div>
      )}

      {/* Order Items Preparation Board */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-blue-700" />
            <h2 className="text-base font-bold text-slate-900">
              جدول تجهيز الأصناف ({order.items.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            حدد الكمية المجهزة وحالة كل بند
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {order.items.map((item) => {
            const isUnavailable = item.status === 'unavailable';
            return (
              <div
                key={item.id}
                className={`py-4 px-3 -mx-3 rounded-2xl transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isUnavailable ? 'bg-rose-50/40 border border-rose-100' : ''
                }`}
              >
                {/* Product Info */}
                <div className="flex items-center gap-3.5 flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <span
                      className={`font-bold text-sm block ${
                        isUnavailable ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {item.productName}
                    </span>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md">{item.variantLabel}</span>
                      {item.sku && <span className="font-mono text-[11px] text-slate-400">SKU: {item.sku}</span>}
                    </div>
                    <div className="text-xs text-slate-700 font-bold mt-1 flex items-center gap-2">
                      <span>
                        المطلوب: <span className="font-mono text-blue-800">{item.requestedQty} قطعة</span>
                      </span>

                      {/* Item Status Badge */}
                      <Badge
                        variant={
                          item.status === 'prepared'
                            ? 'emerald'
                            : item.status === 'partial'
                              ? 'sky'
                              : item.status === 'unavailable'
                                ? 'rose'
                                : 'amber'
                        }
                        className="text-[10px] font-bold gap-1"
                      >
                        {item.status === 'prepared' && <Check className="w-3 h-3" />}
                        {item.status === 'partial' && <Package className="w-3 h-3" />}
                        {item.status === 'unavailable' && <AlertTriangle className="w-3 h-3" />}
                        {item.status === 'pending' && <Clock className="w-3 h-3" />}
                        <span>{ORDER_ITEM_STATUS_LABELS[item.status]}</span>
                        {item.status === 'partial' && ` (${item.preparedQty}/${item.requestedQty})`}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Preparation Controls */}
                <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* Prepared quantity input */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">تم تجهيز:</span>
                    <input
                      type="number"
                      min="0"
                      max={item.requestedQty}
                      value={item.preparedQty}
                      disabled={isLocked || isUnavailable || isPending}
                      onChange={(e) => {
                        const val = e.target.value;
                        const qty = Math.min(item.requestedQty, Math.max(0, parseInt(val, 10) || 0));
                        const status: OrderItemStatus =
                          qty >= item.requestedQty
                            ? 'prepared'
                            : qty > 0
                              ? 'partial'
                              : 'pending';
                        handleUpdateItem(item.variantId, qty, status);
                      }}
                      className="w-16 text-center font-bold font-mono text-xs py-1.5 px-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <span className="text-xs text-slate-400 font-mono">/ {item.requestedQty}</span>
                  </div>

                  {/* Status Selector */}
                  <select
                    value={item.status}
                    disabled={isLocked || isPending}
                    onChange={(e) => {
                      const st = e.target.value as OrderItemStatus;
                      let prepQty = item.preparedQty;
                      if (st === 'prepared') prepQty = item.requestedQty;
                      else if (st === 'unavailable') prepQty = 0;
                      else if (st === 'pending') prepQty = 0;
                      else if (st === 'partial' && (prepQty === 0 || prepQty >= item.requestedQty)) {
                        prepQty = Math.max(1, Math.floor(item.requestedQty / 2));
                      }
                      handleUpdateItem(item.variantId, prepQty, st);
                    }}
                    className="text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-slate-50"
                  >
                    <option value="pending">بانتظار التجهيز</option>
                    <option value="prepared">تم التجهيز بالكامل</option>
                    <option value="partial">تجهيز جزئي</option>
                    <option value="unavailable">غير متوفر</option>
                  </select>

                  {/* Quick Action Buttons */}
                  {!isLocked && (
                    <div className="flex items-center gap-1.5">
                      {item.status !== 'prepared' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickComplete(item)}
                          disabled={isPending}
                          className="h-8 text-xs gap-1 text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>تجهيز كامل</span>
                        </Button>
                      )}
                      {item.status !== 'unavailable' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateItem(item.variantId, 0, 'unavailable')}
                          disabled={isPending}
                          className="h-8 text-xs gap-1 text-rose-700 border-rose-200 hover:bg-rose-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>غير متوفر</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total & Action Bar */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-500 block">إجمالي الفاتورة:</span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              {formatMoney(order.totalAmount)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Cancel Order Button */}
            {!isCancelled && order.status !== 'CONFIRMED' && order.status !== 'COMPLETED' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmCancelOpen(true)}
                disabled={isPending}
                className="gap-2 font-bold px-4 py-3.5 border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300"
              >
                <Ban className="w-4 h-4 text-rose-600" />
                <span>إلغاء الطلب</span>
              </Button>
            )}

            {/* Step 1: Mark Ready */}
            {!isLocked && (
              <Button
                type="button"
                onClick={() => setConfirmReadyOpen(true)}
                disabled={isPending}
                className="gap-2 font-bold px-6 py-3.5 bg-blue-700 hover:bg-blue-800 text-white"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>تأكيد الجهوزية وقفل الفاتورة</span>
              </Button>
            )}

            {/* Step 2: Confirm Order & Debit Ledger (Admin Only) */}
            {order.status === 'READY' && isAdmin && (
              <Button
                type="button"
                onClick={() => setConfirmInvoiceOpen(true)}
                disabled={isPending}
                className="gap-2 font-bold px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <CreditCard className="w-5 h-5" />
                <span>اعتماد الفاتورة وقيد المديونية في الحساب</span>
              </Button>
            )}

            {/* Confirmed State */}
            {order.status === 'CONFIRMED' && (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-900 px-4 py-2.5 rounded-2xl border border-blue-200 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-blue-700" />
                <span>الفاتورة معتمدة ومقيدة على حساب العميل</span>
              </div>
            )}

            {/* Cancelled State */}
            {isCancelled && (
              <div className="flex items-center gap-2 bg-rose-50 text-rose-900 px-4 py-2.5 rounded-2xl border border-rose-200 text-xs font-bold">
                <Ban className="w-4 h-4 text-rose-700" />
                <span>الطلب ملغي ومحرر من المخزون</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Ready Dialog */}
      <ConfirmDialog
        isOpen={confirmReadyOpen}
        onClose={() => setConfirmReadyOpen(false)}
        onConfirm={handleMarkReady}
        title="تأكيد جاهزية الطلب وقفل الفاتورة"
        description="عند الضغط على تأكيد، سيتم خصم الكميات المجهزة من المخزون الفعلي، وتحرير أي كميات غير متوفرة، وقفل الفاتورة نهائيًا ومنع التعديل، وإشعار العميل بأن طلبه جاهز للاستلام."
        confirmLabel="تأكيد الجهوزية وقفل الفاتورة"
        cancelLabel="تراجع"
        variant="primary"
        isLoading={isPending}
      />

      {/* Confirm Invoice & Debit Ledger Dialog */}
      <ConfirmDialog
        isOpen={confirmInvoiceOpen}
        onClose={() => setConfirmInvoiceOpen(false)}
        onConfirm={handleConfirmOrder}
        title="اعتماد الفاتورة وقيد المديونية"
        description={`هل تريد اعتماد الفاتورة وقيد مبلغ ${formatMoney(order.totalAmount)} كمديونية على حساب العميل ${order.customerName} في دفتر الأستاذ؟`}
        confirmLabel="نعم، اعتمد الفاتورة"
        cancelLabel="إلغاء"
        variant="primary"
        isLoading={isPending}
      />

      {/* Confirm Cancel Order Dialog */}
      {confirmCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 text-right">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">إلغاء الطلب وتحرير المخزون</h3>
                <p className="text-xs text-slate-500 font-mono">رقم الطلب: {order.orderNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              عند تأكيد الإلغاء، سيتم تحرير جميع الكميات المحجوزة وإعادتها فورياً للمخزون المتاح، وقفل الطلب نهائياً، وإشعار العميل بالإلغاء.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                سبب الإلغاء (اختياري):
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="مثال: بناء على طلب العميل / عدم توفر الكمية المطلوبة"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 focus:bg-white"
                disabled={isPending}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmCancelOpen(false)}
                disabled={isPending}
                className="text-xs px-4"
              >
                تراجع
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCancelOrder}
                disabled={isPending}
                className="text-xs px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                <span>تأكيد إلغاء الطلب</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

