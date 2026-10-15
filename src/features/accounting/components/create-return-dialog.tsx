'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import {
  RotateCcw,
  Search,
  Plus,
  Trash2,
  Package,
  User,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  CreditCard,
  FileText,
} from 'lucide-react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import {
  searchStoreProductsAction,
  searchStoreCustomersAction,
  createSalesReturnAction,
  type StoreProductReturnOption,
  type StoreCustomerOption,
} from '../actions/return.actions';

export type CustomerOption = StoreCustomerOption;

export interface InvoiceDraftItem {
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
}

interface CreateReturnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCustomer?: CustomerOption | null;
  customers?: CustomerOption[];
  onSuccess?: (result: { returnId: string; returnNumber: string }) => void;
}

export function CreateReturnDialog({
  isOpen,
  onClose,
  preselectedCustomer,
  customers = [],
  onSuccess,
}: CreateReturnDialogProps) {
  // Customer selection
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(
    preselectedCustomer || null
  );
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerOption[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  // Search products
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StoreProductReturnOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Active selected product before adding to invoice
  const [activeProduct, setActiveProduct] = useState<StoreProductReturnOption | null>(null);
  const [activeQty, setActiveQty] = useState(1);
  const [activePrice, setActivePrice] = useState(0);

  // Invoice items
  const [invoiceItems, setInvoiceItems] = useState<InvoiceDraftItem[]>([]);
  const [reason, setReason] = useState('');

  // Submission transition
  const [isPending, startTransition] = useTransition();

  // Reset or initialize when modal opens/changes
  useEffect(() => {
    if (isOpen) {
      setSelectedCustomer(preselectedCustomer || null);
      setCustomerSearchQuery('');
      setCustomerSearchResults([]);
      setIsSearchingCustomer(false);
      setProductSearchQuery('');
      setSearchResults([]);
      setActiveProduct(null);
      setActiveQty(1);
      setActivePrice(0);
      setInvoiceItems([]);
      setReason('');
    }
  }, [isOpen, preselectedCustomer]);

  // Debounced customer search: hidden by default, results appear ONLY when searching (>= 2 chars)
  useEffect(() => {
    const q = customerSearchQuery.trim();
    if (q.length < 2) {
      setCustomerSearchResults([]);
      setIsSearchingCustomer(false);
      return;
    }

    setIsSearchingCustomer(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchStoreCustomersAction({ query: q });
        if (res.ok && res.data.length > 0) {
          setCustomerSearchResults(res.data);
        } else {
          // Fallback search within provided customers list if available
          const normQ = q.toLowerCase();
          const matches = (customers || []).filter(
            (c) =>
              c.displayName.toLowerCase().includes(normQ) ||
              (c.phone || '').includes(q)
          );
          setCustomerSearchResults(matches);
        }
      } catch {
        const normQ = q.toLowerCase();
        const matches = (customers || []).filter(
          (c) =>
            c.displayName.toLowerCase().includes(normQ) ||
            (c.phone || '').includes(q)
        );
        setCustomerSearchResults(matches);
      } finally {
        setIsSearchingCustomer(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearchQuery, customers]);

  // Debounced product search
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
        const res = await searchStoreProductsAction({
          query: q,
          customerRole: selectedCustomer?.role,
        });

        if (res.ok) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [productSearchQuery, selectedCustomer?.role]);

  // Handle selecting product from search list
  const handleSelectProduct = (option: StoreProductReturnOption) => {
    setActiveProduct(option);
    setActiveQty(1);
    setActivePrice(option.defaultPrice);
  };

  // Add active product to draft invoice
  const handleAddItemToInvoice = () => {
    if (!activeProduct) return;
    if (activeQty <= 0) {
      toast.error('الكمية يجب أن تكون 1 أو أكثر.');
      return;
    }
    if (activePrice < 0) {
      toast.error('السعر لا يمكن أن يكون سالباً.');
      return;
    }

    setInvoiceItems((prev) => {
      // Check if already in invoice
      const existingIdx = prev.findIndex(
        (i) => i.productId === activeProduct.productId && i.variantId === activeProduct.variantId
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + activeQty,
          unitPrice: activePrice, // update price to current configured price
        };
        return updated;
      }

      return [
        ...prev,
        {
          productId: activeProduct.productId,
          productName: activeProduct.productName,
          variantId: activeProduct.variantId,
          variantLabel: activeProduct.variantLabel,
          quantity: activeQty,
          unitPrice: activePrice,
        },
      ];
    });

    toast.success(`تمت إضافة "${activeProduct.productName}" إلى الفاتورة`);

    // Reset active product & search query to quickly search next item
    setActiveProduct(null);
    setActiveQty(1);
    setActivePrice(0);
    setProductSearchQuery('');
    setSearchResults([]);
  };

  // Remove item from draft invoice
  const handleRemoveItem = (index: number) => {
    setInvoiceItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update item quantity in invoice table
  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setInvoiceItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  // Update item unit price in invoice table
  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    setInvoiceItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], unitPrice: newPrice };
      return updated;
    });
  };

  // Totals calculations
  const totalAmount = invoiceItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalUnits = invoiceItems.reduce((sum, item) => sum + item.quantity, 0);

  // Submit Sales Return
  const handleSubmitReturn = () => {
    if (!selectedCustomer) {
      toast.error('يرجى تحديد العميل أولاً.');
      return;
    }
    if (invoiceItems.length === 0) {
      toast.error('يرجى إضافة صنف واحد على الأقل للمردود.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createSalesReturnAction({
          customerId: selectedCustomer.uid,
          items: invoiceItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            variantId: item.variantId,
            variantLabel: item.variantLabel,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          reason: reason.trim() || null,
        });

        if (!res.ok) {
          toast.error(res.error.message || 'فشل تسجيل فاتورة مردود المبيعات.');
          return;
        }

        toast.success(`تم تسجيل فاتورة المردود رقم ${res.data.returnNumber} بنجاح!`);
        onClose();
        if (onSuccess) {
          onSuccess({
            returnId: res.data.returnId,
            returnNumber: res.data.returnNumber,
          });
        }
      } catch (err: any) {
        toast.error(err.message || 'حدث خطأ غير متوقع أثناء الحفظ.');
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
              <RotateCcw className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900">إنشاء فاتورة مردود مبيعات جديدة</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                البحث عن منتجات المحل وإضافتها إلى فاتورة الإرجاع وقيدها في الحساب المالي والمخزون
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

        {/* 1. Customer Selection */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-700" />
              <span>العميل المستفيد من المردود:</span>
            </label>
            {selectedCustomer && !preselectedCustomer && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerSearchQuery('');
                  setCustomerSearchResults([]);
                }}
                className="text-[11px] text-blue-700 hover:underline font-bold"
              >
                تغيير العميل
              </button>
            )}
            {!selectedCustomer && (
              <span className="text-[11px] text-slate-500">
                اكتب اسم العميل أو رقمه لإظهار النتائج
              </span>
            )}
          </div>

          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {selectedCustomer.displayName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {selectedCustomer.displayName}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700">
                      {selectedCustomer.role === 'wholesale' ? 'تاجر جملة' : 'عميل تجزئة'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                <Input
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="ابحث عن العميل بالاسم، رقم الهاتف، أو اسم المستخدم..."
                  className="pr-10 text-xs bg-white py-2.5 font-medium"
                />
                {isSearchingCustomer && (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute left-3.5 top-3" />
                )}
              </div>

              {/* Customer Search Dropdown - ONLY appears when searching (>= 2 chars) */}
              {customerSearchQuery.trim().length >= 2 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {isSearchingCustomer ? (
                    <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>جاري البحث في حسابات العملاء...</span>
                    </div>
                  ) : customerSearchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      لا يوجد عميل مطابق لـ "{customerSearchQuery}"
                    </div>
                  ) : (
                    customerSearchResults.map((c) => (
                      <button
                        key={c.uid}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearchQuery('');
                          setCustomerSearchResults([]);
                        }}
                        className="w-full text-right p-3 hover:bg-blue-50/70 flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {c.displayName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{c.displayName}</span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              {c.phone && <span>{c.phone}</span>}
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-700">
                                {c.role === 'wholesale' ? 'تاجر جملة' : 'عميل تجزئة'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg shrink-0">
                          اختيار
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Product Search & Selection Section */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-rose-700" />
              <span>البحث عن صنف لإضافته للمردود:</span>
            </label>
            <span className="text-[11px] text-slate-500">
              اكتب اسم المنتج أو الباركود لإظهار نتائج المتجر
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <Input
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              placeholder="اكتب اسم الصنف، الباركود، أو رمز الصنف للبحث..."
              className="pr-10 text-xs bg-white py-2.5 font-medium"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute left-3.5 top-3" />
            )}
          </div>

          {/* Search Results Dropdown List */}
          {productSearchQuery.trim().length >= 2 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-48 overflow-y-auto divide-y divide-slate-100">
              {isSearching ? (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>جاري البحث في أصناف المتجر...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  لا توجد منتجات مطابقة لـ "{productSearchQuery}"
                </div>
              ) : (
                searchResults.map((opt) => (
                  <button
                    key={`${opt.productId}-${opt.variantId}`}
                    type="button"
                    onClick={() => handleSelectProduct(opt)}
                    className={`w-full text-right p-3 hover:bg-rose-50/70 flex items-center justify-between text-xs transition-colors ${
                      activeProduct?.productId === opt.productId &&
                      activeProduct?.variantId === opt.variantId
                        ? 'bg-rose-50 border-r-4 border-rose-600'
                        : ''
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{opt.productName}</span>
                        {opt.variantLabel && opt.variantLabel !== 'الافتراضي' && (
                          <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded font-normal">
                            {opt.variantLabel}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-3 font-mono">
                        {opt.barcode && <span>باركود: {opt.barcode}</span>}
                        {opt.sku && <span>رمز: {opt.sku}</span>}
                        <span>المخزون الحالي: {opt.availableStock}</span>
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <span className="text-[10px] text-slate-400 block font-sans">
                        السعر الافتراضي
                      </span>
                      <span className="font-bold text-rose-700 text-xs">
                        {formatMoney(opt.defaultPrice)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Active Selected Product Panel */}
          {activeProduct && (
            <div className="bg-white p-3.5 rounded-xl border-2 border-rose-200 shadow-xs space-y-3 mt-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full inline-block mb-1">
                    الصنف المختار
                  </span>
                  <h4 className="font-bold text-sm text-slate-900">
                    {activeProduct.productName}
                    <span className="text-slate-500 text-xs font-normal mr-2">
                      ({activeProduct.variantLabel || 'الافتراضي'})
                    </span>
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveProduct(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  إلغاء التحديد
                </button>
              </div>

              {/* Price & Qty Form Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                {/* Quantity */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    الكمية المسترجعة:
                  </label>
                  <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setActiveQty(Math.max(1, activeQty - 1))}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 border-l border-slate-200"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={activeQty}
                      onChange={(e) => setActiveQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-center font-mono font-bold text-xs py-2 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveQty(activeQty + 1)}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 border-r border-slate-200"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Price (Editable) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    سعر الإرجاع للقطعة (قابل للتعديل):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={activePrice}
                      onChange={(e) => setActivePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full font-mono font-bold text-xs py-2 px-3 border border-slate-300 rounded-xl outline-hidden focus:border-rose-600"
                    />
                    <span className="absolute left-3 top-2 text-[10px] text-slate-400 font-bold">
                      ريال
                    </span>
                  </div>
                </div>

                {/* Add Button & Subtotal */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 p-2 rounded-xl border border-slate-200 text-center font-mono">
                    <span className="text-[9px] text-slate-400 block font-sans">الإجمالي الفرعي</span>
                    <span className="font-bold text-xs text-rose-700">
                      {formatMoney(activeQty * activePrice)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddItemToInvoice}
                    className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 py-2 px-3 text-xs rounded-xl shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة للفاتورة</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Invoice Items Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
          <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-800 flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-600" />
              <span>أصناف فاتورة المردود ({invoiceItems.length})</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              إجمالي القطع: {totalUnits} وحدة
            </span>
          </div>

          {invoiceItems.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs space-y-2">
              <Package className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-medium">لم يتم إضافة أي أصناف إلى الفاتورة بعد.</p>
              <p className="text-[11px] text-slate-400">
                ابحث عن الصنف في الحقل أعلاه، وحدد السعر والكمية ثم اضغط "إضافة للفاتورة".
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-56 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">اسم الصنف</th>
                    <th className="py-2.5 px-3 text-center">المتغير</th>
                    <th className="py-2.5 px-3 text-center w-28">السعر (ريال)</th>
                    <th className="py-2.5 px-3 text-center w-28">الكمية</th>
                    <th className="py-2.5 px-3 text-center w-28">الإجمالي</th>
                    <th className="py-2.5 px-3 w-12 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {invoiceItems.map((item, idx) => (
                    <tr key={`${item.productId}-${item.variantId}-${idx}`} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{item.productName}</td>
                      <td className="py-2 px-3 text-center text-[11px] text-slate-500">
                        {item.variantLabel || 'الافتراضي'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateItemPrice(idx, parseFloat(e.target.value) || 0)
                          }
                          className="w-20 text-center font-mono font-bold text-xs py-1 px-1.5 border border-slate-200 rounded-lg outline-hidden focus:border-rose-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, Math.max(1, item.quantity - 1))}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItemQty(idx, parseInt(e.target.value) || 1)
                            }
                            className="w-12 text-center font-mono font-bold text-xs py-1 border border-slate-200 rounded-lg outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, item.quantity + 1)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">
                        {formatMoney(item.quantity * item.unitPrice)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف الصنف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4. Reason / Notes Input */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            سبب الإرجاع أو ملاحظات الفاتورة (اختياري):
          </label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: تلف في المنتج، استبدال مقاس، رغبة العميل بالإرجاع..."
            className="text-xs"
          />
        </div>

        {/* 5. Summary Box */}
        <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-600 block">إجمالي قيمة فاتورة المردود:</span>
            <span className="text-[11px] text-rose-800 font-bold block mt-0.5">
              {tafqeetRials(totalAmount)}
            </span>
          </div>

          <div className="text-left font-mono">
            <span className="text-2xl font-black text-rose-700">{formatMoney(totalAmount)}</span>
          </div>
        </div>

        {/* 6. Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            إلغاء
          </Button>

          <Button
            type="button"
            onClick={handleSubmitReturn}
            disabled={isPending || invoiceItems.length === 0 || !selectedCustomer}
            className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 px-5 py-2 font-bold rounded-xl shadow-xs"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ والتسجيل...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ واعتماد فاتورة المردود</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

