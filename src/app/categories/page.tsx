import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { categoryRepository } from '@/features/categories/infrastructure/firestore-category.repository';
import { ChevronLeft, Home, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'أقسام المتجر | متجر الحبيشي',
  description: 'تصفح كافة أقسام وتصنيفات متجر الحبيشي: ألعاب، إكسسوارات، خردوات وأدوات، أواني منزلية.',
};

export const instant = false;

export default async function CategoriesPage() {
  await connection();
  const categories = await categoryRepository.findAll(true);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/" className="hover:text-blue-700 flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>الرئيسية</span>
        </Link>
        <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">جميع الأقسام</span>
      </nav>

      {/* Modern Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white p-6 sm:p-10 shadow-xl border border-blue-900/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-right">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              جميع أقسام المتجر
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 max-w-xl leading-relaxed font-normal">
              اختر القسم المطلوب للاطلاع على كافة المنتجات، الأحجام، الألوان المتوفرة، وخيارات الحجز الفوري.
            </p>
          </div>

          <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center self-start sm:self-auto shrink-0">
            <span className="text-2xl font-black text-white font-mono block">
              {categories.length}
            </span>
            <span className="text-[11px] text-blue-200 font-medium">
              أقسام رئيسية
            </span>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/c/${cat.slug}`}
            className="group relative bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-950/5 hover:-translate-y-1.5 transition-all duration-300 text-center flex flex-col items-center justify-between gap-4 overflow-hidden"
          >
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200/80 p-2.5 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-300">
              {cat.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-2xl border border-blue-100">
                  {cat.name.slice(0, 2)}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="font-bold text-base text-slate-900 group-hover:text-blue-700 transition-colors">
                {cat.name}
              </h2>
              {cat.description && (
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
              )}
            </div>

            <div className="w-full pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200/60 text-[11px]">
                {cat.productCount} أصناف
              </span>
              <span className="text-blue-700 font-bold group-hover:translate-x-[-3px] transition-transform flex items-center gap-1 text-xs">
                <span>تصفح</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
