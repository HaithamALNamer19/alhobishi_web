'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Package,
  Plus,
  Search,
  Layers,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Pagination } from '@/shared/ui/pagination';
import { formatMoney } from '@/core/domain/money';
import type { Product } from '../domain/product';
import type { Category } from '@/features/categories/domain/category';
import { deleteProductAction, updateProductAction } from '../actions/product.actions';

interface ProductListTableProps {
  initialProducts: Product[];
  categories: Category[];
}

export function ProductListTable({
  initialProducts,
  categories,
}: ProductListTableProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const categoryObjMap = new Map(categories.map((c) => [c.id, c]));

  // Client-side filtering for fast interactive search
  const filteredProducts = products.filter((p) => {
    if (categoryFilter && p.categoryId !== categoryFilter) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
      if (!matchName && !matchSku) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE
  );

  const handleToggleVisibility = (product: Product) => {
    startTransition(async () => {
      const res = await updateProductAction({
        id: product.id,
        isVisible: !product.isVisible,
      });

      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }

      toast.success(product.isVisible ? 'تم إخفاء المنتج من المتجر' : 'تم إظهار المنتج في المتجر');
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isVisible: !product.isVisible } : p))
      );
      router.refresh();
    });
  };

  const confirmDelete = () => {
    if (!deletingId) return;

    startTransition(async () => {
      const res = await deleteProductAction(deletingId);
      if (!res.ok) {
        toast.error(res.error.message);
        setDeletingId(null);
        return;
      }

      toast.success('تم حذف المنتج بنجاح');
      setProducts((prev) => prev.filter((p) => p.id !== deletingId));
      setDeletingId(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-700" />
            <span>المنتجات والمخزون</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            إدارة كتالوج المنتجات، الأسعار المزدوجة، ومخزون المتغيرات.
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>إضافة منتج جديد</span>
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث بالاسم أو رمز SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 flex-1 md:w-44"
          >
            <option value="">جميع الأقسام</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {!c.isActive ? '(معطل)' : ''}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 w-32"
          >
            <option value="">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="draft">مسودة</option>
            <option value="archived">مؤرشف</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-700">لا توجد منتجات مطابقة للبحث</p>
            <p className="text-xs text-slate-400 mt-1">جرّب تغيير فلاتر البحث أو أضف منتجًا جديدًا</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">المنتج</th>
                  <th className="py-3.5 px-4">القسم</th>
                  <th className="py-3.5 px-4">سعر التجزئة</th>
                  <th className="py-3.5 px-4 text-center">المتغيرات</th>
                  <th className="py-3.5 px-4 text-center">حالة المخزون</th>
                  <th className="py-3.5 px-4 text-center">الظهور</th>
                  <th className="py-3.5 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        {p.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-11 h-11 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                            <Package className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="hover:text-blue-700 transition-colors"
                          >
                            {p.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5 text-xs font-normal text-slate-400 font-mono">
                            {p.sku && <span>SKU: {p.sku}</span>}
                            <span>/p/{p.slug}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs font-medium text-slate-600">
                      {(() => {
                        const cat = categoryObjMap.get(p.categoryId);
                        const isCategoryHidden = cat && !cat.isActive;
                        return (
                          <div className="flex flex-col items-start gap-1">
                            <Badge variant={isCategoryHidden ? 'danger' : 'outline'}>
                              {cat?.name || 'غير مصنف'}
                            </Badge>
                            {isCategoryHidden && (
                              <span className="text-[10px] text-rose-600 font-bold">القسم معطل/مخفي</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-900">
                      {p.retailPriceRange.min !== p.retailPriceRange.max ? (
                        <span>
                          {formatMoney(p.retailPriceRange.min)} - {formatMoney(p.retailPriceRange.max)}
                        </span>
                      ) : (
                        <span>{formatMoney(p.retailPrice)}</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      {p.hasVariants ? (
                        <Badge variant="neutral" className="gap-1">
                          <Layers className="w-3 h-3 text-indigo-500" />
                          <span>متعدد الخيارات</span>
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">خيار واحد</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      {p.inStock ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" /> متوفر
                        </Badge>
                      ) : (
                        <Badge variant="danger" className="gap-1">
                          <XCircle className="w-3 h-3" /> نفد المخزون
                        </Badge>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      {(() => {
                        const cat = categoryObjMap.get(p.categoryId);
                        const isCategoryHidden = cat && !cat.isActive;
                        if (isCategoryHidden) {
                          return (
                            <div className="flex flex-col items-center gap-0.5" title="المنتج مخفي تلقائيًا من المتجر لأن القسم التابع له معطل">
                              <Badge variant="neutral" className="gap-1 opacity-75">
                                <EyeOff className="w-3 h-3 text-rose-500" /> مخفي
                              </Badge>
                              <span className="text-[9px] text-rose-500 font-medium">القسم معطل</span>
                            </div>
                          );
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => handleToggleVisibility(p)}
                            disabled={isPending}
                            className="cursor-pointer transition-transform active:scale-95 inline-flex"
                            title={p.isVisible ? 'إخفاء من المتجر' : 'إظهار في المتجر'}
                          >
                            {p.isVisible ? (
                              <Badge variant="success" className="gap-1 cursor-pointer">
                                <Eye className="w-3 h-3" /> ظاهر
                              </Badge>
                            ) : (
                              <Badge variant="neutral" className="gap-1 cursor-pointer">
                                <EyeOff className="w-3 h-3" /> مخفي
                              </Badge>
                            )}
                          </button>
                        );
                      })()}
                    </td>

                    <td className="py-4 px-4 text-left">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/products/${p.id}/edit?returnUrl=/admin/products`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-50 flex items-center gap-1 font-bold"
                            title="تعديل بيانات المنتج"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </Button>
                        </Link>
                        <Link href={`/admin/products/${p.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1"
                            title="عرض وإدارة المخزون"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>المخزون</span>
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(p.id)}
                          className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-slate-200 bg-slate-50/50">
            <Pagination
              currentPage={activePage}
              totalPages={totalPages}
              totalItems={filteredProducts.length}
              pageSize={PAGE_SIZE}
              itemName="منتج"
              onPageChange={setCurrentPage}
            />
          </div>
        </>
      )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title="تأكيد حذف المنتج"
        description="هل أنت متأكد من حذف هذا المنتج وجميع خياراته وسجلات أسعاره؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="نعم، احذف المنتج"
        cancelLabel="إلغاء"
        variant="danger"
        isLoading={isPending}
      />
    </div>
  );
}
