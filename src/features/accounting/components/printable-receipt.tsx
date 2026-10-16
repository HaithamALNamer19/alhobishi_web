import React from 'react';
import { PrintableFinancialVoucher } from './printable-financial-voucher';
import { cleanCustomerName } from '@/core/utils/clean-name';
import type { SerializedPaymentDetail } from '../actions/ledger.actions';

export interface PrintableReceiptProps {
  payment: SerializedPaymentDetail['payment'];
}

export function PrintableReceipt({ payment }: PrintableReceiptProps) {
  const methodLabel =
    payment.method === 'CASH'
      ? 'نقدًا'
      : payment.method === 'TRANSFER'
        ? 'حوالة مصرفية / صرافة'
        : 'أخرى';

  const voucherNumber = payment.referenceNumber?.startsWith('REC-')
    ? payment.referenceNumber
    : `REC-CUST-${payment.id.slice(-6).toUpperCase()}`;

  const createdAtIso =
    typeof payment.createdAt === 'string'
      ? payment.createdAt
      : new Date().toISOString();

  return (
    <PrintableFinancialVoucher
      voucher={{
        id: payment.id,
        voucherNumber,
        voucherType: 'RECEIPT',
        partyId: payment.customerId,
        partyName: cleanCustomerName(payment.customerName),
        partyType: payment.customerRole === 'wholesale' ? 'WHOLESALE' : 'CUSTOMER',
        partyTypeLabel: payment.customerRole === 'wholesale' ? 'تاجر جملة' : 'عميل',
        partyPhone: null,
        statementUrl: `/admin/customers/${payment.customerId}/statement`,
        amount: payment.amount,
        paymentMethod: payment.method,
        paymentMethodLabel: methodLabel,
        referenceNumber: payment.referenceNumber || null,
        bankOrExchange: null,
        notes: payment.notes || 'تسديد دفعة وقيدها في الحساب',
        collectorName: payment.recordedBy || 'أمين الصندوق',
        createdAt: createdAtIso,
      }}
    />
  );
}
