'use client';

import React, { useState, useTransition } from 'react';
import { Dialog } from '@/shared/ui/dialog';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Button } from '@/shared/ui/button';
import { toast } from 'sonner';
import {
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type { Banner } from '../domain/banner';
import {
  deleteBannerAction,
  toggleBannerActiveAction,
} from '../actions/banner.actions';
import { BannerUploadDialog } from './banner-upload-dialog';

interface BannerManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  banners: Banner[];
  onBannersUpdated: (banners: Banner[]) => void;
}

export function BannerManagerDialog({
  isOpen,
  onClose,
  banners,
  onBannersUpdated,
}: BannerManagerDialogProps) {
  const [isPending, startTransition] = useTransition();
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
        const updated = banners.map((b) => (b.id === banner.id ? res.data : b));
        onBannersUpdated(updated);
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
        const updated = banners.filter((b) => b.id !== deletingId);
        onBannersUpdated(updated);
        setDeletingId(null);
      } catch {
        toast.error('حدث خطأ أثناء حذف الإعلان');
      }
    });
  };

  const handleBannerSaved = (saved: Banner) => {
    const exists = banners.some((b) => b.id === saved.id);
    const updated = exists
      ? banners.map((b) => (b.id === saved.id ? saved : b))
      : [...banners, saved];

    // sort
    updated.sort((a, b) => a.sortOrder - b.sortOrder);
    onBannersUpdated(updated);
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title="إدارة شريط الإعلانات والبنرات"
      >
        <div className="space-y-4 text-right pt-1">
          {/* Top Bar with Add Button */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <p className="text-xs font-bold text-slate-800">
                إعلانات المتجر المتاحة ({banners.length})
              </p>
              <p className="text-[11px] text-slate-500">
                تظهر هذه الإعلانات في الشريط التفاعلي أعلى الصفحة الرئيسية
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleOpenAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 ml-1" />
              رفع إعلان جديد
            </Button>
          </div>

          {/* Banners List */}
          {banners.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 mx-auto flex items-center justify-center">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">لا توجد إعلانات مرفوعة بعد</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  اضغط على زر "رفع إعلان جديد" بالأعلى لرفع أول صورة إعلان لمتجرك
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenAdd}
                className="text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                رفع إعلان الآن
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    b.isActive
                      ? 'bg-white border-slate-200/90 shadow-2xs hover:border-blue-400'
                      : 'bg-slate-50/70 border-slate-200 opacity-60'
                  }`}
                >
                  {/* Banner Preview Thumbnail & Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={b.imageUrl}
                        alt={b.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-900 truncate">
                          {b.title}
                        </h4>
                        {b.badgeText && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold shrink-0">
                            {b.badgeText}
                          </span>
                        )}
                      </div>
                      {b.subtitle && (
                        <p className="text-[11px] text-slate-500 truncate">
                          {b.subtitle}
                        </p>
                      )}
                      {b.linkUrl && (
                        <p className="text-[10px] text-slate-400 ltr font-mono truncate">
                          {b.linkUrl}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Toggle Active Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(b)}
                      disabled={isPending}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        b.isActive
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-slate-400 bg-slate-100 hover:bg-slate-200'
                      }`}
                      title={b.isActive ? 'تعطيل الإعلان' : 'تفعيل الإعلان'}
                    >
                      {b.isActive ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(b)}
                      disabled={isPending}
                      className="p-2 rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                      title="تعديل الإعلان"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setDeletingId(b.id)}
                      disabled={isPending}
                      className="p-2 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                      title="حذف الإعلان"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Upload/Edit Modal */}
      <BannerUploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        bannerToEdit={editingBanner}
        onSaved={handleBannerSaved}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        title="تأكيد حذف الإعلان"
        description="هل أنت متأكد من حذف هذا الإعلان نهائياً من شريط الإعلانات؟"
        confirmLabel="حذف نهائي"
        cancelLabel="تراجع"
        variant="danger"
        isLoading={isPending}
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
      />
    </>
  );
}

