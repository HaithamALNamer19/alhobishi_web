import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import type { Banner, CreateBannerInput, UpdateBannerInput } from '../domain/banner';

export class FirestoreBannerRepository {
  private get db() {
    return adminDb();
  }

  async findAll(onlyActive = false): Promise<Banner[]> {
    let query: FirebaseFirestore.Query = this.db.collection(Collections.BANNERS);
    if (onlyActive) {
      query = query.where('isActive', '==', true);
    }
    const snap = await query.get();
    const banners = snap.docs.map((d) => this.mapDoc(d.id, d.data()));
    return banners.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async findById(id: string): Promise<Banner | null> {
    const doc = await this.db.collection(Collections.BANNERS).doc(id).get();
    if (!doc.exists) return null;
    return this.mapDoc(doc.id, doc.data()!);
  }

  async create(data: CreateBannerInput): Promise<Banner> {
    const col = this.db.collection(Collections.BANNERS);
    const docRef = col.doc();

    const docData = {
      title: data.title,
      subtitle: data.subtitle || null,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl || null,
      badgeText: data.badgeText || null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(docData);
    const createdSnap = await docRef.get();
    return this.mapDoc(docRef.id, createdSnap.data()!);
  }

  async update(data: UpdateBannerInput): Promise<Banner> {
    const docRef = this.db.collection(Collections.BANNERS).doc(data.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new AppError(ErrorCode.NOT_FOUND, { message: 'الإعلان غير موجود' });
    }

    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.linkUrl !== undefined) updateData.linkUrl = data.linkUrl;
    if (data.badgeText !== undefined) updateData.badgeText = data.badgeText;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    await docRef.update(updateData);
    const updatedSnap = await docRef.get();
    return this.mapDoc(docRef.id, updatedSnap.data()!);
  }

  async delete(id: string): Promise<void> {
    const docRef = this.db.collection(Collections.BANNERS).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new AppError(ErrorCode.NOT_FOUND, { message: 'الإعلان غير موجود' });
    }
    await docRef.delete();
  }

  private mapDoc(id: string, data: FirebaseFirestore.DocumentData): Banner {
    let createdAt = new Date().toISOString();
    let updatedAt = new Date().toISOString();

    if (data.createdAt instanceof Timestamp) {
      createdAt = data.createdAt.toDate().toISOString();
    } else if (typeof data.createdAt === 'string') {
      createdAt = data.createdAt;
    }

    if (data.updatedAt instanceof Timestamp) {
      updatedAt = data.updatedAt.toDate().toISOString();
    } else if (typeof data.updatedAt === 'string') {
      updatedAt = data.updatedAt;
    }

    return {
      id,
      title: data.title ?? '',
      subtitle: data.subtitle ?? null,
      imageUrl: data.imageUrl ?? '',
      linkUrl: data.linkUrl ?? null,
      badgeText: data.badgeText ?? null,
      sortOrder: Number(data.sortOrder) || 0,
      isActive: data.isActive ?? true,
      createdAt,
      updatedAt,
    };
  }
}

export const bannerRepository = new FirestoreBannerRepository();

