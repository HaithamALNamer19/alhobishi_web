import React from 'react';
import { connection } from 'next/server';
import { productRepository } from '@/features/products/infrastructure/firestore-product.repository';
import { categoryRepository } from '@/features/categories/infrastructure/firestore-category.repository';
import { ProductListTable } from '@/features/products/components/product-list-table';

export const instant = false;

export default async function AdminProductsPage() {
  await connection();
  const [products, categories] = await Promise.all([
    productRepository.list(),
    categoryRepository.findAll(false),
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      <ProductListTable initialProducts={products} categories={categories} />
    </div>
  );
}

