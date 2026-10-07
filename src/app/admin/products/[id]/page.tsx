import React from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { productRepository } from '@/features/products/infrastructure/firestore-product.repository';
import { inventoryRepository } from '@/features/inventory/infrastructure/firestore-inventory.repository';
import { ProductDetailView } from '@/features/products/components/product-detail-view';

interface AdminProductPageProps {
  params: Promise<{ id: string }>;
}

export const instant = false;

export default async function AdminProductPage({ params }: AdminProductPageProps) {
  await connection();
  const { id } = await params;

  const [product, pricing, movements] = await Promise.all([
    productRepository.findDetailById(id),
    productRepository.findPricing(id),
    inventoryRepository.getMovements({ productId: id, limit: 15 }),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <ProductDetailView
      product={product}
      pricing={pricing}
      movements={movements}
    />
  );
}

