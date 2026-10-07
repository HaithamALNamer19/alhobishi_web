import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import { normalizeArabic } from '@/core/text/arabic-normalize';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../domain/category';

export class FirestoreCategoryRepository {
  private get db() {
    return adminDb();
  }

  async findAll(onlyActive = false): Promise<Category[]> {
    let query: FirebaseFirestore.Query = this.db.collection(Collections.CATEGORIES);
    if (onlyActive) {
      query = query.where('isActive', '==', true);
    }
    const snap = await query.get();
    const categories = snap.docs.map((d) => this.mapDoc(d.id, d.data()));
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async findById(id: string): Promise<Category | null> {
    const doc = await this.db.collection(Collections.CATEGORIES).doc(id).get();
    if (!doc.exists) return null;
    return this.mapDoc(doc.id, doc.data()!);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const snap = await this.db
      .collection(Collections.CATEGORIES)
      .where('slug', '==', slug)
      .limit(1)
      .get();
    if (snap.empty || !snap.docs[0]) return null;
    return this.mapDoc(snap.docs[0].id, snap.docs[0].data());
  }

  async create(
    data: CreateCategoryInput,
    actorId: string,
    actorName: string
  ): Promise<Category> {
    const col = this.db.collection(Collections.CATEGORIES);
    const docRef = col.doc();

    const slug = data.slug || this.slugify(data.name) || docRef.id;

    // Check slug uniqueness
    const existing = await this.findBySlug(slug);
    const finalSlug = existing ? `${slug}-${docRef.id.slice(0, 4)}` : slug;

    const docData = {
      name: data.name,
      slug: finalSlug,
      description: data.description || '',
      image: data.image || null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      productCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const batch = this.db.batch();
    batch.set(docRef, docData);

    // Audit log
    const auditRef = this.db.collection(Collections.AUDIT_LOGS).doc();
    batch.set(auditRef, {
      actorId,
      actorName,
      action: 'CATEGORY_CREATED',
      entityType: 'category',
      entityId: docRef.id,
      oldData: null,
      newData: docData,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return {
      id: docRef.id,
      name: data.name,
      slug: finalSlug,
      description: data.description || '',
      image: data.image || null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      productCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async update(
    data: UpdateCategoryInput,
    actorId: string,
    actorName: string
  ): Promise<Category> {
    const docRef = this.db.collection(Collections.CATEGORIES).doc(data.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new AppError(ErrorCode.NOT_FOUND, { message: 'القسم المطلوب غير موجود.' });
    }

    const current = snap.data()!;
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (data.name !== undefined) updates.name = data.name;
    if (data.slug !== undefined) updates.slug = data.slug;
    if (data.description !== undefined) updates.description = data.description;
    if (data.image !== undefined) updates.image = data.image;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    const batch = this.db.batch();
    batch.update(docRef, updates);

    const auditRef = this.db.collection(Collections.AUDIT_LOGS).doc();
    batch.set(auditRef, {
      actorId,
      actorName,
      action: 'CATEGORY_UPDATED',
      entityType: 'category',
      entityId: data.id,
      oldData: current,
      newData: updates,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    const updatedSnap = await docRef.get();
    return this.mapDoc(docRef.id, updatedSnap.data()!);
  }

  async delete(id: string, actorId: string, actorName: string): Promise<void> {
    const docRef = this.db.collection(Collections.CATEGORIES).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new AppError(ErrorCode.NOT_FOUND, { message: 'القسم غير موجود.' });
    }

    const current = snap.data()!;
    if ((current.productCount || 0) > 0) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, {
        message: 'لا يمكن حذف القسم لوجود منتجات مرتبطة به. قم بنقل المنتجات أو تعطيل القسم.',
      });
    }

    const batch = this.db.batch();
    batch.delete(docRef);

    const auditRef = this.db.collection(Collections.AUDIT_LOGS).doc();
    batch.set(auditRef, {
      actorId,
      actorName,
      action: 'CATEGORY_DELETED',
      entityType: 'category',
      entityId: id,
      oldData: current,
      newData: null,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();
  }

  private slugify(text: string): string {
    return normalizeArabic(text).replace(/\s+/g, '-').slice(0, 50);
  }

  private mapDoc(id: string, data: FirebaseFirestore.DocumentData): Category {
    return {
      id,
      name: data.name ?? '',
      slug: data.slug ?? id,
      description: data.description ?? '',
      image: data.image ?? null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      productCount: data.productCount ?? 0,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const categoryRepository = new FirestoreCategoryRepository();

