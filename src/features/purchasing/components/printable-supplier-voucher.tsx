import React from 'react';
import { PrintableFinancialVoucher } from '@/features/accounting/components/printable-financial-voucher';
import { cleanCustomerName } from '@/core/utils/clean-name';

export interface PrintableSupplierVoucherProps {
  payment: {
    id: string;
    voucher_number?: string;
    voucher_type?: 'RECEIPT' | 'DISBURSEMENT';
    is_refund?: boolean;
    supplier_id: string;
    supplier_name: string;
    company_name?: string;
    amount: number;
    payment_method: string;
    reference_number?: string | null;
    bank_or_exchange?: string | null;
    notes?: string | null;
    recorded_by?: string;
    createdAt: string | Date;
  };
}

export function PrintableSupplierVoucher({ payment }: PrintableSupplierVoucherProps) {
  const isRefund = payment.is_refund === true || payment.voucher_type === 'RECEIPT';
  const voucherType = isRefund ? 'RECEIPT' : 'DISBURSEMENT';

  const methodLabel =
    payment.payment_method === 'CASH'
      ? 'نقدًا'
      : payment.payment_method === 'TRANSFER'
        ? 'حوالة مصرفية / صرافة'
        : payment.payment_method === 'CHECK'
          ? 'شيك بنكي'
          : 'أخرى';

  const createdAtIso =
    payment.createdAt instanceof Date
      ? payment.createdAt.toISOString()
      : typeof payment.createdAt === 'string'
        ? payment.createdAt
        : new Date().toISOString();

  const voucherNumber =
    payment.voucher_number ||
    (payment.reference_number?.startsWith('PAY-') || payment.reference_number?.startsWith('REF-')
      ? payment.reference_number
      : `${isRefund ? 'REF-SUPP' : 'PAY-SUPP'}-${payment.id.slice(-6).toUpperCase()}`);

  const supplierDisplay = payment.company_name
    ? `${cleanCustomerName(payment.supplier_name)} (${payment.company_name})`
    : cleanCustomerName(payment.supplier_name);

  return (
    <PrintableFinancialVoucher
      voucher={{
        id: payment.id,
        voucherNumber,
        voucherType,
        partyId: payment.supplier_id,
        partyName: supplierDisplay,
        partyType: 'SUPPLIER',
        partyTypeLabel: 'مورد',
        partyPhone: null,
        statementUrl: `/admin/suppliers/${payment.supplier_id}/statement`,
        amount: payment.amount,
        paymentMethod: payment.payment_method || 'CASH',
        paymentMethodLabel: methodLabel,
        referenceNumber: payment.reference_number || null,
        bankOrExchange: payment.bank_or_exchange || null,
        notes:
          payment.notes ||
          (isRefund ? 'استرداد دفعة مالية من المورد' : 'سداد دفعة للمورد مقابل فواتير شراء'),
        collectorName: payment.recorded_by || 'أمين الصندوق',
        createdAt: createdAtIso,
      }}
    />
  );
}
