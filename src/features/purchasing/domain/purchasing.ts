export interface Supplier {
  id: string;
  name: string;
  phone: string;
  company_name: string;
  balance: number;
  createdAt: Date;
}

export interface PurchaseItem {
  product_id: string;
  variant_id?: string;
  product_name?: string;
  variant_label?: string;
  quantity: number;
  cost_price: number;
}

export interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  supplier_id: string;
  supplier_name?: string;
  purchase_date: Date;
  items: PurchaseItem[];
  total_amount: number;
  createdAt: Date;
}

export interface PurchaseReturnItem {
  product_id: string;
  variant_id?: string;
  product_name?: string;
  variant_label?: string;
  quantity: number;
  cost_price: number;
}

export interface PurchaseReturn {
  id: string;
  return_number?: string;
  purchase_id: string;
  supplier_id: string;
  supplier_name?: string;
  return_date: Date;
  items: PurchaseReturnItem[];
  total_amount: number;
  createdAt: Date;
}

export type StockMovementType = 'PURCHASE_IN' | 'PURCHASE_RETURN_OUT';

export interface StockMovement {
  id: string;
  product_id: string;
  product_name?: string;
  type: StockMovementType;
  quantity: number;
  reference_id: string;
  timestamp: Date;
}

export type SupplierPaymentMethod = 'CASH' | 'TRANSFER' | 'CHECK' | 'OTHER';

export interface SupplierPayment {
  id: string;
  voucher_number: string;
  supplier_id: string;
  supplier_name: string;
  amount: number;
  payment_method: SupplierPaymentMethod;
  reference_number?: string | null;
  bank_or_exchange?: string | null;
  notes?: string | null;
  recorded_by: string;
  createdAt: Date;
}

export type SupplierTransactionType =
  | 'PURCHASE'
  | 'PAYMENT'
  | 'PURCHASE_RETURN'
  | 'INITIAL_BALANCE';

export interface SupplierTransaction {
  id: string;
  supplier_id: string;
  type: SupplierTransactionType;
  amount: number; // positive = credit (له), negative = debit (عليه)
  debit: number; // مدين (عليه / مسدد له أو مردود)
  credit: number; // دائن (له / فواتير شراء أو رصيد سابق)
  balance_after: number;
  description: string;
  reference_id?: string | null;
  reference_number?: string | null;
  recorded_by?: string;
  createdAt: Date;
  items?: PurchaseItem[] | PurchaseReturnItem[];
  payment_method?: SupplierPaymentMethod;
  bank_or_exchange?: string | null;
  notes?: string | null;
}

export interface SupplierStatement {
  supplier: Supplier;
  transactions: SupplierTransaction[];
  total_purchases: number;
  total_payments: number;
  total_returns: number;
  net_balance: number;
}

