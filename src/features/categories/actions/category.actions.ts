'use server';

import { revalidatePath } from 'next/cache';
import { runAction } from '@/core/actions/run-action';
import type { Result } from '@/core/domain/result';
import { requirePermission } from '@/core/auth/require-auth';
import { Permission } from '@/core/auth/roles';
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategorySchema,
  type UpdateCategorySchema,
} from '../schemas/category.schemas';
import { categoryRepository } from '../infrastructure/firestore-category.repository';
import type { Category } from '../domain/category';

export async function createCategoryAction(
  rawInput: CreateCategorySchema
): Promise<Result<Category>> {
  return runAction(async () => {
    const admin = await requirePermission(Permission.CATALOG_MANAGE);
    const data = createCategorySchema.parse(rawInput);

    const category = await categoryRepository.create(
      data,
      admin.uid,
      admin.email || 'Admin'
    );

    revalidatePath('/admin/categories');
    revalidatePath('/categories');
    revalidatePath('/');
    return category;
  });
}

export async function updateCategoryAction(
  rawInput: UpdateCategorySchema
): Promise<Result<Category>> {
  return runAction(async () => {
    const admin = await requirePermission(Permission.CATALOG_MANAGE);
    const data = updateCategorySchema.parse(rawInput);

    const category = await categoryRepository.update(
      data,
      admin.uid,
      admin.email || 'Admin'
    );

    revalidatePath('/admin/categories');
    revalidatePath('/admin/products');
    revalidatePath('/categories');
    revalidatePath(`/c/${category.slug}`);
    revalidatePath('/products');
    revalidatePath('/search');
    revalidatePath('/');
    return category;
  });
}

export async function deleteCategoryAction(id: string): Promise<Result<{ success: boolean }>> {
  return runAction(async () => {
    const admin = await requirePermission(Permission.CATALOG_MANAGE);
    await categoryRepository.delete(id, admin.uid, admin.email || 'Admin');

    revalidatePath('/admin/categories');
    revalidatePath('/admin/products');
    revalidatePath('/categories');
    revalidatePath('/products');
    revalidatePath('/search');
    revalidatePath('/');
    return { success: true };
  });
}

export async function getCategoriesAction(onlyActive = true): Promise<Result<Category[]>> {
  return runAction(async () => {
    return await categoryRepository.findAll(onlyActive);
  });
}

