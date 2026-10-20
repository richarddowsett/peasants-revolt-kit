import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetChristmasPartyStatusUseCase } from './GetChristmasPartyStatusUseCase';
import { UpdateChristmasPartySettingsUseCase } from './UpdateChristmasPartySettingsUseCase';
import { PurchaseChristmasTicketUseCase } from './PurchaseChristmasTicketUseCase';
import { VerifyAndCheckInTicketUseCase } from './VerifyAndCheckInTicketUseCase';
import { ChristmasPartySettingsRepositoryOutboundPort } from '../ports/outbound/ChristmasPartySettingsRepositoryOutboundPort';
import { OrderRepositoryOutboundPort } from '../ports/outbound/OrderRepositoryOutboundPort';
import { PaymentGatewayOutboundPort } from '../ports/outbound/PaymentGatewayOutboundPort';
import { Order } from '../entities/Order';
import { ChristmasPartySettings } from '../entities/ChristmasPartySettings';

describe('Christmas Party Use Cases', () => {
  let settingsRepo: ChristmasPartySettingsRepositoryOutboundPort;
  let orderRepo: OrderRepositoryOutboundPort;
  let paymentGateway: PaymentGatewayOutboundPort;
  let currentSettings: ChristmasPartySettings;
  let storedOrders: Order[];

  beforeEach(() => {
    currentSettings = {
      eventYear: 2026,
      saleStartAt: new Date(Date.now() - 60_000).toISOString(), // 1 min ago (sale open)
      maxTickets: 2,
      ticketPrice: 25,
      partyDateTime: '2026-12-19T19:00:00.000Z',
      partyLocation: 'Brentwood Brewery, CM14',
      fromEmail: 'Peasants Running Club <christmas@peasants-running-kit.store>',
      updatedAt: new Date().toISOString(),
    };
    storedOrders = [];

    settingsRepo = {
      getSettings: vi.fn().mockImplementation(async () => currentSettings),
      saveSettings: vi.fn().mockImplementation(async (partial) => {
        currentSettings = {
          ...currentSettings,
          ...partial,
          updatedAt: new Date().toISOString(),
        };
        return currentSettings;
      }),
    };

    orderRepo = {
      createOrder: vi.fn().mockImplementation(async (orderData, paymentLinkUrl) => {
        const created: Order = {
          ...orderData,
          id: orderData.id || orderData.monzoReference,
          paymentLinkUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        storedOrders.push(created);
        return created;
      }),
      getOrderById: vi.fn().mockImplementation(async (id) => {
        return storedOrders.find((o) => o.id === id) || null;
      }),
      getOrderByTicketUuid: vi.fn().mockImplementation(async (uuid) => {
        return storedOrders.find((o) => o.ticketUuid === uuid) || null;
      }),
      getOrdersByUserEmail: vi.fn().mockImplementation(async (email) => {
        return storedOrders.filter((o) => o.userEmail === email);
      }),
      getAllOrders: vi.fn().mockImplementation(async () => storedOrders),
      updateOrderStatus: vi.fn().mockImplementation(async (id, status) => {
        const idx = storedOrders.findIndex((o) => o.id === id);
        storedOrders[idx] = { ...storedOrders[idx], status };
        return storedOrders[idx];
      }),
      updateOrderFields: vi.fn().mockImplementation(async (id, fields) => {
        const idx = storedOrders.findIndex((o) => o.id === id);
        storedOrders[idx] = { ...storedOrders[idx], ...fields };
        return storedOrders[idx];
      }),
    };

    paymentGateway = {
      generatePaymentLink: vi
        .fn()
        .mockImplementation((ref, amount) => `https://monzo.me/test/${amount.toFixed(2)}?d=${ref}`),
    };
  });

  describe('GetChristmasPartyStatusUseCase', () => {
    it('returns isPartyScheduled: false when partyDateTime is empty', async () => {
      currentSettings.partyDateTime = '';
      currentSettings.eventYear = null;

      const useCase = new GetChristmasPartyStatusUseCase(settingsRepo, orderRepo);
      const status = await useCase.execute();

      expect(status.isPartyScheduled).toBe(false);
      expect(status.isSaleOpen).toBe(false);
    });

    it('counts only active orders for the current year christmas_yyyy_ticket', async () => {
      storedOrders.push({
        id: 'PRRC-XMAS-2026-0001',
        userEmail: 'alice@example.com',
        userName: 'Alice',
        items: [],
        totalAmount: 25,
        status: 'pending_payment',
        paymentLinkUrl: 'https://monzo.me/test',
        monzoReference: 'PRRC-XMAS-2026-0001',
        orderType: 'christmas_2026_ticket',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      // Cancelled 2026 ticket should not count against limit
      storedOrders.push({
        id: 'PRRC-XMAS-2026-0002',
        userEmail: 'cancelled@example.com',
        userName: 'Cancelled',
        items: [],
        totalAmount: 25,
        status: 'cancelled',
        paymentLinkUrl: 'https://monzo.me/test',
        monzoReference: 'PRRC-XMAS-2026-0002',
        orderType: 'christmas_2026_ticket',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      // Previous year ticket should not count against 2026 limit
      storedOrders.push({
        id: 'PRRC-XMAS-2025-0001',
        userEmail: 'lastyear@example.com',
        userName: 'Last Year',
        items: [],
        totalAmount: 25,
        status: 'completed',
        paymentLinkUrl: 'https://monzo.me/test',
        monzoReference: 'PRRC-XMAS-2025-0001',
        orderType: 'christmas_2025_ticket',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const useCase = new GetChristmasPartyStatusUseCase(settingsRepo, orderRepo);
      const status = await useCase.execute();

      expect(status.isPartyScheduled).toBe(true);
      expect(status.isSaleOpen).toBe(true);
      expect(status.ticketsSold).toBe(1);
      expect(status.ticketsRemaining).toBe(1);
    });
  });

  describe('UpdateChristmasPartySettingsUseCase', () => {
    it('derives eventYear from partyDateTime and validates settings', async () => {
      const useCase = new UpdateChristmasPartySettingsUseCase(settingsRepo);
      const updated = await useCase.execute({
        partyDateTime: '2027-12-18T19:00:00.000Z',
        saleStartAt: '2027-11-01T09:00:00.000Z',
        maxTickets: 40,
        ticketPrice: 30,
        partyLocation: 'The Swan, Brentwood',
      });

      expect(updated.eventYear).toBe(2027);
      expect(updated.maxTickets).toBe(40);
      expect(updated.ticketPrice).toBe(30);
    });

    it('clears eventYear and partyDateTime when partyDateTime is empty', async () => {
      const useCase = new UpdateChristmasPartySettingsUseCase(settingsRepo);
      const updated = await useCase.execute({ partyDateTime: '' });

      expect(updated.partyDateTime).toBe('');
      expect(updated.eventYear).toBeNull();
    });
  });

  describe('PurchaseChristmasTicketUseCase', () => {
    it('blocks ticket purchase before saleStartAt countdown finishes', async () => {
      currentSettings.saleStartAt = new Date(Date.now() + 3600_000).toISOString();
      const useCase = new PurchaseChristmasTicketUseCase(settingsRepo, orderRepo, paymentGateway);

      await expect(
        useCase.execute({ userName: 'Runner One', userEmail: 'runner1@example.com' })
      ).rejects.toThrow(/countdown/i);
    });

    it('creates a 1-ticket order with PRRC-XMAS-yyyy-XXXX reference, christmas_yyyy_ticket orderType, and UUID', async () => {
      const useCase = new PurchaseChristmasTicketUseCase(settingsRepo, orderRepo, paymentGateway);
      const order = await useCase.execute({
        userName: 'Runner One',
        userEmail: 'runner1@example.com',
      });

      expect(order.id).toBe('PRRC-XMAS-2026-0001');
      expect(order.monzoReference).toBe('PRRC-XMAS-2026-0001');
      expect(order.orderType).toBe('christmas_2026_ticket');
      expect(order.ticketUuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(1);
      expect(order.totalAmount).toBe(25);
    });

    it('enforces maxTickets limit and blocks overselling', async () => {
      const useCase = new PurchaseChristmasTicketUseCase(settingsRepo, orderRepo, paymentGateway);

      await useCase.execute({ userName: 'Runner 1', userEmail: 'r1@example.com' });
      await useCase.execute({ userName: 'Runner 2', userEmail: 'r2@example.com' });

      await expect(
        useCase.execute({ userName: 'Runner 3', userEmail: 'r3@example.com' })
      ).rejects.toThrow(/sold out/i);
    });
  });

  describe('VerifyAndCheckInTicketUseCase', () => {
    it('auto checks in a valid paid ticket UUID on scan and blocks a second scan', async () => {
      const purchaseUseCase = new PurchaseChristmasTicketUseCase(
        settingsRepo,
        orderRepo,
        paymentGateway
      );
      const verifyUseCase = new VerifyAndCheckInTicketUseCase(orderRepo);

      const ticketOrder = await purchaseUseCase.execute({
        userName: 'Door Guest',
        userEmail: 'guest@example.com',
      });

      // Before payment is received -> UNPAID
      const unpaidCheck = await verifyUseCase.execute(ticketOrder.ticketUuid!);
      expect(unpaidCheck.valid).toBe(false);
      expect(unpaidCheck.reason).toBe('UNPAID');

      // Admin marks payment received
      await orderRepo.updateOrderStatus(ticketOrder.id, 'payment_successful');

      // First scan at door -> Auto Checked In
      const firstScan = await verifyUseCase.execute(ticketOrder.ticketUuid!);
      expect(firstScan.valid).toBe(true);
      expect(firstScan.reason).toBe('CHECKED_IN');
      expect(firstScan.order?.checkedIn).toBe(true);
      expect(firstScan.order?.checkedInAt).toBeDefined();

      // Second scan of same QR code -> ALREADY_CHECKED_IN
      const secondScan = await verifyUseCase.execute(ticketOrder.ticketUuid!);
      expect(secondScan.valid).toBe(false);
      expect(secondScan.reason).toBe('ALREADY_CHECKED_IN');
    });

    it('returns NOT_FOUND for an unknown UUID', async () => {
      const verifyUseCase = new VerifyAndCheckInTicketUseCase(orderRepo);
      const res = await verifyUseCase.execute('00000000-0000-4000-8000-000000000000');
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('NOT_FOUND');
    });
  });
});
