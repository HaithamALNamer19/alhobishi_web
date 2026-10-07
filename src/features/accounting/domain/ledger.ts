import type { Money } from '@/core/domain/money';

export type AccountTransactionType =
  | 'INVOICE'
  | 'PAYMENT'
  | 'ADJUSTMENT'
  | 'REVERSAL';

export interface AccountTransaction {
  id: string;
  customerId: string;
  orderId: string | null;
  paymentId: string | null;
  type: AccountTransactionType;
  amount: Money; // Positive for invoice (increases debt), negative or credit for payment
  previousBalance: Money;
  newBalance: Money;
  description: string;
  recordedBy: string;
  createdAt: Date;
}

export interface CustomerFinancialStatement {
  customerId: string;
  customerName: string;
  currentBalance: Money;
  transactions: AccountTransaction[];
}

