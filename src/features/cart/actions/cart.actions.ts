'use server';

import { revalidatePath } from 'next/cache';
import { runAction } from '@/core/actions/run-action';
import type { Result } from '@/core/domain/result';
import { getCurrentSession } from '@/core/auth/require-auth';
import { cartRepository } from '../infrastructure/firestore-cart.repository';
import type { CartSummary } from '../domain/cart';

export async function addToCartAction(
  productId: string,
  variantId: string,
  quantity = 1
): Promise<Result<{ success: boolean }>> {
  return runAction(async () => {
    const session = await getCurrentSession();
    if (!session) {
      // If user is guest/visitor, action succeeds and client syncs with local storage
      return { success: true };
    }

    await cartRepository.addItem(session.uid, productId, variantId, Math.max(1, quantity));
    revalidatePath('/cart');
    revalidatePath('/');
    return { success: true };
  });
}

export async function updateCartQuantityAction(
  productId: string,
  variantId: string,
  quantity: number
): Promise<Result<{ success: boolean }>> {
  return runAction(async () => {
    const session = await getCurrentSession();
    if (!session) {
      return { success: true };
    }

    await cartRepository.updateItemQuantity(session.uid, productId, variantId, quantity);
    revalidatePath('/cart');
    revalidatePath('/');
    return { success: true };
  });
}

export async function removeFromCartAction(
  productId: string,
  variantId: string
): Promise<Result<{ success: boolean }>> {
  return runAction(async () => {
    const session = await getCurrentSession();
    if (!session) {
      return { success: true };
    }

    await cartRepository.removeItem(session.uid, productId, variantId);
    revalidatePath('/cart');
    revalidatePath('/');
    return { success: true };
  });
}

export async function getCartSummaryAction(): Promise<Result<CartSummary>> {
  return runAction(async () => {
    const session = await getCurrentSession();
    if (!session) {
      return {
        items: [],
        totalQuantity: 0,
        totalAmount: 0,
        hasOutOfStockItems: false,
      };
    }

    const cart = await cartRepository.getCart(session.uid);
    return await cartRepository.resolveCartSummary(cart, session.role);
  });
}

