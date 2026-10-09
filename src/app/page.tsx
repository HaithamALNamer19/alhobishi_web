import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { getCurrentSession } from '@/core/auth/require-auth';
import { categoryRepository } from '@/features/categories/infrastructure/firestore-category.repository';
import { productRepository } from '@/features/products/infrastructure/firestore-product.repository';
import { bannerRepository } from '@/features/banners/infrastructure/firestore-banner.repository';
import { ProductCard } from '@/features/products/components/product-card';
import { AnnouncementBannerSlider } from '@/features/banners/components/announcement-banner-slider';
import { ScrollReveal } from '@/shared/ui/scroll-reveal';
import { ScrollToTop } from '@/shared/components/scroll-to-top';
import { Role, can, Permission } from '@/core/auth/roles';
import {
  Search,
  ArrowLeft,
  Boxes,
  Flame,
  Sparkles,
  PackageCheck,
} from 'lucide-react';
import { formatMoney } from '@/core/domain/money';

export const instant = false;

export default async function HomePage() {
  await connection();

  const [sessionRes, categoriesRes, productsRes, bannersRes] = await Promise.allSettled([
    getCurrentSession(),
    categoryRepository.findAll(true),
    productRepository.list({ isVisible: true, status: 'active', limit: 16 }),
    bannerRepository.findAll(true),
  ]);

  const session = sessionRes.status === 'fulfilled' ? sessionRes.value : null;
  const categories = categoriesRes.status === 'fulfilled' ? categoriesRes.value : [];
  const products = productsRes.status === 'fulfilled' ? productsRes.value : [];
  const banners = bannersRes.status === 'fulfilled' ? bannersRes.value : [];

  const isAdmin = session?.role === Role.ADMIN || can(session?.role, Permission.CATALOG_MANAGE);

  const featuredProducts = products.filter((p) => p.isFeatured);
  const spotlightProduct = featuredProducts[0] || products[0];
  const latestProducts = products.slice(0, 8);

  return (
    <>
      <div className="space-y-12 sm:space-y-16 pb-4 sm:pb-6 relative w-full max-w-full overflow-x-clip">
      {/* 1. HERO SECTION: High-Impact Cockpit with Interactive Spotlight */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 text-white pt-10 sm:pt-16 pb-16 sm:pb-24 px-3 xs:px-4 sm:px-6 lg:px-8 border-b border-blue-900/40 w-full max-w-full">
        {/* Subtle Ambient Blueprint Grid Texture */}
        <div
          className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:28px_28px] opacity-15 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"
          aria-hidden="true"
        />

        {/* Luminous Glowing Orbs with Smooth Floating Pulse */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none isolate" style={{ clipPath: 'inset(0)' }} aria-hidden="true">
          <div className="absolute top-0 right-0 sm:right-1/4 w-72 h-72 sm:w-[500px] sm:h-[500px] bg-blue-500/20 rounded-full blur-3xl sm:blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-0 left-0 sm:left-1/4 w-72 h-72 sm:w-[500px] sm:h-[500px] bg-indigo-500/15 rounded-full blur-3xl sm:blur-[120px] animate-pulse-glow [animation-delay:3.5s]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 w-full max-w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Right Column (in RTL): Hero Headline & Smart Search */}
            <div className="lg:col-span-7 space-y-6 text-right w-full max-w-full">
              {/* Trust Badge with Ambient Sheen */}
              <div className="inline-flex max-w-full items-center gap-1.5 xs:gap-2 px-3 py-1 xs:px-4 xs:py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-[11px] xs:text-xs font-semibold shadow-xs transition-transform duration-300 hover:scale-105">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
                <span className="w-2 h-2 rounded-full bg-blue-400 -mr-3 xs:-mr-4 shrink-0" />
                <span className="truncate">منصة التوزيع والتسوق المباشر الرسمية</span>
                <span className="text-white/40 shrink-0">•</span>
                <span className="text-white font-bold shrink-0">متجر الحبيشي</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-2xl xs:text-3xl sm:text-5xl lg:text-5.5xl font-black tracking-tight leading-[1.2] text-white">
                وجهتك المعتمدة لتسوق
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-amber-200 mt-1">
                  الألعاب، الإكسسوارات، والخردوات
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-base text-blue-100/90 leading-relaxed max-w-2xl font-normal">
                منظومة توريد وتوزيع متطورة تتيح لك حجز البضائع فورياً من المستودع، مراجعة وتجهيز دقيق لكل صنف، ومرونة كاملة في إدارة فواتيرك وكشف حسابك المالي.
              </p>

              {/* Smart Search Form */}
              <div className="pt-2 max-w-xl w-full">
                <form action="/search" method="GET" className="relative group w-full">
                  <input
                    type="text"
                    name="q"
                    placeholder="ابحث بالاسم، الصنف، أو القسم..."
                    className="w-full bg-white text-slate-900 placeholder-slate-400 rounded-2xl py-3.5 sm:py-4 pr-11 sm:pr-12 pl-24 sm:pl-28 text-xs sm:text-sm font-medium shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/40 transition-all duration-300 group-hover:shadow-blue-500/10"
                  />
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-600 transition-colors" />
                  <button
                    type="submit"
                    className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-blue-700 hover:bg-blue-600 text-white text-[11px] sm:text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md active:scale-95 hover:shadow-blue-600/30 shrink-0"
                  >
                    بحث فوري
                  </button>
                </form>

                {/* Popular Search Tags */}
                <div className="flex flex-wrap items-center gap-1.5 xs:gap-2 mt-3 text-[11px] xs:text-xs text-blue-200/80">
                  <span className="text-white/70 font-semibold">الأكثر طلباً:</span>
                  <Link
                    href="/products?category=smart-watches"
                    className="px-2.5 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 hover:scale-105 transition-all"
                  >
                    ساعات ذكية
                  </Link>
                  <Link
                    href="/products?category=toys"
                    className="px-2.5 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 hover:scale-105 transition-all"
                  >
                    ألعاب أطفال
                  </Link>
                  <Link
                    href="/products?category=cookware"
                    className="px-2.5 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 hover:scale-105 transition-all"
                  >
                    أواني منزلية
                  </Link>
                  <Link
                    href="/products?category=tools"
                    className="px-2.5 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 hover:scale-105 transition-all"
                  >
                    أدوات وصيانة
                  </Link>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2">
                <Link
                  href="/products"
                  className="px-4.5 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-white text-slate-900 hover:bg-blue-50 font-bold text-xs sm:text-sm shadow-lg transition-all duration-300 flex items-center gap-2 group cursor-pointer hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>استعراض كافة المنتجات</span>
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1.5 transition-transform duration-300" />
                </Link>
                <Link
                  href="/categories"
                  className="px-4.5 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Boxes className="w-4 h-4 text-blue-300" />
                  <span>دليل الأقسام</span>
                </Link>
              </div>
            </div>

            {/* Left Column (in RTL): Spotlight Showcase Card with Floating Animation */}
            {spotlightProduct && (
              <div className="lg:col-span-5 hidden lg:block">
                <div className="relative group rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 text-white shadow-2xl transition-all duration-500 hover:border-white/40 animate-float-gentle hover:[animation-play-state:paused]">
                  {/* Glowing Backlight */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 via-transparent to-amber-500/10 rounded-3xl pointer-events-none group-hover:opacity-100 transition-opacity" />

                  {/* Header Badge */}
                  <div className="relative z-10 flex items-center justify-between gap-3 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-md group-hover:scale-105 transition-transform">
                      <Flame className="w-3.5 h-3.5 fill-current text-slate-950" />
                      وصل حديثاً للمستودع
                    </span>
                    <span className="text-xs text-blue-200 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      متوفر للحجز الفوري
                    </span>
                  </div>

                  {/* Spotlight Image */}
                  <div className="relative z-10 aspect-4/3 rounded-2xl bg-slate-900/50 border border-white/10 overflow-hidden flex items-center justify-center p-4 mb-4">
                    {spotlightProduct.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={spotlightProduct.images[0]}
                        alt={spotlightProduct.name}
                        className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <Boxes className="w-16 h-16 text-slate-600" />
                    )}
                  </div>

                  {/* Spotlight Info */}
                  <div className="relative z-10 space-y-3 text-right">
                    <h3 className="font-black text-lg text-white group-hover:text-blue-200 transition-colors line-clamp-1">
                      {spotlightProduct.name}
                    </h3>
                    <p className="text-xs text-blue-100/80 line-clamp-2 leading-relaxed">
                      {spotlightProduct.shortDescription ||
                        'منتج مميز بأعلى مواصفات الجودة متوفر الآن بالمستودع.'}
                    </p>

                    <div className="pt-3 border-t border-white/15 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-blue-200 block font-medium">السعر</span>
                        <span className="text-lg font-black text-white font-mono">
                          {formatMoney(spotlightProduct.retailPrice)}
                        </span>
                      </div>
                      <Link
                        href={`/p/${spotlightProduct.slug}`}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 hover:shadow-blue-500/40 active:scale-95"
                      >
                        <span>حجز الصنف</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. ANNOUNCEMENT & PROMOTIONAL BANNERS SLIDER */}
      <div className="-mt-8 sm:-mt-16 relative z-20 w-full max-w-full">
        <AnnouncementBannerSlider initialBanners={banners} isAdmin={isAdmin} />
      </div>

      {/* 3. CATEGORIES SECTION: Vibrant Visual Grid with Modern Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 w-full max-w-full">
        <ScrollReveal direction="up" durationMs={500}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-700" />
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  تصفح الأقسام الرئيسية
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                اختر القسم المطلوب لاستعراض التشكيلات والخيارات المتاحة بالمستودع
              </p>
            </div>

            <Link
              href="/categories"
              className="text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors flex items-center gap-1 self-start sm:self-auto group"
            >
              <span>عرض كل الأقسام</span>
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>

        {categories.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
            لا توجد أقسام منشورة بعد
          </div>
        ) : (
          <ScrollReveal direction="up" durationMs={600} delayMs={100}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4.5">
              {categories.map((cat, idx) => (
                <Link
                  key={cat.id}
                  href={`/c/${cat.slug}`}
                  className="group relative bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-slate-200/90 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-950/5 hover:-translate-y-2 transition-all duration-300 text-center flex flex-col items-center justify-between gap-3 overflow-hidden cursor-pointer"
                  style={{ transitionDelay: `${idx * 25}ms` }}
                >
                  {/* Subtle Hover Gradient Flare */}
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-50/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200/80 p-2 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 group-hover:rotate-1 transition-all duration-300">
                    {cat.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="font-black text-lg text-blue-700">
                        {cat.name.slice(0, 2)}
                      </div>
                    )}
                  </div>

                  <div className="relative z-10 space-y-1 w-full">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                      {cat.name}
                    </h3>
                    <span className="inline-block text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 font-mono group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200 transition-colors">
                      {cat.productCount} أصناف
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </ScrollReveal>
        )}
      </section>

      {/* 4. FEATURED PRODUCTS: Luxury Branded Product Showcase */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 w-full max-w-full">
          <ScrollReveal direction="up" durationMs={500}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    منتجات مميزة ومختارة
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  أبرز الأصناف الأكثر طلباً مع توفر فوري للمقاسات والألوان
                </p>
              </div>

              <Link
                href="/products"
                className="text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors flex items-center gap-1 self-start sm:self-auto group"
              >
                <span>عرض كل المنتجات ({products.length})</span>
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" durationMs={600} delayMs={100}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
              {featuredProducts.map((p) => (
                <ProductCard key={p.id} product={p} userRole={session?.role} />
              ))}
            </div>
          </ScrollReveal>
        </section>
      )}

      {/* 5. LATEST PRODUCTS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 w-full max-w-full">
        <ScrollReveal direction="up" durationMs={500}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-blue-700" />
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  أحدث المنتجات المضافة
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                بضائع جديدة متوفرة في المستودع وجاهزة للحجز الفوري
              </p>
            </div>

            <Link
              href="/products"
              className="text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors flex items-center gap-1 self-start sm:self-auto group"
            >
              <span>استعراض الكتالوج بالكامل</span>
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>

        {latestProducts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-sm">
            لا توجد منتجات منشورة في المتجر حاليًا
          </div>
        ) : (
          <ScrollReveal direction="up" durationMs={600} delayMs={100}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
              {latestProducts.map((p) => (
                <ProductCard key={p.id} product={p} userRole={session?.role} />
              ))}
            </div>
          </ScrollReveal>
        )}
      </section>

      {/* 6. TRUST BANNER: Direct Wholesale & Retail Ordering Commitment */}
      <ScrollReveal direction="up" durationMs={600}>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full max-w-full">
          <div className="rounded-3xl sm:rounded-4xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-12 relative overflow-hidden shadow-2xl border border-slate-800 transition-all duration-300 hover:border-slate-700">
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
              <div className="absolute top-0 right-0 w-72 h-72 sm:w-96 sm:h-96 bg-blue-600/10 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-right">
              <div className="space-y-3 max-w-2xl">
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  هل تبحث عن أصناف محددة أو كميات خاصة لمتجرك؟
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  فريق متجر الحبيشي جاهز لتلبية طلباتك، توفير الأصناف المتجددة من الألعاب والإكسسوارات والخردوات، وحجز كمياتك فورياً مع فحص وتغليف احترافي.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link
                  href="/products"
                  className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg cursor-pointer hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
                >
                  تصفح المنتجات الآن
                </Link>
                {!session && (
                  <Link
                    href="/register"
                    className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                  >
                    إنشاء حساب جديد
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>
    </div>

    {/* Floating Scroll to Top Micro-Interaction */}
    <ScrollToTop />
  </>
  );
}
