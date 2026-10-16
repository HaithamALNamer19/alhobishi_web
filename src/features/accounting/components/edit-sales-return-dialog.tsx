'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Loader2, Calendar, Hash, Trash2, Plus, Search, RotateCcw, AlertCircle } from 'lucide-react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { formatMoney } from '@/core/domain/money';
import { toast } from '@/shared/ui/toast';
import { updateSalesReturnAction, searchStoreProductsAction, type StoreProductReturnOption, type SerializedReturnDetail } from '../actions/return.actions';

interface EditSalesReturnItemState {
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
}

interface EditSalesReturnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  returnDoc: SerializedReturnDetail | null;
  onSuccess?: () => void;
}

export function EditSalesReturnDialog({
  isOpen,
  onClose,
  returnDoc,
  onSuccess,
}: EditSalesReturnDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [returnNumber, setReturnNumber] = useState('');
  const [createdAtDate, setCreatedAtDate] = useState('');
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<EditSalesReturnItemState[]>([]);

  // Search state for adding new items
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StoreProductReturnOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    if (returnDoc) {
      setReturnNumber(returnDoc.returnNumber || '');
      setReason(returnDoc.reason || '');
      if (returnDoc.createdAt) {
        const d = new Date(returnDoc.createdAt);
        if (!isNaN(d.getTime())) {
          setCreatedAtDate(d.toISOString().slice(0, 10));
        } else {
          setCreatedAtDate('');
        }
      } else {
        setCreatedAtDate('');
      }

      setItems(
        (returnDoc.items || []).map((it) => ({
          productId: it.productId,
          variantId: it.variantId || 'default',
          productName: it.productName || 'صنف',
          variantLabel: it.variantLabel !== '-' ? it.variantLabel : '',
          quantity: Number(it.quantity || 1),
          unitPrice: Number(it.unitPrice || 0),
        }))
      );
    }
  }, [returnDoc]);

  // Search for store products to add
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchStoreProductsAction({ query: searchQuery.trim() });
        if (res.ok && res.data) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!returnDoc) return null;

  const handleAddItem = (prod: StoreProductReturnOption) => {
    const existingIdx = items.findIndex(
      (i) => i.productId === prod.productId && i.variantId === prod.variantId
    );

    if (existingIdx >= 0) {
      setItems((prev) =>
        prev.map((i, idx) =>
          idx === existingIdx ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: prod.productId,
          variantId: prod.variantId,
          productName: prod.productName,
          variantLabel: prod.variantLabel !== '-' ? prod.variantLabel : '',
          quantity: 1,
          unitPrice: prod.defaultPrice || 0,
        },
      ]);
    }

    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleItemQuantityChange = (index: number, val: number) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, quantity: Math.max(1, val) } : it))
    );
  };

  const handleItemPriceChange = (index: number, val: number) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, unitPrice: Math.max(0, val) } : it))
    );
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error('يجب أن تحتوي فاتورة المردود على صنف واحد على الأقل.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const newTotal = items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
  const oldTotal = returnDoc.totalAmount || 0;
  const deltaTotal = newTotal - oldTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!returnNumber.trim()) {
      toast.error('يرجى إدخال رقم فاتورة المردود.');
      return;
    }

    if (items.length === 0) {
      toast.error('يرجى إضافة صنف واحد على الأقل للمردود.');
      return;
    }

    for (const it of items) {
      if (it.quantity <= 0) {
        toast.error(`الكمية للصنف ${it.productName} يجب أن تكون أكبر من 0.`);
        return;
      }
      if (it.unitPrice < 0) {
        toast.error(`السعر للصنف ${it.productName} لا يمكن أن يكون سالباً.`);
        return;
      }
    }

    startTransition(async () => {
      try {
        const res = await updateSalesReturnAction({
          returnId: returnDoc.id,
          returnNumber: returnNumber.trim(),
          createdAt: createdAtDate || undefined,
          reason: reason.trim() || null,
          items: items.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            variantId: it.variantId,
            variantLabel: it.variantLabel || '-',
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
        });

        if (res.ok) {
          toast.success('تم تعديل فاتورة مردود المبيعات وإعادة تسوية المخزون ورصيد العميل بنجاح.');
          onSuccess?.();
          onClose();
        } else {
          toast.error(res.error?.message || 'فشل تعديل فاتورة مردود المبيعات.');
        }
      } catch (err: any) {
        toast.error(err.message || 'حدث خطأ أثناء تعديل فاتورة المردود.');
      }
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`تعديل فاتورة مردود مبيعات #${returnDoc.returnNumber}`}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-right font-sans" dir="rtl">
        {/* Info Banner */}
        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5 text-xs text-rose-900 space-y-1">
          <div className="flex items-center gap-2 font-bold text-rose-950">
            <RotateCcw className="w-4 h-4 text-rose-600 shrink-0" />
            <span>تعديل مردود المبيعات وإعادة التسوية الآلية</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            العميل: <strong className="text-slate-900">{returnDoc.customerName}</strong>.
            عند تعديل الكميات، سيتم تحديث رصيد المخزون المتوفر تلقائياً وتسجيل فارق المبلغ في دفتر الأستاذ وحساب العميل.
          </p>
        </div>

        {/* Header Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رقم فاتورة المردود <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                required
                value={returnNumber}
                onChange={(e) => setReturnNumber(e.target.value)}
                className="text-xs h-9 font-mono pr-8"
                placeholder="SR-..."
              />
              <Hash className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ المردود</label>
            <div className="relative">
              <Input
                type="date"
                value={createdAtDate}
                onChange={(e) => setCreatedAtDate(e.target.value)}
                className="text-xs h-9 font-mono pr-8"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">سبب المردود / ملاحظات</label>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs h-9"
              placeholder="مثال: استبدال أو استرجاع من العميل"
            />
          </div>
        </div>

        {/* Add Product Search */}
        <div className="space-y-1.5 relative">
          <label className="block text-xs font-bold text-slate-700">إضافة صنف إلى المردود</label>
          <div className="relative">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="ابحث بالاسم أو الباركود أو SKU لإضافة صنف جديد..."
              className="text-xs h-9 pr-8"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute left-2.5 top-2.5" />
            )}
          </div>

          {/* Search Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
              {searchResults.map((prod) => (
                <button
                  key={`${prod.productId}-${prod.variantId}`}
                  type="button"
                  onClick={() => handleAddItem(prod)}
                  className="w-full p-2.5 text-right hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{prod.productName}</span>
                    {prod.variantLabel && prod.variantLabel !== '-' && (
                      <span className="text-[10px] text-blue-600 font-bold block">
                        الخيار: {prod.variantLabel}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      المخزون المتوفر: {prod.availableStock} | السعر: {formatMoney(prod.defaultPrice)}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-lg flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    إضافة
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              بنود المردود ({items.length} صنف)
            </span>
            <span className="text-[11px] text-slate-500">
              إجمالي القطع: {items.reduce((s, it) => s + (it.quantity || 0), 0)}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/70 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">الصنف</th>
                  <th className="py-2.5 px-3 w-28 text-center">الكمية المسترجعة</th>
                  <th className="py-2.5 px-3 w-32 text-center">سعر الوحدة</th>
                  <th className="py-2.5 px-3 w-28 text-center">الإجمالي</th>
                  <th className="py-2.5 px-2 w-10 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={`${item.productId}-${item.variantId}-${idx}`} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">{item.productName}</span>
                      {item.variantLabel && (
                        <span className="text-[10px] text-blue-600 font-bold block">
                          {item.variantLabel}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemQuantityChange(idx, parseInt(e.target.value) || 1)}
                        className="h-8 text-xs text-center font-mono font-bold w-20 mx-auto"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => handleItemPriceChange(idx, parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-center font-mono w-24 mx-auto"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                      {formatMoney(item.quantity * item.unitPrice)}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="حذف الصنف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary & Delta Preview */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-bold">إجمالي المردود السابق:</span>
            <span className="font-mono text-slate-500">{formatMoney(oldTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-900 font-bold">إجمالي المردود بعد التعديل:</span>
            <span className="font-mono font-black text-base text-rose-700">
              {formatMoney(newTotal)}
            </span>
          </div>
          {deltaTotal !== 0 && (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 font-bold">
              <span className="text-slate-700">فارق تسوية حساب العميل:</span>
              <span
                className={`font-mono ${
                  deltaTotal > 0 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {deltaTotal > 0 ? `+${formatMoney(deltaTotal)} (تخفيض إضافي لمديونية العميل)` : `${formatMoney(deltaTotal)} (إعادة مديونية على العميل)`}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="text-xs h-9 px-4"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={isPending || items.length === 0}
            className="text-xs h-9 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الحفظ والتسوية...</span>
              </>
            ) : (
              <span>حفظ التعديلات والتسوية</span>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
