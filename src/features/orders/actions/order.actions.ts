'use server';

import { revalidatePath } from 'next/cache';
import { runAction } from '@/core/actions/run-action';
import type { Result } from '@/core/domain/result';
import { requireAuth, requirePermission } from '@/core/auth/require-auth';
import { Permission } from '@/core/auth/roles';
import { orderRepository } from '../infrastructure/firestore-order.repository';
import { ledgerRepository } from '@/features/accounting/infrastructure/firestore-ledger.repository';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';
import type { Order, OrderItemStatus } from '../domain/order';
import { assertMoney, type Money } from '@/core/domain/money';

export async function createOrderAction(
  customerNotes?: string
): Promise<Result<Order>> {
  return runAction(async () => {
    const session = await requireAuth();
    const order = await orderRepository.createOrderFromCart(
      session.uid,
      customerNotes
    );

    revalidatePath('/account');
    revalidatePath('/cart');
    revalidatePath('/admin/orders/today');
    revalidatePath('/admin/orders');
    return order;
  });
}

export async function customerUpdateOrderAction(
  orderId: string,
  updatedItems: Array<{ productId: string; variantId: string; quantity: number }>,
  customerNotes?: string
): Promise<Result<Order>> {
  return runAction(async () => {
    const session = await requireAuth();
    const order = await orderRepository.updateCustomerOrder(
      session.uid,
      orderId,
      updatedItems,
      customerNotes
    );

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath('/account');
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders/today');
    return order;
  });
}

export async function staffUpdateItemPrepAction(
  orderId: string,
  variantId: string,
  preparedQty: number,
  status: OrderItemStatus,
  notes?: string
): Promise<Result<Order>> {
  return runAction(async () => {
    const session = await requirePermission(Permission.ORDERS_PREPARE);
    const order = await orderRepository.updateItemPreparation(
      session.uid,
      session.email || 'موظف تجهيز',
      orderId,
      variantId,
      preparedQty,
      status,
      notes
    );

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders/today');
    return order;
  });
}

export async function staffMarkOrderReadyAction(
  orderId: string
): Promise<Result<Order>> {
  return runAction(async () => {
    const session = await requirePermission(Permission.ORDERS_MARK_READY);
    const order = await orderRepository.markOrderReady(
      session.uid,
      session.email || 'موظف تجهيز',
      orderId
    );

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders/today');
    revalidatePath('/admin/orders');
    revalidatePath(`/account/orders/${orderId}`);
    return order;
  });
}

export async function adminConfirmOrderAction(
  orderId: string
): Promise<Result<Order>> {
  return runAction(async () => {
    const session = await requirePermission(Permission.ORDERS_CONFIRM);
    const order = await orderRepository.confirmOrder(
      session.uid,
      session.email || 'المدير',
      orderId
    );

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders/today');
    revalidatePath('/admin/orders');
    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath('/account');
    return order;
  });
}

export async function recordPaymentAction(params: {
  customerId: string;
  amount: number;
  method: 'CASH' | 'TRANSFER' | 'OTHER';
  referenceNumber?: string | null;
  notes?: string | null;
  collectorName?: string | null;
}): Promise<Result<{ transactionId: string; newBalance: Money }>> {
  return runAction(async () => {
    const session = await requirePermission(Permission.PAYMENTS_RECORD);

    let collector = params.collectorName?.trim();
    if (!collector) {
      const currentActor = await userRepository.findById(session.uid);
      collector =
        currentActor?.displayName ||
        currentActor?.username ||
        session.email?.split('@')[0] ||
        'إدارة المتجر';
    }

    const result = await ledgerRepository.recordPayment({
      ...params,
      amount: assertMoney(params.amount),
      actorId: session.uid,
      actorName: collector,
    });

    revalidatePath('/admin/customers');
    revalidatePath('/admin/payments');
    revalidatePath('/account');
    return result;
  });
}

