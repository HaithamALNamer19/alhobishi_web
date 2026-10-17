'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { runAction } from '@/core/actions/run-action';
import type { Result } from '@/core/domain/result';
import { requirePermission, requireSession } from '@/core/auth/require-auth';
import { Permission, can } from '@/core/auth/roles';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import {
  type StoreSettings,
  type UpdateStoreSettingsInput,
  updateStoreSettingsSchema,
} from '../domain/store-settings';
import { storeSettingsRepository } from '../infrastructure/firestore-store-settings.repository';

export async function getStoreSettingsAction(): Promise<Result<StoreSettings>> {
  return runAction(async () => {
    return await storeSettingsRepository.getSettings();
  });
}

export async function updateStoreSettingsAction(
  rawInput: UpdateStoreSettingsInput
): Promise<Result<StoreSettings>> {
  return runAction(async () => {
    const session = await requireSession();
    const hasPermission =
      can(session.role, Permission.SETTINGS_MANAGE) ||
      can(session.role, Permission.USERS_MANAGE_ROLES);

    if (!hasPermission) {
      throw new AppError(ErrorCode.FORBIDDEN, {
        message: 'ليس لديك صلاحية لتعديل إعدادات المتجر',
      });
    }

    const data = updateStoreSettingsSchema.parse(rawInput);
    const updated = await storeSettingsRepository.updateSettings(data, session.uid);

    // Revalidate paths that display store information
    revalidatePath('/admin');
    revalidatePath('/admin/settings');
    revalidatePath('/');
    revalidatePath('/layout');

    return updated;
  });
}

export async function uploadStoreLogoAction(
  formData: FormData
): Promise<Result<{ url: string }>> {
  return runAction(async () => {
    const session = await requireSession();
    const hasPermission =
      can(session.role, Permission.SETTINGS_MANAGE) ||
      can(session.role, Permission.USERS_MANAGE_ROLES);

    if (!hasPermission) {
      throw new AppError(ErrorCode.FORBIDDEN, {
        message: 'ليس لديك صلاحية لرفع شعار المتجر',
      });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, {
        message: 'لم يتم اختيار أي ملف',
      });
    }

    // Check size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, {
        message: 'حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت',
      });
    }

    // Check mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, {
        message: 'نوع الملف غير مدعوم. الصيغ المدعومة: JPG, PNG, WEBP, SVG',
      });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'store');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = file.name.split('.').pop() || 'png';
    const filename = `logo-${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/store/${filename}`;
    return { url: publicUrl };
  });
}
