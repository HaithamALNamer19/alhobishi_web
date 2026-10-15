'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { PackagePlus, Loader2, X, ExternalLink, Check } from 'lucide-react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { createProductAction } from '@/features/products/actions/product.actions';
import { getCategoriesAction } from '@/features/categories/actions/category.actions';
import type { Category } from '@/features/categories/domain/category';
import type { ProductDetail } from '@/features/products/domain/product';

interface QuickCreateProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  onSuccess: (data: { product: ProductDetail; suggestedCostPrice: number }) => void;
}

export function QuickCreateProductDialog({
  isOpen,
  onClose,
  initialName = '',
  onSuccess,
}: QuickCreateProductDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCats, setIsLoadingCats] = useState(false);

  // Form Fields
  const [name, setName] = useState(initialName);
  const [categoryId, setCategoryId] = useState('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [retailPrice, setRetailPrice] = useState<number | ''>('');
  const [wholesalePrice, setWholesalePrice] = useState<number | ''>('');
  const [barcode, setBarcode] = useState('');

  const [isPending, startTransition] = useTransition();

  // Load categories when opened
  useEffect(() => {
    if (isOpen) {
      setName(initialName || '');
      setCostPrice('');
      setRetailPrice('');
      setWholesalePrice('');
      setBarcode('');

      setIsLoadingCats(true);
      getCategoriesAction(true)
        .then((res) => {
          if (res.ok && res.data) {
            setCategories(res.data);
            if (res.data.length > 0) {
              setCategoryId((prev) => prev || res.data[0].id);
            }
          }
        })
        .finally(() => {
          setIsLoadingCats(false);
        });
    }
  }, [isOpen, initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error('اسم المنتج يجب أن يتكون من حرفين على الأقل.');
      return;
    }

    if (!categoryId) {
      toast.error('يرجى اختيار القسم أو التصنيف للمنتج.');
      return;
    }

    const cost = costPrice === '' ? 0 : Number(costPrice);
    const retail = retailPrice === '' ? (cost > 0 ? cost : 0) : Number(retailPrice);
    const wholesale = wholesalePrice === '' ? (cost > 0 ? cost : retail) : Number(wholesalePrice);

    if (retail < 0 || wholesale < 0 || cost < 0) {
      toast.error('الأسعار لا يمكن أن تكون سالبة.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createProductAction({
          name: trimmedName,
          categoryId,
          retailPrice: retail,
          wholesalePrice: wholesale,
          barcode: barcode.trim() || undefined,
          status: 'active',
          isVisible: true,
          isFeatured: false,
          shortDescription: '',
          description: '',
          images: [],
          options: [],
          variants: [
            {
              label: 'الافتراضي',
              stockQty: 0,
              lowStockThreshold: 5,
              optionValues: {},
              barcode: barcode.trim() || undefined,
            },
          ],
        });

        if (!res.ok) {
          toast.error(res.error.message || 'فشل إضافة المنتج.');
          return;
        }

        toast.success(`تم إنشاء المنتج "${trimmedName}" بنجاح!`);
        onSuccess({ product: res.data, suggestedCostPrice: cost });
        onClose();
      } catch (err: any) {
        toast.error(err?.message || 'حدث خطأ أثناء حفظ المنتج.');
      }
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="lg" hideCloseButton>
      <div className="space-y-4 text-right font-sans" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
              <PackagePlus className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900">إضافة منتج جديد سريع</h3>
              <p className="text-[11px] text-slate-500">
                إدخال المنتج في النظام وإضافته مباشرة إلى الفاتورة الحالية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Product Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم المنتج الجديد *
            </label>
            <input
              type="text"
              required
              placeholder="مثال: شوكولاتة كيندر بوينو 43 جم"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:bg-white text-slate-900 font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              القسم / التصنيف *
            </label>
            {isLoadingCats ? (
              <div className="flex items-center gap-2 text-slate-500 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري تحميل الأقسام...</span>
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {categories.length === 0 && <option value="">لا توجد أقسام</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                سعر التكلفة بالفاتورة (ر.ي)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none text-center"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">تكلفة الشراء</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                سعر بيع التجزئة (ر.ي) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none text-center"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">سعر بيع المستهلك</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                سعر بيع الجملة (ر.ي)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none text-center"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">سعر بيع التجار</span>
            </div>
          </div>

          {/* Barcode (Optional) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              الباركود (اختياري)
            </label>
            <input
              type="text"
              placeholder="امسح أو اكتب الباركود إن وجد"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-between gap-2">
            <a
              href="/admin/products/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium hover:underline"
            >
              <span>إضافة منتج كامل بخيارات وصور</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isPending}
                className="text-xs"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 px-4"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>حفظ وإضافة للفاتورة</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
