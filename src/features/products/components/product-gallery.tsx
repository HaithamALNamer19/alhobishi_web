'use client';

import React, { useState } from 'react';
import { Package, ZoomIn, ChevronRight, ChevronLeft } from 'lucide-react';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeImage = images[selectedIndex] || images[0];

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-gradient-to-b from-slate-50 to-slate-100 rounded-3xl border border-slate-200/80 flex flex-col items-center justify-center text-slate-300 p-8 shadow-xs">
        <Package className="w-20 h-20 text-slate-300 stroke-[1.25]" />
        <span className="text-xs text-slate-400 mt-3 font-medium">لا توجد صورة متوفرة</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none">
      {/* Main Image Stage */}
      <div className="group relative aspect-square bg-gradient-to-b from-slate-50 via-white to-slate-50/70 rounded-3xl border border-slate-200/90 overflow-hidden flex items-center justify-center p-6 shadow-xs transition-shadow hover:shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeImage}
          alt={`${productName} - صورة ${selectedIndex + 1}`}
          className="w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Carousel controls if multiple images */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="الصورة السابقة"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 text-slate-700 hover:text-blue-700 hover:scale-105 hover:bg-white flex items-center justify-center shadow-md transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="الصورة التالية"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 text-slate-700 hover:text-blue-700 hover:scale-105 hover:bg-white flex items-center justify-center shadow-md transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Image index counter badge */}
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-white text-[11px] font-mono font-bold tracking-wider">
            {selectedIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails Row */}
      {images.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          {images.map((img, idx) => {
            const isCurrent = idx === selectedIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-slate-50 border p-1.5 transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-blue-700 ring-2 ring-blue-600/30 shadow-sm scale-102 bg-white'
                    : 'border-slate-200/80 hover:border-slate-300 opacity-70 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

