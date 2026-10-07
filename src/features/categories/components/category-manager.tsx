'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, FolderTree, ArrowUpDown, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Dialog } from '@/shared/ui/dialog';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import type { Category } from '../domain/category';
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from '../actions/category.actions';

interface CategoryManagerProps {
  initialCategories: Category[];
}

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  // Delete dialog state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setImage('');
    setSortOrder('0');
    setIsActive(true);
    setIsDialogOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setImage(cat.image || '');
    setSortOrder(cat.sortOrder.toString());
    setIsActive(cat.isActive);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('اسم القسم مطلوب');
      return;
    }

    startTransition(async () => {
      try {
        if (editingCategory) {
          const res = await updateCategoryAction({
            id: editingCategory.id,
            name: name.trim(),
            slug: slug.trim() || undefined,
            description: description.trim(),
            image: image.trim() || null,
            sortOrder: parseInt(sortOrder, 10) || 0,
            isActive,
          });

          if (!res.ok) {
            toast.error(res.error.message);
            return;
          }

          toast.success('تم تحديث القسم بنجاح');
          setCategories((prev) =>
            prev.map((c) => (c.id === editingCategory.id ? res.data : c))
          );
        } else {
          const res = await createCategoryAction({
            name: name.trim(),
            slug: slug.trim() || undefined,
            description: description.trim(),
            image: image.trim() || null,
            sortOrder: parseInt(sortOrder, 10) || 0,
            isActive,
          });

          if (!res.ok) {
            toast.error(res.error.message);
            return;
          }

          toast.success('تمت إضافة القسم بنجاح');
          setCategories((prev) => [...prev, res.data]);
        }

        setIsDialogOpen(false);
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || 'حدث خطأ غير متوقع');
      }
    });
  };

  const handleToggleActive = (cat: Category) => {
    startTransition(async () => {
      const res = await updateCategoryAction({
        id: cat.id,
        isActive: !cat.isActive,
      });

      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }

      toast.success(cat.isActive ? 'تم تعطيل القسم' : 'تم تفعيل القسم');
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isActive: !cat.isActive } : c))
      );
      router.refresh();
    });
  };

  const confirmDelete = () => {
    if (!deletingId) return;

    startTransition(async () => {
      const res = await deleteCategoryAction(deletingId);
      if (!res.ok) {
        toast.error(res.error.message);
        setDeletingId(null);
        return;
      }

      toast.success('تم حذف القسم بنجاح');
      setCategories((prev) => prev.filter((c) => c.id !== deletingId));
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
            <FolderTree className="w-6 h-6 text-blue-700" />
            <span>إدارة الأقسام</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            إضافة وتعديل الأقسام والتحكم في ظهورها وترتيبها في المتجر.
          </p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>إضافة قسم جديد</span>
        </Button>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FolderTree className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-700">لا توجد أقسام مضافة بعد</p>
            <p className="text-xs text-slate-400 mt-1">ابدأ بإضافة أول قسم في متجرك الآن</p>
            <Button onClick={openCreateModal} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 ml-1" />
              إضافة قسم
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">القسم</th>
                  <th className="py-3.5 px-4">الرابط المخصص (Slug)</th>
                  <th className="py-3.5 px-4 text-center">الترتيب</th>
                  <th className="py-3.5 px-4 text-center">عدد المنتجات</th>
                  <th className="py-3.5 px-4 text-center">الحالة</th>
                  <th className="py-3.5 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        {cat.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-black text-xs shrink-0 border border-blue-100">
                            {cat.name.slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <div>{cat.name}</div>
                          {cat.description && (
                            <div className="text-xs font-normal text-slate-400 truncate max-w-xs mt-0.5">
                              {cat.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-mono text-xs">
                      /c/{cat.slug}
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-slate-600">
                      {cat.sortOrder}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Badge variant="outline" className="font-mono">
                        {cat.productCount} منتج
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(cat)}
                        disabled={isPending}
                        className="cursor-pointer transition-transform active:scale-95 inline-flex"
                        title={cat.isActive ? 'اضغط لتعطيل القسم' : 'اضغط لتفعيل القسم'}
                      >
                        {cat.isActive ? (
                          <Badge variant="success" className="gap-1 cursor-pointer">
                            <Check className="w-3 h-3" /> نشط
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="gap-1 cursor-pointer">
                            <X className="w-3 h-3" /> معطل
                          </Badge>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-left">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(cat)}
                          className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(cat.id)}
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
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingCategory ? 'تعديل بيانات القسم' : 'إضافة قسم جديد'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="اسم القسم *"
            placeholder="مثال: الألعاب، أدوات منزلية..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="الرابط المخصص (Slug) - اختياري"
            placeholder="يتم توليده تلقائيًا من الاسم إذا ترك فارغًا"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            dir="ltr"
            className="text-left font-mono text-sm"
          />

          <Input
            label="رابط صورة القسم (URL) - اختياري"
            placeholder="https://example.com/category-image.jpg"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            dir="ltr"
            className="text-left font-mono text-sm"
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              الوصف المختصر للقسم
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="نبذة عن منتجات هذا القسم..."
              rows={3}
              className="w-full text-sm rounded-xl border border-slate-200 p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="ترتيب الظهور"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              min="0"
            />

            <div className="flex flex-col justify-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-600"
                />
                <span className="text-sm font-bold text-slate-700">قسم نشط في المتجر</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isPending}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending} className="flex items-center gap-2">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingCategory ? 'حفظ التعديلات' : 'إنشاء القسم'}</span>
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title="تأكيد حذف القسم"
        description="هل أنت متأكد من حذف هذا القسم؟ لا يمكن الحذف إذا كانت هناك منتجات مرتبطة به."
        confirmLabel="نعم، احذف القسم"
        cancelLabel="تراجع"
        variant="danger"
        isLoading={isPending}
      />
    </div>
  );
}
