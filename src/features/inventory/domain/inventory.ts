export type InventoryMovementType =
  | 'RESTOCK'
  | 'ADJUSTMENT'
  | 'RESERVE'
  | 'RELEASE'
  | 'COMMIT'
  | 'RETURN';

export interface InventoryMovement {
  id: string;
  productId: string;
  variantId: string;
  type: InventoryMovementType;
  delta: number;
  stockAfter: number;
  reservedAfter: number;
  orderId: string | null;
  reason: string | null;
  actorId: string;
  createdAt: Date;
}

export interface AdjustStockInput {
  productId: string;
  variantId: string;
  newStockQty: number;
  reason: string;
}

