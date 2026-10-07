import React from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { productRepository } from '@/features/products/infrastructure/firestore-product.repository';
import { categoryRepository } from '@/features/categories/infrastructure/firestore-category.repository';
import { ProductForm } from '@/features/products/components/product-form';

interface EditProductPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ returnUrl?: string }>;
}

export const instant = false;

export default async function EditProductPage({ params, searchParams }: EditProductPageProps) {
  await connection();
  const { id } = await params;
  const { returnUrl } = (await searchParams) || {};

  const [product, pricing, categories] = await Promise.all([
    productRepository.findDetailById(id),
    productRepository.findPricing(id),
    categoryRepository.findAll(false),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto">
      <ProductForm
        categories={categories}
        initialProduct={product}
        initialPricing={pricing}
        returnUrl={returnUrl}
      />
    </div>
  );
}

