import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { getCurrentSession } from '@/core/auth/require-auth';
import { productRepository } from '@/features/products/infrastructure/firestore-product.repository';
import { categoryRepository } from '@/features/categories/infrastructure/firestore-category.repository';
import { ProductCard } from '@/features/products/components/product-card';
import { Pagination } from '@/shared/ui/pagination';
import { Package, ChevronLeft, Home, Search, SlidersHorizontal, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'كتالوج المنتجات | متجر الحبيشي',
  description: 'استعرض تشكيلة متجر الحبيشي من الألعاب، الإكسسوارات، الأدوات، والأواني المنزلية مع حجز فوري للمخزون.',
};

export const instant = false;

interface ProductsPageProps {
  searchParams: Promise<{ category?: string; search?: string; page?: string }>;
}

export default async function ProductsCatalogPage({ searchParams }: ProductsPageProps) {
  await connection();
  const PAGE_SIZE = 15;
  const { category: categorySlug, search, page: pageStr } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageStr || '1', 10) || 1);

  let session = null;
  let categories: any[] = [];
  try {
    const [sessionRes, categoriesRes] = await Promise.allSettled([
      getCurrentSession(),
      categoryRepository.findAll(true),
    ]);
    session = sessionRes.status === 'fulfilled' ? sessionRes.value : null;
    categories = categoriesRes.status === 'fulfilled' ? categoriesRes.value : [];
  } catch (err) {
    console.error('ProductsPage session/categories error:', err);
  }

  let activeCategoryId: string | undefined;
  let activeCategoryName: string | undefined;
  if (categorySlug) {
    const matchedCategory = categories.find((c) => c.slug === categorySlug);
    if (matchedCategory) {
      activeCategoryId = matchedCategory.id;
      activeCategoryName = matchedCategory.name;
    }
  }

  let allProducts: any[] = [];
  try {
    allProducts = await productRepository.list({
      categoryId: activeCategoryId,
      search: search || undefined,
      isVisible: true,
      status: 'active',
    });
  } catch (err) {
    console.error('ProductsPage products list error:', err);
    allProducts = [];
  }

  const totalProducts = allProducts.length;
  const totalPages = Math.ceil(totalProducts / PAGE_SIZE) || 1;
  const products = allProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams();
    if (categorySlug) params.set('category', categorySlug);
    if (search) params.set('search', search);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/products${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Sleek Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/" className="hover:text-blue-700 flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>الرئيسية</span>
        </Link>
        <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
        <Link href="/products" className="hover:text-blue-700 transition-colors">
          المنتجات
        </Link>
        {activeCategoryName && (
          <>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-bold">{activeCategoryName}</span>
          </>
        )}
      </nav>

      {/* Modern Catalog Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white p-6 sm:p-10 shadow-xl border border-blue-900/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 text-right">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {activeCategoryName || 'جميع المنتجات والأصناف'}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 max-w-xl leading-relaxed font-normal">
              تصفح التشكيلات المتوفرة، اختر المقاسات والألوان المناسبة، وثبّت حجز طلبيتك فورياً.
            </p>
          </div>

          {/* Quick Counter Badge */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <span className="text-2xl font-black text-white font-mono block">
                {totalProducts}
              </span>
              <span className="text-[11px] text-blue-200 font-medium">
                صنف متوفر
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Chips Bar */}
      <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-slate-500 px-2 shrink-0 flex items-center gap-1">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>الأقسام:</span>
        </span>

        <Link
          href="/products"
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            !categorySlug
              ? 'bg-blue-700 text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
          }`}
        >
          الكل ({categories.reduce((acc, c) => acc + c.productCount, 0)})
        </Link>

        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/products?category=${c.slug}`}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              categorySlug === c.slug
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            <span>{c.name}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                categorySlug === c.slug ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
              }`}
            >
              {c.productCount}
            </span>
          </Link>
        ))}
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-md p-16 rounded-3xl border border-slate-200/80 text-center text-slate-500 space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">لا توجد منتجات مطابقة للبحث</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              جرّب اختيار تصنيف آخر أو تصفح الأقسام الأخرى للاطلاع على أحدث البضائع.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold shadow-md hover:bg-blue-800 transition-colors"
          >
            عرض كافة المنتجات
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} userRole={session?.role} />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalProducts}
            pageSize={PAGE_SIZE}
            itemName="صنف"
            getPageHref={buildPageHref}
            className="pt-6 border-t border-slate-200"
          />
        </div>
      )}
    </div>
  );
}
