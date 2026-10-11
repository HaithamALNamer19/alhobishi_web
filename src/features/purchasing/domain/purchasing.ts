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
  product_name?: string;
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
  product_name?: string;
  quantity: number;
  cost_price: number;
}

export interface PurchaseReturn {
  id: string;
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

