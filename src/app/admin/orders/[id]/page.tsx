import React from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getCurrentSession } from '@/core/auth/require-auth';
import { can, Permission } from '@/core/auth/roles';
import { orderRepository } from '@/features/orders/infrastructure/firestore-order.repository';
import { OrderPrepView } from '@/features/orders/components/order-prep-view';

export const instant = false;

interface AdminOrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderPage({ params }: AdminOrderPageProps) {
  await connection();
  const session = await getCurrentSession();
  const { id } = await params;

  const order = await orderRepository.findById(id);
  if (!order) {
    notFound();
  }

  const isAdmin = can(session?.role, Permission.ORDERS_CONFIRM);

  return (
    <div className="max-w-6xl mx-auto">
      <OrderPrepView initialOrder={order} isAdmin={isAdmin} />
    </div>
  );
}

