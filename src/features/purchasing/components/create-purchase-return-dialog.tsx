'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Undo2,
  Search,
  Plus,
  Trash2,
  Package,
  Building2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  Calendar,
} from 'lucide-react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { searchStoreProductsAction, type StoreProductReturnOption } from '@/features/accounting/actions/return.actions';
import { createPurchaseReturnAction } from '../actions/purchasing.actions';
import type { SerializedSupplier } from './suppliers-manager';
import type { PurchaseReturnItem } from '../domain/purchasing';

interface CreatePurchaseReturnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: SerializedSupplier[];
  preselectedSupplierId?: string | null;
  onSuccess?: () => void;
}

export function CreatePurchaseReturnDialog({
  isOpen,
  onClose,
  suppliers = [],
  preselectedSupplierId,
  onSuccess,
}: CreatePurchaseReturnDialogProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(preselectedSupplierId || '');
  const [purchaseInvoiceRef, setPurchaseInvoiceRef] = useState('');
  const [returnDate, setReturnDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Product Search State
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StoreProductReturnOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Active item staging before adding
  const [activeProduct, setActiveProduct] = useState<StoreProductReturnOption | null>(null);
  const [activeQty, setActiveQty] = useState(1);
  const [activeCostPrice, setActiveCostPrice] = useState(0);

  // Items in current draft return
  const [returnItems, setReturnItems] = useState<PurchaseReturnItem[]>([]);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      if (preselectedSupplierId) {
        setSelectedSupplierId(preselectedSupplierId);
      } else if (suppliers.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(suppliers[0].id);
      }
      setPurchaseInvoiceRef('');
      setProductSearchQuery('');
      setSearchResults([]);
      setActiveProduct(null);
      setActiveQty(1);
      setActiveCostPrice(0);
      setReturnItems([]);
    }
  }, [isOpen, preselectedSupplierId, suppliers]);

  // Debounced product search (>= 2 chars)
  useEffect(() => {
    const q = productSearchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchStoreProductsAction({ query: q });
        if (res.ok) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [productSearchQuery]);

  const handleSelectProduct = (prod: StoreProductReturnOption) => {
    setActiveProduct(prod);
    setActiveQty(1);
    setActiveCostPrice(prod.defaultPrice || 0);
    setProductSearchQuery('');
    setSearchResults([]);
  };

  const handleAddItem = () => {
    if (!activeProduct) return;
    const qty = parseInt(String(activeQty), 10);
    const cost = parseFloat(String(activeCostPrice));

    if (isNaN(qty) || qty <= 0) {
      toast.error('يرجى إدخال كمية صحيحة.');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      toast.error('يرجى إدخال سعر تكلفة صحيح.');
      return;
    }

    const varId = activeProduct.variantId || 'default';
    const existingIndex = returnItems.findIndex(
      (it) => it.product_id === activeProduct.productId && (it.variant_id || 'default') === varId
    );
    if (existingIndex >= 0) {
      const updated = [...returnItems];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].cost_price = cost;
      setReturnItems(updated);
    } else {
      setReturnItems((prev) => [
        ...prev,
        {
          product_id: activeProduct.productId,
          variant_id: varId,
          variant_label: activeProduct.variantLabel || undefined,
          product_name: activeProduct.variantLabel && activeProduct.variantLabel !== 'الافتراضي'
            ? `${activeProduct.productName} (${activeProduct.variantLabel})`
            : activeProduct.productName,
          quantity: qty,
          cost_price: cost,
        },
      ]);
    }

    setActiveProduct(null);
    setActiveQty(1);
    setActiveCostPrice(0);
    toast.success(`تمت إضافة "${activeProduct.productName}" إلى مردود المشتريات.`);
  };

  const handleRemoveItem = (index: number) => {
    setReturnItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const totalAmount = returnItems.reduce(
    (sum, item) => sum + item.quantity * item.cost_price,
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error('يرجى اختيار المورد.');
      return;
    }
    if (returnItems.length === 0) {
      toast.error('يرجى إضافة صنف واحد على الأقل لمردود المشتريات.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createPurchaseReturnAction({
          supplier_id: selectedSupplierId,
          purchase_id: purchaseInvoiceRef.trim() || undefined,
          return_date: returnDate,
          items: returnItems,
        });

        if (!res.ok) {
          toast.error(res.error.message || 'فشل حفظ مردود المشتريات.');
          return;
        }

        toast.success(`تم حفظ مردود المشتريات #${res.data.returnNumber} وخصم المخزون بنجاح!`);
        onClose();
        if (onSuccess) onSuccess();
      } catch (err: any) {
        toast.error(err?.message || 'حدث خطأ أثناء الحفظ.');
      }
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="4xl" hideCloseButton>
      <div className="space-y-5 text-right font-sans" dir="rtl">
        {/* Header */}
        <div className="sticky -top-5 sm:-top-6 -mt-5 sm:-mt-6 -mx-5 sm:-mx-6 px-5 sm:px-6 py-3.5 bg-white/95 backdrop-blur-xs border-b border-slate-200 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200">
              <Undo2 className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900">إنشاء فاتورة مردود مشتريات</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                إرجاع بضاعة إلى المورد، خصم الكمية من المخزون وتخفيض مديونية/حساب المورد
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Return Details Bar (Supplier, Return Date, Ref) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">المورد *</label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 font-bold focus:ring-2 focus:ring-rose-600 focus:outline-none"
              required
            >
              <option value="">-- اختر المورد --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.company_name ? `(${s.company_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رقم فاتورة الشراء الأصلية (اختياري)
            </label>
            <input
              type="text"
              placeholder="مثال: PUR-2026-0001"
              value={purchaseInvoiceRef}
              onChange={(e) => setPurchaseInvoiceRef(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-rose-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الإرجاع</label>
            <div className="relative">
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-rose-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Product Autocomplete Search Section */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <label className="block text-xs font-bold text-slate-800">
            البحث عن صنف لإرجاعه إلى المورد:
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="اكتب اسم الصنف أو الباركود (حرفين على الأقل)..."
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              className="pr-10 text-xs rounded-xl"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-rose-600 animate-spin absolute left-3.5 top-1/2 -translate-y-1/2" />
            )}

            {/* Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-1.5 right-0 left-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map((prod) => (
                  <button
                    key={`${prod.productId}-${prod.variantId || 'main'}`}
                    type="button"
                    onClick={() => handleSelectProduct(prod)}
                    className="w-full text-right p-3 hover:bg-rose-50/50 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-rose-700">
                        {prod.productName}
                        {prod.variantLabel && (
                          <span className="text-[11px] font-normal text-slate-500 mr-1.5">
                            ({prod.variantLabel})
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        رصيد المخزون المتوفر: <span className="font-bold text-slate-700">{prod.availableStock}</span> | السعر الافتراضي: {formatMoney(prod.defaultPrice)}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                      اختيار
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Staging selected product */}
          {activeProduct && (
            <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-rose-700 shrink-0" />
                <div>
                  <p className="text-xs font-black text-rose-950">
                    {activeProduct.productName}
                    {activeProduct.variantLabel && ` (${activeProduct.variantLabel})`}
                  </p>
                  <p className="text-[11px] text-rose-800/80">
                    رصيد المخزون الحالي: {activeProduct.availableStock}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-24">
                  <label className="block text-[10px] font-bold text-rose-900 mb-0.5">الكمية المرجعة</label>
                  <Input
                    type="number"
                    min="1"
                    value={activeQty}
                    onChange={(e) => setActiveQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="text-xs h-9 bg-white text-center font-bold"
                  />
                </div>

                <div className="w-28">
                  <label className="block text-[10px] font-bold text-rose-900 mb-0.5">سعر التكلفة (ر.ي)</label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={activeCostPrice}
                    onChange={(e) => setActiveCostPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="text-xs h-9 bg-white text-center font-bold"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 px-4 rounded-xl font-bold flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selected Items Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>قائمة الأصناف المرجعة في الفاتورة ({returnItems.length})</span>
            {returnItems.length > 0 && (
              <span className="text-rose-600">
                الإجمالي: {formatMoney(totalAmount)}
              </span>
            )}
          </div>

          {returnItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>لم يتم إضافة أي أصناف لمردود المشتريات بعد.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ابحث عن الصنف في الحقل أعلاه وأدخله في القائمة.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-56 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-100 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">الصنف</th>
                    <th className="py-2.5 px-3 text-center">الكمية</th>
                    <th className="py-2.5 px-3 text-center">سعر التكلفة</th>
                    <th className="py-2.5 px-3 text-left">الإجمالي الفرعي</th>
                    <th className="py-2.5 px-3 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {returnItems.map((item, idx) => {
                    const subtotal = item.quantity * item.cost_price;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {item.product_name}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = Math.max(1, parseInt(e.target.value, 10) || 1);
                              const updated = [...returnItems];
                              updated[idx].quantity = newQty;
                              setReturnItems(updated);
                            }}
                            className="w-16 text-center border border-slate-200 rounded-lg p-1 text-xs font-bold"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.cost_price}
                            onChange={(e) => {
                              const newCost = Math.max(0, parseFloat(e.target.value) || 0);
                              const updated = [...returnItems];
                              updated[idx].cost_price = newCost;
                              setReturnItems(updated);
                            }}
                            className="w-20 text-center border border-slate-200 rounded-lg p-1 text-xs font-bold"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-left font-black text-rose-700">
                          {formatMoney(subtotal)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
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

        {/* Invoice Summary & Tafqeet */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">إجمالي قيمة المردود:</span>
            <div className="text-2xl font-black text-rose-400 tracking-tight">
              {formatMoney(totalAmount)}
            </div>
            <p className="text-xs text-slate-300 mt-1 font-sans">
              فقط: {tafqeetRials(totalAmount)}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="text-xs rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || returnItems.length === 0}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl px-5 h-10 shadow-lg shadow-rose-900/40 flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ والخصم...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ المردود وتحديث المخزون</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
