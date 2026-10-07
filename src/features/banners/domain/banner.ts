import { z } from 'zod';

export interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  badgeText?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const createBannerSchema = z.object({
  title: z.string().min(1, 'عنوان الإعلان مطلوب').max(120, 'عنوان الإعلان طويل جداً'),
  subtitle: z.string().max(250, 'الوصف طويل جداً').optional().nullable(),
  imageUrl: z.string().min(1, 'صورة الإعلان مطلوبة'),
  linkUrl: z.string().max(500, 'رابط الإعلان طويل جداً').optional().nullable(),
  badgeText: z.string().max(40, 'نص الشارة طويل جداً').optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateBannerSchema = createBannerSchema.partial().extend({
  id: z.string().min(1, 'معرّف الإعلان مطلوب'),
});

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;

