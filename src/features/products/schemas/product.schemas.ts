import { z } from 'zod';

export const productOptionValueSchema = z.object({
  id: z.string().trim().min(1, 'معرّف القيمة مطلوب'),
  label: z.string().trim().min(1, 'اسم القيمة مطلوب'),
  swatch: z.string().optional(),
});

export const productOptionSchema = z.object({
  key: z.string().trim().min(1, 'مفتاح الخاصية مطلوب'),
  label: z.string().trim().min(1, 'اسم الخاصية مطلوب'),
  displayType: z.enum(['swatch', 'button', 'select']).default('button'),
  values: z.array(productOptionValueSchema).min(1, 'أضف قيمة واحدة على الأقل لكل خاصية'),
});

export const createVariantInputSchema = z.object({
  id: z.string().optional(),
  optionValues: z.record(z.string(), z.string()).default({}),
  label: z.string().trim().min(1, 'تسمية الخيار مطلوبة'),
  sku: z.string().trim().nullable().optional(),
  barcode: z.string().trim().nullable().optional(),
  retailPriceOverride: z.coerce.number().int().min(0, 'السعر لا يمكن أن يكون سالبًا').nullable().optional(),
  wholesalePriceOverride: z.coerce.number().int().min(0, 'سعر الجملة لا يمكن أن يكون سالبًا').nullable().optional(),
  stockQty: z.coerce.number().int().min(0, 'كمية المخزون لا يمكن أن تكون سالبة').default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(2, 'اسم المنتج حرفين على الأقل').max(120, 'اسم المنتج طويل جدًا'),
  slug: z.string().trim().min(2).max(120).optional(),
  shortDescription: z.string().trim().max(300, 'الوصف المختصر لا يتجاوز 300 حرف').default(''),
  description: z.string().trim().max(5000, 'الوصف التفصيلي طويل جدًا').default(''),
  categoryId: z.string().min(1, 'يرجى اختيار القسم'),
  images: z.array(z.string().trim().min(1, 'رابط الصورة مطلوب')).default([]),
  sku: z.string().trim().nullable().optional(),
  barcode: z.string().trim().nullable().optional(),
  retailPrice: z.coerce.number().int().min(0, 'سعر التجزئة لا يمكن أن يكون سالبًا'),
  wholesalePrice: z.coerce.number().int().min(0, 'سعر التاجر لا يمكن أن يكون سالبًا'),
  status: z.enum(['active', 'draft', 'archived']).default('active'),
  isVisible: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  options: z.array(productOptionSchema).default([]),
  variants: z.array(createVariantInputSchema).optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().min(1, 'معرّف المنتج مطلوب'),
});

export const adjustStockSchema = z.object({
  productId: z.string().min(1, 'معرّف المنتج مطلوب'),
  variantId: z.string().min(1, 'معرّف الخيار مطلوب'),
  newStockQty: z.coerce.number().int().min(0, 'الكمية يجب أن تكون صفرًا أو أكبر'),
  reason: z.string().trim().min(3, 'يرجى ذكر سبب تعديل المخزون (مثال: جرد دوري، تالف، توريد)').max(200),
});

export type CreateProductSchema = z.infer<typeof createProductSchema>;
export type UpdateProductSchema = z.infer<typeof updateProductSchema>;
export type AdjustStockSchema = z.infer<typeof adjustStockSchema>;

