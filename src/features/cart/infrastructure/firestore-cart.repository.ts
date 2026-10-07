import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { assertMoney, addMoney, multiplyMoney, type Money } from '@/core/domain/money';
import { resolveUnitPrice } from '@/features/products/domain/pricing';
import { productRepository } from '@/features/products/infrastructure/firestore-product.repository';
import type { Role } from '@/core/auth/roles';
import type { Cart, CartItem, CartResolvedItem, CartSummary } from '../domain/cart';

export class FirestoreCartRepository {
  private get db() {
    return adminDb();
  }

  async getCart(userId: string): Promise<Cart> {
    const doc = await this.db.collection(Collections.CARTS).doc(userId).get();
    if (!doc.exists) {
      return {
        userId,
        items: [],
        updatedAt: new Date(),
      };
    }

    const data = doc.data()!;
    const rawItems = Array.isArray(data.items) ? data.items : [];

    const items: CartItem[] = rawItems.map((item: FirebaseFirestore.DocumentData) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: Number(item.quantity) || 1,
      addedAt: item.addedAt instanceof Timestamp ? item.addedAt.toDate() : new Date(),
    }));

    return {
      userId,
      items,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }

  async addItem(
    userId: string,
    productId: string,
    variantId: string,
    quantity: number
  ): Promise<void> {
    const cartRef = this.db.collection(Collections.CARTS).doc(userId);

    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(cartRef);
      let items: Array<{
        productId: string;
        variantId: string;
        quantity: number;
        addedAt: Timestamp | Date;
      }> = [];

      if (snap.exists) {
        items = (snap.data()?.items || []) as typeof items;
      }

      const existingIndex = items.findIndex(
        (i) => i.productId === productId && i.variantId === variantId
      );

      if (existingIndex >= 0) {
        items[existingIndex]!.quantity += quantity;
      } else {
        items.push({
          productId,
          variantId,
          quantity,
          addedAt: new Date(),
        });
      }

      tx.set(
        cartRef,
        {
          userId,
          items,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
  }

  async updateItemQuantity(
    userId: string,
    productId: string,
    variantId: string,
    quantity: number
  ): Promise<void> {
    const cartRef = this.db.collection(Collections.CARTS).doc(userId);

    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(cartRef);
      if (!snap.exists) return;

      let items = (snap.data()?.items || []) as CartItem[];

      if (quantity <= 0) {
        items = items.filter(
          (i) => !(i.productId === productId && i.variantId === variantId)
        );
      } else {
        const item = items.find(
          (i) => i.productId === productId && i.variantId === variantId
        );
        if (item) {
          item.quantity = quantity;
        }
      }

      tx.update(cartRef, {
        items,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  }

  async removeItem(userId: string, productId: string, variantId: string): Promise<void> {
    await this.updateItemQuantity(userId, productId, variantId, 0);
  }

  async clearCart(userId: string): Promise<void> {
    await this.db.collection(Collections.CARTS).doc(userId).delete();
  }

  /**
   * Pure server resolver that converts raw cart items into verified, current
   * products, variant stock status, and role-based prices (Wholesale vs Retail).
   */
  async resolveCartSummary(cart: Cart, role?: Role | null): Promise<CartSummary> {
    if (cart.items.length === 0) {
      return {
        items: [],
        totalQuantity: 0,
        totalAmount: assertMoney(0),
        hasOutOfStockItems: false,
      };
    }

    const resolvedItems: CartResolvedItem[] = [];
    let totalQuantity = 0;
    let totalAmount = assertMoney(0);
    let hasOutOfStockItems = false;

    for (const item of cart.items) {
      const product = await productRepository.findById(item.productId);
      if (!product) continue;

      const variant = await productRepository.findVariantById(item.productId, item.variantId);
      const pricing = await productRepository.findPricing(item.productId);

      const unitPrice = resolveUnitPrice({
        product,
        variant,
        pricing,
        role,
      });

      const catSnap = product.categoryId
        ? await this.db.collection(Collections.CATEGORIES).doc(product.categoryId).get()
        : null;
      const isCatActive = catSnap?.exists ? (catSnap.data()?.isActive ?? true) : true;
      const isProductAvailable = product.isVisible && product.status === 'active' && isCatActive;

      const availableQty = (variant && isProductAvailable)
        ? variant.availableQty
        : (product.inStock && isProductAvailable ? 999 : 0);
      const inStock = isProductAvailable && availableQty >= item.quantity;
      if (!inStock) {
        hasOutOfStockItems = true;
      }

      const subtotal = multiplyMoney(unitPrice, item.quantity);

      resolvedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        productSlug: product.slug,
        productName: product.name,
        variantLabel: variant?.label || 'الافتراضي',
        image: product.images[0] || null,
        unitPrice,
        quantity: item.quantity,
        subtotal,
        availableQty,
        inStock,
      });

      totalQuantity += item.quantity;
      totalAmount = addMoney(totalAmount, subtotal);
    }

    return {
      items: resolvedItems,
      totalQuantity,
      totalAmount,
      hasOutOfStockItems,
    };
  }
}

export const cartRepository = new FirestoreCartRepository();

