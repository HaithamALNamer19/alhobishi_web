'use client';

import React from 'react';
import Link from 'next/link';
import { Package, Layers, ArrowUpLeft, Check } from 'lucide-react';
import { formatMoney } from '@/core/domain/money';
import type { Product } from '../domain/product';
import type { Role } from '@/core/auth/roles';

interface ProductCardProps {
  product: Product;
  userRole?: Role | null;
}

export function ProductCard({ product }: ProductCardProps) {
  const hasMultiplePrices =
    product.retailPriceRange.min !== product.retailPriceRange.max;

  return (
    <Link
      href={`/p/${product.slug}`}
      className="group relative bg-white rounded-3xl border border-slate-200/80 p-3 sm:p-3.5 hover:border-blue-600/80 hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        {/* Image Frame with Soft Gradient & Badges */}
        <div className="aspect-square bg-gradient-to-b from-slate-50 to-slate-100/60 rounded-2xl overflow-hidden relative flex items-center justify-center p-3 border border-slate-100/80">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-108"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300">
              <Package className="w-10 h-10 stroke-[1.25]" />
            </div>
          )}

          {/* Floating Glassmorphic Badges */}
          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
            {!product.inStock ? (
              <span className="backdrop-blur-md bg-rose-600/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                نفد المخزون
              </span>
            ) : product.hasVariants ? (
              <span className="backdrop-blur-md bg-white/90 text-slate-700 border border-slate-200/70 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <Layers className="w-2.5 h-2.5 text-blue-700" />
                <span>خيارات متوفرة</span>
              </span>
            ) : (
              <span className="backdrop-blur-md bg-emerald-600/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5" />
                <span>متوفر</span>
              </span>
            )}
          </div>

          {/* Subtle Hover Action Button */}
          <div className="absolute bottom-2.5 left-2.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-none">
            <span className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center shadow-md">
              <ArrowUpLeft className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Content Info */}
        <div className="pt-3 px-1 space-y-1">
          <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {product.shortDescription && (
            <p className="text-xs text-slate-500 line-clamp-1 font-normal leading-relaxed">
              {product.shortDescription}
            </p>
          )}
        </div>
      </div>

      {/* Modern Price Block */}
      <div className="pt-3 px-1 border-t border-slate-100 mt-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 block font-medium">السعر</span>
          <span className="text-sm sm:text-base font-black text-slate-900 font-mono tracking-tight">
            {hasMultiplePrices
              ? `${formatMoney(product.retailPriceRange.min)} - ${formatMoney(product.retailPriceRange.max)}`
              : formatMoney(product.retailPrice)}
          </span>
        </div>

        <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-700 text-slate-400 flex items-center justify-center transition-colors">
          <ArrowUpLeft className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
}
