import crypto from 'crypto';
import {
  EventTicketRepositoryOutboundPort,
  ReserveTicketInput,
} from '../../../domain/ports/outbound/EventTicketRepositoryOutboundPort';
import { ClubEvent, EventTicket } from '../../../domain/entities/ClubEvent';
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

  async reserveAndCreateTicket(input: ReserveTicketInput): Promise<EventTicket> {
    const now = input.now || new Date();
    const nowIso = now.toISOString();
    const eventId = input.event.id;
    const eventYear =
      new Date(input.event.startDate).getFullYear() || now.getFullYear();

    try {
      const createdTicket = await adminDb.runTransaction(async (transaction) => {
        const eventRef = adminDb.collection('events').doc(eventId);
        const eventSnap = await transaction.get(eventRef);

        let eventData: ClubEvent;
        if (!eventSnap.exists) {
          eventData = input.event;
        } else {
          eventData = eventSnap.data() as ClubEvent;
        }

        // Active ticket count check
        const currentTicketsSold =
          typeof eventData.ticketsSold === 'number'
            ? eventData.ticketsSold
            : 0;

        if (currentTicketsSold >= eventData.maxTickets) {
          throw new Error('Sorry, this event is sold out!');
        }

        const nextSeq =
          typeof eventData.nextTicketSequence === 'number'
            ? eventData.nextTicketSequence
            : currentTicketsSold + 1;

        const ticketId = `PRRC-EVT-${eventYear}-${String(nextSeq).padStart(4, '0')}`;
        const ticketRef = adminDb.collection(this.collectionName).doc(ticketId);

        const existingTicketDoc = await transaction.get(ticketRef);
        if (existingTicketDoc.exists) {
          throw new Error(`Ticket ID conflict for ${ticketId}. Please retry.`);
        }

        const paymentLinkUrl = input.paymentLinkGenerator(
          ticketId,
          Number(eventData.ticketPrice)
        );

        const ticketUuid = crypto.randomUUID();
        const ticket: EventTicket = stripUndefined({
          id: ticketId,
          eventId: eventData.id,
          eventTitle: eventData.title,
          eventStartDate: eventData.startDate,
          eventAddress: eventData.address,
          eventLogoUrl: eventData.logoUrl || undefined,
          userName: input.userName,
          userEmail: input.userEmail,
          userId: input.userId,
          unitPrice: eventData.ticketPrice,
          status: 'pending_payment',
          paymentLinkUrl,
          monzoReference: ticketId,
          ticketUuid,
          checkedIn: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        transaction.create(ticketRef, ticket);

        transaction.set(
          eventRef,
          {
            ticketsSold: currentTicketsSold + 1,
            nextTicketSequence: nextSeq + 1,
            updatedAt: nowIso,
          },
          { merge: true }
        );

        return ticket;
      });

      FirestoreEventTicketRepositoryAdapter.localMemoryTickets.push(createdTicket);
      return createdTicket;
    } catch (err: unknown) {
      const msg = (err as Error).message || '';
      if (msg.includes('sold out')) {
        throw new Error('Sorry, this event is sold out!');
      }
      console.warn(`[Firestore DB notice] Transaction failed in reserveAndCreateTicket:`, err);

      // Memory fallback for offline / test environments
      const memActive = FirestoreEventTicketRepositoryAdapter.localMemoryTickets.filter(
        (t) => t.eventId === eventId && t.status !== 'cancelled'
      );
      if (memActive.length >= input.event.maxTickets) {
        throw new Error('Sorry, this event is sold out!');
      }

      let seq = memActive.length + 1;
      let ticketId = `PRRC-EVT-${eventYear}-${String(seq).padStart(4, '0')}`;
      while (
        FirestoreEventTicketRepositoryAdapter.localMemoryTickets.some(
          (t) => t.id === ticketId
        )
      ) {
        seq++;
        ticketId = `PRRC-EVT-${eventYear}-${String(seq).padStart(4, '0')}`;
      }

      const paymentLinkUrl = input.paymentLinkGenerator(
        ticketId,
        Number(input.event.ticketPrice)
      );
      const fallbackTicket: EventTicket = stripUndefined({
        id: ticketId,
        eventId: input.event.id,
        eventTitle: input.event.title,
        eventStartDate: input.event.startDate,
        eventAddress: input.event.address,
        eventLogoUrl: input.event.logoUrl || undefined,
        userName: input.userName,
        userEmail: input.userEmail,
        userId: input.userId,
        unitPrice: input.event.ticketPrice,
        status: 'pending_payment',
        paymentLinkUrl,
        monzoReference: ticketId,
        ticketUuid: crypto.randomUUID(),
        checkedIn: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      FirestoreEventTicketRepositoryAdapter.localMemoryTickets.push(fallbackTicket);
      return fallbackTicket;
    }
  }

  async cancelTicketAndReleaseCapacity(
    ticketId: string,
    reason?: string
  ): Promise<EventTicket> {
    const nowIso = new Date().toISOString();
    try {
      const updatedTicket = await adminDb.runTransaction(async (transaction) => {
        const ticketRef = adminDb.collection(this.collectionName).doc(ticketId);
        const ticketSnap = await transaction.get(ticketRef);
        if (!ticketSnap.exists) {
          throw new Error(`Event ticket ${ticketId} not found`);
        }

        const ticketData = ticketSnap.data() as EventTicket;
        if (ticketData.status === 'cancelled') {
          return ticketData;
        }

        const updated: EventTicket = stripUndefined({
          ...ticketData,
          status: 'cancelled',
          cancelledAt: nowIso,
          cancellationReason: reason || 'Payment not received in good time',
          updatedAt: nowIso,
        });

        transaction.set(ticketRef, updated, { merge: true });

        if (ticketData.eventId) {
          const eventRef = adminDb.collection('events').doc(ticketData.eventId);
          const eventSnap = await transaction.get(eventRef);
          if (eventSnap.exists) {
            const eventData = eventSnap.data() as ClubEvent;
            const currentSold =
              typeof eventData.ticketsSold === 'number' ? eventData.ticketsSold : 1;
            const newSold = Math.max(0, currentSold - 1);
            transaction.set(
              eventRef,
              {
                ticketsSold: newSold,
                updatedAt: nowIso,
              },
              { merge: true }
            );
          }
        }

        return updated;
      });

      const idx = FirestoreEventTicketRepositoryAdapter.localMemoryTickets.findIndex(
        (t) => t.id === ticketId
      );
      if (idx !== -1) {
        FirestoreEventTicketRepositoryAdapter.localMemoryTickets[idx] = updatedTicket;
      }
      return updatedTicket;
    } catch (err: unknown) {
      console.warn(
        `[Firestore DB notice] Transaction failed in cancelTicketAndReleaseCapacity:`,
        err
      );
      const mem = FirestoreEventTicketRepositoryAdapter.localMemoryTickets.find(
        (t) => t.id === ticketId
      );
      if (mem) {
        mem.status = 'cancelled';
        mem.cancelledAt = nowIso;
        mem.cancellationReason = reason || 'Payment not received in good time';
        mem.updatedAt = nowIso;
        return mem;
      }
      throw err;
    }
  }
}
