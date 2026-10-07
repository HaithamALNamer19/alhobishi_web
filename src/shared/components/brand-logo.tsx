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
    sm: { img: 32, text: 'text-base', sub: 'text-[9px]' },
    md: { img: 44, text: 'text-xl', sub: 'text-[11px]' },
    lg: { img: 56, text: 'text-2xl', sub: 'text-xs' },
    xl: { img: 72, text: 'text-3xl', sub: 'text-sm' },
  }[size];

  const content = (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Circular Emblem with Metallic Ring */}
      <div
        className="relative overflow-hidden rounded-full shrink-0 shadow-sm border border-slate-200/80 bg-white"
        style={{ width: dimensions.img, height: dimensions.img }}
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

