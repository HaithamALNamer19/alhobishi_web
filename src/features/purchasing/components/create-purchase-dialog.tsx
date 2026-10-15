'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Receipt,
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
import { createPurchaseInvoiceAction } from '../actions/purchasing.actions';
import { QuickCreateProductDialog } from './quick-create-product-dialog';
import type { SerializedSupplier } from './suppliers-manager';
import type { PurchaseItem } from '../domain/purchasing';

interface CreatePurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: SerializedSupplier[];
  preselectedSupplierId?: string | null;
  onSuccess?: () => void;
}

export function CreatePurchaseDialog({
  isOpen,
  onClose,
  suppliers = [],
  preselectedSupplierId,
  onSuccess,
}: CreatePurchaseDialogProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(preselectedSupplierId || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Product Search State
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StoreProductReturnOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);

  // Active item staging before adding
  const [activeProduct, setActiveProduct] = useState<StoreProductReturnOption | null>(null);
  const [activeQty, setActiveQty] = useState(1);
  const [activeCostPrice, setActiveCostPrice] = useState(0);

  // Items in current draft invoice
  const [invoiceItems, setInvoiceItems] = useState<PurchaseItem[]>([]);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      if (preselectedSupplierId) {
        setSelectedSupplierId(preselectedSupplierId);
      } else if (suppliers.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(suppliers[0].id);
      }
      setInvoiceNumber('');
      setProductSearchQuery('');
      setSearchResults([]);
      setActiveProduct(null);
      setActiveQty(1);
      setActiveCostPrice(0);
      setInvoiceItems([]);
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
    // Suggest defaultPrice or 0
    setActiveCostPrice(prod.defaultPrice || 0);
    setProductSearchQuery('');
    setSearchResults([]);
  };

  const handleQuickProductCreated = ({
    product,
    suggestedCostPrice,
  }: {
    product: any;
    suggestedCostPrice: number;
  }) => {
    const defaultVariant = product.variants?.[0];
    const varId = defaultVariant?.id || 'default';
    const varLabel = defaultVariant?.label || 'الافتراضي';

    const option: StoreProductReturnOption = {
      productId: product.id,
      productName: product.name,
      variantId: varId,
      variantLabel: varLabel,
      defaultPrice: suggestedCostPrice > 0 ? suggestedCostPrice : (product.retailPrice || 0),
      availableStock: 0,
      sku: defaultVariant?.sku || product.sku || null,
      barcode: defaultVariant?.barcode || product.barcode || null,
    };

    setActiveProduct(option);
    setActiveQty(1);
    setActiveCostPrice(suggestedCostPrice > 0 ? suggestedCostPrice : (product.retailPrice || 0));
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
    // Check if item already exists in draft
    const existingIndex = invoiceItems.findIndex(
      (it) => it.product_id === activeProduct.productId && (it.variant_id || 'default') === varId
    );
    if (existingIndex >= 0) {
      const updated = [...invoiceItems];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].cost_price = cost;
      setInvoiceItems(updated);
    } else {
      setInvoiceItems((prev) => [
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
    toast.success(`تمت إضافة "${activeProduct.productName}" إلى الفاتورة.`);
  };

  const handleRemoveItem = (index: number) => {
    setInvoiceItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const totalAmount = invoiceItems.reduce(
    (sum, item) => sum + item.quantity * item.cost_price,
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error('يرجى اختيار المورد.');
      return;
    }
    if (invoiceItems.length === 0) {
      toast.error('يرجى إضافة صنف واحد على الأقل للفاتورة.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createPurchaseInvoiceAction({
          supplier_id: selectedSupplierId,
          invoice_number: invoiceNumber.trim() || undefined,
          purchase_date: purchaseDate,
          items: invoiceItems,
        });

        if (!res.ok) {
          toast.error(res.error.message || 'فشل حفظ فاتورة الشراء.');
          return;
        }

        toast.success(`تم حفظ فاتورة الشراء #${res.data.invoiceNumber} وزيادة رصيد المخزون بنجاح!`);
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
            <span className="p-2.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-200">
              <Receipt className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900">إنشاء فاتورة شراء وتوريد جديدة</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                إدخال بضائع المورد، زيادة رصيد المخزون تلقائياً وقيد المستحقات المالية
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

        {/* Invoice Info Bar (Supplier, Invoice Number, Date) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">المورد *</label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
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
              رقم الفاتورة (أو اتركه لتوليد تسلسلي تلقائي)
            </label>
            <input
              type="text"
              placeholder="مثال: INV-9900 أو اتركه فارغاً"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الشراء والتوريد *</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
              required
            />
          </div>
        </div>

        {/* Product Search & Staging Box */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200/70 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              البحث عن صنف وإضافته للفاتورة:
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsQuickProductOpen(true)}
              className="h-7 px-2.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 font-bold gap-1 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة منتج جديد</span>
            </Button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="اكتب اسم المنتج أو الصنف للبحث والإضافة (حرفين على الأقل)..."
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              className="w-full pr-9 pl-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute left-3 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* No Results Fallback with Shortcut */}
          {!isSearching && productSearchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  لم يتم العثور على أي صنف باسم: <strong>&quot;{productSearchQuery}&quot;</strong>
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsQuickProductOpen(true)}
                className="h-7 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة كمنتج جديد الآن</span>
              </Button>
            </div>
          )}

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white shadow-lg text-xs">
              {searchResults.map((prod) => (
                <div
                  key={`${prod.productId}-${prod.variantId}`}
                  onClick={() => handleSelectProduct(prod)}
                  className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900">{prod.productName}</span>
                      {prod.variantLabel && (
                        <span className="text-[11px] text-slate-500 mr-1.5">
                          ({prod.variantLabel})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-slate-400 text-[10px] block">
                      المخزون الحالي: {prod.availableStock}
                    </span>
                    <span className="text-blue-700 font-bold">
                      {formatMoney(prod.defaultPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active Selected Product Staging Form */}
          {activeProduct && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 block">{activeProduct.productName}</span>
                  <span className="text-[11px] text-slate-500">
                    المخزون الحالي: {activeProduct.availableStock} قطعة
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">الكمية المشتراة:</label>
                  <input
                    type="number"
                    min="1"
                    value={activeQty}
                    onChange={(e) => setActiveQty(Number(e.target.value) || 1)}
                    className="w-20 p-1.5 text-center font-mono font-bold rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">سعر التكلفة (ر.ي):</label>
                  <input
                    type="number"
                    min="0"
                    value={activeCostPrice}
                    onChange={(e) => setActiveCostPrice(Number(e.target.value) || 0)}
                    className="w-28 p-1.5 text-center font-mono font-bold rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div className="self-end">
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 px-3 text-xs rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    إضافة
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Items Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 font-bold text-xs text-slate-700 border-b border-slate-200 flex items-center justify-between">
            <span>الأصناف المدرجة في الفاتورة ({invoiceItems.length})</span>
            <span className="font-mono text-blue-700 font-bold">
              إجمالي القطع: {invoiceItems.reduce((sum, it) => sum + it.quantity, 0)}
            </span>
          </div>

          {invoiceItems.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              لم تتم إضافة أي أصناف إلى الفاتورة بعد. ابحث عن منتج أعلاه وأضفه.
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">م</th>
                  <th className="py-2.5 px-3">اسم الصنف</th>
                  <th className="py-2.5 px-3 text-center w-24">الكمية</th>
                  <th className="py-2.5 px-3 text-center w-28">سعر التكلفة</th>
                  <th className="py-2.5 px-3 text-center w-32">الإجمالي الفرعي</th>
                  <th className="py-2.5 px-3 text-center w-12">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoiceItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{item.product_name}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{formatMoney(item.cost_price)}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-950">
                      {formatMoney(item.quantity * item.cost_price)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                        title="حذف الصنف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Invoice Summary & Tafqeet */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">الإجمالي الكلي للفاتورة:</span>
            <div className="text-xl font-black font-mono text-white mt-0.5">
              {formatMoney(totalAmount)}
            </div>
            <span className="text-blue-300 text-[11px] block mt-0.5 font-medium">
              {tafqeetRials(totalAmount)}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || invoiceItems.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 px-5"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>حفظ الفاتورة وقيد المخزون</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Create Product Dialog */}
      <QuickCreateProductDialog
        isOpen={isQuickProductOpen}
        onClose={() => setIsQuickProductOpen(false)}
        initialName={productSearchQuery.trim()}
        onSuccess={handleQuickProductCreated}
      />
    </Dialog>
  );
}
