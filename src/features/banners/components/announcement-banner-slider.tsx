'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Settings,
  Plus,
  ArrowLeft,
  Upload,
} from 'lucide-react';
import type { Banner } from '../domain/banner';
import { BannerManagerDialog } from './banner-manager-dialog';

interface AnnouncementBannerSliderProps {
  initialBanners: Banner[];
  isAdmin?: boolean;
}

// Fallback high-impact default banners if none uploaded yet
const DEFAULT_BANNERS: Banner[] = [
  {
    id: 'default-1',
    title: 'عروض حصرية وتشكيلات متجددة لمتجرك',
    subtitle: 'أحدث موديلات الألعاب، الإكسسوارات الفاخرة، والخردوات مع حجز فوري للمخزون من المستودع.',
    imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1600&auto=format&fit=crop',
    linkUrl: '/products',
    badgeText: 'تشكيلة الموسم',
    sortOrder: 0,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'default-2',
    title: 'تجهيز دقيق وفحص معتمد لكافة الطلبيات',
    subtitle: 'نوفر أعلى درجات المطابقة والسرعة في تحضير الفواتير ومتابعة كشف الحساب لحظة بلحظة.',
    imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?q=80&w=1600&auto=format&fit=crop',
    linkUrl: '/categories',
    badgeText: 'خدمات التوزيع',
    sortOrder: 1,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
];

export function AnnouncementBannerSlider({
  initialBanners,
  isAdmin = false,
}: AnnouncementBannerSliderProps) {
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  // Filter active banners
  const activeBanners = banners.filter((b) => b.isActive);
  const displayBanners = activeBanners.length > 0 ? activeBanners : DEFAULT_BANNERS;
  const isUsingDefault = activeBanners.length === 0;

  // Auto-play interval
  useEffect(() => {
    if (displayBanners.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayBanners.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [displayBanners.length, isPaused]);

  // Touch swipe support
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;

    if (diff > 50) {
      // Swiped left (in RTL: next slide)
      handleNext();
    } else if (diff < -50) {
      // Swiped right (in RTL: prev slide)
      handlePrev();
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + displayBanners.length) % displayBanners.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displayBanners.length);
  };

  const currentBanner = displayBanners[currentIndex] || displayBanners[0];

  return (
    <>
      <section
        className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 relative group w-full max-w-full overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Modern Slider Container */}
        <div className="relative rounded-3xl sm:rounded-4xl overflow-hidden shadow-xl border border-slate-200/90 bg-slate-950 aspect-auto sm:aspect-[24/9] md:aspect-[28/9] min-h-[200px] sm:min-h-[260px] lg:min-h-[320px] w-full max-w-full">
          {/* Background Images with Cross-Fade */}
          {displayBanners.map((banner, index) => {
            const isCurrent = index === currentIndex;
            return (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="w-full h-full object-cover object-center transform transition-transform duration-7000 ease-out scale-105"
                />

                {/* Ambient Dual-Gradient Overlay for Superior Readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
              </div>
            );
          })}

          {/* Slide Content Overlay */}
          <div className="relative z-20 h-full flex flex-col justify-end sm:justify-center p-3.5 xs:p-5 sm:p-10 lg:p-12 text-right">
            <div className="max-w-xl space-y-2 sm:space-y-3.5">
              {/* Badge */}
              {currentBanner.badgeText && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-blue-200 text-[11px] sm:text-xs font-bold shadow-xs">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-300" />
                  <span>{currentBanner.badgeText}</span>
                </div>
              )}

              {/* Title */}
              <h3 className="text-base xs:text-xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-snug sm:leading-tight drop-shadow-md">
                {currentBanner.title}
              </h3>

              {/* Subtitle */}
              {currentBanner.subtitle && (
                <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed font-normal line-clamp-2 max-w-lg drop-shadow-xs">
                  {currentBanner.subtitle}
                </p>
              )}

              {/* Call to Action Link */}
              {currentBanner.linkUrl && (
                <div className="pt-1 sm:pt-1.5">
                  <Link
                    href={currentBanner.linkUrl}
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-900/30 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <span>استعراض العرض</span>
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Admin Floating Control Button */}
          {isAdmin && (
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsManagerOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-slate-900/85 hover:bg-slate-900 backdrop-blur-md border border-white/20 text-white text-[10px] sm:text-xs font-bold shadow-xl hover:scale-105 transition-all cursor-pointer"
                title="إدارة البنرات الإعلانية ورفع صور جديدة"
              >
                <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" />
                <span className="hidden sm:inline">إدارة ورفع الإعلانات</span>
                <span className="sm:hidden">إدارة الإعلانات</span>
                {isUsingDefault && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping mr-1" />
                )}
              </button>
            </div>
          )}

          {/* Navigation Arrows (visible on hover or touch) */}
          {displayBanners.length > 1 && (
            <>
              {/* Prev Button (in RTL: right arrow moves backward) */}
              <button
                type="button"
                onClick={handlePrev}
                aria-label="الإعلان السابق"
                className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-25 w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-white/10 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 hover:scale-105 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Next Button (in RTL: left arrow moves forward) */}
              <button
                type="button"
                onClick={handleNext}
                aria-label="الإعلان التالي"
                className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-25 w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-white/10 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 hover:scale-105 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </>
          )}

          {/* Pagination Indicators Dots */}
          {displayBanners.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-25 flex items-center gap-1.5 p-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10">
              {displayBanners.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`الانتقال للإعلان ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentIndex
                      ? 'w-6 bg-blue-400'
                      : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Admin Manager Dialog */}
      {isAdmin && (
        <BannerManagerDialog
          isOpen={isManagerOpen}
          onClose={() => setIsManagerOpen(false)}
          banners={banners}
          onBannersUpdated={(updated) => {
            setBanners(updated);
            setCurrentIndex(0);
          }}
        />
      )}
    </>
  );
}

