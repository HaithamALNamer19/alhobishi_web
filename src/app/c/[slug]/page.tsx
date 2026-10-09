import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getCurrentSession } from '@/core/auth/require-auth';
import { categoryRepository } from '@/features/categories/infrastructure/firestore-category.repository';
import { productRepository } from '@/features/products/infrastructure/firestore-product.repository';
import { ProductCard } from '@/features/products/components/product-card';
import { UrlPagination } from '@/shared/ui/url-pagination';
import { ChevronLeft, FolderTree, Home, Package, ArrowLeft } from 'lucide-react';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export const instant = false;

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  await connection();
  const PAGE_SIZE = 15;
  const [{ slug }, { page: pageStr }] = await Promise.all([params, searchParams]);
  const currentPage = Math.max(1, parseInt(pageStr || '1', 10) || 1);

  let category = null;
  try {
    category = await categoryRepository.findBySlug(slug);
  } catch (err) {
    console.error('CategoryPage error finding category:', err);
  }
  if (!category || !category.isActive) {
    notFound();
  }

  let session = null;
  let allProducts: any[] = [];
  try {
    const [sessionRes, productsRes] = await Promise.allSettled([
      getCurrentSession(),
      productRepository.list({
        categoryId: category.id,
        isVisible: true,
        status: 'active',
      }),
    ]);
    session = sessionRes.status === 'fulfilled' ? sessionRes.value : null;
    allProducts = productsRes.status === 'fulfilled' ? productsRes.value : [];
  } catch (err) {
    console.error('CategoryPage products list error:', err);
    allProducts = [];
  }

  const totalProducts = allProducts.length;
  const totalPages = Math.ceil(totalProducts / PAGE_SIZE) || 1;
  const products = allProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const buildPageHref = (p: number) => {
    return `/c/${slug}${p > 1 ? `?page=${p}` : ''}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/" className="hover:text-blue-700 flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>الرئيسية</span>
        </Link>
        <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
        <Link href="/categories" className="hover:text-blue-700 transition-colors">
          الأقسام
        </Link>
        <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">{category.name}</span>
      </nav>

      {/* Category Header Banner with Luxury Atmosphere */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white p-6 sm:p-10 shadow-xl border border-blue-900/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-right">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2 flex items-center justify-center shrink-0 shadow-lg">
              {category.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <FolderTree className="w-8 h-8 text-blue-300" />
              )}
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-xs sm:text-sm text-blue-100/80 max-w-xl leading-relaxed font-normal">
                  {category.description}
                </p>
              )}
            </div>
          </div>

          <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center self-start sm:self-auto shrink-0">
            <span className="text-2xl font-black text-white font-mono block">
              {totalProducts}
            </span>
            <span className="text-[11px] text-blue-200 font-medium">
              صنف متوفر
            </span>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-md p-16 rounded-3xl border border-slate-200/80 text-center text-slate-500 space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">لا توجد منتجات في هذا القسم حاليًا</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              سيتم إضافة وتحديث منتجات جديدة في هذا القسم قريبًا. يمكنك تصفح الأقسام الأخرى.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold shadow-md hover:bg-blue-800 transition-colors"
            >
              <span>تصفح كل المنتجات</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} userRole={session?.role} />
            ))}
          </div>

          <UrlPagination
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
