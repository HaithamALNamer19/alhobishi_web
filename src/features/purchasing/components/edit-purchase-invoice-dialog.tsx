'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Loader2, Calendar, Hash, Trash2, Plus, Search, AlertCircle } from 'lucide-react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { formatMoney } from '@/core/domain/money';
import { toast } from '@/shared/ui/toast';
import { updatePurchaseInvoiceAction } from '../actions/purchasing.actions';
import { searchStoreProductsAction, type StoreProductReturnOption } from '@/features/accounting/actions/return.actions';
import type { PurchaseItem } from '../domain/purchasing';

interface EditItemState {
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_label: string;
  quantity: number;
  cost_price: number;
}

interface EditPurchaseInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    id: string;
    invoice_number: string;
    supplier_name: string;
    total_amount: number;
    purchase_date?: string;
    createdAt?: string;
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

export function EditPurchaseInvoiceDialog({
  isOpen,
  onClose,
  invoice,
  supplierId,
  onSuccess,
}: EditPurchaseInvoiceDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [items, setItems] = useState<EditItemState[]>([]);

  // Search state for adding new items
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StoreProductReturnOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    if (invoice) {
      setInvoiceNumber(invoice.invoice_number || '');
      const rawDate = invoice.purchase_date || invoice.createdAt;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          setPurchaseDate(d.toISOString().slice(0, 10));
        } else {
          setPurchaseDate('');
        }
      } else {
        setPurchaseDate('');
      }

      setItems(
        (invoice.items || []).map((it) => ({
          product_id: it.product_id,
          variant_id: it.variant_id || 'default',
          product_name: it.product_name || 'صنف',
          variant_label: it.variant_label || '',
          quantity: Number(it.quantity || 1),
          cost_price: Number(it.cost_price || 0),
        }))
      );
    }
  }, [invoice]);

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

  if (!invoice) return null;

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

  const handleItemCostChange = (index: number, val: number) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, cost_price: Math.max(0, val) } : it))
    );
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error('يجب أن تحتوي الفاتورة على صنف واحد على الأقل.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const currentTotal = items.reduce((sum, it) => sum + it.quantity * it.cost_price, 0);
  const oldTotal = invoice.total_amount || 0;
  const balanceDiff = currentTotal - oldTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) {
      toast.error('يرجى إدخال رقم الفاتورة.');
      return;
    }
    if (items.length === 0) {
      toast.error('يجب إضافة صنف واحد على الأقل للفاتورة.');
      return;
    }

    startTransition(async () => {
      const res = await updatePurchaseInvoiceAction({
        purchaseId: invoice.id,
        invoice_number: invoiceNumber.trim(),
        purchase_date: purchaseDate ? purchaseDate : undefined,
        items: items.map((i) => ({
          product_id: i.product_id,
          variant_id: i.variant_id,
          product_name: i.product_name,
          variant_label: i.variant_label,
          quantity: i.quantity,
          cost_price: i.cost_price,
        })),
        supplierId,
      });

      if (!res.ok) {
        toast.error(res.error.message || 'فشل تعديل فاتورة الشراء.');
        return;
      }

      toast.success('تم حفظ تعديلات فاتورة الشراء وتسوية المخزون والحساب بنجاح.');
      onClose();
      if (onSuccess) onSuccess();
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="تعديل فاتورة الشراء والتوريد"
      description="تعديل بيانات الفاتورة والأصناف والكميات والأسعار مع تسوية رصيد المورد والمخزون آلياً."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 pt-2 text-right" dir="rtl">
        {/* Invoice Header Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs">
          <div>
            <span className="text-slate-500 font-medium block">المورد:</span>
            <span className="text-sm font-black text-slate-900 mt-0.5 block truncate">
              {invoice.supplier_name}
            </span>
          </div>
          <div>
            <label className="text-slate-600 font-bold block mb-1">رقم الفاتورة *</label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="رقم الفاتورة"
              className="text-xs font-mono font-bold h-8"
              required
            />
          </div>
          <div>
            <label className="text-slate-600 font-bold block mb-1">تاريخ الفاتورة</label>
            <Input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="text-xs font-mono h-8"
            />
          </div>
        </div>

        {/* Product Search & Quick Add */}
        <div className="space-y-1.5 relative">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-blue-600" />
            <span>إضافة صنف جديد للفاتورة</span>
          </label>
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="ابحث باسم المنتج أو الباركود لإضافته..."
              className="text-xs pr-8"
            />
            {isSearching && (
              <Loader2 className="w-3.5 h-3.5 animate-spin absolute left-2.5 top-2.5 text-slate-400" />
            )}
          </div>

          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
              {searchResults.map((prod) => (
                <button
                  key={`${prod.productId}-${prod.variantId}`}
                  type="button"
                  onClick={() => handleAddItem(prod)}
                  className="w-full p-2.5 text-right hover:bg-blue-50/70 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <span className="font-bold text-slate-900 block group-hover:text-blue-700">
                      {prod.productName}
                    </span>
                    {prod.variantLabel && prod.variantLabel !== '-' && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        الخيار: {prod.variantLabel}
                      </span>
                    )}
                  </div>
                  <span className="text-blue-700 font-mono font-bold text-[11px] bg-blue-50 px-2 py-0.5 rounded-md">
                    + إضافة
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              بنود الفاتورة ({items.length} أصناف):
            </span>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">الصنف والخيار</th>
                    <th className="py-2.5 px-2 text-center w-24">الكمية</th>
                    <th className="py-2.5 px-2 text-center w-28">سعر التكلفة</th>
                    <th className="py-2.5 px-3 text-left w-28">الإجمالي</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => {
                    const subtotal = it.quantity * it.cost_price;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2 px-3 font-medium text-slate-900">
                          <span className="block truncate max-w-xs">{it.product_name}</span>
                          {it.variant_label && (
                            <span className="text-[10px] text-slate-500 block">
                              {it.variant_label}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => handleItemQuantityChange(idx, Number(e.target.value))}
                            className="h-7 text-xs text-center font-mono font-bold w-20 mx-auto"
                            required
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={it.cost_price}
                            onChange={(e) => handleItemCostChange(idx, Number(e.target.value))}
                            className="h-7 text-xs text-center font-mono font-bold w-24 mx-auto"
                            required
                          />
                        </td>
                        <td className="py-2 px-3 text-left font-mono font-bold text-slate-900">
                          {formatMoney(subtotal)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="حذف البند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Financial Summary & Balance Delta Preview */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">الإجمالي السابق للفاتورة:</span>
            <span className="font-mono font-bold text-slate-700">{formatMoney(oldTotal)}</span>
          </div>
          <div>
            <span className="text-blue-900 font-bold block text-[11px]">الإجمالي الجديد:</span>
            <span className="text-sm font-black font-mono text-blue-700">
              {formatMoney(currentTotal)}
            </span>
          </div>
          <div className="border-r border-blue-200 pr-3">
            <span className="text-slate-500 block text-[11px]">التأثير على حساب المورد:</span>
            <span
              className={`font-mono font-bold ${
                balanceDiff > 0
                  ? 'text-emerald-700'
                  : balanceDiff < 0
                  ? 'text-rose-700'
                  : 'text-slate-500'
              }`}
            >
              {balanceDiff > 0 ? `+${formatMoney(balanceDiff)} (زيادة دائنية)` : balanceDiff < 0 ? `${formatMoney(balanceDiff)} (نقص دائنية)` : 'لا تغيير'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="text-xs"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="text-xs bg-blue-700 hover:bg-blue-800 text-white font-bold"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />}
            <span>حفظ التعديلات وتسوية المخزون</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
