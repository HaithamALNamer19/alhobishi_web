import React from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { requireAuth } from '@/core/auth/require-auth';
import { orderRepository } from '@/features/orders/infrastructure/firestore-order.repository';
import { CustomerOrderView } from '@/features/orders/components/customer-order-view';

export const metadata = {
  title: 'تفاصيل الطلب | المتجر',
};

export const instant = false;

interface CustomerOrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerOrderPage({ params }: CustomerOrderPageProps) {
  await connection();
  const session = await requireAuth();
  const { id } = await params;

  const order = await orderRepository.findById(id);
  if (!order || order.customerId !== session.uid) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <CustomerOrderView initialOrder={order} />
    </div>
  );
}

