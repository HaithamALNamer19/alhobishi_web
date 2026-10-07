'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { runAction } from '@/core/actions/run-action';
import type { Result } from '@/core/domain/result';
import { requirePermission } from '@/core/auth/require-auth';
import { Permission } from '@/core/auth/roles';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import {
  createBannerSchema,
  updateBannerSchema,
  type Banner,
  type CreateBannerInput,
  type UpdateBannerInput,
} from '../domain/banner';
import { bannerRepository } from '../infrastructure/firestore-banner.repository';

export async function createBannerAction(
  rawInput: CreateBannerInput
): Promise<Result<Banner>> {
  return runAction(async () => {
    await requirePermission(Permission.CATALOG_MANAGE);
    const data = createBannerSchema.parse(rawInput);

    const banner = await bannerRepository.create(data);

    revalidatePath('/');
    revalidatePath('/admin/banners');
    return banner;
  });
}

export async function updateBannerAction(
  rawInput: UpdateBannerInput
): Promise<Result<Banner>> {
  return runAction(async () => {
    await requirePermission(Permission.CATALOG_MANAGE);
    const data = updateBannerSchema.parse(rawInput);

    const banner = await bannerRepository.update(data);

    revalidatePath('/');
    revalidatePath('/admin/banners');
    return banner;
  });
}

export async function deleteBannerAction(
  id: string
): Promise<Result<{ success: boolean }>> {
  return runAction(async () => {
    await requirePermission(Permission.CATALOG_MANAGE);
    await bannerRepository.delete(id);

    revalidatePath('/');
    revalidatePath('/admin/banners');
    return { success: true };
  });
}

export async function toggleBannerActiveAction(
  id: string,
  isActive: boolean
): Promise<Result<Banner>> {
  return runAction(async () => {
    await requirePermission(Permission.CATALOG_MANAGE);
    const banner = await bannerRepository.update({ id, isActive });

    revalidatePath('/');
    revalidatePath('/admin/banners');
    return banner;
  });
}

export async function uploadBannerImageAction(
  formData: FormData
): Promise<Result<{ url: string }>> {
  return runAction(async () => {
    await requirePermission(Permission.CATALOG_MANAGE);
    const file = formData.get('file');

    if (!file || typeof file === 'string' || !(file instanceof File)) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, { message: 'يرجى اختيار ملف صورة صالح' });
    }

    // Limit size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, { message: 'حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)' });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'banners');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const originalName = file.name || 'banner.jpg';
    const ext = path.extname(originalName).toLowerCase() || '.jpg';
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext)
      ? ext
      : '.jpg';

    const filename = `banner-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${safeExt}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/banners/${filename}`;

    return { url: publicUrl };
  });
}

