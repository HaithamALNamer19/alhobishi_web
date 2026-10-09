import React from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getCurrentSession } from '@/core/auth/require-auth';
import { cartRepository } from '@/features/cart/infrastructure/firestore-cart.repository';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';
import { CheckoutForm } from '@/features/orders/components/checkout-form';

export const metadata = {
  title: 'إتمام الطلب وحجز البضاعة | المتجر',
};

export const instant = false;

export default async function CheckoutPage() {
  await connection();
  const session = await getCurrentSession();
  if (!session) {
    redirect('/login?from=/checkout');
  }

  const [cart, profile] = await Promise.all([
    cartRepository.getCart(session.uid),
    userRepository.findById(session.uid),
  ]);

  if (!profile || profile.status === 'disabled') {
    redirect('/login?error=disabled');
  }

  const summary = await cartRepository.resolveCartSummary(cart, session.role);

  if (summary.items.length === 0) {
    redirect('/cart');
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <CheckoutForm
        summary={summary}
        customerName={profile?.displayName || session.email || 'عميل'}
        customerPhone={profile?.phone || ''}
      />
    </div>
  );
}
