'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ArrowUpDown,
  Home,
  CheckCircle2,
} from 'lucide-react';
import type { Banner } from '../domain/banner';
import {
  deleteBannerAction,
  toggleBannerActiveAction,
} from '../actions/banner.actions';
import { BannerUploadDialog } from './banner-upload-dialog';

interface AdminBannersViewProps {
  initialBanners: Banner[];
}

export function AdminBannersView({ initialBanners }: AdminBannersViewProps) {
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingBanner(null);
    setIsUploadOpen(true);
  };

  const handleOpenEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setIsUploadOpen(true);
  };

  const handleToggleActive = (banner: Banner) => {
    startTransition(async () => {
      try {
        const res = await toggleBannerActiveAction(banner.id, !banner.isActive);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        toast.success(res.data.isActive ? 'تم تفعيل الإعلان' : 'تم تعطيل الإعلان');
        setBanners((prev) =>
          prev.map((b) => (b.id === banner.id ? res.data : b))
        );
      } catch {
        toast.error('حدث خطأ أثناء تعديل حالة الإعلان');
      }
    });
  };

  const handleDelete = () => {
    if (!deletingId) return;

    startTransition(async () => {
      try {
        const res = await deleteBannerAction(deletingId);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        toast.success('تم حذف الإعلان بنجاح');
        setBanners((prev) => prev.filter((b) => b.id !== deletingId));
        setDeletingId(null);
      } catch {
        toast.error('حدث خطأ أثناء حذف الإعلان');
      }
    });
  };

  const handleBannerSaved = (saved: Banner) => {
    setBanners((prev) => {
      const exists = prev.some((b) => b.id === saved.id);
      const list = exists
        ? prev.map((b) => (b.id === saved.id ? saved : b))
        : [...prev, saved];
      return list.sort((a, b) => a.sortOrder - b.sortOrder);
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-blue-700" />
            <span>إدارة الإعلانات والبنرات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            رفع صور البنرات الإعلانية لشريط الصفحة الرئيسية وتحديد الروابط الترويجية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>معاينة في المتجر</span>
          </Link>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
          >
            <Plus className="w-4 h-4 ml-1" />
            رفع إعلان جديد
          </Button>
        </div>
      </div>

      {/* Banners Grid / List */}
      {banners.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <ImageIcon className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">لا توجد إعلانات منشورة بعد</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              قم برفع صور إعلانية جذابة لعرضها في السلايدر المتحرك في الصفحة الرئيسية للمتجر لجذب العملاء للعروض والمنتجات.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
          >
            <Plus className="w-4 h-4 ml-1" />
            رفع أول إعلان الآن
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((b) => (
            <div
              key={b.id}
              className={`rounded-3xl border overflow-hidden transition-all flex flex-col justify-between ${
                b.isActive
                  ? 'bg-white border-slate-200/90 shadow-md hover:shadow-lg'
                  : 'bg-slate-50 border-slate-200 opacity-70'
              }`}
            >
              {/* Image Preview Banner */}
              <div className="relative aspect-16/7 bg-slate-900 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.imageUrl}
                  alt={b.title}
                  className="w-full h-full object-cover"
                />

                {/* Status Badges Overlay */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md shadow-xs ${
                      b.isActive
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-slate-800/90 text-slate-300'
                    }`}
                  >
                    {b.isActive ? 'مفعّل ونشط' : 'معطّل مؤقتاً'}
                  </span>

                  {b.badgeText && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-600/90 text-white backdrop-blur-md shadow-xs">
                      {b.badgeText}
                    </span>
                  )}
                </div>

                <div className="absolute bottom-3 left-3">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                    ترتيب: {b.sortOrder}
                  </span>
                </div>
              </div>

              {/* Banner Details */}
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h3 className="font-black text-sm text-slate-900 leading-snug">
                    {b.title}
                  </h3>
                  {b.subtitle && (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {b.subtitle}
                    </p>
                  )}
                  {b.linkUrl && (
                    <div className="pt-1 flex items-center gap-1 text-[11px] text-blue-600 font-mono">
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate" dir="ltr">{b.linkUrl}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(b)}
                    disabled={isPending}
                    className={`text-xs font-bold ${
                      b.isActive
                        ? 'text-amber-700 hover:bg-amber-50'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {b.isActive ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 ml-1" />
                        تعطيل
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 ml-1" />
                        تفعيل
                      </>
                    )}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(b)}
                      disabled={isPending}
                      className="text-xs font-bold text-slate-700"
                    >
                      <Edit2 className="w-3.5 h-3.5 ml-1" />
                      تعديل
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => setDeletingId(b.id)}
                      disabled={isPending}
                      className="text-xs font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5 ml-1" />
                      حذف
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload/Edit Modal */}
      <BannerUploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        bannerToEdit={editingBanner}
        onSaved={handleBannerSaved}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        title="تأكيد حذف الإعلان"
        description="هل أنت متأكد من حذف هذا الإعلان بشكل نهائي؟ لن يظهر في الصفحة الرئيسية مجدداً."
        confirmLabel="حذف نهائي"
        cancelLabel="تراجع"
        variant="danger"
        isLoading={isPending}
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
      />
    </div>
  );
}

