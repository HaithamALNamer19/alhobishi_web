'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Package,
  Receipt,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Edit3,
  Trash2,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatMoney } from '@/core/domain/money';
import {
  ORDER_STATUS_LABELS,
  ORDER_ITEM_STATUS_LABELS,
  canCustomerEditOrder,
  type Order,
  type OrderItem,
} from '../domain/order';
import { customerUpdateOrderAction } from '../actions/order.actions';

interface CustomerOrderViewProps {
  initialOrder: Order;
}

export function CustomerOrderView({ initialOrder }: CustomerOrderViewProps) {
  const router = useRouter();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>>(
    initialOrder.items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.requestedQty,
    }))
  );
  const [isPending, startTransition] = useTransition();

  const canEdit = canCustomerEditOrder(order.status);

  const handleUpdateQty = (productId: string, variantId: string, delta: number) => {
    setEditedItems((prev) =>
      prev.map((i) =>
        i.productId === productId && i.variantId === variantId
          ? { ...i, quantity: Math.max(1, i.quantity + delta) }
          : i
      )
    );
  };

  const handleRemoveItem = (productId: string, variantId: string) => {
    if (editedItems.length <= 1) {
      toast.error('لا يمكن حذف جميع الأصناف من الطلب');
      return;
    }
    setEditedItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.variantId === variantId))
    );
  };

  const handleSaveEdits = () => {
    startTransition(async () => {
      try {
        const res = await customerUpdateOrderAction(order.id, editedItems);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        toast.success('تم حفظ التعديلات على الفاتورة وتحديث الحجز بنجاح!');
        setOrder(res.data);
        setIsEditing(false);
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || 'حدث خطأ أثناء حفظ التعديلات');
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/account"
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
                      : order.status === 'PREPARING'
                        ? 'amber'
                        : 'slate'
                }
                className="font-bold text-xs"
              >
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>تاريخ الطلب: {order.businessDate}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {canEdit && !isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-2 text-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-700" />
              <span>تعديل الفاتورة</span>
            </Button>
          )}

          {canEdit && isEditing && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditedItems(
                    order.items.map((i) => ({
                      productId: i.productId,
                      variantId: i.variantId,
                      quantity: i.requestedQty,
                    }))
                  );
                  setIsEditing(false);
                }}
                disabled={isPending}
                className="text-xs"
              >
                إلغاء التعديل
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveEdits}
                disabled={isPending}
                className="gap-2 text-xs"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>حفظ التعديلات</span>
              </Button>
            </div>
          )}

          {!canEdit && (
            <Badge variant="rose" className="gap-1.5 py-1.5 px-3 font-bold text-xs">
              <Lock className="w-3.5 h-3.5" />
              <span>الفاتورة مقفلة</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Editing Alert Banner */}
      {isEditing && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">أنت الآن في وضع تعديل الفاتورة:</span>
            <p className="leading-relaxed">
              يمكنك زيادة أو تقليل كميات الأصناف أو حذفها. سيتم إعادة فحص المخزون فورًا عند الحفظ وتحديث الحجز وإشعار موظف التجهيز.
            </p>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          الأصناف المحجوزة في الطلب
        </h2>

        <div className="divide-y divide-slate-100">
          {order.items.map((item) => {
            const currentEdited = editedItems.find(
              (i) => i.productId === item.productId && i.variantId === item.variantId
            );
            const displayQty = isEditing ? (currentEdited?.quantity ?? item.requestedQty) : item.requestedQty;

            return (
              <div
                key={item.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
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
                    <span className="font-bold text-sm text-slate-900 block">{item.productName}</span>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md">{item.variantLabel}</span>
                      <span className="font-mono text-slate-700">{formatMoney(item.unitPrice)}</span>
                    </div>

                    {/* Preparation Status */}
                    <div className="pt-1 flex items-center gap-2">
                      <Badge
                        variant={
                          item.status === 'prepared'
                            ? 'emerald'
                            : item.status === 'partial'
                              ? 'amber'
                              : 'slate'
                        }
                        className="text-[10px]"
                      >
                        {ORDER_ITEM_STATUS_LABELS[item.status]}
                        {item.preparedQty > 0 && ` (${item.preparedQty}/${item.requestedQty})`}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Quantity and Price */}
                <div className="flex items-center justify-between sm:justify-end gap-6">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.productId, item.variantId, -1)}
                          disabled={displayQty <= 1}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer text-xs"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-bold text-slate-900 font-mono text-xs">
                          {displayQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.productId, item.variantId, 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer text-xs"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.productId, item.variantId)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="حذف الصنف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-right sm:text-left">
                      <span className="text-xs text-slate-500 block">الكمية: {item.requestedQty} قطعة</span>
                      <span className="font-black text-sm text-slate-900 font-mono">
                        {formatMoney(item.subtotal)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-between items-baseline">
          <span className="font-bold text-sm text-slate-900">إجمالي الفاتورة:</span>
          <span className="text-xl font-black text-blue-900 font-mono">
            {formatMoney(order.totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}

