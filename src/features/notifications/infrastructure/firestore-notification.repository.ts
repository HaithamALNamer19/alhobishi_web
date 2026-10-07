import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import type { AppNotification, NotificationType } from '../domain/notification';

export class FirestoreNotificationRepository {
  private get db() {
    return adminDb();
  }

  async create(params: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    referenceId?: string | null;
  }): Promise<string> {
    const docRef = this.db.collection(Collections.NOTIFICATIONS).doc();
    await docRef.set({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      referenceId: params.referenceId || null,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    return docRef.id;
  }

  private getUserIdsFilter(userId: string, isBackOffice: boolean): string[] {
    if (isBackOffice) {
      return [userId, 'STAFF_BROADCAST', 'ADMIN_BROADCAST'];
    }
    return [userId];
  }

  async listByUser(
    userId: string,
    isBackOffice = false,
    limit = 30
  ): Promise<AppNotification[]> {
    const targetUserIds = this.getUserIdsFilter(userId, isBackOffice);

    let snap: FirebaseFirestore.QuerySnapshot;
    if (targetUserIds.length === 1) {
      snap = await this.db
        .collection(Collections.NOTIFICATIONS)
        .where('userId', '==', targetUserIds[0])
        .get();
    } else {
      snap = await this.db
        .collection(Collections.NOTIFICATIONS)
        .where('userId', 'in', targetUserIds)
        .get();
    }

    const notifs = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type as NotificationType,
        referenceId: data.referenceId || null,
        isRead: Boolean(data.isRead),
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(data.createdAt || Date.now()),
      };
    });

    return notifs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getUnreadCount(userId: string, isBackOffice = false): Promise<number> {
    const targetUserIds = this.getUserIdsFilter(userId, isBackOffice);

    let snap: FirebaseFirestore.QuerySnapshot;
    if (targetUserIds.length === 1) {
      snap = await this.db
        .collection(Collections.NOTIFICATIONS)
        .where('userId', '==', targetUserIds[0])
        .where('isRead', '==', false)
        .get();
    } else {
      snap = await this.db
        .collection(Collections.NOTIFICATIONS)
        .where('userId', 'in', targetUserIds)
        .where('isRead', '==', false)
        .get();
    }

    return snap.size;
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.db
      .collection(Collections.NOTIFICATIONS)
      .doc(notificationId)
      .update({
        isRead: true,
      });
  }

  async markAllAsRead(userId: string, isBackOffice = false): Promise<void> {
    const targetUserIds = this.getUserIdsFilter(userId, isBackOffice);

    let snap: FirebaseFirestore.QuerySnapshot;
    if (targetUserIds.length === 1) {
      snap = await this.db
        .collection(Collections.NOTIFICATIONS)
        .where('userId', '==', targetUserIds[0])
        .where('isRead', '==', false)
        .get();
    } else {
      snap = await this.db
        .collection(Collections.NOTIFICATIONS)
        .where('userId', 'in', targetUserIds)
        .where('isRead', '==', false)
        .get();
    }

    if (snap.empty) return;

    const batch = this.db.batch();
    for (const doc of snap.docs) {
      batch.update(doc.ref, { isRead: true });
    }
    await batch.commit();
  }
}

export const notificationRepository = new FirestoreNotificationRepository();
