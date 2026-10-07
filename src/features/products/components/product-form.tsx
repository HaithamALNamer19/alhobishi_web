'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Package,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  ArrowRight,
  Loader2,
  Image as ImageIcon,
  DollarSign,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import type { Category } from '@/features/categories/domain/category';
import type { ProductDetail } from '../domain/product';
import type { ProductPricing } from '../domain/pricing';
import {
  generateOptionCombinations,
  generateVariantId,
  type ProductOption,
  type ProductOptionValue,
} from '../domain/variant';
import { createProductAction, updateProductAction } from '../actions/product.actions';

interface ProductFormProps {
  categories: Category[];
  initialProduct?: ProductDetail;
  initialPricing?: ProductPricing | null;
  returnUrl?: string;
}

interface VariantRow {
  id?: string;
  optionValues: Record<string, string>;
  label: string;
  sku: string;
  barcode: string;
  retailPriceOverride: string;
  wholesalePriceOverride: string;
  stockQty: string;
}

export function ProductForm({
  categories,
  initialProduct,
  initialPricing,
  returnUrl,
}: ProductFormProps) {
  const isEditing = !!initialProduct;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Basic Information
  const [name, setName] = useState(initialProduct?.name || '');
  const [slug, setSlug] = useState(initialProduct?.slug || '');
  const [shortDescription, setShortDescription] = useState(initialProduct?.shortDescription || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [categoryId, setCategoryId] = useState(initialProduct?.categoryId || categories[0]?.id || '');
  const [sku, setSku] = useState(initialProduct?.sku || '');
  const [barcode, setBarcode] = useState(initialProduct?.barcode || '');

  // Base Prices (YER)
  const [retailPrice, setRetailPrice] = useState(initialProduct ? initialProduct.retailPrice.toString() : '');
  const [wholesalePrice, setWholesalePrice] = useState(
    initialPricing?.wholesalePrice !== undefined && initialPricing?.wholesalePrice !== null
      ? initialPricing.wholesalePrice.toString()
      : ''
  );

  // Images
  const [imageUrls, setImageUrls] = useState<string[]>(
    initialProduct?.images && initialProduct.images.length > 0 ? initialProduct.images : ['']
  );

  // Status & Visibility
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>(initialProduct?.status || 'active');
  const [isVisible, setIsVisible] = useState(initialProduct ? initialProduct.isVisible : true);
  const [isFeatured, setIsFeatured] = useState(initialProduct ? initialProduct.isFeatured : false);

  // Single variant initial stock
  const [singleStockQty, setSingleStockQty] = useState(
    initialProduct && !initialProduct.hasVariants && initialProduct.variants.length > 0
      ? (initialProduct.variants[0]?.stockQty ?? 0).toString()
      : '0'
  );

  // Options & Variants Matrix
  const [hasVariants, setHasVariants] = useState(
    initialProduct ? initialProduct.hasVariants : false
  );
  const [options, setOptions] = useState<ProductOption[]>(
    initialProduct && initialProduct.options && initialProduct.options.length > 0
      ? initialProduct.options
      : [
          {
            key: 'color',
            label: 'اللون',
            displayType: 'button',
            values: [
              { id: 'red', label: 'أحمر' },
              { id: 'black', label: 'أسود' },
            ],
          },
          {
            key: 'size',
            label: 'المقاس',
            displayType: 'button',
            values: [
              { id: 'm', label: 'وسط' },
              { id: 'l', label: 'كبير' },
            ],
          },
        ]
  );
  const [variants, setVariants] = useState<VariantRow[]>(
    initialProduct && initialProduct.hasVariants && initialProduct.variants.length > 0
      ? initialProduct.variants.map((v) => ({
          id: v.id,
          optionValues: v.optionValues || {},
          label: v.label,
          sku: v.sku || '',
          barcode: v.barcode || '',
          retailPriceOverride:
            v.retailPriceOverride !== null && v.retailPriceOverride !== undefined
              ? v.retailPriceOverride.toString()
              : '',
          wholesalePriceOverride:
            initialPricing?.variantWholesalePrices?.[v.id] !== undefined
              ? initialPricing.variantWholesalePrices[v.id].toString()
              : '',
          stockQty: v.stockQty.toString(),
        }))
      : []
  );

  // Helpers for image URLs
  const addImageUrl = () => setImageUrls((prev) => [...prev, '']);
  const updateImageUrl = (index: number, val: string) => {
    setImageUrls((prev) => prev.map((url, i) => (i === index ? val : url)));
  };
  const removeImageUrl = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Option builder helpers
  const addOption = () => {
    const newIdx = options.length + 1;
    setOptions((prev) => [
      ...prev,
      {
        key: `option_${newIdx}`,
        label: `الخاصية ${newIdx}`,
        displayType: 'button',
        values: [{ id: 'val_1', label: 'قيمة 1' }],
      },
    ]);
  };

  const removeOption = (optIndex: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== optIndex));
  };

  const updateOptionKey = (optIndex: number, key: string, label: string) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === optIndex ? { ...opt, key: key.trim().toLowerCase(), label } : opt))
    );
  };

  const addOptionValue = (optIndex: number) => {
    setOptions((prev) =>
      prev.map((opt, i) => {
        if (i !== optIndex) return opt;
        const vIdx = opt.values.length + 1;
        return {
          ...opt,
          values: [...opt.values, { id: `val_${vIdx}`, label: `قيمة ${vIdx}` }],
        };
      })
    );
  };

  const updateOptionValue = (
    optIndex: number,
    valIndex: number,
    id: string,
    label: string
  ) => {
    setOptions((prev) =>
      prev.map((opt, i) => {
        if (i !== optIndex) return opt;
        return {
          ...opt,
          values: opt.values.map((v, j) =>
            j === valIndex ? { ...v, id: id.trim().toLowerCase(), label } : v
          ),
        };
      })
    );
  };

  const removeOptionValue = (optIndex: number, valIndex: number) => {
    setOptions((prev) =>
      prev.map((opt, i) => {
        if (i !== optIndex) return opt;
        return {
          ...opt,
          values: opt.values.filter((_, j) => j !== valIndex),
        };
      })
    );
  };

  // Generate Matrix
  const handleGenerateMatrix = () => {
    const validOptions = options.filter(
      (opt) => opt.key.trim() && opt.values.length > 0 && opt.values.every((v) => v.id.trim() && v.label.trim())
    );

    if (validOptions.length === 0) {
      toast.error('يرجى تحديد خاصية واحدة على الأقل وبداخلها قيم صالحة');
      return;
    }

    const combinations = generateOptionCombinations(validOptions);
    const newVariants: VariantRow[] = combinations.map((c) => {
      const targetId = generateVariantId(c.optionValues);
      const existing = variants.find((v) => {
        const vId = v.id || generateVariantId(v.optionValues);
        return vId === targetId;
      });

      if (existing) {
        return {
          id: existing.id || targetId,
          optionValues: c.optionValues,
          label: c.label,
          sku: existing.sku,
          barcode: existing.barcode,
          retailPriceOverride: existing.retailPriceOverride,
          wholesalePriceOverride: existing.wholesalePriceOverride,
          stockQty: existing.stockQty,
        };
      }

      return {
        id: targetId,
        optionValues: c.optionValues,
        label: c.label,
        sku: '',
        barcode: '',
        retailPriceOverride: '',
        wholesalePriceOverride: '',
        stockQty: '10',
      };
    });

    setVariants(newVariants);
    toast.success(`تم توليد ${newVariants.length} تركيبة/خيار بنجاح`);
  };

  const updateVariantRow = (index: number, field: keyof VariantRow, value: string) => {
    setVariants((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const removeVariantRow = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const addCustomVariant = () => {
    const newRow: VariantRow = {
      optionValues: {},
      label: `خيار مخصص ${variants.length + 1}`,
      sku: '',
      barcode: '',
      retailPriceOverride: '',
      wholesalePriceOverride: '',
      stockQty: '0',
    };
    setVariants((prev) => [...prev, newRow]);
  };

  const handleBack = () => {
    if (returnUrl) {
      router.push(returnUrl);
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/admin/products');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('اسم المنتج مطلوب');
      return;
    }

    if (!categoryId) {
      toast.error('يرجى اختيار القسم');
      return;
    }

    const retPrice = parseInt(retailPrice, 10);
    const whoPrice = parseInt(wholesalePrice, 10);

    if (isNaN(retPrice) || retPrice < 0) {
      toast.error('يرجى إدخال سعر تجزئة صالح');
      return;
    }

    if (isNaN(whoPrice) || whoPrice < 0) {
      toast.error('يرجى إدخال سعر تاجر صالح');
      return;
    }

    if (whoPrice > retPrice) {
      toast.warning('تنبيه: سعر التاجر أعلى من سعر التجزئة!');
    }

    const cleanedImages = imageUrls.map((u) => u.trim()).filter((u) => u.length > 0);

    const payloadVariants = hasVariants
      ? variants.map((v) => ({
          id: v.id,
          optionValues: v.optionValues,
          label: v.label,
          sku: v.sku.trim() || null,
          barcode: v.barcode.trim() || null,
          retailPriceOverride: v.retailPriceOverride.trim()
            ? parseInt(v.retailPriceOverride, 10)
            : null,
          wholesalePriceOverride: v.wholesalePriceOverride.trim()
            ? parseInt(v.wholesalePriceOverride, 10)
            : null,
          stockQty: parseInt(v.stockQty, 10) || 0,
          lowStockThreshold: 5,
        }))
      : [
          {
            id: initialProduct?.variants?.[0]?.id || 'default',
            optionValues: {},
            label: 'الافتراضي',
            sku: sku.trim() || null,
            barcode: barcode.trim() || null,
            retailPriceOverride: null,
            wholesalePriceOverride: null,
            stockQty: parseInt(singleStockQty, 10) || 0,
            lowStockThreshold: 5,
          },
        ];

    startTransition(async () => {
      try {
        if (isEditing && initialProduct) {
          const res = await updateProductAction({
            id: initialProduct.id,
            name: name.trim(),
            slug: slug.trim() || undefined,
            shortDescription: shortDescription.trim(),
            description: description.trim(),
            categoryId,
            images: cleanedImages,
            sku: sku.trim() || null,
            barcode: barcode.trim() || null,
            retailPrice: retPrice,
            wholesalePrice: whoPrice,
            status,
            isVisible,
            isFeatured,
            options: hasVariants ? options : [],
            variants: payloadVariants,
          });

          if (!res.ok) {
            toast.error(res.error.message);
            return;
          }

          toast.success('تم تحديث بيانات المنتج والمتغيرات بنجاح!');
          if (returnUrl) {
            router.push(returnUrl);
          } else {
            router.push('/admin/products');
          }
          router.refresh();
          return;
        }

        const res = await createProductAction({
          name: name.trim(),
          slug: slug.trim() || undefined,
          shortDescription: shortDescription.trim(),
          description: description.trim(),
          categoryId,
          images: cleanedImages,
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
          retailPrice: retPrice,
          wholesalePrice: whoPrice,
          status,
          isVisible,
          isFeatured,
          options: hasVariants ? options : [],
          variants: payloadVariants,
        });

        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        toast.success('تم إنشاء المنتج وتحديد المخزون بنجاح!');
        if (returnUrl) {
          router.push(returnUrl);
        } else {
          router.push('/admin/products');
        }
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || 'حدث خطأ أثناء حفظ المنتج');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="رجوع"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-700" />
              <span>{isEditing ? `تعديل بيانات المنتج` : 'إضافة منتج جديد'}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing
                ? `تعديل الاسم والأسعار والأقسام والصور والخيارات للمنتج: ${initialProduct?.name}`
                : 'إدخال تفاصيل المنتج، الأسعار (تجزئة وجملة)، والخيارات والمخزون'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleBack}
          >
            إلغاء
          </Button>
          <Button type="submit" disabled={isPending} className="flex items-center gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isEditing ? 'حفظ التعديلات' : 'حفظ ونشر المنتج'}</span>
          </Button>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols): Main Product Data */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Basic Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Package className="w-4 h-4 text-blue-700" />
              <span>المعلومات الأساسية</span>
            </h2>

            <Input
              label="اسم المنتج *"
              placeholder="مثال: طقم قدور تيفال 7 قطع، لعبة تركيب ليجو..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  القسم التابع له *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                  required
                >
                  <option value="" disabled>
                    اختر قسم المنتج...
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="الرابط المخصص (Slug) - اختياري"
                placeholder="slug-product-name"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                dir="ltr"
                className="font-mono text-xs text-left"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الوصف المختصر (يظهر في البطاقات وقوائم البحث)
              </label>
              <textarea
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="وصف سريع وموجز عن مواصفات المنتج..."
                rows={2}
                className="w-full text-sm rounded-xl border border-slate-200 p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الوصف الكامل والمواصفات
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="شرح مفصل لمميزات المنتج ومواده وطرق استخدامه..."
                rows={5}
                className="w-full text-sm rounded-xl border border-slate-200 p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <Input
                label="رمز المخزون SKU"
                placeholder="SKU-1002"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                dir="ltr"
                className="font-mono text-xs text-left"
              />
              <Input
                label="الباركود الدولي Barcode"
                placeholder="6291100000000"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                dir="ltr"
                className="font-mono text-xs text-left"
              />
            </div>
          </div>

          {/* 2. Dual Pricing (Retail & Wholesale) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-700" />
                <span>تحديد الأسعار</span>
              </h2>
              <Badge variant="outline" className="text-xs">
                تسعير مزدوج آمن
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <Input
                  label="سعر التجزئة (للعميل العادي والزوار) *"
                  type="number"
                  placeholder="5000"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(e.target.value)}
                  min="0"
                  required
                />
                <span className="text-[11px] text-blue-800 mt-1 block">
                  هذا السعر يظهر للجميع وللعملاء العاديين
                </span>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                <Input
                  label="سعر التاجر / الجملة (Wholesale) *"
                  type="number"
                  placeholder="3500"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(e.target.value)}
                  min="0"
                  required
                />
                <span className="text-[11px] text-amber-700 mt-1 block">
                  محمي ومخفي تلقائيًا؛ لا يظهر إلا للتجار المعتمدين
                </span>
              </div>
            </div>
          </div>

          {/* 3. Variants & Stock Matrix */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-700" />
                  <span>الخصائص والمتغيرات (Variants) والمخزون</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  إدارة مخزون وأسعار كل مقاس أو لون أو حجم بشكل مستقل وتفاعلي
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasVariants}
                  onChange={(e) => {
                    setHasVariants(e.target.checked);
                    if (e.target.checked && variants.length === 0) {
                      handleGenerateMatrix();
                    }
                  }}
                  className="w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-600"
                />
                <span className="text-xs font-bold text-slate-800">
                  منتج له خيارات متعددة
                </span>
              </label>
            </div>

            {!hasVariants ? (
              /* Single Variant Simple Stock */
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <div className="max-w-xs">
                  <Input
                    label="كمية المخزون الحالي *"
                    type="number"
                    placeholder="100"
                    value={singleStockQty}
                    onChange={(e) => setSingleStockQty(e.target.value)}
                    min="0"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    الكمية المتوفرة على الرف في المستودع لهذا المنتج
                  </span>
                </div>
              </div>
            ) : (
              /* Multi-variant builder */
              <div className="space-y-6">
                {/* Options List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      حدد خصائص المنتج (مثل: المقاس، اللون، الخامة):
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOption}
                      className="text-xs h-8"
                    >
                      <Plus className="w-3.5 h-3.5 ml-1" />
                      إضافة خاصية جديدة
                    </Button>
                  </div>

                  {options.map((opt, optIndex) => (
                    <div
                      key={optIndex}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            placeholder="اسم الخاصية (مثال: اللون)"
                            value={opt.label}
                            onChange={(e) =>
                              updateOptionKey(optIndex, opt.key, e.target.value)
                            }
                            className="bg-white text-xs h-9"
                          />
                          <Input
                            placeholder="المفتاح (color)"
                            value={opt.key}
                            onChange={(e) =>
                              updateOptionKey(optIndex, e.target.value, opt.label)
                            }
                            dir="ltr"
                            className="bg-white text-xs h-9 font-mono text-left w-32"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(optIndex)}
                          className="text-rose-600 hover:bg-rose-50 h-8 w-8 p-0"
                          title="حذف الخاصية"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Values */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] font-bold text-slate-500">القيم:</span>
                        {opt.values.map((val, valIndex) => (
                          <div
                            key={valIndex}
                            className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs"
                          >
                            <input
                              type="text"
                              value={val.label}
                              onChange={(e) =>
                                updateOptionValue(
                                  optIndex,
                                  valIndex,
                                  val.id,
                                  e.target.value
                                )
                              }
                              placeholder="أحمر"
                              className="w-16 px-1.5 py-0.5 text-center text-slate-800 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => removeOptionValue(optIndex, valIndex)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                              title="حذف القيمة"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addOptionValue(optIndex)}
                          className="h-7 text-[11px] px-2 bg-white"
                        >
                          <Plus className="w-3 h-3 ml-0.5" /> إضافة قيمة
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomVariant}
                      className="text-xs h-8 text-slate-700"
                    >
                      <Plus className="w-3.5 h-3.5 ml-1" />
                      إضافة خيار مخصص يدويًا
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleGenerateMatrix}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-blue-700" />
                      <span>توليد / تحديث جدول الخيارات</span>
                    </Button>
                  </div>
                </div>

                {/* Variants Matrix Table */}
                {variants.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        جدول الخيارات ({variants.length} خيار):
                      </span>
                      <span className="text-[11px] text-slate-400">
                        اترك الأسعار فارغة ليرث المتغير السعر الأساسي للمنتج
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">الخيار</th>
                            <th className="py-2.5 px-3 text-center w-24">المخزون *</th>
                            <th className="py-2.5 px-3 text-center w-28">سعر التجزئة</th>
                            <th className="py-2.5 px-3 text-center w-28">سعر التاجر</th>
                            <th className="py-2.5 px-3 w-28">رمز SKU</th>
                            <th className="py-2.5 px-3 w-28">الباركود</th>
                            <th className="py-2.5 px-2 text-center w-10">إجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {variants.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                <input
                                  type="text"
                                  value={row.label}
                                  onChange={(e) =>
                                    updateVariantRow(idx, 'label', e.target.value)
                                  }
                                  className="w-full py-1 px-1.5 border border-transparent hover:border-slate-200 focus:border-blue-600 rounded text-xs font-bold focus:outline-none"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={row.stockQty}
                                  onChange={(e) =>
                                    updateVariantRow(idx, 'stockQty', e.target.value)
                                  }
                                  className="w-20 text-center py-1 px-1.5 border border-slate-200 rounded-lg text-xs font-bold focus:ring-1 focus:ring-blue-600 focus:outline-none"
                                  required
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder={retailPrice || 'افتراضي'}
                                  value={row.retailPriceOverride}
                                  onChange={(e) =>
                                    updateVariantRow(
                                      idx,
                                      'retailPriceOverride',
                                      e.target.value
                                    )
                                  }
                                  className="w-24 text-center py-1 px-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none placeholder:text-slate-300"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder={wholesalePrice || 'افتراضي'}
                                  value={row.wholesalePriceOverride}
                                  onChange={(e) =>
                                    updateVariantRow(
                                      idx,
                                      'wholesalePriceOverride',
                                      e.target.value
                                    )
                                  }
                                  className="w-24 text-center py-1 px-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none placeholder:text-slate-300"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  placeholder="SKU"
                                  value={row.sku}
                                  onChange={(e) =>
                                    updateVariantRow(idx, 'sku', e.target.value)
                                  }
                                  dir="ltr"
                                  className="w-24 font-mono text-left py-1 px-1.5 border border-slate-200 rounded-lg text-[11px] focus:ring-1 focus:ring-blue-600 focus:outline-none"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  placeholder="Barcode"
                                  value={row.barcode}
                                  onChange={(e) =>
                                    updateVariantRow(idx, 'barcode', e.target.value)
                                  }
                                  dir="ltr"
                                  className="w-24 font-mono text-left py-1 px-1.5 border border-slate-200 rounded-lg text-[11px] focus:ring-1 focus:ring-blue-600 focus:outline-none"
                                />
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeVariantRow(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                                  title="حذف هذا الخيار"
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
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Media, Status & Visibility */}
        <div className="space-y-6">
          {/* Status & Visibility Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              حالة النشر والظهور
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                حالة المنتج
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as 'active' | 'draft' | 'archived')
                }
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              >
                <option value="active">نشط (Active)</option>
                <option value="draft">مسودة (Draft)</option>
                <option value="archived">مؤرشف (Archived)</option>
              </select>
            </div>

            <div className="space-y-2.5 pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => setIsVisible(e.target.checked)}
                  className="w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-600"
                />
                <span className="text-xs font-bold text-slate-800">
                  ظاهر في واجهة المتجر للعملاء
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-600"
                />
                <span className="text-xs font-bold text-slate-800">
                  منتج مميز (يظهر في القسم المميز بالرئيسية)
                </span>
              </label>
            </div>
          </div>

          {/* Media / Images Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-700" />
                <span>صور المنتج</span>
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addImageUrl}
                className="text-xs h-7"
              >
                <Plus className="w-3 h-3 ml-0.5" /> إضافة رابط
              </Button>
            </div>

            <div className="space-y-3">
              {imageUrls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="https://images.example.com/item.jpg"
                    value={url}
                    onChange={(e) => updateImageUrl(idx, e.target.value)}
                    dir="ltr"
                    className="text-xs font-mono text-left flex-1"
                  />
                  {imageUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImageUrl(idx)}
                      className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="إزالة الرابط"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400">
              يمكنك وضع روابط صور سحابية أو روابط تجريبية مثل Unsplash.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}

