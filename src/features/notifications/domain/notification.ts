export type NotificationType =
  | 'ORDER_PLACED'
  | 'ORDER_PREPARING'
  | 'ORDER_ITEM_UPDATED'
  | 'ORDER_EDITED_BY_CUSTOMER'
  | 'ORDER_READY'
  | 'ORDER_CONFIRMED'
  | 'PAYMENT_RECORDED'
  | 'ROLE_UPDATED';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  referenceId: string | null;
  isRead: boolean;
  createdAt: Date;
}

