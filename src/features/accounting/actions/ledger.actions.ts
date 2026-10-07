'use server';

import { z } from 'zod';
import { runAction } from '@/core/actions/run-action';
import type { Result } from '@/core/domain/result';
import { requireSession } from '@/core/auth/require-auth';
import { isBackOfficeRole } from '@/core/auth/roles';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import { orderRepository } from '@/features/orders/infrastructure/firestore-order.repository';
import { ledgerRepository } from '../infrastructure/firestore-ledger.repository';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';
import type { OrderItem } from '@/features/orders/domain/order';

const detailSchema = z.object({
  type: z.enum(['INVOICE', 'PAYMENT']),
  id: z.string().min(1),
});

export type SerializedInvoiceDetail = {
  type: 'INVOICE';
  order: {
    id: string;
    orderNumber: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerRole: string;
    status: string;
    businessDate: string;
    items: OrderItem[];
    totalAmount: number;
    customerNotes: string | null;
    preparedBy: string | null;
    preparedAt: string | null;
    confirmedBy: string | null;
    confirmedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export type SerializedPaymentDetail = {
  type: 'PAYMENT';
  payment: {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerRole: string;
    amount: number;
    method: 'CASH' | 'TRANSFER' | 'OTHER';
    referenceNumber: string | null;
    notes: string | null;
    recordedBy: string;
    createdAt: string;
  };
};

export type LedgerDocumentDetail = SerializedInvoiceDetail | SerializedPaymentDetail;

export async function getLedgerDocumentDetailAction(params: {
  type: 'INVOICE' | 'PAYMENT';
  id: string;
}): Promise<Result<LedgerDocumentDetail>> {
  return runAction(async () => {
    const input = detailSchema.parse(params);
    const session = await requireSession();
    const isBackOffice = isBackOfficeRole(session.role);

    if (input.type === 'INVOICE') {
      const order = await orderRepository.findById(input.id);
      if (!order) {
        throw new AppError(ErrorCode.NOT_FOUND, { message: 'فاتورة الطلب غير موجودة في النظام.' });
      }

      if (!isBackOffice && order.customerId !== session.uid) {
        throw new AppError(ErrorCode.FORBIDDEN, { message: 'ليس لديك صلاحية لعرض هذه الفاتورة.' });
      }

      return {
        type: 'INVOICE',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerRole: order.customerRole,
          status: order.status,
          businessDate: order.businessDate,
          items: order.items,
          totalAmount: order.totalAmount,
          customerNotes: order.customerNotes,
          preparedBy: order.preparedBy,
          preparedAt: order.preparedAt ? order.preparedAt.toISOString() : null,
          confirmedBy: order.confirmedBy,
          confirmedAt: order.confirmedAt ? order.confirmedAt.toISOString() : null,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        },
      };
    } else {
      const payment = await ledgerRepository.getPaymentById(input.id);
      if (!payment) {
        throw new AppError(ErrorCode.NOT_FOUND, { message: 'سند القبض المالي غير موجود.' });
      }

      if (!isBackOffice && payment.customerId !== session.uid) {
        throw new AppError(ErrorCode.FORBIDDEN, { message: 'ليس لديك صلاحية لعرض هذا السند.' });
      }

      const customer = await userRepository.findById(payment.customerId);

      return {
        type: 'PAYMENT',
        payment: {
          id: payment.id,
          customerId: payment.customerId,
          customerName: customer?.displayName || 'العميل',
          customerPhone: customer?.phone || '',
          customerRole: customer?.role || 'customer',
          amount: payment.amount,
          method: payment.method,
          referenceNumber: payment.referenceNumber,
          notes: payment.notes,
          recordedBy: payment.recordedBy,
          createdAt: payment.createdAt.toISOString(),
        },
      };
    }
  });
}

