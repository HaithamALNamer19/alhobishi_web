import type { Money } from '@/core/domain/money';

export type AccountTransactionType =
  | 'INVOICE'
  | 'PAYMENT'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'REVERSAL';

export interface AccountTransaction {
  id: string;
  customerId: string;
  orderId: string | null;
  paymentId: string | null;
  returnId?: string | null;
  type: AccountTransactionType;
  amount: Money; // Positive for invoice (increases debt), negative or credit for payment & return
  previousBalance: Money;
  newBalance: Money;
  description: string;
  recordedBy: string;
  createdAt: Date;
}

export interface SalesReturnItem {
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  quantity: number;
  unitPrice: Money;
  subtotal: Money;
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  items: SalesReturnItem[];
  totalAmount: Money;
  reason?: string | null;
  orderId?: string | null;
  recordedBy: string;
  createdAt: Date;
}

export interface CustomerFinancialStatement {
  customerId: string;
  customerName: string;
  currentBalance: Money;
  transactions: AccountTransaction[];
}

