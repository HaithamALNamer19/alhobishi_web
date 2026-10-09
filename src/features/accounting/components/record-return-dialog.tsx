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
  Minus,
  Trash2,
  Package,
  Search,
  History,
  AlertCircle,
  User,
  Store,
  Loader2,
} from 'lucide-react';
import {
  recordSalesReturnAction,
  getCustomerReturnableItemsAction,
  searchStoreProductsForReturnAction,
  type StoreProductReturnOption,
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

  // Store Product Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [storeProducts, setStoreProducts] = useState<StoreProductReturnOption[]>([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);

  // Toggle for past customer purchases (optional quick helper)
  const [showPastPurchases, setShowPastPurchases] = useState(false);
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

  // Reset and load catalog products when dialog opens
  useEffect(() => {
    if (!isOpen || !customer) {
      setReturnItems([]);
      setReason('');
      setSelectedOrderId(null);
      setSearchQuery('');
      setStoreProducts([]);
      setShowPastPurchases(false);
      return;
    }

    let isSubscribed = true;
    setIsSearchingCatalog(true);

    // Initial load of store products
    searchStoreProductsForReturnAction({ query: '', customerRole: customer.role })
      .then((res) => {
        if (!isSubscribed) return;
        if (res.ok) {
          setStoreProducts(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isSubscribed) setIsSearchingCatalog(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, customer]);

  // Debounced search when manager types in search bar
  useEffect(() => {
    if (!isOpen || !customer) return;

    const timer = setTimeout(() => {
      setIsSearchingCatalog(true);
      searchStoreProductsForReturnAction({
        query: searchQuery,
        customerRole: customer.role,
      })
        .then((res) => {
          if (res.ok) {
            setStoreProducts(res.data);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsSearchingCatalog(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, customer]);

  // Lazy load past purchases only if requested
  const handleTogglePastPurchases = () => {
    if (!showPastPurchases && pastPurchases.length === 0 && customer) {
      setIsLoadingPast(true);
      getCustomerReturnableItemsAction(customer.uid)
        .then((res) => {
          if (res.ok) {
            setPastPurchases(res.data);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoadingPast(false);
        });
    }
    setShowPastPurchases(!showPastPurchases);
  };

  if (!isOpen || !customer) return null;

  // Add item from store products search
  const handleAddFromCatalog = (product: StoreProductReturnOption) => {
    setReturnItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === product.productId && item.variantId === product.variantId
      );

      if (existingIdx >= 0) {
        // Increment quantity if already added
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
        };
        toast.success(`تمت زيادة كمية [${product.productName}] إلى ${updated[existingIdx].quantity}`);
        return updated;
      }

      // Add new item with default quantity 1 and auto price from store catalog
      toast.success(`تمت إضافة [${product.productName} - ${product.variantLabel}] للفاتورة`);
      return [
        ...prev,
        {
          productId: product.productId,
          productName: product.productName,
          variantId: product.variantId,
          variantLabel: product.variantLabel,
          quantity: 1, // Default 1
          unitPrice: product.defaultPrice, // Auto price from store (editable)
          orderId: null,
        },
      ];
    });
  };

  // Add item from past purchases
  const handleAddFromPast = (p: typeof pastPurchases[number]) => {
    setReturnItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === p.productId && item.variantId === p.variantId
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = Math.min(
          p.purchasedQty,
          updated[existingIdx].quantity + 1
        );
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
        };
        toast.success(`تمت زيادة كمية [${p.productName}] إلى ${newQty}`);
        return updated;
      }

      toast.success(`تمت إضافة [${p.productName} - ${p.variantLabel}] من الطلب #${p.orderNumber}`);
      return [
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
      ];
    });

    if (!selectedOrderId) {
      setSelectedOrderId(p.orderId);
    }
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setReturnItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity: newQty } : item))
    );
  };

  const handleIncrementQty = (index: number) => {
    setReturnItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const max = item.maxQty ?? 999999;
        const next = Math.min(max, item.quantity + 1);
        return { ...item, quantity: next };
      })
    );
  };

  const handleDecrementQty = (index: number) => {
    setReturnItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const next = Math.max(1, item.quantity - 1);
        return { ...item, quantity: next };
      })
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
      toast.error('يرجى اختيار وإضافة صنف واحد على الأقل لفاتورة المردود');
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
          `تم اعتماد وقيد فاتورة مردود المبيعات #${res.data.returnNumber} بنجاح وإعادة البضاعة للمخزون`
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
      <div className="space-y-5 text-right">
        {/* Customer Header Bar */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-slate-500" />
            <div>
              <span className="text-slate-500 block text-[10px]">العميل المسترجع منه:</span>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm">{customer.displayName}</span>
                <Badge variant={customer.role === 'wholesale' ? 'indigo' : 'slate'} className="text-[10px] py-0 px-2">
                  {customer.role === 'wholesale' ? 'تاجر جملة' : 'عميل عادي'}
                </Badge>
              </div>
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

        {/* Store Products Search Section */}
        <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Store className="w-4 h-4 text-rose-600" />
              <span>البحث في منتجات المحل لإضافتها للمردود:</span>
            </span>

            <button
              type="button"
              onClick={handleTogglePastPurchases}
              className="text-[11px] text-blue-700 hover:text-blue-800 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>{showPastPurchases ? 'إخفاء مشتريات العميل' : 'عرض مشتريات العميل السابقة'}</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="ابحث في منتجات المحل (اسم الصنف، الباركود، الكود) لإضافته مباشرة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-600 transition-all placeholder:text-slate-400 font-medium"
            />
            {isSearchingCatalog && (
              <Loader2 className="w-4 h-4 text-rose-600 animate-spin absolute left-3 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* Search Results List */}
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-2xs">
            {storeProducts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                {isSearchingCatalog
                  ? 'جاري البحث في منتجات المحل...'
                  : 'لا توجد منتجات مطابقة لبيانات البحث'}
              </div>
            ) : (
              storeProducts.map((p) => {
                const isAdded = returnItems.some(
                  (item) => item.productId === p.productId && item.variantId === p.variantId
                );
                return (
                  <div
                    key={`${p.productId}-${p.variantId}`}
                    className="p-2.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-xs gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{p.productName}</span>
                        <span className="text-slate-500 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                          {p.variantLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="font-mono font-bold text-rose-800">
                          السعر التلقائي: {formatMoney(p.defaultPrice)}
                        </span>
                        <span>المتوفر بالمخزن: {p.availableStock}</span>
                        {p.sku && <span className="font-mono text-slate-400">SKU: {p.sku}</span>}
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddFromCatalog(p)}
                      className={`text-xs h-7 px-3 gap-1 cursor-pointer font-bold shrink-0 ${
                        isAdded
                          ? 'bg-slate-800 hover:bg-slate-700 text-white'
                          : 'bg-rose-700 hover:bg-rose-600 text-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAdded ? 'إضافة قطعة أخرى' : 'إضافة للصنف'}</span>
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Optional Past Purchases Accordion */}
        {showPastPurchases && (
          <div className="space-y-2 bg-blue-50/50 p-3 rounded-2xl border border-blue-200/70">
            <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-600" />
              <span>مشتريات العميل من الطلبات السابقة:</span>
            </span>

            {isLoadingPast ? (
              <div className="p-3 bg-white border border-blue-200 rounded-xl text-center text-xs text-slate-400">
                جاري تحميل سجل مشتريات العميل...
              </div>
            ) : pastPurchases.length === 0 ? (
              <div className="p-3 bg-white border border-blue-200 rounded-xl text-center text-xs text-slate-500">
                لا توجد طلبات معتمدة سابقة لهذا العميل.
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-blue-200 rounded-xl divide-y divide-blue-100 bg-white shadow-2xs">
                {pastPurchases.map((p, idx) => (
                  <div
                    key={`${p.orderId}-${p.variantId}-${idx}`}
                    className="p-2 flex items-center justify-between hover:bg-blue-50/40 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{p.productName}</span>
                        <span className="text-slate-500 text-[11px]">({p.variantLabel})</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>الطلب: #{p.orderNumber}</span>
                        <span>السعر: {formatMoney(p.unitPrice)}</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddFromPast(p)}
                      className="text-xs h-6 px-2.5 gap-1 bg-blue-700 hover:bg-blue-600 text-white font-bold"
                    >
                      <Plus className="w-3 h-3" />
                      <span>إرجاع</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected Return Items Invoice Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-rose-600" />
              <span>الأصناف المضافة لفاتورة المردود ({returnItems.length})</span>
            </span>
            {totalItemsCount > 0 && (
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                إجمالي القطع: {totalItemsCount}
              </span>
            )}
          </div>

          {returnItems.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-rose-200/80 bg-rose-50/30 rounded-2xl text-center text-rose-800 text-xs space-y-1">
              <p className="font-bold">لم تقم بإضافة أي أصناف للفاتورة بعد</p>
              <p className="text-[11px] text-slate-500">
                ابحث عن منتج المحل أعلاه واضغط على "إضافة للصنف" لإدراجه تلقائياً مع سعره الافتراضي.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">الصنف / المتغير</th>
                    <th className="py-2.5 px-3 text-center w-36">الكمية المردودة (الافتراضي 1)</th>
                    <th className="py-2.5 px-3 text-center w-36">سعر الوحدة (تلقائي وقابل للتغيير)</th>
                    <th className="py-2.5 px-3 text-center w-28">الإجمالي الفرعي</th>
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
                          {item.orderId && (
                            <span className="text-[10px] text-blue-600 font-mono block">
                              (مرجع طلب سابق)
                            </span>
                          )}
                        </td>

                        {/* Quantity with + / - and direct input (default 1) */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDecrementQty(idx)}
                              className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-bold"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.maxQty}
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateQty(idx, parseInt(e.target.value, 10) || 1)
                              }
                              className="w-14 px-1 py-1 text-center font-mono font-bold rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-rose-600 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleIncrementQty(idx)}
                              className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-bold"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Unit Price (Auto-filled, Editable / Changeable) */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleUpdatePrice(idx, parseFloat(e.target.value) || 0)
                            }
                            className="w-28 px-2 py-1 text-center font-mono font-bold rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-rose-600 bg-white text-slate-900"
                            title="سعر الوحدة المرتجع - تلقائي وقابل للتعديل"
                          />
                        </td>

                        {/* Subtotal */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-900">
                          {formatMoney(subtotal)}
                        </td>

                        {/* Delete */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md transition-colors"
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

        {/* Reason / Notes */}
        <div className="space-y-1.5">
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

        {/* Impact Notice */}
        <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            عند اعتماد الفاتورة، سيتم تلقائيًا <strong>إضافة هذه الكميات إلى المخزون الفعلي والمتاح</strong>، و<strong>خصم قيمة المردود كقيد دائن من مديونية العميل</strong> في كشف حسابه فوراً.
          </p>
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
              فاتورة مردود مبيعات
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
