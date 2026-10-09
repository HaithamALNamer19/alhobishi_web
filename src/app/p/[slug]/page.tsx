import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getCurrentSession } from '@/core/auth/require-auth';
import { can, Permission, Role } from '@/core/auth/roles';
import { productRepository } from '@/features/products/infrastructure/firestore-product.repository';
import { categoryRepository } from '@/features/categories/infrastructure/firestore-category.repository';
import { ProductGallery } from '@/features/products/components/product-gallery';
import { VariantPicker } from '@/features/products/components/variant-picker';
import { ProductCard } from '@/features/products/components/product-card';
import {
  ChevronLeft,
  Home,
  Tag,
  Barcode,
  Sparkles,
  FileText,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export const instant = false;

export default async function ProductDetailPage({ params }: ProductPageProps) {
  await connection();
  const { slug } = await params;

  let session = null;
  let product = null;
  try {
    const [sessionRes, productRes] = await Promise.allSettled([
      getCurrentSession(),
      productRepository.findDetailBySlug(slug),
    ]);
    session = sessionRes.status === 'fulfilled' ? sessionRes.value : null;
    product = productRes.status === 'fulfilled' ? productRes.value : null;
  } catch (err) {
    console.error('ProductDetailPage error:', err);
  }

  const isAdmin = session?.role === Role.ADMIN || can(session?.role, Permission.CATALOG_MANAGE);

  if (!product || ((!product.isVisible || product.status !== 'active') && !isAdmin)) {
    notFound();
  }

  let category = null;
  let relatedProductsList: any[] = [];
  try {
    const [catRes, relRes] = await Promise.allSettled([
      categoryRepository.findById(product.categoryId),
      productRepository.list({
        categoryId: product.categoryId,
        isVisible: true,
        status: 'active',
        limit: 6,
      }),
    ]);
    category = catRes.status === 'fulfilled' ? catRes.value : null;
    relatedProductsList = relRes.status === 'fulfilled' ? relRes.value : [];
  } catch (err) {
    relatedProductsList = [];
  }

  // If the category is hidden/inactive, hide the product from customers
  if ((!category || !category.isActive) && !isAdmin) {
    notFound();
  }

  // Only load wholesale pricing internally on server if user has permission
  const canSeeWholesale = can(session?.role, Permission.PRICES_VIEW_WHOLESALE);
  const pricing = canSeeWholesale
    ? await productRepository.findPricing(product.id)
    : null;

  // Filter out the current product from related items
  const relatedProducts = relatedProductsList
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* Sleek Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium overflow-x-auto pb-1">
        <Link
          href="/"
          className="hover:text-blue-700 flex items-center gap-1 transition-colors shrink-0"
        >
          <Home className="w-3.5 h-3.5" />
          <span>الرئيسية</span>
        </Link>
        <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        {category && (
          <>
            <Link
              href={`/c/${category.slug}`}
              className="hover:text-blue-700 transition-colors shrink-0 px-2 py-0.5 rounded-md hover:bg-slate-100"
            >
              {category.name}
            </Link>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </>
        )}
        <span className="text-slate-900 font-bold truncate max-w-xs sm:max-w-md">
          {product.name}
        </span>
      </nav>

      {/* Main Product Showcase Shell */}
      <div className="bg-white/95 backdrop-blur-xl rounded-4xl border border-slate-200/90 shadow-xl shadow-slate-900/5 p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left/Start Column: Interactive Image Gallery (6 cols) */}
          <div className="lg:col-span-6 lg:sticky lg:top-24">
            <ProductGallery
              images={product.images}
              productName={product.name}
            />
          </div>

          {/* Right/End Column: Title, Metadata & Variant Picker (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Header Info */}
            <div className="space-y-3">
              {/* Meta Tags Row */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {category && (
                  <Link
                    href={`/c/${category.slug}`}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                  >
                    <Tag className="w-3 h-3" />
                    <span>{category.name}</span>
                  </Link>
                )}
                {product.sku && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-mono font-medium border border-slate-200">
                    <Barcode className="w-3 h-3 text-slate-400" />
                    <span>SKU: {product.sku}</span>
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                {product.name}
              </h1>

              {/* Short Description */}
              {product.shortDescription && (
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  {product.shortDescription}
                </p>
              )}
            </div>

            {/* Interactive Variant Picker & Add to Cart */}
            <VariantPicker
              product={product}
              pricing={pricing}
              userRole={session?.role}
            />
          </div>
        </div>
      </div>

      {/* Product Details & Purchase Workflow Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Detailed Description (2 cols) */}
        <div className="lg:col-span-2 bg-white/95 backdrop-blur-md p-7 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <FileText className="w-5 h-5 text-blue-700" />
            <h2 className="text-lg font-bold text-slate-900">
              المواصفات وتفاصيل المنتج
            </h2>
          </div>
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
            {product.description || product.shortDescription || 'لا توجد مواصفات إضافية مسجلة لهذا الصنف.'}
          </div>
        </div>

        {/* Order Policy & Workflow Info (1 col) */}
        <div className="bg-slate-50/80 p-7 rounded-3xl border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Clock className="w-5 h-5 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              دورة الطلب والحجز
            </h3>
          </div>
          <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>
                <strong>حجز فوري:</strong> يتم حجز الكمية تلقائياً من المستودع بمجرد إرسال الطلب.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>
                <strong>تعديل الفاتورة:</strong> يمكنك تعديل الكميات أو حذف وإضافة أصناف بحرية حتى تأكيد الجهوزية.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>
                <strong>فحص الجودة:</strong> يقوم موظف التجهيز بمراجعة وفحص الأصناف بنداً بنداً قبل الاستلام.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Related Products in the same category */}
      {relatedProducts.length > 0 && (
        <section className="space-y-6 pt-6 border-t border-slate-200/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-700" />
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                منتجات مشابهة قد تهمك
              </h2>
            </div>
            {category && (
              <Link
                href={`/c/${category.slug}`}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors"
              >
                عرض كل أصناف القسم ←
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((relProduct) => (
              <ProductCard
                key={relProduct.id}
                product={relProduct}
                userRole={session?.role}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
