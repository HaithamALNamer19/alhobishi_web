import { z } from 'zod';

export const createSalesReturnSchema = z.object({
  customerId: z.string().min(1, 'يجب تحديد العميل'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        productName: z.string().min(1),
        variantId: z.string().min(1),
        variantLabel: z.string().min(1),
        quantity: z.number().int().positive('الكمية يجب أن تكون أكبر من صفر'),
        unitPrice: z.number().min(0, 'السعر لا يمكن أن يكون سالباً'),
      })
    )
    .min(1, 'يجب إضافة صنف واحد على الأقل للمردود'),
  reason: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
});

export type CreateSalesReturnInput = z.infer<typeof createSalesReturnSchema>;
