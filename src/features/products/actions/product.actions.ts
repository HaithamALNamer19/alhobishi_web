'use server';

import { revalidatePath } from 'next/cache';
import { runAction } from '@/core/actions/run-action';
import type { Result } from '@/core/domain/result';
import { requirePermission } from '@/core/auth/require-auth';
import { Permission } from '@/core/auth/roles';
import {
  createProductSchema,
  updateProductSchema,
  adjustStockSchema,
  type CreateProductSchema,
  type UpdateProductSchema,
  type AdjustStockSchema,
} from '../schemas/product.schemas';
import { productRepository } from '../infrastructure/firestore-product.repository';
import { inventoryRepository } from '@/features/inventory/infrastructure/firestore-inventory.repository';
import type { Product, ProductDetail, ProductStatus } from '../domain/product';
import type { ProductPricing } from '../domain/pricing';
import type { Money } from '@/core/domain/money';

export async function createProductAction(
  rawInput: CreateProductSchema
): Promise<Result<ProductDetail>> {
  return runAction(async () => {
    const admin = await requirePermission(Permission.CATALOG_MANAGE);
    const data = createProductSchema.parse(rawInput);

    const product = await productRepository.create(
      {
        ...data,
        retailPrice: data.retailPrice as Money,
        wholesalePrice: data.wholesalePrice as Money,
        variants: data.variants?.map((v) => ({
          ...v,
          retailPriceOverride: (v.retailPriceOverride as Money) ?? null,
          wholesalePriceOverride: (v.wholesalePriceOverride as Money) ?? null,
        })),
      },
      admin.uid,
      admin.email || 'Admin'
    );

    revalidatePath('/admin/products');
    revalidatePath('/');
    return product;
  });
}

export async function updateProductAction(
  rawInput: UpdateProductSchema
): Promise<Result<Product>> {
  return runAction(async () => {
    const admin = await requirePermission(Permission.CATALOG_MANAGE);
    const data = updateProductSchema.parse(rawInput);

    const product = await productRepository.update(
      data,
      admin.uid,
      admin.email || 'Admin'
    );

    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${product.id}`);
    revalidatePath(`/p/${product.slug}`);
    revalidatePath('/');
    return product;
  });
}

export async function deleteProductAction(id: string): Promise<Result<{ success: boolean }>> {
  return runAction(async () => {
    const admin = await requirePermission(Permission.CATALOG_MANAGE);
    await productRepository.delete(id, admin.uid, admin.email || 'Admin');

    revalidatePath('/admin/products');
    revalidatePath('/');
    return { success: true };
  });
}

export async function adjustStockAction(
  rawInput: AdjustStockSchema
): Promise<Result<{ previousStockQty: number; newStockQty: number; delta: number; availableQty: number }>> {
  return runAction(async () => {
    const admin = await requirePermission(Permission.INVENTORY_MANAGE);
    const data = adjustStockSchema.parse(rawInput);

    const result = await inventoryRepository.adjustStock(
      data,
      admin.uid,
      admin.email || 'Staff'
    );

    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${data.productId}`);
    revalidatePath('/admin/inventory');
    revalidatePath('/');
    return result;
  });
}

export async function getAdminProductDetailAction(
  id: string
): Promise<Result<{ product: ProductDetail; pricing: ProductPricing | null }>> {
  return runAction(async () => {
    await requirePermission(Permission.CATALOG_MANAGE);
    const product = await productRepository.findDetailById(id);
    if (!product) {
      throw new Error('المنتج غير موجود');
    }
    const pricing = await productRepository.findPricing(id);
    return { product, pricing };
  });
}

export async function getProductsListAction(filters: {
  categoryId?: string;
  status?: ProductStatus;
  search?: string;
  limit?: number;
} = {}): Promise<Result<Product[]>> {
  return runAction(async () => {
    return await productRepository.list(filters);
  });
}
