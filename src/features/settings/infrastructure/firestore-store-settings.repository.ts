import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import {
  type StoreSettings,
  type UpdateStoreSettingsInput,
  DEFAULT_STORE_SETTINGS,
} from '../domain/store-settings';

const STORE_SETTINGS_DOC_ID = 'store';

export class FirestoreStoreSettingsRepository {
  private get db() {
    return adminDb();
  }

  private get docRef() {
    return this.db.collection(Collections.SETTINGS).doc(STORE_SETTINGS_DOC_ID);
  }

  async getSettings(): Promise<StoreSettings> {
    try {
      const snap = await this.docRef.get();
      if (!snap.exists) {
        return { ...DEFAULT_STORE_SETTINGS };
      }
      return this.mapDoc(snap.data()!);
    } catch (error) {
      console.error('Error fetching store settings:', error);
      return { ...DEFAULT_STORE_SETTINGS };
    }
  }

  async updateSettings(
    input: UpdateStoreSettingsInput,
    updatedByUid?: string
  ): Promise<StoreSettings> {
    const dataToSave = {
      ...input,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: updatedByUid || null,
    };

    await this.docRef.set(dataToSave, { merge: true });
    return this.getSettings();
  }

  private mapDoc(data: Record<string, any>): StoreSettings {
    const updatedAt =
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : typeof data.updatedAt === 'string'
        ? data.updatedAt
        : null;

    return {
      storeName: data.storeName ?? DEFAULT_STORE_SETTINGS.storeName,
      shortName: data.shortName ?? DEFAULT_STORE_SETTINGS.shortName,
      tagline: data.tagline ?? DEFAULT_STORE_SETTINGS.tagline,
      logoUrl: data.logoUrl ?? DEFAULT_STORE_SETTINGS.logoUrl,
      commercialRegister: data.commercialRegister ?? DEFAULT_STORE_SETTINGS.commercialRegister,
      taxNumber: data.taxNumber ?? DEFAULT_STORE_SETTINGS.taxNumber,
      phone: data.phone ?? DEFAULT_STORE_SETTINGS.phone,
      phoneSecondary: data.phoneSecondary ?? DEFAULT_STORE_SETTINGS.phoneSecondary,
      whatsapp: data.whatsapp ?? DEFAULT_STORE_SETTINGS.whatsapp,
      email: data.email ?? DEFAULT_STORE_SETTINGS.email,
      address: data.address ?? DEFAULT_STORE_SETTINGS.address,
      city: data.city ?? DEFAULT_STORE_SETTINGS.city,
      invoiceNotes: data.invoiceNotes ?? DEFAULT_STORE_SETTINGS.invoiceNotes,
      receiptNotes: data.receiptNotes ?? DEFAULT_STORE_SETTINGS.receiptNotes,
      statementNotes: data.statementNotes ?? DEFAULT_STORE_SETTINGS.statementNotes,
      showLogoInPrint: data.showLogoInPrint ?? DEFAULT_STORE_SETTINGS.showLogoInPrint,
      showContactInPrint: data.showContactInPrint ?? DEFAULT_STORE_SETTINGS.showContactInPrint,
      currency: data.currency ?? DEFAULT_STORE_SETTINGS.currency,
      currencySymbol: data.currencySymbol ?? DEFAULT_STORE_SETTINGS.currencySymbol,
      isStoreOpen: data.isStoreOpen ?? DEFAULT_STORE_SETTINGS.isStoreOpen,
      maintenanceMessage: data.maintenanceMessage ?? DEFAULT_STORE_SETTINGS.maintenanceMessage,
      updatedAt,
      updatedBy: data.updatedBy ?? null,
    };
  }
}

export const storeSettingsRepository = new FirestoreStoreSettingsRepository();
