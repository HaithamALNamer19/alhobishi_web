import { z } from 'zod';
import { normalizeYemeniPhone } from '@/core/domain/phone';
import { isValidUsername, normalizeUsername } from '../domain/username';

/** Shared by the client form (instant feedback) and the server (authoritative). */
export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .refine(isValidUsername, {
    error: 'اسم المستخدم من 3 إلى 20 حرفًا: أحرف إنجليزية صغيرة وأرقام و _ ويبدأ بحرف.',
  });

export const passwordSchema = z
  .string()
  .min(8, { error: 'كلمة المرور 8 أحرف على الأقل.' })
  .max(128, { error: 'كلمة المرور طويلة جدًا.' });

export const phoneSchema = z
  .string()
  .transform((v, ctx) => {
    const phone = normalizeYemeniPhone(v);
    if (!phone) {
      ctx.issues.push({ code: 'custom', message: 'رقم جوال يمني غير صحيح (مثال: 771234567).', input: v });
      return z.NEVER;
    }
    return phone;
  });

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, { error: 'الاسم قصير جدًا.' })
  .max(60, { error: 'الاسم طويل جدًا.' });

export const registerSchema = z
  .object({
    displayName: displayNameSchema,
    username: usernameSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    error: 'كلمتا المرور غير متطابقتين.',
  });

export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterData = z.output<typeof registerSchema>;

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, { error: 'أدخل كلمة المرور.' }),
});

export type LoginInput = z.input<typeof loginSchema>;

export const idTokenSchema = z.string().min(20).max(4096);

