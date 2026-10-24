import { describe, it, expect } from 'vitest';
import { isEventTicketOrderType, DEFAULT_EVENTS_FROM_EMAIL } from './ClubEvent';

describe('ClubEvent domain model', () => {
  it('identifies event ticket order types correctly', () => {
    expect(isEventTicketOrderType('event_ticket')).toBe(true);
    expect(isEventTicketOrderType('christmas_2026_ticket')).toBe(true);
    expect(isEventTicketOrderType('christmas_2025_ticket')).toBe(true);
    expect(isEventTicketOrderType('standard')).toBe(false);
    expect(isEventTicketOrderType(undefined)).toBe(false);
    expect(isEventTicketOrderType('')).toBe(false);
    expect(isEventTicketOrderType('christmas_ticket')).toBe(false);
  });

  it('provides default events from email', () => {
    expect(DEFAULT_EVENTS_FROM_EMAIL).toContain('@peasants-running-kit.store');
  });
});
