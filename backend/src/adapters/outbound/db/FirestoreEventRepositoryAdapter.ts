import { EventRepositoryOutboundPort } from '../../../domain/ports/outbound/EventRepositoryOutboundPort';
import {
  ClubEvent,
  DEFAULT_EVENTS_FROM_EMAIL,
  getDefaultEventsFromEmail,
  isQaEnvironment,
} from '../../../domain/entities/ClubEvent';
import { adminDb } from './FirebaseAdminConfig';

export class FirestoreEventRepositoryAdapter implements EventRepositoryOutboundPort {
  private readonly collectionName = 'events';
  private static localMemoryEvents: ClubEvent[] = [];

  private normalizeEvent(event: ClubEvent): ClubEvent {
    const normalized = { ...event };
    if (isQaEnvironment() && normalized.fromEmail === DEFAULT_EVENTS_FROM_EMAIL) {
      normalized.fromEmail = getDefaultEventsFromEmail();
    }
    return normalized;
  }

  async listEvents(): Promise<ClubEvent[]> {
    try {
      const snapshot = await adminDb.collection(this.collectionName).get();
      const events = snapshot.docs.map((doc) =>
        this.normalizeEvent(doc.data() as ClubEvent)
      );
      FirestoreEventRepositoryAdapter.localMemoryEvents = events;
      return events;
    } catch (err) {
      console.warn('[Firestore DB notice] Failed to list events:', err);
      return [...FirestoreEventRepositoryAdapter.localMemoryEvents];
    }
  }

  async getEventById(id: string): Promise<ClubEvent | null> {
    try {
      const docSnap = await adminDb.collection(this.collectionName).doc(id).get();
      if (docSnap.exists) {
        return this.normalizeEvent(docSnap.data() as ClubEvent);
      }
    } catch (err) {
      console.warn(`[Firestore DB notice] Failed to get event ${id}:`, err);
    }

    const mem = FirestoreEventRepositoryAdapter.localMemoryEvents.find((e) => e.id === id);
    return mem ? this.normalizeEvent(mem) : null;
  }

  async createEvent(event: ClubEvent): Promise<ClubEvent> {
    try {
      await adminDb.collection(this.collectionName).doc(event.id).set(event);
      console.log(`[Firestore DB] Created event ${event.id} (${event.title})`);
    } catch (err) {
      console.error(`[Firestore DB error] Failed to create event ${event.id}:`, err);
      throw new Error(`Failed to create event in Firestore: ${(err as Error).message}`);
    }

    FirestoreEventRepositoryAdapter.localMemoryEvents.push(event);
    return event;
  }

  async updateEvent(id: string, partial: Partial<ClubEvent>): Promise<ClubEvent> {
    const existing = await this.getEventById(id);
    if (!existing) {
      throw new Error(`Event ${id} not found`);
    }

    const updated: ClubEvent = {
      ...existing,
      ...partial,
      id,
      updatedAt: new Date().toISOString(),
    };

    try {
      await adminDb.collection(this.collectionName).doc(id).set(updated, { merge: true });
      console.log(`[Firestore DB] Updated event ${id}`);
    } catch (err) {
      console.error(`[Firestore DB error] Failed to update event ${id}:`, err);
      throw new Error(`Failed to update event in Firestore: ${(err as Error).message}`);
    }

    const idx = FirestoreEventRepositoryAdapter.localMemoryEvents.findIndex((e) => e.id === id);
    if (idx !== -1) {
      FirestoreEventRepositoryAdapter.localMemoryEvents[idx] = updated;
    }
    return updated;
  }

  async deleteEvent(id: string): Promise<void> {
    try {
      await adminDb.collection(this.collectionName).doc(id).delete();
      console.log(`[Firestore DB] Deleted event ${id}`);
    } catch (err) {
      console.error(`[Firestore DB error] Failed to delete event ${id}:`, err);
      throw new Error(`Failed to delete event in Firestore: ${(err as Error).message}`);
    }

    FirestoreEventRepositoryAdapter.localMemoryEvents =
      FirestoreEventRepositoryAdapter.localMemoryEvents.filter((e) => e.id !== id);
  }
}
