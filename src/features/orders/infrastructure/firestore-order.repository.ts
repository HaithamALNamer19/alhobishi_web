import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import { assertMoney, addMoney, multiplyMoney, type Money } from '@/core/domain/money';
import { toBusinessDate, businessYear } from '@/core/domain/dates';
import { computeStockState } from '@/features/products/domain/variant';
import { resolveUnitPrice } from '@/features/products/domain/pricing';
import type { Role } from '@/core/auth/roles';
import {
  type Order,
  type OrderItem,
  type OrderStatus,
  type OrderItemStatus,
  canCustomerEditOrder,
} from '../domain/order';

export class FirestoreOrderRepository {
  private get db() {
    return adminDb();
  }

  async findById(id: string): Promise<Order | null> {
    const doc = await this.db.collection(Collections.ORDERS).doc(id).get();
    if (!doc.exists) return null;
    const order = this.mapOrderDoc(doc.id, doc.data()!);
    if (order.customerId) {
      try {
        const userDoc = await this.db.collection(Collections.USERS).doc(order.customerId).get();
        if (userDoc.exists) {
          const u = userDoc.data()!;
          if (u.displayName) {
            order.customerName = u.displayName;
          }
        }
      } catch {
        // preserve existing order.customerName fallback
      }
    }
    return order;
  }

  async listByCustomer(customerId: string): Promise<Order[]> {
    const snap = await this.db
      .collection(Collections.ORDERS)
      .where('customerId', '==', customerId)
      .get();

    const orders = snap.docs.map((d) => this.mapOrderDoc(d.id, d.data()));
    await this.attachCustomerDisplayNames(orders);
    return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listTodayOrders(dateStr?: string): Promise<Order[]> {
    const today = dateStr || toBusinessDate(new Date());
    const snap = await this.db
      .collection(Collections.ORDERS)
      .where('businessDate', '==', today)
      .get();

    const orders = snap.docs.map((d) => this.mapOrderDoc(d.id, d.data()));
    await this.attachCustomerDisplayNames(orders);
    return orders.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listAll(options: { status?: OrderStatus; limit?: number } = {}): Promise<Order[]> {
    let query: FirebaseFirestore.Query = this.db.collection(Collections.ORDERS);

    if (options.status) {
      query = query.where('status', '==', options.status);
    } else {
      query = query.orderBy('createdAt', 'desc');
    }

    if (options.limit && !options.status) {
      query = query.limit(options.limit);
    }

    const snap = await query.get();
    let orders = snap.docs.map((d) => this.mapOrderDoc(d.id, d.data()));
    await this.attachCustomerDisplayNames(orders);
    if (options.status) {
      orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      if (options.limit) {
        orders = orders.slice(0, options.limit);
      }
    }
    return orders;
  }

  private async attachCustomerDisplayNames(orders: Order[]): Promise<void> {
    const customerIds = Array.from(new Set(orders.map((o) => o.customerId).filter(Boolean)));
    if (customerIds.length === 0) return;

    try {
      const userDocs = await Promise.allSettled(
        customerIds.map((id) => this.db.collection(Collections.USERS).doc(id).get())
      );
      const nameMap = new Map<string, string>();
      userDocs.forEach((res) => {
        if (res.status === 'fulfilled' && res.value.exists) {
          const u = res.value.data()!;
          if (u.displayName) {
            nameMap.set(res.value.id, u.displayName);
          }
        }
      });

      for (const o of orders) {
        if (o.customerId && nameMap.has(o.customerId)) {
          o.customerName = nameMap.get(o.customerId)!;
        }
      }
    } catch {
      // fallback to stored names
    }
  }

  /**
   * Creates an order atomically from the user's cart.
   * Atomically reserves inventory (`reservedQty`) for each item in the order.
   */
  async createOrderFromCart(
    customerId: string,
    customerNotes?: string
  ): Promise<Order> {
    return this.db.runTransaction(async (tx) => {
      // 1. Read Customer User Info
      const userRef = this.db.collection(Collections.USERS).doc(customerId);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new AppError(ErrorCode.NOT_FOUND, { message: 'المستخدم غير موجود.' });
      }
      const userData = userSnap.data()!;
      if (userData.status === 'disabled') {
        throw new AppError(ErrorCode.ACCOUNT_DISABLED, {
          message: 'تم إيقاف حسابك من قبل إدارة المتجر. لا يمكن إتمام أي طلبات جديدة.',
        });
      }
      const customerRole = (userData.role || 'customer') as Role;
      const customerName = userData.displayName || userData.name || userData.username || 'عميل';
      const customerPhone = userData.phone || '';

      // 2. Read Customer Cart
      const cartRef = this.db.collection(Collections.CARTS).doc(customerId);
      const cartSnap = await tx.get(cartRef);
      if (!cartSnap.exists || !cartSnap.data()?.items || cartSnap.data()?.items.length === 0) {
        throw new AppError(ErrorCode.EMPTY_ORDER, { message: 'سلة المشتريات فارغة.' });
      }

      const cartItems = cartSnap.data()!.items as Array<{
        productId: string;
        variantId: string;
        quantity: number;
      }>;

      // 3. Sequential order number counter
      // 3. Sequential order number counter
      const counterRef = this.db.collection(Collections.COUNTERS).doc('orders');
      const counterSnap = await tx.get(counterRef);
      const currentSeq = counterSnap.exists ? (counterSnap.data()?.seq || 0) : 0;
      const nextSeq = currentSeq + 1;

      const currentYear = businessYear(new Date());
      const orderNumber = `ORD-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
      const businessDate = toBusinessDate(new Date());

      // 4. READ ALL CART ITEMS IN PARALLEL BEFORE ANY WRITES
      const loadedCartItems = await Promise.all(
        cartItems.map(async (item) => {
          const prodRef = this.db.collection(Collections.PRODUCTS).doc(item.productId);
          const varRef = prodRef.collection(Collections.VARIANTS).doc(item.variantId);
          const pricingRef = this.db.collection(Collections.PRODUCT_PRICING).doc(item.productId);

          const [prodSnap, varSnap, pricingSnap] = await Promise.all([
            tx.get(prodRef),
            tx.get(varRef),
            tx.get(pricingRef),
          ]);

          let catSnap: FirebaseFirestore.DocumentSnapshot | null = null;
          if (prodSnap.exists && prodSnap.data()?.categoryId) {
            const catRef = this.db.collection(Collections.CATEGORIES).doc(prodSnap.data()!.categoryId);
            catSnap = await tx.get(catRef);
          }

          return { item, prodRef, varRef, prodSnap, varSnap, pricingSnap, catSnap };
        })
      );

      // 5. Validate and calculate items in memory
      const orderItems: OrderItem[] = [];
      let totalAmount = assertMoney(0);
      const variantUpdates: Array<{
        varRef: FirebaseFirestore.DocumentReference;
        item: (typeof cartItems)[0];
        currentStock: number;
        newReserved: number;
        newAvailable: number;
        newStockState: string;
      }> = [];

      for (const loaded of loadedCartItems) {
        const { item, varRef, prodSnap, varSnap, pricingSnap, catSnap } = loaded;

        if (!prodSnap.exists) {
          throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, {
            message: `أحد المنتجات في سلتك لم يعد متاحًا.`,
          });
        }
        if (!varSnap.exists) {
          throw new AppError(ErrorCode.VARIANT_NOT_AVAILABLE, {
            message: `أحد الخيارات في سلتك لم يعد متاحًا.`,
          });
        }

        const prodData = prodSnap.data()!;
        const varData = varSnap.data()!;

        if (!prodData.isVisible || prodData.status !== 'active') {
          throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, {
            message: `المنتج "${prodData.name}" لم يعد متاحًا للشراء حاليًا.`,
          });
        }

        if (catSnap && catSnap.exists && catSnap.data()?.isActive === false) {
          throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, {
            message: `المنتج "${prodData.name}" يتبع قسماً غير مفعل حالياً.`,
          });
        }

        const currentStock = (varData.stockQty ?? 0) as number;
        const currentReserved = (varData.reservedQty ?? 0) as number;
        const availableQty = Math.max(0, currentStock - currentReserved);

        // Check stock availability
        if (availableQty < item.quantity) {
          throw new AppError(ErrorCode.STOCK_BELOW_RESERVED, {
            message: `الكمية المتوفرة من "${prodData.name} (${varData.label})" هي ${availableQty} قطعة فقط. يرجى تقليل الكمية.`,
          });
        }

        // Pricing resolution
        const pricingData = pricingSnap.exists ? pricingSnap.data() : null;
        const unitPrice = resolveUnitPrice({
          product: { retailPrice: prodData.retailPrice },
          variant: { id: varData.id, retailPriceOverride: varData.retailPriceOverride },
          pricing: pricingData
            ? {
                productId: item.productId,
                wholesalePrice: pricingData.wholesalePrice,
                variantWholesalePrices: pricingData.variantWholesalePrices || {},
                updatedAt: new Date(),
                updatedBy: '',
              }
            : null,
          role: customerRole,
        });

        const subtotal = multiplyMoney(unitPrice, item.quantity);
        totalAmount = addMoney(totalAmount, subtotal);

        const newReserved = currentReserved + item.quantity;
        const newAvailable = Math.max(0, currentStock - newReserved);
        const threshold = (varData.lowStockThreshold ?? 5) as number;
        const newStockState = computeStockState(newAvailable, threshold);

        variantUpdates.push({
          varRef,
          item,
          currentStock,
          newReserved,
          newAvailable,
          newStockState,
        });

        orderItems.push({
          id: `${item.productId}__${item.variantId}`,
          productId: item.productId,
          variantId: item.variantId,
          productSlug: prodData.slug,
          productName: prodData.name,
          variantLabel: varData.label,
          image: prodData.images?.[0] || null,
          sku: varData.sku || prodData.sku || null,
          barcode: varData.barcode || prodData.barcode || null,
          unitPrice,
          requestedQty: item.quantity,
          preparedQty: 0,
          status: 'pending',
          subtotal,
          notes: null,
        });
      }

      // 6. ALL WRITES TOGETHER
      tx.set(counterRef, { seq: nextSeq, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

      for (const vu of variantUpdates) {
        tx.update(vu.varRef, {
          reservedQty: vu.newReserved,
          availableQty: vu.newAvailable,
          stockState: vu.newStockState,
          updatedAt: FieldValue.serverTimestamp(),
        });

        const moveRef = this.db.collection(Collections.INVENTORY_MOVEMENTS).doc();
        tx.set(moveRef, {
          productId: vu.item.productId,
          variantId: vu.item.variantId,
          type: 'RESERVE',
          delta: vu.item.quantity,
          stockAfter: vu.currentStock,
          reservedAfter: vu.newReserved,
          orderId: orderNumber,
          reason: `حجز للطلب ${orderNumber}`,
          actorId: customerId,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      // 5. Create Order Document
      const orderRef = this.db.collection(Collections.ORDERS).doc();
      const orderDoc = {
        orderNumber,
        customerId,
        customerName,
        customerPhone,
        customerRole,
        status: 'PENDING' as OrderStatus,
        businessDate,
        items: orderItems,
        totalAmount,
        customerNotes: customerNotes?.trim() || null,
        isLocked: false,
        preparedBy: null,
        preparedAt: null,
        confirmedBy: null,
        confirmedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      tx.set(orderRef, orderDoc);

      // 6. Clear Customer Cart
      tx.delete(cartRef);

      // 7. Notification for Customer
      const notifRef = this.db.collection(Collections.NOTIFICATIONS).doc();
      tx.set(notifRef, {
        userId: customerId,
        title: 'تم استلام طلبك بنجاح',
        message: `تم إنشاء طلب الحجز رقم ${orderNumber} بمبلغ ${totalAmount} ر.ي وهو بانتظار بدء التجهيز.`,
        type: 'ORDER_PLACED',
        referenceId: orderRef.id,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Notification for Store Staff & Admin
      const staffNotifRef = this.db.collection(Collections.NOTIFICATIONS).doc();
      tx.set(staffNotifRef, {
        userId: 'STAFF_BROADCAST',
        title: `طلب حجز جديد (${orderNumber})`,
        message: `تم استلام طلب حجز جديد رقم ${orderNumber} من العميل ${customerName} بمبلغ ${totalAmount} ر.ي بانتظار بدء التجهيز.`,
        type: 'ORDER_PLACED',
        referenceId: orderRef.id,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 8. Audit Log
      const auditRef = this.db.collection(Collections.AUDIT_LOGS).doc();
      tx.set(auditRef, {
        actorId: customerId,
        actorName: customerName,
        action: 'ORDER_CREATED',
        entityType: 'order',
        entityId: orderRef.id,
        oldData: null,
        newData: { orderNumber, totalAmount, itemCount: orderItems.length },
        timestamp: FieldValue.serverTimestamp(),
      });

      return {
        id: orderRef.id,
        orderNumber,
        customerId,
        customerName,
        customerPhone,
        customerRole,
        status: 'PENDING',
        businessDate,
        items: orderItems,
        totalAmount,
        customerNotes: customerNotes?.trim() || null,
        isLocked: false,
        preparedBy: null,
        preparedAt: null,
        confirmedBy: null,
        confirmedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
  }

  /**
   * Customer edits their order items before it is locked (READY/CONFIRMED).
   * Atomically recalculates reservations and triggers a staff alert notification if order is in preparation.
   */
  async updateCustomerOrder(
    customerId: string,
    orderId: string,
    updatedItems: Array<{ productId: string; variantId: string; quantity: number }>,
    customerNotes?: string
  ): Promise<Order> {
    return this.db.runTransaction(async (tx) => {
      const orderRef = this.db.collection(Collections.ORDERS).doc(orderId);
      const orderSnap = await tx.get(orderRef);

      if (!orderSnap.exists) {
        throw new AppError(ErrorCode.ORDER_NOT_FOUND, { message: 'الطلب غير موجود.' });
      }

      const orderData = orderSnap.data()!;
      if (orderData.customerId !== customerId) {
        throw new AppError(ErrorCode.FORBIDDEN, { message: 'غير مصرح بتعديل هذا الطلب.' });
      }

      const userRef = this.db.collection(Collections.USERS).doc(customerId);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new AppError(ErrorCode.NOT_FOUND, { message: 'حساب العميل غير موجود.' });
      }
      const userData = userSnap.data()!;
      if (userData.status === 'disabled') {
        throw new AppError(ErrorCode.ACCOUNT_DISABLED, {
          message: 'تم إيقاف حسابك من قبل إدارة المتجر. لا يمكن تعديل الطلبات.',
        });
      }

      if (!canCustomerEditOrder(orderData.status as OrderStatus)) {
        throw new AppError(ErrorCode.ORDER_LOCKED, {
          message: 'تم قفل الفاتورة مسبقًا لأن الطلب أصبح جاهزًا أو معتمدًا. لا يمكن تعديل الأصناف الآن.',
        });
      }

      if (updatedItems.length === 0) {
        throw new AppError(ErrorCode.EMPTY_ORDER, { message: 'لا يمكن إفراغ الطلب بالكامل من الأصناف.' });
      }

      const oldItems = (orderData.items || []) as OrderItem[];
      const oldItemMap = new Map<string, OrderItem>();
      for (const item of oldItems) {
        oldItemMap.set(`${item.productId}__${item.variantId}`, item);
      }

      const newItems: OrderItem[] = [];
      let totalAmount = assertMoney(0);

      // Track visited variant keys to find deleted items
      const newKeys = new Set<string>();

      // Pre-read all updated items in parallel before any writes
      const loadedUpdates = await Promise.all(
        updatedItems.map(async (update) => {
          const itemKey = `${update.productId}__${update.variantId}`;
          newKeys.add(itemKey);

          const prodRef = this.db.collection(Collections.PRODUCTS).doc(update.productId);
          const varRef = prodRef.collection(Collections.VARIANTS).doc(update.variantId);
          const pricingRef = this.db.collection(Collections.PRODUCT_PRICING).doc(update.productId);

          const [prodSnap, varSnap, pricingSnap] = await Promise.all([
            tx.get(prodRef),
            tx.get(varRef),
            tx.get(pricingRef),
          ]);
          return { update, prodRef, varRef, pricingRef, prodSnap, varSnap, pricingSnap };
        })
      );

      // Pre-read all deleted items in parallel before any writes
      const deletedOldItems = Array.from(oldItemMap.entries())
        .filter(([key]) => !newKeys.has(key))
        .map(([, item]) => item);

      const loadedDeletedVariants = await Promise.all(
        deletedOldItems.map(async (oldItem) => {
          const varRef = this.db
            .collection(Collections.PRODUCTS)
            .doc(oldItem.productId)
            .collection(Collections.VARIANTS)
            .doc(oldItem.variantId);
          const varSnap = await tx.get(varRef);
          return { oldItem, varRef, varSnap };
        })
      );

      // Process updates and calculations in memory
      const variantWrites: Array<{
        varRef: FirebaseFirestore.DocumentReference;
        reservedQty: number;
        availableQty: number;
        stockState: string;
        moveDelta: number;
        moveType: 'RESERVE' | 'RELEASE';
        currentStock: number;
        productId: string;
        variantId: string;
      }> = [];

      for (const loaded of loadedUpdates) {
        const { update, varRef, prodSnap, varSnap, pricingSnap } = loaded;
        const itemKey = `${update.productId}__${update.variantId}`;

        if (!prodSnap.exists || !varSnap.exists) {
          throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, { message: 'أحد الأصناف لم يعد متاحًا.' });
        }

        const prodData = prodSnap.data()!;
        const varData = varSnap.data()!;
        const currentStock = (varData.stockQty ?? 0) as number;
        const currentReserved = (varData.reservedQty ?? 0) as number;

        const oldItem = oldItemMap.get(itemKey);
        const oldQty = oldItem ? oldItem.requestedQty : 0;
        const diffQty = update.quantity - oldQty;

        // Stock check if quantity increased
        const currentAvailable = Math.max(0, currentStock - currentReserved);
        if (diffQty > 0 && currentAvailable < diffQty) {
          throw new AppError(ErrorCode.STOCK_BELOW_RESERVED, {
            message: `لا تتوفر كمية كافية لزيادة "${prodData.name} (${varData.label})". المتوفر الإضافي: ${currentAvailable} قطعة.`,
          });
        }

        const newReserved = Math.max(0, currentReserved + diffQty);
        const newAvailable = Math.max(0, currentStock - newReserved);
        const threshold = (varData.lowStockThreshold ?? 5) as number;
        const newStockState = computeStockState(newAvailable, threshold);

        if (diffQty !== 0) {
          variantWrites.push({
            varRef,
            reservedQty: newReserved,
            availableQty: newAvailable,
            stockState: newStockState,
            moveDelta: Math.abs(diffQty),
            moveType: diffQty > 0 ? 'RESERVE' : 'RELEASE',
            currentStock,
            productId: update.productId,
            variantId: update.variantId,
          });
        }

        // Recalculate price
        const pricingData = pricingSnap.exists ? pricingSnap.data() : null;
        const unitPrice = resolveUnitPrice({
          product: { retailPrice: prodData.retailPrice },
          variant: { id: varData.id, retailPriceOverride: varData.retailPriceOverride },
          pricing: pricingData
            ? {
                productId: update.productId,
                wholesalePrice: pricingData.wholesalePrice,
                variantWholesalePrices: pricingData.variantWholesalePrices || {},
                updatedAt: new Date(),
                updatedBy: '',
              }
            : null,
          role: orderData.customerRole as Role,
        });

        const subtotal = multiplyMoney(unitPrice, update.quantity);
        totalAmount = addMoney(totalAmount, subtotal);

        newItems.push({
          id: itemKey,
          productId: update.productId,
          variantId: update.variantId,
          productSlug: prodData.slug,
          productName: prodData.name,
          variantLabel: varData.label,
          image: prodData.images?.[0] || null,
          sku: varData.sku || prodData.sku || null,
          barcode: varData.barcode || prodData.barcode || null,
          unitPrice,
          requestedQty: update.quantity,
          preparedQty: oldItem ? Math.min(oldItem.preparedQty, update.quantity) : 0,
          status: oldItem ? (oldItem.preparedQty >= update.quantity ? 'prepared' : 'pending') : 'pending',
          subtotal,
          notes: oldItem?.notes || null,
        });
      }

      // Process deletions in memory
      const deletedWrites: Array<{
        varRef: FirebaseFirestore.DocumentReference;
        reservedQty: number;
        availableQty: number;
        stockState: string;
        requestedQty: number;
        currentStock: number;
        productId: string;
        variantId: string;
      }> = [];

      for (const loaded of loadedDeletedVariants) {
        const { oldItem, varRef, varSnap } = loaded;
        if (varSnap.exists) {
          const vData = varSnap.data()!;
          const cStock = (vData.stockQty ?? 0) as number;
          const cReserved = (vData.reservedQty ?? 0) as number;
          const released = Math.max(0, cReserved - oldItem.requestedQty);
          const avail = Math.max(0, cStock - released);
          const thresh = (vData.lowStockThreshold ?? 5) as number;

          deletedWrites.push({
            varRef,
            reservedQty: released,
            availableQty: avail,
            stockState: computeStockState(avail, thresh),
            requestedQty: oldItem.requestedQty,
            currentStock: cStock,
            productId: oldItem.productId,
            variantId: oldItem.variantId,
          });
        }
      }

      // NOW EXECUTE ALL WRITES TOGETHER
      for (const vw of variantWrites) {
        tx.update(vw.varRef, {
          reservedQty: vw.reservedQty,
          availableQty: vw.availableQty,
          stockState: vw.stockState,
          updatedAt: FieldValue.serverTimestamp(),
        });

        const moveRef = this.db.collection(Collections.INVENTORY_MOVEMENTS).doc();
        tx.set(moveRef, {
          productId: vw.productId,
          variantId: vw.variantId,
          type: vw.moveType,
          delta: vw.moveDelta,
          stockAfter: vw.currentStock,
          reservedAfter: vw.reservedQty,
          orderId: orderData.orderNumber,
          reason: `تعديل عميل للطلب ${orderData.orderNumber}`,
          actorId: customerId,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      for (const dw of deletedWrites) {
        tx.update(dw.varRef, {
          reservedQty: dw.reservedQty,
          availableQty: dw.availableQty,
          stockState: dw.stockState,
          updatedAt: FieldValue.serverTimestamp(),
        });

        const moveRef = this.db.collection(Collections.INVENTORY_MOVEMENTS).doc();
        tx.set(moveRef, {
          productId: dw.productId,
          variantId: dw.variantId,
          type: 'RELEASE',
          delta: dw.requestedQty,
          stockAfter: dw.currentStock,
          reservedAfter: dw.reservedQty,
          orderId: orderData.orderNumber,
          reason: `حذف صنف من الطلب ${orderData.orderNumber}`,
          actorId: customerId,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      // Update Order Document
      const updates: Record<string, unknown> = {
        items: newItems,
        totalAmount,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (customerNotes !== undefined) {
        updates.customerNotes = customerNotes.trim() || null;
      }

      tx.update(orderRef, updates);

      // Staff Alert if order was already in preparation
      if (orderData.status === 'PREPARING' || orderData.status === 'PARTIALLY_READY') {
        const staffAlertRef = this.db.collection(Collections.NOTIFICATIONS).doc();
        tx.set(staffAlertRef, {
          userId: 'STAFF_BROADCAST',
          title: `تعديل من العميل على طلب قيد التجهيز`,
          message: `تنبيه: قام العميل ${orderData.customerName} بتعديل أصناف الطلب ${orderData.orderNumber} أثناء التجهيز.`,
          type: 'ORDER_EDITED_BY_CUSTOMER',
          referenceId: orderId,
          isRead: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      // Audit Log
      const auditRef = this.db.collection(Collections.AUDIT_LOGS).doc();
      tx.set(auditRef, {
        actorId: customerId,
        actorName: orderData.customerName,
        action: 'ORDER_EDITED_BY_CUSTOMER',
        entityType: 'order',
        entityId: orderId,
        oldData: { totalAmount: orderData.totalAmount, itemCount: oldItems.length },
        newData: { totalAmount, itemCount: newItems.length },
        timestamp: FieldValue.serverTimestamp(),
      });

      return {
        id: orderId,
        orderNumber: orderData.orderNumber,
        customerId,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerRole: orderData.customerRole,
        status: orderData.status,
        businessDate: orderData.businessDate,
        items: newItems,
        totalAmount,
        customerNotes: customerNotes !== undefined ? (customerNotes.trim() || null) : orderData.customerNotes,
        isLocked: false,
        preparedBy: orderData.preparedBy,
        preparedAt: orderData.preparedAt instanceof Timestamp ? orderData.preparedAt.toDate() : null,
        confirmedBy: orderData.confirmedBy,
        confirmedAt: orderData.confirmedAt instanceof Timestamp ? orderData.confirmedAt.toDate() : null,
        createdAt: orderData.createdAt instanceof Timestamp ? orderData.createdAt.toDate() : new Date(),
        updatedAt: new Date(),
      };
    });
  }

  /**
   * Staff updates preparation progress of a single order item.
   */
  async updateItemPreparation(
    staffId: string,
    staffName: string,
    orderId: string,
    variantId: string,
    preparedQty: number,
    itemStatus: OrderItemStatus,
    notes?: string
  ): Promise<Order> {
    const orderRef = this.db.collection(Collections.ORDERS).doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, { message: 'الطلب غير موجود.' });
    }

    const orderData = snap.data()!;
    const items = (orderData.items || []) as OrderItem[];
    const itemIndex = items.findIndex((i) => i.variantId === variantId);

    if (itemIndex === -1) {
      throw new AppError(ErrorCode.NOT_FOUND, { message: 'الصنف غير موجود في الطلب.' });
    }

    const targetItem = items[itemIndex]!;
    targetItem.preparedQty = Math.max(0, preparedQty);
    targetItem.status = itemStatus;
    if (notes !== undefined) targetItem.notes = notes;

    // Recalculate order status:
    // If all items prepared -> ready for markReady
    // If some prepared/partial -> PREPARING or PARTIALLY_READY
    const hasAnyPrepared = items.some((i) => i.preparedQty > 0 || i.status === 'prepared');
    let nextStatus: OrderStatus = orderData.status;

    if (orderData.status === 'PENDING' && hasAnyPrepared) {
      nextStatus = 'PREPARING';
    }

    await orderRef.update({
      items,
      status: nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedSnap = await orderRef.get();
    return this.mapOrderDoc(orderId, updatedSnap.data()!);
  }

  /**
   * Staff/Admin marks order as READY.
   * Atomically locks the order, commits physical stock deduction, and releases reservations.
   */
  async markOrderReady(
    staffId: string,
    staffName: string,
    orderId: string
  ): Promise<Order> {
    return this.db.runTransaction(async (tx) => {
      const orderRef = this.db.collection(Collections.ORDERS).doc(orderId);
      const snap = await tx.get(orderRef);

      if (!snap.exists) {
        throw new AppError(ErrorCode.ORDER_NOT_FOUND, { message: 'الطلب غير موجود.' });
      }

      const orderData = snap.data()!;
      if (orderData.status === 'READY' || orderData.status === 'CONFIRMED') {
        throw new AppError(ErrorCode.ORDER_LOCKED, { message: 'الطلب جاهز بالفعل.' });
      }

      const items = (orderData.items || []) as OrderItem[];

      // Pre-read all variant snapshots in parallel before any writes
      const loadedVariants = await Promise.all(
        items.map(async (item) => {
          const varRef = this.db
            .collection(Collections.PRODUCTS)
            .doc(item.productId)
            .collection(Collections.VARIANTS)
            .doc(item.variantId);
          const varSnap = await tx.get(varRef);
          return { item, varRef, varSnap };
        })
      );

      // Execute writes together
      for (const lv of loadedVariants) {
        const { item, varRef, varSnap } = lv;
        if (varSnap.exists) {
          const vData = varSnap.data()!;
          const currentStock = (vData.stockQty ?? 0) as number;
          const currentReserved = (vData.reservedQty ?? 0) as number;

          // Quantity actually being taken
          const actualDeduction = item.preparedQty > 0 ? item.preparedQty : item.requestedQty;
          const newStock = Math.max(0, currentStock - actualDeduction);
          const newReserved = Math.max(0, currentReserved - item.requestedQty);
          const newAvailable = Math.max(0, newStock - newReserved);
          const threshold = (vData.lowStockThreshold ?? 5) as number;
          const newStockState = computeStockState(newAvailable, threshold);

          tx.update(varRef, {
            stockQty: newStock,
            reservedQty: newReserved,
            availableQty: newAvailable,
            stockState: newStockState,
            updatedAt: FieldValue.serverTimestamp(),
          });

          // COMMIT movement
          const moveRef = this.db.collection(Collections.INVENTORY_MOVEMENTS).doc();
          tx.set(moveRef, {
            productId: item.productId,
            variantId: item.variantId,
            type: 'COMMIT',
            delta: -actualDeduction,
            stockAfter: newStock,
            reservedAfter: newReserved,
            orderId: orderData.orderNumber,
            reason: `تجهيز وتأكيد جاهزية الطلب ${orderData.orderNumber}`,
            actorId: staffId,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      }

      // Update Order to READY and lock it
      tx.update(orderRef, {
        status: 'READY' as OrderStatus,
        isLocked: true,
        preparedBy: staffName,
        preparedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Notification to customer
      const notifRef = this.db.collection(Collections.NOTIFICATIONS).doc();
      tx.set(notifRef, {
        userId: orderData.customerId,
        title: 'طلبك أصبح جاهزًا للاستلام!',
        message: `تم تجهيز طلبك رقم ${orderData.orderNumber} بالكامل وتم قفل الفاتورة. يرجى التوجه للاستلام أو انتظار المندوب.`,
        type: 'ORDER_READY',
        referenceId: orderId,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Audit Log
      const auditRef = this.db.collection(Collections.AUDIT_LOGS).doc();
      tx.set(auditRef, {
        actorId: staffId,
        actorName: staffName,
        action: 'ORDER_MARKED_READY',
        entityType: 'order',
        entityId: orderId,
        oldData: { status: orderData.status },
        newData: { status: 'READY', isLocked: true },
        timestamp: FieldValue.serverTimestamp(),
      });

      return {
        id: orderId,
        orderNumber: orderData.orderNumber,
        customerId: orderData.customerId,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerRole: orderData.customerRole,
        status: 'READY',
        businessDate: orderData.businessDate,
        items,
        totalAmount: orderData.totalAmount,
        customerNotes: orderData.customerNotes,
        isLocked: true,
        preparedBy: staffName,
        preparedAt: new Date(),
        confirmedBy: orderData.confirmedBy,
        confirmedAt: null,
        createdAt: orderData.createdAt instanceof Timestamp ? orderData.createdAt.toDate() : new Date(),
        updatedAt: new Date(),
      };
    });
  }

  /**
   * Admin confirms the ready order and posts debt (INVOICE) to customer's financial ledger.
   */
  async confirmOrder(
    adminId: string,
    adminName: string,
    orderId: string
  ): Promise<Order> {
    return this.db.runTransaction(async (tx) => {
      const orderRef = this.db.collection(Collections.ORDERS).doc(orderId);
      const snap = await tx.get(orderRef);

      if (!snap.exists) {
        throw new AppError(ErrorCode.ORDER_NOT_FOUND, { message: 'الطلب غير موجود.' });
      }

      const orderData = snap.data()!;
      if (orderData.status !== 'READY') {
        throw new AppError(ErrorCode.INVALID_STATUS_TRANSITION, {
          message: 'لا يمكن اعتماد الفاتورة إلا بعد أن يصبح الطلب في حالة جاهز (READY).',
        });
      }

      // Read customer user account
      const userRef = this.db.collection(Collections.USERS).doc(orderData.customerId);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new AppError(ErrorCode.NOT_FOUND, { message: 'حساب العميل غير موجود.' });
      }

      const userData = userSnap.data()!;
      const currentBalance = (userData.balance ?? 0) as Money;
      const orderAmount = orderData.totalAmount as Money;
      // Invoicing posts a debit (customer balance increases by invoice amount)
      const newBalance = addMoney(currentBalance, orderAmount);

      // Append ledger transaction
      const txRef = this.db.collection(Collections.ACCOUNT_TRANSACTIONS).doc();
      tx.set(txRef, {
        customerId: orderData.customerId,
        orderId,
        paymentId: null,
        type: 'INVOICE',
        amount: orderAmount,
        previousBalance: currentBalance,
        newBalance,
        description: `فاتورة مبيعات معتمدة للطلب رقم ${orderData.orderNumber}`,
        recordedBy: adminName,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Update customer balance
      tx.update(userRef, {
        balance: newBalance,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update order status to CONFIRMED
      tx.update(orderRef, {
        status: 'CONFIRMED' as OrderStatus,
        confirmedBy: adminName,
        confirmedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Notification
      const notifRef = this.db.collection(Collections.NOTIFICATIONS).doc();
      tx.set(notifRef, {
        userId: orderData.customerId,
        title: 'تم اعتماد فاتورة طلبك',
        message: `تم اعتماد الفاتورة رقم ${orderData.orderNumber} بمبلغ ${orderAmount} ر.ي وقيدها على حسابك المالي. الرصيد الإجمالي: ${newBalance} ر.ي.`,
        type: 'ORDER_CONFIRMED',
        referenceId: orderId,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Audit Log
      const auditRef = this.db.collection(Collections.AUDIT_LOGS).doc();
      tx.set(auditRef, {
        actorId: adminId,
        actorName: adminName,
        action: 'ORDER_CONFIRMED',
        entityType: 'order',
        entityId: orderId,
        oldData: { status: 'READY', customerBalance: currentBalance },
        newData: { status: 'CONFIRMED', customerBalance: newBalance, amount: orderAmount },
        timestamp: FieldValue.serverTimestamp(),
      });

      return {
        id: orderId,
        orderNumber: orderData.orderNumber,
        customerId: orderData.customerId,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerRole: orderData.customerRole,
        status: 'CONFIRMED',
        businessDate: orderData.businessDate,
        items: orderData.items,
        totalAmount: orderData.totalAmount,
        customerNotes: orderData.customerNotes,
        isLocked: true,
        preparedBy: orderData.preparedBy,
        preparedAt: orderData.preparedAt instanceof Timestamp ? orderData.preparedAt.toDate() : null,
        confirmedBy: adminName,
        confirmedAt: new Date(),
        createdAt: orderData.createdAt instanceof Timestamp ? orderData.createdAt.toDate() : new Date(),
        updatedAt: new Date(),
      };
    });
  }

  private mapOrderDoc(id: string, data: FirebaseFirestore.DocumentData): Order {
    return {
      id,
      orderNumber: data.orderNumber || id,
      customerId: data.customerId || '',
      customerName: data.customerName || 'عميل',
      customerPhone: data.customerPhone || '',
      customerRole: (data.customerRole || 'customer') as Role,
      status: (data.status || 'PENDING') as OrderStatus,
      businessDate: data.businessDate || '',
      items: Array.isArray(data.items) ? data.items : [],
      totalAmount: (data.totalAmount ?? 0) as Money,
      customerNotes: data.customerNotes || null,
      isLocked: !!data.isLocked,
      preparedBy: data.preparedBy || null,
      preparedAt: data.preparedAt instanceof Timestamp ? data.preparedAt.toDate() : null,
      confirmedBy: data.confirmedBy || null,
      confirmedAt: data.confirmedAt instanceof Timestamp ? data.confirmedAt.toDate() : null,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const orderRepository = new FirestoreOrderRepository();

