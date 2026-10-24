import { EventTicketRepositoryOutboundPort } from '../../../domain/ports/outbound/EventTicketRepositoryOutboundPort';
import { EventTicket } from '../../../domain/entities/ClubEvent';
import { adminDb } from './FirebaseAdminConfig';

function stripUndefined<T extends object>(obj: T): T {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      cleaned[k] = v;
    }
  }
  return cleaned as T;
}

export class FirestoreEventTicketRepositoryAdapter
  implements EventTicketRepositoryOutboundPort
{
  private readonly collectionName = 'event_tickets';
  private static localMemoryTickets: EventTicket[] = [];

  async createTicket(ticket: EventTicket): Promise<EventTicket> {
    const cleaned = stripUndefined(ticket);
    try {
      await adminDb.collection(this.collectionName).doc(ticket.id).set(cleaned);
      console.log(`[Firestore DB] Created event ticket ${ticket.id} for event ${ticket.eventId}`);
    } catch (err) {
      console.error(`[Firestore DB error] Failed to create event ticket ${ticket.id}:`, err);
      throw new Error(`Failed to create event ticket in Firestore: ${(err as Error).message}`);
    }

    FirestoreEventTicketRepositoryAdapter.localMemoryTickets.push(cleaned);
    return cleaned;
  }

  async getTicketById(id: string): Promise<EventTicket | null> {
    try {
      const docSnap = await adminDb.collection(this.collectionName).doc(id).get();
      if (docSnap.exists) {
        return docSnap.data() as EventTicket;
      }
    } catch (err) {
      console.warn(`[Firestore DB notice] Failed to get event ticket ${id}:`, err);
    }

    return (
      FirestoreEventTicketRepositoryAdapter.localMemoryTickets.find((t) => t.id === id) || null
    );
  }

  async getTicketByUuid(ticketUuid: string): Promise<EventTicket | null> {
    try {
      const snapshot = await adminDb
        .collection(this.collectionName)
        .where('ticketUuid', '==', ticketUuid)
        .get();
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as EventTicket;
      }
    } catch (err) {
      console.warn(
        `[Firestore DB notice] Failed to query event ticket by UUID ${ticketUuid}:`,
        err
      );
    }

    return (
      FirestoreEventTicketRepositoryAdapter.localMemoryTickets.find(
        (t) => t.ticketUuid === ticketUuid
      ) || null
    );
  }

  async listTicketsByEvent(eventId: string): Promise<EventTicket[]> {
    try {
      const snapshot = await adminDb
        .collection(this.collectionName)
        .where('eventId', '==', eventId)
        .get();
      const tickets = snapshot.docs.map((doc) => doc.data() as EventTicket);
      return tickets.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (err) {
      console.warn(
        `[Firestore DB notice] Failed to list tickets for event ${eventId}:`,
        err
      );
      return FirestoreEventTicketRepositoryAdapter.localMemoryTickets
        .filter((t) => t.eventId === eventId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  async listTicketsByEmail(email: string): Promise<EventTicket[]> {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const snapshot = await adminDb
        .collection(this.collectionName)
        .where('userEmail', '==', normalizedEmail)
        .get();
      const tickets = snapshot.docs.map((doc) => doc.data() as EventTicket);
      return tickets.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (err) {
      console.warn(
        `[Firestore DB notice] Failed to list tickets by email ${normalizedEmail}:`,
        err
      );
      return FirestoreEventTicketRepositoryAdapter.localMemoryTickets
        .filter((t) => t.userEmail.toLowerCase() === normalizedEmail)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  async listAllTickets(): Promise<EventTicket[]> {
    try {
      const snapshot = await adminDb.collection(this.collectionName).get();
      const tickets = snapshot.docs.map((doc) => doc.data() as EventTicket);
      FirestoreEventTicketRepositoryAdapter.localMemoryTickets = tickets;
      return tickets.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (err) {
      console.warn('[Firestore DB notice] Failed to list all event tickets:', err);
      return [...FirestoreEventTicketRepositoryAdapter.localMemoryTickets].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  }

  async updateTicket(id: string, partial: Partial<EventTicket>): Promise<EventTicket> {
    const existing = await this.getTicketById(id);
    if (!existing) {
      throw new Error(`Event ticket ${id} not found`);
    }

    const updated: EventTicket = stripUndefined({
      ...existing,
      ...partial,
      id,
      updatedAt: new Date().toISOString(),
    });

    try {
      await adminDb.collection(this.collectionName).doc(id).set(updated, { merge: true });
      console.log(`[Firestore DB] Updated event ticket ${id}`);
    } catch (err) {
      console.error(`[Firestore DB error] Failed to update event ticket ${id}:`, err);
      throw new Error(`Failed to update event ticket in Firestore: ${(err as Error).message}`);
    }

    const idx = FirestoreEventTicketRepositoryAdapter.localMemoryTickets.findIndex(
      (t) => t.id === id
    );
    if (idx !== -1) {
      FirestoreEventTicketRepositoryAdapter.localMemoryTickets[idx] = updated;
    }
    return updated;
  }
}
