'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Loader2, Calendar, Hash, Trash2, Plus, Search, AlertCircle, Undo2 } from 'lucide-react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { formatMoney } from '@/core/domain/money';
import { toast } from '@/shared/ui/toast';
import { updatePurchaseReturnAction } from '../actions/purchasing.actions';
import { searchStoreProductsAction, type StoreProductReturnOption } from '@/features/accounting/actions/return.actions';
import type { PurchaseReturnItem } from '../domain/purchasing';

interface EditReturnItemState {
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_label: string;
  quantity: number;
  cost_price: number;
}

interface EditPurchaseReturnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  returnDoc: {
    id: string;
    return_number?: string;
    supplier_name?: string;
    supplier_id: string;
    total_amount: number;
    return_date?: string;
    createdAt?: string;
    reason?: string;
    items?: Array<{
      product_id: string;
      variant_id?: string;
      product_name?: string;
      variant_label?: string;
      quantity: number;
      cost_price: number;
    }>;
  } | null;
  supplierId: string;
  onSuccess?: () => void;
}

export function EditPurchaseReturnDialog({
  isOpen,
  onClose,
  returnDoc,
  supplierId,
  onSuccess,
}: EditPurchaseReturnDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [returnNumber, setReturnNumber] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<EditReturnItemState[]>([]);

  // Search state for adding new items
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StoreProductReturnOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    if (returnDoc) {
      setReturnNumber(returnDoc.return_number || '');
      setReason(returnDoc.reason || '');
      const rawDate = returnDoc.return_date || returnDoc.createdAt;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          setReturnDate(d.toISOString().slice(0, 10));
        } else {
          setReturnDate('');
        }
      } else {
        setReturnDate('');
      }

      setItems(
        (returnDoc.items || []).map((it) => ({
          product_id: it.product_id,
          variant_id: it.variant_id || 'default',
          product_name: it.product_name || 'صنف',
          variant_label: it.variant_label || '',
          quantity: Number(it.quantity || 1),
          cost_price: Number(it.cost_price || 0),
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
      (i) => i.product_id === prod.productId && i.variant_id === prod.variantId
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
          product_id: prod.productId,
          variant_id: prod.variantId,
          product_name: prod.productName,
          variant_label: prod.variantLabel !== '-' ? prod.variantLabel : '',
          quantity: 1,
          cost_price: prod.defaultPrice || 0,
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
      prev.map((it, idx) => (idx === index ? { ...it, cost_price: Math.max(0, val) } : it))
    );
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error('يجب أن تحتوي فاتورة المردود على صنف واحد على الأقل.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const newTotal = items.reduce((acc, it) => acc + it.quantity * it.cost_price, 0);
  const oldTotal = returnDoc.total_amount || 0;
  const deltaTotal = newTotal - oldTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!returnNumber.trim()) {
      toast.error('يرجى إدخال رقم سند المردود.');
      return;
    }

    if (items.length === 0) {
      toast.error('يرجى إضافة صنف واحد على الأقل للمردود.');
      return;
    }

    for (const it of items) {
      if (it.quantity <= 0) {
        toast.error(`الكمية للصنف ${it.product_name} يجب أن تكون أكبر من 0.`);
        return;
      }
      if (it.cost_price < 0) {
        toast.error(`سعر التكلفة للصنف ${it.product_name} لا يمكن أن يكون سالباً.`);
        return;
      }
    }

    startTransition(async () => {
      try {
        const payloadItems: PurchaseReturnItem[] = items.map((it) => ({
          product_id: it.product_id,
          variant_id: it.variant_id,
          product_name: it.product_name,
          variant_label: it.variant_label,
          quantity: it.quantity,
          cost_price: it.cost_price,
        }));

        const res = await updatePurchaseReturnAction({
          returnId: returnDoc.id,
          return_number: returnNumber.trim(),
          return_date: returnDate || undefined,
          reason: reason.trim() || null,
          items: payloadItems,
          supplierId,
        });

        if (res.ok) {
          toast.success('تم تعديل سند مردود المشتريات وإعادة تسوية المخزون والحساب بنجاح.');
          onSuccess?.();
          onClose();
        } else {
          toast.error(res.error?.message || 'فشل تعديل سند المردود.');
        }
      } catch (err: any) {
        toast.error(err.message || 'حدث خطأ أثناء تعديل سند المردود.');
      }
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`تعديل مردود مشتريات #${returnDoc.return_number || ''}`}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-right font-sans" dir="rtl">
        {/* Info Banner */}
        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5 text-xs text-rose-900 space-y-1">
          <div className="flex items-center gap-2 font-bold text-rose-950">
            <Undo2 className="w-4 h-4 text-rose-600 shrink-0" />
            <span>تعديل مردود المشتريات وإعادة التسوية الآلية</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            المورد: <strong className="text-slate-900">{returnDoc.supplier_name || 'مورد'}</strong>.
            عند تعديل الكميات أو الأسعار، سيقوم النظام تلقائياً بضبط رصيد المخزون المتوفر لكل صنف وقيد فارق الحساب في دفتر الأستاذ للمورد.
          </p>
        </div>

        {/* Header Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رقم سند المردود <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                required
                value={returnNumber}
                onChange={(e) => setReturnNumber(e.target.value)}
                className="text-xs h-9 font-mono pr-8"
                placeholder="RET-..."
              />
              <Hash className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ المردود</label>
            <div className="relative">
              <Input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
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
              placeholder="مثال: تالف أو زيادة عن الطلب"
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
                  <th className="py-2.5 px-3 w-28 text-center">الكمية المردودة</th>
                  <th className="py-2.5 px-3 w-32 text-center">سعر التكلفة</th>
                  <th className="py-2.5 px-3 w-28 text-center">الإجمالي</th>
                  <th className="py-2.5 px-2 w-10 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={`${item.product_id}-${item.variant_id}-${idx}`} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">{item.product_name}</span>
                      {item.variant_label && (
                        <span className="text-[10px] text-blue-600 font-bold block">
                          {item.variant_label}
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
                        value={item.cost_price}
                        onChange={(e) => handleItemPriceChange(idx, parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-center font-mono w-24 mx-auto"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                      {formatMoney(item.quantity * item.cost_price)}
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
              <span className="text-slate-700">فارق تسوية حساب المورد:</span>
              <span
                className={`font-mono ${
                  deltaTotal > 0 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {deltaTotal > 0 ? `+${formatMoney(deltaTotal)} (تخفيض إضافي لمديونية المورد)` : `${formatMoney(deltaTotal)} (إعادة دين للمورد)`}
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
