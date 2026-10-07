'use client';

import React, { useState, useRef, useTransition } from 'react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { toast } from 'sonner';
import {
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import type { Banner } from '../domain/banner';
import {
  createBannerAction,
  updateBannerAction,
  uploadBannerImageAction,
} from '../actions/banner.actions';

interface BannerUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bannerToEdit?: Banner | null;
  onSaved: (banner: Banner) => void;
}

export function BannerUploadDialog({
  isOpen,
  onClose,
  bannerToEdit,
  onSaved,
}: BannerUploadDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  // Sync state when dialog opens or bannerToEdit changes
  React.useEffect(() => {
    if (bannerToEdit) {
      setTitle(bannerToEdit.title);
      setSubtitle(bannerToEdit.subtitle || '');
      setImageUrl(bannerToEdit.imageUrl);
      setLinkUrl(bannerToEdit.linkUrl || '');
      setBadgeText(bannerToEdit.badgeText || '');
      setSortOrder(bannerToEdit.sortOrder.toString());
      setIsActive(bannerToEdit.isActive);
    } else {
      setTitle('');
      setSubtitle('');
      setImageUrl('');
      setLinkUrl('');
      setBadgeText('عرض حصري');
      setSortOrder('0');
      setIsActive(true);
    }
  }, [bannerToEdit, isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await uploadBannerImageAction(formData);
      if (!res.ok) {
        toast.error(res.error.message || 'فشل رفع الصورة');
        return;
      }

      setImageUrl(res.data.url);
      toast.success('تم رفع صورة الإعلان بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء رفع الصورة');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('يرجى كتابة عنوان للإعلان');
      return;
    }
    if (!imageUrl.trim()) {
      toast.error('يرجى رفع صورة الإعلان أولاً');
      return;
    }

    startTransition(async () => {
      try {
        if (bannerToEdit) {
          const res = await updateBannerAction({
            id: bannerToEdit.id,
            title: title.trim(),
            subtitle: subtitle.trim() || null,
            imageUrl: imageUrl.trim(),
            linkUrl: linkUrl.trim() || null,
            badgeText: badgeText.trim() || null,
            sortOrder: parseInt(sortOrder, 10) || 0,
            isActive,
          });

          if (!res.ok) {
            toast.error(res.error.message);
            return;
          }

          toast.success('تم تحديث الإعلان بنجاح');
          onSaved(res.data);
          onClose();
        } else {
          const res = await createBannerAction({
            title: title.trim(),
            subtitle: subtitle.trim() || null,
            imageUrl: imageUrl.trim(),
            linkUrl: linkUrl.trim() || null,
            badgeText: badgeText.trim() || null,
            sortOrder: parseInt(sortOrder, 10) || 0,
            isActive,
          });

          if (!res.ok) {
            toast.error(res.error.message);
            return;
          }

          toast.success('تمت إضافة الإعلان بنجاح');
          onSaved(res.data);
          onClose();
        }
      } catch {
        toast.error('حدث خطأ أثناء حفظ الإعلان');
      }
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={bannerToEdit ? 'تعديل الإعلان الترويجي' : 'رفع وإضافة إعلان جديد'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right pt-2">
        {/* Image Upload Area */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            صورة الإعلان <span className="text-rose-500">*</span>
          </label>

          {imageUrl ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-900 group aspect-16/7 max-h-48">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="معاينة الإعلان"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-white/90 hover:bg-white text-slate-900 text-xs font-bold"
                >
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  تغيير الصورة
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => setImageUrl('')}
                  className="text-xs font-bold"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  حذف
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <span className="text-xs font-bold text-slate-700">جاري رفع ومعالجة الصورة...</span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">انقر هنا لرفع صورة الإعلان من جهازك</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      يُفضل مقاس عريض بنسبة (16:9 أو 21:9) بدقة واضحة (JPG, PNG, WebP)
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Or enter custom image URL directly */}
          <div className="pt-1">
            <details className="text-[11px] text-slate-500">
              <summary className="cursor-pointer hover:text-blue-600 font-medium">
                أو إدخال رابط صورة خارجي مباشرة (URL)
              </summary>
              <div className="mt-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="text-xs ltr font-mono"
                />
              </div>
            </details>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-800">
            عنوان الإعلان <span className="text-rose-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: تشكيلة الصيف الكبرى من الألعاب والهدايا"
            className="text-xs"
            required
          />
        </div>

        {/* Subtitle */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-800">
            الوصف أو النص الفرعي <span className="text-slate-400 font-normal">(اختياري)</span>
          </label>
          <Input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="مثال: خصومات حصرية وتوفر فوري لكافة المقاسات بالمستودع"
            className="text-xs"
          />
        </div>

        {/* Link URL & Badge */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-800">
              رابط التوجيه عند النقر <span className="text-slate-400 font-normal">(اختياري)</span>
            </label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="/products أو /categories"
              className="text-xs ltr font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-800">
              نص الشارة <span className="text-slate-400 font-normal">(اختياري)</span>
            </label>
            <Input
              value={badgeText}
              onChange={(e) => setBadgeText(e.target.value)}
              placeholder="مثال: وصل حديثاً، تخفيض 25%"
              className="text-xs"
            />
          </div>
        </div>

        {/* Sort Order & Active */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-800">ترتيب الظهور</label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-6">
            <label className="text-xs font-bold text-slate-800 cursor-pointer">
              تفعيل ونشر الإعلان
            </label>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPending || isUploading}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isPending || isUploading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" />
                جاري الحفظ...
              </>
            ) : bannerToEdit ? (
              'حفظ التعديلات'
            ) : (
              'نشر الإعلان'
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

