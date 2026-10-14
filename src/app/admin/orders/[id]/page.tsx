import React from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getCurrentSession } from '@/core/auth/require-auth';
import { can, Permission } from '@/core/auth/roles';
import { orderRepository } from '@/features/orders/infrastructure/firestore-order.repository';
import { OrderPrepView } from '@/features/orders/components/order-prep-view';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AdminOrderPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ returnUrl?: string; from?: string }>;
}

export default async function AdminOrderPage({ params, searchParams }: AdminOrderPageProps) {
  await connection();
  const session = await getCurrentSession();
  const { id } = await params;
  const sParams = searchParams ? await searchParams : undefined;
  const returnUrl = sParams?.returnUrl || (sParams?.from === 'all' ? '/admin/orders' : undefined);

  const order = await orderRepository.findById(id);
  if (!order) {
    notFound();
  }

  const isAdmin = can(session?.role, Permission.ORDERS_CONFIRM);

  return (
    <div className="max-w-6xl mx-auto">
      <OrderPrepView initialOrder={order} isAdmin={isAdmin} returnUrl={returnUrl} />
    </div>
  );
}

