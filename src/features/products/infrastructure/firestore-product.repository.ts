import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import { buildSearchKeywords, normalizeArabic, toSearchToken } from '@/core/text/arabic-normalize';
import type { Money } from '@/core/domain/money';
import type {
  Product,
  ProductDetail,
  ProductStatus,
  CreateProductInput,
} from '../domain/product';
import {
  generateVariantId,
  computeStockState,
  computeAvailableQty,
  type ProductVariant,
  type ProductOption,
} from '../domain/variant';
import type { ProductPricing } from '../domain/pricing';
import type { UpdateProductSchema } from '../schemas/product.schemas';

export class FirestoreProductRepository {
  private get db() {
    return adminDb();
  }

  async findById(id: string): Promise<Product | null> {
    const doc = await this.db.collection(Collections.PRODUCTS).doc(id).get();
    if (!doc.exists) return null;
    return this.mapProductDoc(doc.id, doc.data()!);
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const snap = await this.db
      .collection(Collections.PRODUCTS)
      .where('slug', '==', slug)
      .limit(1)
      .get();
    if (snap.empty || !snap.docs[0]) return null;
    return this.mapProductDoc(snap.docs[0].id, snap.docs[0].data());
  }

  async findDetailById(id: string): Promise<ProductDetail | null> {
    const product = await this.findById(id);
    if (!product) return null;

    const variants = await this.getVariants(id);
    return {
      ...product,
      variants,
    };
  }

  async findDetailBySlug(slug: string): Promise<ProductDetail | null> {
    const product = await this.findBySlug(slug);
    if (!product) return null;

    const variants = await this.getVariants(product.id);
    return {
      ...product,
      variants,
    };
  }

  async getVariants(productId: string): Promise<ProductVariant[]> {
    const snap = await this.db
      .collection(Collections.PRODUCTS)
      .doc(productId)
      .collection(Collections.VARIANTS)
      .get();

    return snap.docs.map((d) => this.mapVariantDoc(d.id, productId, d.data()));
  }

  async findVariantById(productId: string, variantId: string): Promise<ProductVariant | null> {
    const doc = await this.db
      .collection(Collections.PRODUCTS)
      .doc(productId)
      .collection(Collections.VARIANTS)
      .doc(variantId)
      .get();

    if (!doc.exists) return null;
    return this.mapVariantDoc(doc.id, productId, doc.data()!);
  }

  /**
   * Internal/Server-only: Retrieves wholesale pricing for a product.
   * NEVER call this from public/customer client actions.
   */
  async findPricing(productId: string): Promise<ProductPricing | null> {
    const doc = await this.db.collection(Collections.PRODUCT_PRICING).doc(productId).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      productId: doc.id,
      wholesalePrice: data.wholesalePrice as Money,
      variantWholesalePrices: (data.variantWholesalePrices || {}) as Record<string, Money>,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
      updatedBy: data.updatedBy || '',
    };
  }

  async list(options: {
    categoryId?: string;
    isVisible?: boolean;
    status?: ProductStatus;
    search?: string;
    isFeatured?: boolean;
    limit?: number;
  } = {}): Promise<Product[]> {
    let query: FirebaseFirestore.Query = this.db.collection(Collections.PRODUCTS);

    if (options.categoryId) {
      query = query.where('categoryId', '==', options.categoryId);
    }

    if (options.status) {
      query = query.where('status', '==', options.status);
    }

    if (options.isVisible !== undefined) {
      query = query.where('isVisible', '==', options.isVisible);
    }

    if (options.isFeatured !== undefined) {
      query = query.where('isFeatured', '==', options.isFeatured);
    }

    if (options.search) {
      const searchToken = toSearchToken(options.search);
      if (searchToken) {
        query = query.where('searchKeywords', 'array-contains', searchToken);
      }
    }

    const hasFilter = Boolean(
      options.categoryId ||
      options.status ||
      options.isVisible !== undefined ||
      options.isFeatured !== undefined ||
      options.search
    );

    if (!hasFilter) {
      query = query.orderBy('createdAt', 'desc');
      if (options.limit) {
        query = query.limit(options.limit);
      }
    }

    const snap = await query.get();
    let products = snap.docs.map((d) => this.mapProductDoc(d.id, d.data()));

    // Exclude products whose category is hidden/inactive when browsing storefront
    if (options.isVisible === true) {
      const activeCatsSnap = await this.db
        .collection(Collections.CATEGORIES)
        .where('isActive', '==', true)
        .get();
      const activeCatIds = new Set(activeCatsSnap.docs.map((d) => d.id));

      if (options.categoryId && !activeCatIds.has(options.categoryId)) {
        return [];
      }

      products = products.filter((p) => activeCatIds.has(p.categoryId));
    }

    if (hasFilter) {
      products.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      if (options.limit) {
        products = products.slice(0, options.limit);
      }
    }

    return products;
  }

  async create(
    data: CreateProductInput,
    actorId: string,
    actorName: string
  ): Promise<ProductDetail> {
    const prodRef = this.db.collection(Collections.PRODUCTS).doc();
    const productId = prodRef.id;

    const slug = data.slug || this.slugify(data.name) || productId;
    const existingSlug = await this.findBySlug(slug);
    const finalSlug = existingSlug ? `${slug}-${productId.slice(0, 4)}` : slug;

    const options: ProductOption[] = data.options || [];
    const hasVariants = options.length > 0 && (data.variants && data.variants.length > 0);

    // Process variants
    interface PreparedVariant {
      id: string;
      data: Record<string, unknown>;
      wholesalePriceOverride?: Money | null;
      stockQty: number;
      availableQty: number;
    }

    const preparedVariants: PreparedVariant[] = [];
    const variantWholesaleMap: Record<string, Money> = {};
    const availableOptionKeysSet = new Set<string>();

    const retailPrices: Money[] = [];

    if (hasVariants && data.variants) {
      for (const v of data.variants) {
        const variantId = generateVariantId(v.optionValues);
        const availableQty = computeAvailableQty(v.stockQty, 0);
        const threshold = v.lowStockThreshold ?? 5;
        const stockState = computeStockState(availableQty, threshold);

        if (availableQty > 0) {
          for (const [key, val] of Object.entries(v.optionValues)) {
            availableOptionKeysSet.add(`${key}:${val}`);
          }
        }

        const effectiveRetail = v.retailPriceOverride ?? data.retailPrice;
        retailPrices.push(effectiveRetail);

        if (v.wholesalePriceOverride !== undefined && v.wholesalePriceOverride !== null) {
          variantWholesaleMap[variantId] = v.wholesalePriceOverride;
        }

        preparedVariants.push({
          id: variantId,
          wholesalePriceOverride: v.wholesalePriceOverride,
          stockQty: v.stockQty,
          availableQty,
          data: {
            id: variantId,
            productId,
            optionValues: v.optionValues,
            label: v.label,
            sku: v.sku || null,
            barcode: v.barcode || null,
            retailPriceOverride: v.retailPriceOverride ?? null,
            images: null,
            stockQty: v.stockQty,
            reservedQty: 0,
            availableQty,
            lowStockThreshold: threshold,
            stockState,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
        });
      }
    } else {
      // Default single variant
      const defaultInitialStock = data.variants?.[0]?.stockQty ?? 0;
      const availableQty = computeAvailableQty(defaultInitialStock, 0);
      const stockState = computeStockState(availableQty, 5);
      retailPrices.push(data.retailPrice);

      preparedVariants.push({
        id: 'default',
        stockQty: defaultInitialStock,
        availableQty,
        data: {
          id: 'default',
          productId,
          optionValues: {},
          label: 'الافتراضي',
          sku: data.sku || null,
          barcode: data.barcode || null,
          retailPriceOverride: null,
          images: null,
          stockQty: defaultInitialStock,
          reservedQty: 0,
          availableQty,
          lowStockThreshold: 5,
          stockState,
          isActive: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
      });
    }

    const minRetail = retailPrices.length > 0 ? Math.min(...retailPrices) as Money : data.retailPrice;
    const maxRetail = retailPrices.length > 0 ? Math.max(...retailPrices) as Money : data.retailPrice;
    const inStock = preparedVariants.some((v) => v.availableQty > 0);

    const searchKeywords = buildSearchKeywords(
      [data.name, data.shortDescription || '', data.description || ''],
      [data.sku, data.barcode, ...preparedVariants.map((v) => (v.data.sku as string) || null)]
    );

    const productDoc = {
      name: data.name,
      nameNormalized: normalizeArabic(data.name),
      slug: finalSlug,
      shortDescription: data.shortDescription || '',
      description: data.description || '',
      categoryId: data.categoryId,
      images: data.images || [],
      sku: data.sku || null,
      barcode: data.barcode || null,

      status: data.status || 'active',
      isVisible: data.isVisible ?? true,
      isFeatured: data.isFeatured ?? false,
      featuredOrder: null,

      retailPrice: data.retailPrice,
      retailPriceRange: { min: minRetail, max: maxRetail },
      compareAtPrice: null,

      options,
      hasVariants: options.length > 0,

      inStock,
      availableOptionKeys: Array.from(availableOptionKeysSet),
      searchKeywords,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const batch = this.db.batch();
    batch.set(prodRef, productDoc);

    // Save variants in subcollection
    for (const v of preparedVariants) {
      const vRef = prodRef.collection(Collections.VARIANTS).doc(v.id);
      batch.set(vRef, v.data);

      // Initial inventory movement if initial stock > 0
      if (v.stockQty > 0) {
        const moveRef = this.db.collection(Collections.INVENTORY_MOVEMENTS).doc();
        batch.set(moveRef, {
          productId,
          variantId: v.id,
          type: 'RESTOCK',
          delta: v.stockQty,
          stockAfter: v.stockQty,
          reservedAfter: 0,
          orderId: null,
          reason: 'المخزون الافتتاحي عند إنشاء المنتج',
          actorId,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // Save protected wholesale pricing in productPricing
    const pricingRef = this.db.collection(Collections.PRODUCT_PRICING).doc(productId);
    batch.set(pricingRef, {
      productId,
      wholesalePrice: data.wholesalePrice,
      variantWholesalePrices: variantWholesaleMap,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actorId,
    });

    // Increment category product count
    const catRef = this.db.collection(Collections.CATEGORIES).doc(data.categoryId);
    batch.update(catRef, {
      productCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Audit log
    const auditRef = this.db.collection(Collections.AUDIT_LOGS).doc();
    batch.set(auditRef, {
      actorId,
      actorName,
      action: 'PRODUCT_CREATED',
      entityType: 'product',
      entityId: productId,
      oldData: null,
      newData: { ...productDoc, wholesalePrice: data.wholesalePrice },
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // Map output
    const variantsResult: ProductVariant[] = preparedVariants.map((v) => ({
      id: v.id,
      productId,
      optionValues: (v.data.optionValues || {}) as Record<string, string>,
      label: v.data.label as string,
      sku: (v.data.sku as string) || null,
      barcode: (v.data.barcode as string) || null,
      retailPriceOverride: (v.data.retailPriceOverride as Money) || null,
      images: null,
      stockQty: v.stockQty,
      reservedQty: 0,
      availableQty: v.availableQty,
      lowStockThreshold: (v.data.lowStockThreshold as number) || 5,
      stockState: computeStockState(v.availableQty, (v.data.lowStockThreshold as number) || 5),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    return {
      id: productId,
      name: data.name,
      nameNormalized: normalizeArabic(data.name),
      slug: finalSlug,
      shortDescription: data.shortDescription || '',
      description: data.description || '',
      categoryId: data.categoryId,
      images: data.images || [],
      sku: data.sku || null,
      barcode: data.barcode || null,
      status: data.status || 'active',
      isVisible: data.isVisible ?? true,
      isFeatured: data.isFeatured ?? false,
      featuredOrder: null,
      retailPrice: data.retailPrice,
      retailPriceRange: { min: minRetail, max: maxRetail },
      compareAtPrice: null,
      options,
      hasVariants: options.length > 0,
      inStock,
      availableOptionKeys: Array.from(availableOptionKeysSet),
      searchKeywords,
      createdAt: new Date(),
      updatedAt: new Date(),
      variants: variantsResult,
    };
  }

  async update(
    input: UpdateProductSchema,
    actorId: string,
    actorName: string
  ): Promise<Product> {
    const prodRef = this.db.collection(Collections.PRODUCTS).doc(input.id);
    const snap = await prodRef.get();
    if (!snap.exists) {
      throw new AppError(ErrorCode.NOT_FOUND, { message: 'المنتج المطلوب غير موجود.' });
    }

    const current = snap.data()!;
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (input.name !== undefined) {
      updates.name = input.name;
      updates.nameNormalized = normalizeArabic(input.name);
    }
    if (input.slug !== undefined) updates.slug = input.slug;
    if (input.shortDescription !== undefined) updates.shortDescription = input.shortDescription;
    if (input.description !== undefined) updates.description = input.description;
    if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
    if (input.images !== undefined) updates.images = input.images;
    if (input.sku !== undefined) updates.sku = input.sku;
    if (input.barcode !== undefined) updates.barcode = input.barcode;
    if (input.status !== undefined) updates.status = input.status;
    if (input.isVisible !== undefined) updates.isVisible = input.isVisible;
    if (input.isFeatured !== undefined) updates.isFeatured = input.isFeatured;

    if (input.retailPrice !== undefined) {
      updates.retailPrice = input.retailPrice;
      if (!current.hasVariants && input.variants === undefined) {
        updates.retailPriceRange = { min: input.retailPrice, max: input.retailPrice };
      }
    }

    // Refresh search keywords if name or descriptions changed
    if (input.name || input.shortDescription || input.description || input.sku || input.barcode) {
      updates.searchKeywords = buildSearchKeywords(
        [
          (input.name ?? current.name) as string,
          (input.shortDescription ?? current.shortDescription ?? '') as string,
          (input.description ?? current.description ?? '') as string,
        ],
        [(input.sku ?? current.sku) as string, (input.barcode ?? current.barcode) as string]
      );
    }

    const batch = this.db.batch();

    // If category changed, update counts
    if (input.categoryId && input.categoryId !== current.categoryId) {
      const oldCatRef = this.db.collection(Collections.CATEGORIES).doc(current.categoryId as string);
      const newCatRef = this.db.collection(Collections.CATEGORIES).doc(input.categoryId);
      batch.update(oldCatRef, { productCount: FieldValue.increment(-1) });
      batch.update(newCatRef, { productCount: FieldValue.increment(1) });
    }

    // Handle variants and options update
    if (input.variants !== undefined) {
      const hasVariants = Boolean(
        (input.options && input.options.length > 0) ||
        (input.variants && input.variants.length > 1) ||
        (input.variants && input.variants.length === 1 && input.variants[0].label !== 'الافتراضي')
      );

      updates.hasVariants = hasVariants;
      updates.options = input.options || [];

      // Fetch existing variants
      const existingVariants = await this.getVariants(input.id);
      const existingMap = new Map(existingVariants.map((v) => [v.id, v]));

      const incomingVariantIds = new Set<string>();
      const variantWholesaleMap: Record<string, Money> = {};
      const availableOptionKeysSet = new Set<string>();
      const retailPrices: Money[] = [];
      let totalAvailable = 0;

      for (const v of input.variants) {
        const variantId = v.id || generateVariantId(v.optionValues || {});
        incomingVariantIds.add(variantId);

        const existing = existingMap.get(variantId);
        const reservedQty = existing ? existing.reservedQty : 0;
        const stockQty = v.stockQty ?? 0;
        const availableQty = computeAvailableQty(stockQty, reservedQty);
        const threshold = v.lowStockThreshold ?? (existing?.lowStockThreshold ?? 5);
        const stockState = computeStockState(availableQty, threshold);

        if (availableQty > 0) {
          totalAvailable += availableQty;
          if (v.optionValues) {
            for (const [key, val] of Object.entries(v.optionValues)) {
              availableOptionKeysSet.add(`${key}:${val}`);
            }
          }
        }

        const effectiveRetail = (v.retailPriceOverride ?? input.retailPrice ?? current.retailPrice) as Money;
        retailPrices.push(effectiveRetail);

        if (v.wholesalePriceOverride !== undefined && v.wholesalePriceOverride !== null) {
          variantWholesaleMap[variantId] = v.wholesalePriceOverride as Money;
        }

        const vRef = prodRef.collection(Collections.VARIANTS).doc(variantId);

        // Inventory movement if stock changed
        if (existing) {
          const delta = stockQty - existing.stockQty;
          if (delta !== 0) {
            const moveRef = this.db.collection(Collections.INVENTORY_MOVEMENTS).doc();
            batch.set(moveRef, {
              productId: input.id,
              variantId,
              type: 'ADJUSTMENT',
              delta,
              stockAfter: stockQty,
              reservedAfter: reservedQty,
              orderId: null,
              reason: 'تعديل المخزون أثناء تحديث بيانات المنتج',
              actorId,
              createdAt: FieldValue.serverTimestamp(),
            });
          }

          batch.set(
            vRef,
            {
              id: variantId,
              productId: input.id,
              optionValues: v.optionValues || {},
              label: v.label,
              sku: v.sku || null,
              barcode: v.barcode || null,
              retailPriceOverride: v.retailPriceOverride ?? null,
              stockQty,
              reservedQty,
              availableQty,
              lowStockThreshold: threshold,
              stockState,
              isActive: true,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        } else {
          // New variant added
          if (stockQty > 0) {
            const moveRef = this.db.collection(Collections.INVENTORY_MOVEMENTS).doc();
            batch.set(moveRef, {
              productId: input.id,
              variantId,
              type: 'RESTOCK',
              delta: stockQty,
              stockAfter: stockQty,
              reservedAfter: 0,
              orderId: null,
              reason: 'إضافة خيار جديد أثناء تحديث بيانات المنتج',
              actorId,
              createdAt: FieldValue.serverTimestamp(),
            });
          }

          batch.set(vRef, {
            id: variantId,
            productId: input.id,
            optionValues: v.optionValues || {},
            label: v.label,
            sku: v.sku || null,
            barcode: v.barcode || null,
            retailPriceOverride: v.retailPriceOverride ?? null,
            images: null,
            stockQty,
            reservedQty: 0,
            availableQty,
            lowStockThreshold: threshold,
            stockState,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      // Delete variants that were removed
      for (const existing of existingVariants) {
        if (!incomingVariantIds.has(existing.id)) {
          const vRef = prodRef.collection(Collections.VARIANTS).doc(existing.id);
          batch.delete(vRef);
        }
      }

      // Update productPricing with variant wholesale prices
      const pricingRef = this.db.collection(Collections.PRODUCT_PRICING).doc(input.id);
      const pricingUpdate: Record<string, unknown> = {
        productId: input.id,
        variantWholesalePrices: variantWholesaleMap,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actorId,
      };
      if (input.wholesalePrice !== undefined) {
        pricingUpdate.wholesalePrice = input.wholesalePrice;
      }
      batch.set(pricingRef, pricingUpdate, { merge: true });

      // Update aggregates on product document
      updates.availableOptionKeys = Array.from(availableOptionKeysSet);
      updates.inStock = totalAvailable > 0;
      if (retailPrices.length > 0) {
        updates.retailPriceRange = {
          min: Math.min(...retailPrices),
          max: Math.max(...retailPrices),
        };
      }
    } else {
      if (input.options !== undefined) {
        updates.options = input.options;
      }

      // Update wholesale price in productPricing if supplied without variants
      if (input.wholesalePrice !== undefined) {
        const pricingRef = this.db.collection(Collections.PRODUCT_PRICING).doc(input.id);
        batch.set(
          pricingRef,
          {
            productId: input.id,
            wholesalePrice: input.wholesalePrice,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: actorId,
          },
          { merge: true }
        );
      }
    }

    batch.update(prodRef, updates);

    // Audit log
    const auditRef = this.db.collection(Collections.AUDIT_LOGS).doc();
    batch.set(auditRef, {
      actorId,
      actorName,
      action: 'PRODUCT_UPDATED',
      entityType: 'product',
      entityId: input.id,
      oldData: current,
      newData: updates,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    const updatedSnap = await prodRef.get();
    return this.mapProductDoc(prodRef.id, updatedSnap.data()!);
  }

  async delete(id: string, actorId: string, actorName: string): Promise<void> {
    const prodRef = this.db.collection(Collections.PRODUCTS).doc(id);
    const snap = await prodRef.get();
    if (!snap.exists) {
      throw new AppError(ErrorCode.NOT_FOUND, { message: 'المنتج غير موجود.' });
    }

    const current = snap.data()!;

    // Decrement category product count
    const batch = this.db.batch();
    batch.delete(prodRef);

    // Also delete pricing doc
    const pricingRef = this.db.collection(Collections.PRODUCT_PRICING).doc(id);
    batch.delete(pricingRef);

    if (current.categoryId) {
      const catRef = this.db.collection(Collections.CATEGORIES).doc(current.categoryId as string);
      batch.update(catRef, { productCount: FieldValue.increment(-1) });
    }

    const auditRef = this.db.collection(Collections.AUDIT_LOGS).doc();
    batch.set(auditRef, {
      actorId,
      actorName,
      action: 'PRODUCT_DELETED',
      entityType: 'product',
      entityId: id,
      oldData: current,
      newData: null,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();
  }

  private slugify(text: string): string {
    return normalizeArabic(text).replace(/\s+/g, '-').slice(0, 60);
  }

  private mapProductDoc(id: string, data: FirebaseFirestore.DocumentData): Product {
    return {
      id,
      slug: data.slug ?? id,
      name: data.name ?? '',
      nameNormalized: data.nameNormalized ?? '',
      shortDescription: data.shortDescription ?? '',
      description: data.description ?? '',
      categoryId: data.categoryId ?? '',
      images: Array.isArray(data.images) ? data.images : [],
      sku: data.sku ?? null,
      barcode: data.barcode ?? null,
      status: data.status ?? 'active',
      isVisible: data.isVisible ?? true,
      isFeatured: data.isFeatured ?? false,
      featuredOrder: data.featuredOrder ?? null,
      retailPrice: (data.retailPrice ?? 0) as Money,
      retailPriceRange: data.retailPriceRange ?? {
        min: (data.retailPrice ?? 0) as Money,
        max: (data.retailPrice ?? 0) as Money,
      },
      compareAtPrice: data.compareAtPrice ?? null,
      options: Array.isArray(data.options) ? data.options : [],
      hasVariants: data.hasVariants ?? false,
      inStock: data.inStock ?? false,
      availableOptionKeys: Array.isArray(data.availableOptionKeys) ? data.availableOptionKeys : [],
      searchKeywords: Array.isArray(data.searchKeywords) ? data.searchKeywords : [],
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }

  private mapVariantDoc(
    id: string,
    productId: string,
    data: FirebaseFirestore.DocumentData
  ): ProductVariant {
    return {
      id,
      productId,
      optionValues: (data.optionValues || {}) as Record<string, string>,
      label: data.label ?? '',
      sku: data.sku ?? null,
      barcode: data.barcode ?? null,
      retailPriceOverride: (data.retailPriceOverride as Money) ?? null,
      images: data.images ?? null,
      stockQty: data.stockQty ?? 0,
      reservedQty: data.reservedQty ?? 0,
      availableQty: data.availableQty ?? 0,
      lowStockThreshold: data.lowStockThreshold ?? 5,
      stockState: data.stockState ?? 'out',
      isActive: data.isActive ?? true,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const productRepository = new FirestoreProductRepository();

