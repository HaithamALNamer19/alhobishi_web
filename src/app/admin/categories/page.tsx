import React from 'react';
import { connection } from 'next/server';
import { categoryRepository } from '@/features/categories/infrastructure/firestore-category.repository';
import { CategoryManager } from '@/features/categories/components/category-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminCategoriesPage() {
  await connection();
  const categories = await categoryRepository.findAll(false);

  return (
    <div className="max-w-6xl mx-auto">
      <CategoryManager initialCategories={categories} />
    </div>
  );
}

