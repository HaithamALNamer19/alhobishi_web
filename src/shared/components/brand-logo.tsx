import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  inverted?: boolean;
  href?: string | null;
  className?: string;
}

export function BrandLogo({
  size = 'md',
  showSubtitle = true,
  inverted = false,
  href = '/',
  className = '',
}: BrandLogoProps) {
  const dimensions = {
    sm: { img: 'w-8 h-8', text: 'text-sm sm:text-base', sub: 'text-[9px]' },
    md: { img: 'w-9 h-9 sm:w-11 sm:h-11', text: 'text-lg sm:text-xl', sub: 'text-[11px]' },
    lg: { img: 'w-12 h-12 sm:w-14 sm:h-14', text: 'text-xl sm:text-2xl', sub: 'text-xs' },
    xl: { img: 'w-14 h-14 sm:w-18 sm:h-18', text: 'text-2xl sm:text-3xl', sub: 'text-sm' },
  }[size];

  const content = (
    <div className={`inline-flex items-center gap-2 sm:gap-3 select-none ${className}`}>
      {/* Circular Emblem with Metallic Ring */}
      <div
        className={`relative overflow-hidden rounded-full shrink-0 shadow-sm border border-slate-200/80 bg-white ${dimensions.img}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.jpg"
          alt="شعار الحبيشي"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col text-right leading-none">
        <span
          className={`font-black tracking-tight ${dimensions.text} ${
            inverted ? 'text-white' : 'text-blue-900'
          }`}
          style={{ fontFamily: 'inherit' }}
        >
          الحبيشي
        </span>
        {showSubtitle && (
          <span
            className={`font-semibold mt-1 tracking-normal hidden sm:inline-block ${dimensions.sub} ${
              inverted ? 'text-blue-200' : 'text-slate-500'
            }`}
          >
            للألعاب والإكسسوارات والخردوات
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-95 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

