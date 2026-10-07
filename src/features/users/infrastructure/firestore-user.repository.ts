import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import { Role, type Role as RoleType } from '@/core/auth/roles';
import { normalizeArabic, buildSearchKeywords } from '@/core/text/arabic-normalize';
import { normalizeUsername, usernameToEmail } from '@/features/auth/domain/username';
import { emptyAccount, type UserProfile, type UserStatus } from '../domain/user';

export interface CreateUserData {
  displayName: string;
  username: string;
  phone: string;
  password: string;
}

export class FirestoreUserRepository {
  private get db() {
    return adminDb();
  }
  private get auth() {
    return adminAuth();
  }

  async registerUser(data: CreateUserData): Promise<UserProfile> {
    const normalizedUsername = normalizeUsername(data.username);
    const email = usernameToEmail(normalizedUsername);

    // 1. First check if username document already exists in Firestore
    const usernameDocRef = this.db.collection(Collections.USERNAMES).doc(normalizedUsername);
    const existingUsername = await usernameDocRef.get();
    if (existingUsername.exists) {
      throw new AppError(ErrorCode.USERNAME_TAKEN);
    }

    // 2. Create in Firebase Auth (atomic email uniqueness guarantee)
    let authUser;
    try {
      authUser = await this.auth.createUser({
        email,
        password: data.password,
        displayName: data.displayName,
      });
    } catch (err: any) {
      if (err.code === 'auth/email-already-exists') {
        throw new AppError(ErrorCode.USERNAME_TAKEN);
      }
      throw err;
    }

    try {
      // 3. Set custom user claims for Security Rules
      await this.auth.setCustomUserClaims(authUser.uid, { role: Role.CUSTOMER });

      // 4. Save to Firestore (users and usernames)
      const userDocRef = this.db.collection(Collections.USERS).doc(authUser.uid);
      const searchKeywords = buildSearchKeywords(
        [data.displayName, normalizedUsername],
        [data.phone, normalizedUsername]
      );

      const batch = this.db.batch();

      batch.set(usernameDocRef, {
        uid: authUser.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      const userDocData = {
        uid: authUser.uid,
        username: normalizedUsername,
        displayName: data.displayName,
        displayNameNormalized: normalizeArabic(data.displayName),
        phone: data.phone,
        email,
        role: Role.CUSTOMER,
        status: 'active' as UserStatus,
        searchKeywords,
        account: emptyAccount(),
        stats: { ordersCount: 0, openOrdersCount: 0 },
        wholesaleSince: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      batch.set(userDocRef, userDocData);
      await batch.commit();

      return {
        uid: authUser.uid,
        username: normalizedUsername,
        displayName: data.displayName,
        phone: data.phone,
        role: Role.CUSTOMER,
        status: 'active',
        account: emptyAccount(),
        stats: { ordersCount: 0, openOrdersCount: 0 },
        wholesaleSince: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      // Rollback Auth user if database operations fail
      try {
        await this.auth.deleteUser(authUser.uid);
      } catch (delError) {
        console.error('Failed to rollback auth user during registration failure:', delError);
      }
      throw error;
    }
  }

  async findById(uid: string): Promise<UserProfile | null> {
    const doc = await this.db.collection(Collections.USERS).doc(uid).get();
    if (!doc.exists) return null;
    return this.mapDoc(doc.data()!);
  }

  async findByUsername(username: string): Promise<UserProfile | null> {
    const normalized = normalizeUsername(username);
    const udoc = await this.db.collection(Collections.USERNAMES).doc(normalized).get();
    if (!udoc.exists) return null;
    const uid = udoc.data()?.uid;
    if (!uid) return null;
    return this.findById(uid);
  }

  async listUsers(role?: RoleType, limit = 50): Promise<UserProfile[]> {
    let query: FirebaseFirestore.Query = this.db.collection(Collections.USERS);
    if (role) {
      query = query.where('role', '==', role);
    } else {
      query = query.orderBy('createdAt', 'desc').limit(limit);
    }
    const snap = await query.get();
    let users = snap.docs.map((d) => this.mapDoc(d.data()));
    if (role) {
      users = users.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
    }
    return users;
  }

  async updateUserRole(
    targetUid: string,
    newRole: RoleType,
    actorId: string,
    actorName: string
  ): Promise<void> {
    if (targetUid === actorId) {
      throw new AppError(ErrorCode.CANNOT_MODIFY_SELF);
    }

    const userRef = this.db.collection(Collections.USERS).doc(targetUid);

    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) {
        throw new AppError(ErrorCode.NOT_FOUND);
      }

      const current = snap.data()!;
      const oldRole = current.role;

      // Update Firestore user document
      tx.update(userRef, {
        role: newRole,
        wholesaleSince:
          newRole === Role.WHOLESALE
            ? current.wholesaleSince || FieldValue.serverTimestamp()
            : current.wholesaleSince,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Write Audit log
      const auditRef = this.db.collection(Collections.AUDIT_LOGS).doc();
      tx.set(auditRef, {
        actorId,
        actorName,
        action: 'ROLE_CHANGED',
        entityType: 'user',
        entityId: targetUid,
        oldData: { role: oldRole },
        newData: { role: newRole },
        timestamp: FieldValue.serverTimestamp(),
      });
    });

    // Update Custom Claims in Firebase Auth
    await this.auth.setCustomUserClaims(targetUid, { role: newRole });

    // Revoke refresh tokens so downgrade takes effect immediately
    await this.auth.revokeRefreshTokens(targetUid);
  }

  async updateUserStatus(
    targetUid: string,
    newStatus: UserStatus,
    actorId: string,
    actorName: string
  ): Promise<void> {
    if (targetUid === actorId) {
      throw new AppError(ErrorCode.CANNOT_MODIFY_SELF);
    }

    const userRef = this.db.collection(Collections.USERS).doc(targetUid);

    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw new AppError(ErrorCode.NOT_FOUND);

      const oldStatus = snap.data()!.status;

      tx.update(userRef, {
        status: newStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const auditRef = this.db.collection(Collections.AUDIT_LOGS).doc();
      tx.set(auditRef, {
        actorId,
        actorName,
        action: 'USER_STATUS_CHANGED',
        entityType: 'user',
        entityId: targetUid,
        oldData: { status: oldStatus },
        newData: { status: newStatus },
        timestamp: FieldValue.serverTimestamp(),
      });
    });

    if (newStatus === 'disabled') {
      await this.auth.updateUser(targetUid, { disabled: true });
      await this.auth.revokeRefreshTokens(targetUid);
    } else {
      await this.auth.updateUser(targetUid, { disabled: false });
    }
  }

  private mapDoc(data: FirebaseFirestore.DocumentData): UserProfile {
    return {
      uid: data.uid,
      username: data.username,
      displayName: data.displayName,
      phone: data.phone,
      role: data.role,
      status: data.status,
      account: {
        balance: data.balance ?? data.account?.balance ?? 0,
        totalDebit: data.account?.totalDebit ?? 0,
        totalCredit: data.account?.totalCredit ?? 0,
        lastSeq: data.account?.lastSeq ?? 0,
        lastTransactionAt: data.account?.lastTransactionAt?.toDate() ?? null,
      },
      stats: {
        ordersCount: data.stats?.ordersCount ?? 0,
        openOrdersCount: data.stats?.openOrdersCount ?? 0,
      },
      wholesaleSince: data.wholesaleSince?.toDate() ?? null,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const userRepository = new FirestoreUserRepository();
