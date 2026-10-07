import React from 'react';
import { connection } from 'next/server';
import { categoryRepository } from '@/features/categories/infrastructure/firestore-category.repository';
import { ProductForm } from '@/features/products/components/product-form';

export const instant = false;

export default async function NewProductPage() {
  await connection();
  const categories = await categoryRepository.findAll(true);

  return (
    <div className="max-w-6xl mx-auto">
      <ProductForm categories={categories} />
    </div>
  );
}

