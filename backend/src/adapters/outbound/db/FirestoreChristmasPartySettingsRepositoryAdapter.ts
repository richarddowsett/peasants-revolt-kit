import { ChristmasPartySettingsRepositoryOutboundPort } from '../../../domain/ports/outbound/ChristmasPartySettingsRepositoryOutboundPort';
import {
  ChristmasPartySettings,
  DEFAULT_CHRISTMAS_FROM_EMAIL,
  getDefaultChristmasFromEmail,
  isQaEnvironment,
} from '../../../domain/entities/ChristmasPartySettings';
import { adminDb } from './FirebaseAdminConfig';

export class FirestoreChristmasPartySettingsRepositoryAdapter
  implements ChristmasPartySettingsRepositoryOutboundPort
{
  private readonly collectionName = 'settings';
  private readonly docId = 'christmas_party';
  private static localMemorySettings: ChristmasPartySettings | null = null;

  private getDefaultSettings(): ChristmasPartySettings {
    return {
      eventYear: null,
      saleStartAt: '',
      maxTickets: 50,
      ticketPrice: 25,
      partyDateTime: '',
      partyLocation: '',
      fromEmail: getDefaultChristmasFromEmail(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getSettings(): Promise<ChristmasPartySettings> {
    try {
      const docSnap = await adminDb.collection(this.collectionName).doc(this.docId).get();
      if (docSnap.exists) {
        const data = docSnap.data() as Partial<ChristmasPartySettings>;
        const settings: ChristmasPartySettings = {
          ...this.getDefaultSettings(),
          ...data,
        };
        if (isQaEnvironment() && settings.fromEmail === DEFAULT_CHRISTMAS_FROM_EMAIL) {
          settings.fromEmail = getDefaultChristmasFromEmail();
        }
        FirestoreChristmasPartySettingsRepositoryAdapter.localMemorySettings = settings;
        return settings;
      }
    } catch (err) {
      console.warn('[Firestore DB notice] Failed to read christmas_party settings:', err);
    }

    if (FirestoreChristmasPartySettingsRepositoryAdapter.localMemorySettings) {
      return FirestoreChristmasPartySettingsRepositoryAdapter.localMemorySettings;
    }

    return this.getDefaultSettings();
  }

  async saveSettings(
    partial: Partial<ChristmasPartySettings>
  ): Promise<ChristmasPartySettings> {
    const existing = await this.getSettings();
    const updated: ChristmasPartySettings = {
      ...existing,
      ...partial,
      updatedAt: new Date().toISOString(),
    };

    try {
      await adminDb.collection(this.collectionName).doc(this.docId).set(updated, { merge: true });
      console.log('[Firestore DB] Saved christmas_party settings:', JSON.stringify(updated));
    } catch (err) {
      console.error('[Firestore DB error] Failed to save christmas_party settings:', err);
      throw new Error(`Failed to save Christmas party settings: ${(err as Error).message}`);
    }

    FirestoreChristmasPartySettingsRepositoryAdapter.localMemorySettings = updated;
    return updated;
  }
}
