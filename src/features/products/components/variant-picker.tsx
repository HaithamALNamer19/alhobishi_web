'use client';

import React, { useState, useTransition } from 'react';
import {
  Check,
  AlertCircle,
  ShoppingCart,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { formatMoney } from '@/core/domain/money';
import { Button } from '@/shared/ui/button';
import { toast } from 'sonner';
import { addToCartAction } from '@/features/cart/actions/cart.actions';
import type { ProductDetail } from '../domain/product';
import type { ProductPricing } from '../domain/pricing';
import type { Role } from '@/core/auth/roles';
import {
  findMatchingVariant,
  generateVariantId,
  computeStockState,
  computeAvailableQty,
  formatCustomerStockDisplay,
} from '../domain/variant';
import { resolveUnitPrice } from '../domain/pricing';

interface VariantPickerProps {
  product: ProductDetail;
  pricing: ProductPricing | null;
  userRole?: Role | null;
}

export function VariantPicker({ product, pricing, userRole }: VariantPickerProps) {
  const [isPending, startTransition] = useTransition();

  // Selected option values (e.g. { color: 'red', size: 'm' })
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (product.options && product.options.length > 0) {
      for (const opt of product.options) {
        if (opt.values.length > 0 && opt.values[0]) {
          initial[opt.key] = opt.values[0].id;
        }
      }
    }
    return initial;
  });

  const [quantity, setQuantity] = useState(1);

  // Match active variant
  const currentVariant = product.hasVariants
    ? findMatchingVariant(product.variants, selectedOptions)
    : product.variants[0] || null;

  // Compute live available quantity & stock status
  const stockQty = currentVariant ? currentVariant.stockQty : 0;
  const reservedQty = currentVariant ? currentVariant.reservedQty : 0;
  const availableQty = currentVariant
    ? computeAvailableQty(stockQty, reservedQty)
    : 0;

  const isAvailable = currentVariant ? availableQty > 0 : product.inStock;

  // Resolve price based on user role (completely seamless & discreet)
  const unitPrice = resolveUnitPrice({
    product,
    variant: currentVariant,
    pricing,
    role: userRole,
  });

  const handleSelectOption = (key: string, valueId: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [key]: valueId,
    }));
    setQuantity(1);
  };

  // Helper: check if a combination has stock
  const isOptionValueAvailable = (key: string, valueId: string): boolean => {
    const candidateOptions = { ...selectedOptions, [key]: valueId };
    const matched = findMatchingVariant(product.variants, candidateOptions);
    if (!matched) return false;
    return computeAvailableQty(matched.stockQty, matched.reservedQty) > 0;
  };

  const handleAddToCart = () => {
    if (!isAvailable) {
      toast.error('هذا الخيار غير متوفر حاليًا في المخزون.');
      return;
    }

    startTransition(async () => {
      try {
        const variantId = currentVariant?.id || 'default';
        const res = await addToCartAction(product.id, variantId, quantity);

        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        toast.success(`تمت إضافة ${quantity} قطعة إلى السلة بنجاح!`, {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
        });
      } catch (err: unknown) {
        toast.error((err as Error).message || 'تعذر إضافة المنتج إلى السلة');
      }
    });
  };

  return (
    <div className="space-y-6 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs">
      {/* Price & Stock Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
            السعر
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
              {formatMoney(unitPrice)}
            </span>
          </div>
        </div>

        {/* Live Stock Indicator */}
        <div>
          {(() => {
            const stockInfo = formatCustomerStockDisplay(availableQty);
            if (!isAvailable || !stockInfo.isAvailable) {
              return (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>نفد من المخزون</span>
                </span>
              );
            }

            if (stockInfo.isLowStock) {
              return (
                <div className="flex flex-col items-end">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>{stockInfo.badgeText}</span>
                  </span>
                  <span className="text-[11px] text-amber-600 mt-1 font-semibold">
                    كمية محدودة - سارع بالحجز
                  </span>
                </div>
              );
            }

            return (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>متوفر في المخزون</span>
              </span>
            );
          })()}
        </div>
      </div>

      {/* Options & Variants Selector */}
      {product.hasVariants && product.options.length > 0 && (
        <div className="space-y-5">
          {product.options.map((option) => {
            const selectedVal = option.values.find(
              (v) => v.id === selectedOptions[option.key]
            );

            return (
              <div key={option.key} className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    {option.label}:
                  </span>
                  <span className="text-blue-700 font-semibold bg-blue-50 px-2.5 py-0.5 rounded-md">
                    {selectedVal?.label || 'اختر'}
                  </span>
                </div>

                {/* Swatch / Button List */}
                <div className="flex flex-wrap gap-2.5">
                  {option.values.map((val) => {
                    const isSelected = selectedOptions[option.key] === val.id;
                    const valueHasStock = isOptionValueAvailable(option.key, val.id);

                    if (option.displayType === 'swatch' && val.swatch) {
                      return (
                        <button
                          key={val.id}
                          type="button"
                          onClick={() => handleSelectOption(option.key, val.id)}
                          disabled={!valueHasStock}
                          title={`${val.label} ${!valueHasStock ? '(غير متوفر)' : ''}`}
                          className={`group relative p-1 rounded-full transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-blue-700 ring-offset-2 scale-110 shadow-md'
                              : valueHasStock
                                ? 'hover:scale-105 opacity-80 hover:opacity-100'
                                : 'opacity-30 cursor-not-allowed'
                          }`}
                        >
                          <span
                            className="w-8 h-8 rounded-full border border-slate-300 block shadow-xs"
                            style={{ backgroundColor: val.swatch }}
                          />
                          {!valueHasStock && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="w-full h-0.5 bg-rose-600 rotate-45 block" />
                            </span>
                          )}
                        </button>
                      );
                    }

                    return (
                      <button
                        key={val.id}
                        type="button"
                        onClick={() => handleSelectOption(option.key, val.id)}
                        disabled={!valueHasStock}
                        className={`relative px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'border-blue-700 bg-blue-700 text-white shadow-md shadow-blue-700/20'
                            : valueHasStock
                              ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              : 'border-slate-200/60 bg-slate-50 text-slate-400 line-through cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span>{val.label}</span>
                        {!valueHasStock && (
                          <span className="text-[10px] font-normal no-underline mr-1 text-slate-400">
                            (منتهي)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quantity & Action Area */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-3">
          {/* Ergonomic Stepper */}
          <div className="flex items-center border border-slate-200/90 rounded-2xl bg-slate-50 p-1 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || !isAvailable}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-all cursor-pointer shadow-2xs active:scale-95"
              aria-label="إنقاص الكمية"
            >
              -
            </button>
            <span className="w-12 text-center font-black text-slate-900 font-mono text-base">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(availableQty, q + 1))}
              disabled={quantity >= availableQty || !isAvailable}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-all cursor-pointer shadow-2xs active:scale-95"
              aria-label="زيادة الكمية"
            >
              +
            </button>
          </div>

          {/* Add to Cart Primary Button */}
          <Button
            type="button"
            onClick={handleAddToCart}
            disabled={!isAvailable || isPending}
            className="flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl shadow-md hover:shadow-lg transition-all"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ShoppingCart className="w-5 h-5" />
            )}
            <span>{isAvailable ? 'إضافة إلى السلة' : 'غير متوفر حاليًا'}</span>
          </Button>
        </div>

        {/* E-Commerce Trust Highlights */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center text-[11px] text-slate-500 font-medium">
          <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50/70 border border-slate-100">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span>حجز فوري للبضائع</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50/70 border border-slate-100">
            <Zap className="w-4 h-4 text-amber-600" />
            <span>تجهيز سريع للطلبات</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50/70 border border-slate-100">
            <RotateCcw className="w-4 h-4 text-emerald-600" />
            <span>مرونة تعديل الفاتورة</span>
          </div>
        </div>
      </div>
    </div>
  );
}
