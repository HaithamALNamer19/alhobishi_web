import React from 'react';
import { connection } from 'next/server';
import { getCurrentSession } from '@/core/auth/require-auth';
import { cartRepository } from '@/features/cart/infrastructure/firestore-cart.repository';
import { CartView } from '@/features/cart/components/cart-view';
import { assertMoney } from '@/core/domain/money';
import type { CartSummary } from '@/features/cart/domain/cart';

export const metadata = {
  title: 'سلة المشتريات | المتجر',
};

export const instant = false;

export default async function CartPage() {
  await connection();
  const session = await getCurrentSession();

  let summary: CartSummary = {
    items: [],
    totalQuantity: 0,
    totalAmount: assertMoney(0),
    hasOutOfStockItems: false,
  };

  if (session) {
    const cart = await cartRepository.getCart(session.uid);
    summary = await cartRepository.resolveCartSummary(cart, session.role);
  }

  return (
    <CartView
      initialSummary={summary}
      isLoggedIn={!!session}
    />
  );
}
