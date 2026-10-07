import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { getCurrentSession } from '@/core/auth/require-auth';
import { productRepository } from '@/features/products/infrastructure/firestore-product.repository';
import { ProductCard } from '@/features/products/components/product-card';
import { Search, Home, ChevronLeft, Package } from 'lucide-react';

export const metadata = {
  title: 'نتائج البحث | المتجر',
};

export const instant = false;

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  await connection();
  const { q } = await searchParams;
  const session = await getCurrentSession();

  const query = q?.trim() || '';
  const products = query
    ? await productRepository.list({
        search: query,
        isVisible: true,
        status: 'active',
      })
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/" className="hover:text-blue-700 flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>الرئيسية</span>
        </Link>
        <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-800 font-bold">البحث</span>
      </nav>

      {/* Search Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Search className="w-6 h-6 text-blue-700" />
            <span>البحث عن المنتجات</span>
          </h1>
          {query && (
            <p className="text-xs text-slate-500 mt-1">
              نتائج البحث عن: <span className="font-bold text-slate-800">"{query}"</span> ({products.length} نتيجة)
            </p>
          )}
        </div>

        {/* Search Input Box */}
        <form action="/search" method="GET" className="max-w-xl">
          <div className="relative">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="اكتب اسم المنتج أو الصنف أو الرمز..."
              className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 rounded-2xl py-3 pr-11 pl-24 text-sm font-medium border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="submit"
              className="absolute left-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              بحث
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {!query ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          أدخل كلمة البحث في المربع أعلاه لعرض النتائج
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200/80 text-center text-slate-500 space-y-3">
          <Package className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">لم يتم العثور على أي منتج</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            تأكد من كتابة الكلمة بشكل صحيح، أو جرّب البحث بكلمة عامة أكثر.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} userRole={session?.role} />
          ))}
        </div>
      )}
    </div>
  );
}
