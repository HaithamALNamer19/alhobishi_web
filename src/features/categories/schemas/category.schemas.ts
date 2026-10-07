import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'اسم القسم يجب أن يكون حرفين على الأقل').max(60, 'اسم القسم طويل جدًا'),
  slug: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(300, 'الوصف لا يتجاوز 300 حرف').default(''),
  image: z.string().url('رابط الصورة غير صحيح').nullable().optional().default(null),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string().min(1, 'معرّف القسم مطلوب'),
});

export type CreateCategorySchema = z.infer<typeof createCategorySchema>;
export type UpdateCategorySchema = z.infer<typeof updateCategorySchema>;

