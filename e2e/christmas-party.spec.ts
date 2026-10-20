import { test, expect } from '@playwright/test';

test.describe('Christmas Party Ticket Sales & Door QR Scanner Journey', () => {
  test('Full E2E: No-date holding page -> Admin sets party config -> Customer buys ticket -> Admin marks paid & checks in UUID at door', async ({
    page,
    request,
  }) => {
    const adminPassword =
      process.env.QA_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'peasants2026!';

    // 1. Ensure party date is cleared first and verify the No Christmas Party holding page
    await request.put('http://127.0.0.1:8080/api/christmas-party/settings', {
      data: { partyDateTime: '' },
    });

    await page.goto('/christmas-party');
    await expect(
      page.locator('text=No Christmas party, please check Instagram for more details')
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('a', { hasText: 'Follow @prrcbrentwood' })).toBeVisible();

    // 2. Admin configures Christmas Party with countdown in the future first, then open for sale
    const futureSale = new Date(Date.now() + 3600_000).toISOString();
    await request.put('http://127.0.0.1:8080/api/christmas-party/settings', {
      data: {
        partyDateTime: '2026-12-19T19:30:00.000Z',
        saleStartAt: futureSale,
        maxTickets: 50,
        ticketPrice: 25,
        partyLocation: 'The Brentwood Tap, CM14',
      },
    });

    await page.reload();
    await expect(page.getByTestId('christmas-party-countdown')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=The Brentwood Tap, CM14')).toBeVisible();

    // 3. Open ticket sales (countdown expired)
    const pastSale = new Date(Date.now() - 60_000).toISOString();
    await request.put('http://127.0.0.1:8080/api/christmas-party/settings', {
      data: {
        partyDateTime: '2026-12-19T19:30:00.000Z',
        saleStartAt: pastSale,
        maxTickets: 50,
        ticketPrice: 25,
        partyLocation: 'The Brentwood Tap, CM14',
      },
    });

    await page.reload();
    await expect(page.getByTestId('christmas-party-purchase')).toBeVisible({ timeout: 10000 });

    // 4. Customer purchases a ticket
    const uniqueEmail = `xmas_${Date.now()}@peasants.store`;
    await page.fill('input#ticket-customer-name', 'Festive Runner');
    await page.fill('input#ticket-customer-email', uniqueEmail);

    const [purchaseResp] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/christmas-party/tickets') && resp.ok()
      ),
      page.click('button[type="submit"]:has-text("Buy Christmas Party Ticket")'),
    ]);
    const createdTicket = await purchaseResp.json();
    expect(createdTicket.id).toMatch(/^PRRC-XMAS-2026-\d{4}$/);
    expect(createdTicket.orderType).toBe('christmas_2026_ticket');
    expect(createdTicket.ticketUuid).toBeTruthy();

    await expect(page.getByTestId('christmas-ticket-monzo-step')).toBeVisible();
    await expect(page.locator(`text=${createdTicket.id}`)).toBeVisible();

    // 5. Admin logs in, navigates to Christmas Party tab, marks payment received, and scans UUID at the door
    await page.goto('/admin');
    const pwdInput = page.locator('input[type="password"]');
    await pwdInput.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
    if (await pwdInput.isVisible()) {
      await pwdInput.fill(adminPassword);
      await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/admin/login') && r.ok()),
        page.click('button[type="submit"]'),
      ]);
    }

    await page.click('button:has-text("Christmas Party & Door Scanner")');
    await expect(page.locator(`text=${createdTicket.id}`)).toBeVisible({ timeout: 10000 });

    const ticketRow = page.locator('.rounded-2xl', { hasText: createdTicket.id });
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/orders/${createdTicket.id}/status`)),
      ticketRow.locator('button:has-text("Mark Payment Received & Email Ticket")').click(),
    ]);

    await expect(ticketRow.locator('text=Ticket Email Sent')).toBeVisible({ timeout: 10000 });

    // Verify UUID in Door Scanner (Auto Check-In)
    await page.fill('input#manual-ticket-uuid', createdTicket.ticketUuid);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/christmas-party/verify-qr') && r.ok()),
      page.click('button:has-text("Verify & Check In")'),
    ]);

    const scanResult = page.getByTestId('qr-scan-result');
    await expect(scanResult).toBeVisible();
    await expect(scanResult.locator('text=Entry Confirmed — Checked In!')).toBeVisible();
    await expect(scanResult.locator('text=Festive Runner').first()).toBeVisible();
  });
});
