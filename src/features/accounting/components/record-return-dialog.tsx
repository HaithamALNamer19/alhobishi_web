'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { toast } from '@/shared/ui/toast';
import {
  RotateCcw,
  Plus,
  Trash2,
  Package,
  History,
  AlertCircle,
  FileText,
  User,
  CheckCircle2,
} from 'lucide-react';
import {
  recordSalesReturnAction,
  getCustomerReturnableItemsAction,
} from '../actions/ledger.actions';

interface ReturnItemDraft {
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  orderId?: string | null;
  maxQty?: number;
}

interface RecordReturnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    uid: string;
    displayName: string;
    username?: string;
    phone?: string;
    role?: string;
  } | null;
  onSuccess?: (res: { returnId: string; returnNumber: string }) => void;
}

export function RecordReturnDialog({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: RecordReturnDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [returnItems, setReturnItems] = useState<ReturnItemDraft[]>([]);
  const [reason, setReason] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Past purchases state
  const [pastPurchases, setPastPurchases] = useState<
    Array<{
      orderNumber: string;
      orderId: string;
      productId: string;
      productName: string;
      variantId: string;
      variantLabel: string;
      purchasedQty: number;
      unitPrice: number;
      orderDate: string;
    }>
  >([]);
  const [isLoadingPast, setIsLoadingPast] = useState(false);

  // Manual entry toggle
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualVariant, setManualVariant] = useState('');
  const [manualQty, setManualQty] = useState('1');
  const [manualPrice, setManualPrice] = useState('0');
  const [manualProductId, setManualProductId] = useState('');
  const [manualVariantId, setManualVariantId] = useState('');

  // Fetch past orders when dialog opens
  useEffect(() => {
    if (!isOpen || !customer) {
      setReturnItems([]);
      setReason('');
      setSelectedOrderId(null);
      setPastPurchases([]);
      setShowManualAdd(false);
      return;
    }

    let isSubscribed = true;
    setIsLoadingPast(true);

    getCustomerReturnableItemsAction(customer.uid)
      .then((res) => {
        if (!isSubscribed) return;
        if (res.ok) {
          setPastPurchases(res.data);
        } else {
          toast.error('تعذر جلب سجل مشتريات العميل السابقة');
        }
      })
      .catch(() => {
        if (isSubscribed) toast.error('خطأ في الاتصال بسجل المشتريات');
      })
      .finally(() => {
        if (isSubscribed) setIsLoadingPast(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  // Add item from past purchases
  const handleAddFromPast = (p: typeof pastPurchases[number]) => {
    // Check if already in draft
    const exists = returnItems.find(
      (item) => item.productId === p.productId && item.variantId === p.variantId
    );
    if (exists) {
      toast.info('الصنف مضاف بالفعل في قائمة المردود الحالية');
      return;
    }

    setReturnItems((prev) => [
      ...prev,
      {
        productId: p.productId,
        productName: p.productName,
        variantId: p.variantId,
        variantLabel: p.variantLabel,
        quantity: 1,
        unitPrice: p.unitPrice,
        orderId: p.orderId,
        maxQty: p.purchasedQty,
      },
    ]);

    if (!selectedOrderId) {
      setSelectedOrderId(p.orderId);
    }
  };

  // Add manual item
  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      toast.error('يرجى إدخال اسم المنتج أو الصنف');
      return;
    }
    const q = parseInt(manualQty, 10);
    const p = parseFloat(manualPrice);
    if (isNaN(q) || q <= 0) {
      toast.error('يرجى إدخال كمية صحيحة');
      return;
    }
    if (isNaN(p) || p < 0) {
      toast.error('يرجى إدخال سعر وحدة صحيح');
      return;
    }

    const prodId = manualProductId.trim() || `manual-${Date.now()}`;
    const varId = manualVariantId.trim() || `var-${Date.now()}`;

    setReturnItems((prev) => [
      ...prev,
      {
        productId: prodId,
        productName: manualName.trim(),
        variantId: varId,
        variantLabel: manualVariant.trim() || 'قياسي',
        quantity: q,
        unitPrice: p,
        orderId: null,
      },
    ]);

    // Reset manual form
    setManualName('');
    setManualVariant('');
    setManualQty('1');
    setManualPrice('0');
    setManualProductId('');
    setManualVariantId('');
    setShowManualAdd(false);
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setReturnItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity: newQty } : item))
    );
  };

  const handleUpdatePrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    setReturnItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, unitPrice: newPrice } : item))
    );
  };

  const handleRemoveItem = (index: number) => {
    setReturnItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Compute total
  const totalReturnAmount = returnItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const totalItemsCount = returnItems.reduce((sum, item) => sum + item.quantity, 0);

  // Submit
  const handleSubmitReturn = () => {
    if (returnItems.length === 0) {
      toast.error('يرجى إضافة صنف واحد على الأقل لفاتورة المردود');
      return;
    }

    startTransition(async () => {
      try {
        const res = await recordSalesReturnAction({
          customerId: customer.uid,
          items: returnItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            variantId: item.variantId,
            variantLabel: item.variantLabel,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          reason: reason.trim() || null,
          orderId: selectedOrderId,
        });

        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        toast.success(
          `تم تسجيل فاتورة مردود المبيعات #${res.data.returnNumber} بنجاح وإعادة البضاعة للمخزون`
        );
        onClose();
        if (onSuccess) {
          onSuccess(res.data);
        }
      } catch (err: any) {
        toast.error(err.message || 'حدث خطأ أثناء تسجيل فاتورة المردود');
      }
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="تسجيل فاتورة مردود مبيعات جديدة"
      maxWidth="3xl"
    >
      <div className="space-y-6 text-right">
        {/* Customer Header Bar */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-slate-500" />
            <div>
              <span className="text-slate-500 block text-[10px]">العميل المسترجع منه:</span>
              <span className="font-black text-slate-900 text-sm">{customer.displayName}</span>
            </div>
          </div>
          {customer.phone && (
            <div className="text-left font-mono" dir="ltr">
              <span className="text-slate-500 text-[10px] block" dir="rtl">
                الهاتف:
              </span>
              <span className="font-bold text-slate-800">{customer.phone}</span>
            </div>
          )}
        </div>

        {/* Explain Notice */}
        <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">أثر فاتورة المردود في النظام:</span>
            <p className="text-amber-800 leading-relaxed">
              عند اعتماد الفاتورة، سيتم تلقائيًا <strong>إعادة الكميات المردودة للمخزون الفعلي والمتاح</strong>، و<strong>خصم قيمة المردود كقيد دائن من مديونية العميل</strong> في كشف الحساب.
            </p>
          </div>
        </div>

        {/* Selection from Past Orders Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-600" />
              <span>مشتريات العميل من الطلبات السابقة (اختيار سريع)</span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowManualAdd(!showManualAdd)}
              className="text-[11px] h-7 px-2.5 gap-1 border-slate-300"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showManualAdd ? 'إلغاء الإدخال اليدوي' : 'إضافة صنف يدويًا'}</span>
            </Button>
          </div>

          {isLoadingPast ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
              جاري تحميل سجل مشتريات العميل...
            </div>
          ) : pastPurchases.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
              لا توجد طلبات مؤكدة سابقة لهذا العميل. يمكنك استخدام زر "إضافة صنف يدويًا".
            </div>
          ) : (
            <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-2xs">
              {pastPurchases.map((p, idx) => {
                const isAdded = returnItems.some(
                  (item) => item.productId === p.productId && item.variantId === p.variantId
                );
                return (
                  <div
                    key={`${p.orderId}-${p.variantId}-${idx}`}
                    className="p-2.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{p.productName}</span>
                        <span className="text-slate-500 text-[11px]">({p.variantLabel})</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span>الطلب: #{p.orderNumber}</span>
                        <span>الكمية المشتراة: {p.purchasedQty}</span>
                        <span>السعر: {formatMoney(p.unitPrice)}</span>
                        <span>التاريخ: {p.orderDate}</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={isAdded ? 'secondary' : 'outline'}
                      disabled={isAdded}
                      onClick={() => handleAddFromPast(p)}
                      className={`text-[11px] h-7 px-2.5 gap-1 ${
                        isAdded ? 'opacity-60 text-slate-500' : 'text-blue-700 border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تمت الإضافة</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>إرجاع الصنف</span>
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Manual Add Subform */}
        {showManualAdd && (
          <form
            onSubmit={handleAddManualItem}
            className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs"
          >
            <span className="font-bold text-slate-800 block text-[11px]">
              إدخال صنف مردود يدويًا:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">اسم الصنف / المنتج *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حليب ممتاز"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1">المواصفات / المتغير</label>
                <input
                  type="text"
                  placeholder="مثال: كرتون 24 حبة"
                  value={manualVariant}
                  onChange={(e) => setManualVariant(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1">الكمية المردودة *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={manualQty}
                  onChange={(e) => setManualQty(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1">سعر الوحدة (ر.ي) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" size="sm" className="h-7 text-xs bg-slate-800 hover:bg-slate-700 text-white">
                إضافة للقائمة
              </Button>
            </div>
          </form>
        )}

        {/* Selected Return Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-rose-600" />
              <span>الأصناف المشمولة في فاتورة المردود ({returnItems.length})</span>
            </span>
            {totalItemsCount > 0 && (
              <span className="text-xs font-mono font-bold text-slate-500">
                إجمالي القطع: {totalItemsCount}
              </span>
            )}
          </div>

          {returnItems.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
              لم تقم بإضافة أي أصناف بعد. اختر من المشتريات السابقة أعلاه أو أضف يدويًا.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">الصنف / المتغير</th>
                    <th className="py-2.5 px-3 text-center w-28">الكمية المردودة</th>
                    <th className="py-2.5 px-3 text-center w-32">سعر الوحدة (ر.ي)</th>
                    <th className="py-2.5 px-3 text-center w-32">الإجمالي</th>
                    <th className="py-2.5 px-2 text-center w-12">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returnItems.map((item, idx) => {
                    const subtotal = item.quantity * item.unitPrice;
                    return (
                      <tr key={`${item.productId}-${item.variantId}-${idx}`} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{item.productName}</span>
                          <span className="text-[11px] text-slate-500">{item.variantLabel}</span>
                          {item.maxQty && (
                            <span className="text-[10px] text-slate-400 block">
                              (أقصى كمية مشتراة: {item.maxQty})
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            max={item.maxQty}
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateQty(idx, parseInt(e.target.value, 10) || 1)
                            }
                            className="w-20 px-2 py-1 text-center font-mono font-bold rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-rose-600"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleUpdatePrice(idx, parseFloat(e.target.value) || 0)
                            }
                            className="w-24 px-2 py-1 text-center font-mono rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-rose-600"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-900">
                          {formatMoney(subtotal)}
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                            title="حذف الصنف من الفاتورة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reason and Details */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            سبب المردود / ملاحظات العملية:
          </label>
          <input
            type="text"
            placeholder="مثال: إرجاع بضاعة بحالة سليمة لعدم الحاجة / تلف جزئي في الكرتون..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-600 placeholder:text-slate-400"
          />
        </div>

        {/* Total Summary Card */}
        <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-rose-800 font-bold block">
              صافي المبلغ الإجمالي للمردود (خصم من الدين):
            </span>
            <div className="text-2xl font-black font-mono text-rose-950 mt-0.5">
              {formatMoney(totalReturnAmount)}
            </div>
            <p className="text-[11px] text-rose-700 mt-1">
              المبلغ كتابةً: {tafqeetRials(totalReturnAmount)}
            </p>
          </div>
          <div className="text-left">
            <Badge variant="rose" className="text-xs px-3 py-1 font-bold">
              مردود مبيعات
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <Button
            type="button"
            onClick={handleSubmitReturn}
            disabled={isPending || returnItems.length === 0}
            className="bg-rose-700 hover:bg-rose-600 text-white font-bold gap-2 px-6 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isPending ? 'جاري الاعتماد والقيد...' : 'اعتماد وقيد فاتورة المردود'}</span>
          </Button>

          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            إلغاء
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

