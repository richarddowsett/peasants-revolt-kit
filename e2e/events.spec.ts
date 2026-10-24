import { test, expect } from '@playwright/test';

test.describe('Club Events & Ticketing End-to-End Journey', () => {
  const adminPassword = process.env.ADMIN_PASSWORD || 'peasants2026!';

  test('No Events Instagram Holding -> Admin creates event -> Customer views directory & buys ticket -> My Orders -> Admin marks paid & checks in UUID at door', async ({
    page,
    request,
  }) => {
    // 1. Ensure no upcoming events exist initially so the Instagram holding page is shown
    const existingRes = await request.get('/api/events?includePast=true');
    if (existingRes.ok()) {
      const existingEvents = await existingRes.json();
      for (const item of existingEvents) {
        if (item?.event?.id) {
          await request.delete(`/api/events/${item.event.id}`);
        }
      }
    }

    await page.goto('/events');
    await expect(page.getByTestId('no-events-holding')).toBeVisible();
    await expect(
      page.locator('text=No upcoming events, please check Instagram for more details')
    ).toBeVisible();
    const igLink = page.locator('a[href="https://www.instagram.com/prrcbrentwood/"]').first();
    await expect(igLink).toBeVisible();

    // 2. Admin logs into /admin and creates a new Club Event
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

    await page.click('button:has-text("Events & Tickets")');
    await expect(page).toHaveURL(/\/admin\/events/);
    await page.click('button:has-text("Add New Event")');
    await expect(page.getByTestId('event-admin-form')).toBeVisible();

    const eventTitle = `PRRC Christmas Party ${Date.now()}`;
    await page.fill('#admin-event-title', eventTitle);
    await page.fill(
      '#admin-event-description',
      'Annual club celebration with drinks, food, and awards!'
    );
    await page.fill('#admin-event-start-date', '2027-12-18T19:30');
    await page.fill('#admin-event-sale-date', '2020-01-01T09:00');
    await page.fill('#admin-event-max-tickets', '10');
    await page.fill('#admin-event-price', '25');
    await page.fill('#admin-event-address', 'The Brentwood Tap, CM14');

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/events') && r.request().method() === 'POST' && r.ok()
      ),
      page.click('button:has-text("Create Event")'),
    ]);

    await expect(page.locator(`text=Created "${eventTitle}" successfully.`)).toBeVisible();

    // 3. Customer visits /events, sees the event in the directory, clicks it, and purchases 1 ticket
    await page.goto('/events');
    await expect(page.getByTestId('events-list')).toBeVisible();
    const eventCard = page.getByTestId('event-card').filter({ hasText: eventTitle });
    await expect(eventCard).toBeVisible();
    await eventCard.click();

    await expect(page.getByTestId('event-detail-view')).toBeVisible();
    await expect(page.getByTestId('event-purchase-form')).toBeVisible();

    const uniqueEmail = `runner_${Date.now()}@example.com`;
    await page.fill('#ticket-customer-name', 'Festive Runner');
    await page.fill('#ticket-customer-email', uniqueEmail);

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/tickets') && r.request().method() === 'POST' && r.ok()
      ),
      page.click('button:has-text("Buy Ticket")'),
    ]);

    await expect(page.getByTestId('ticket-order-confirmation')).toBeVisible();
    const orderRef = (await page.getByTestId('ticket-order-reference').innerText()).trim();
    expect(orderRef).toMatch(/^PRRC-EVT-2027-\d{4}$/);

    // 4. Customer checks their ticket on /store/orders
    await page.goto(
      `/store/orders?ref=${encodeURIComponent(orderRef)}&email=${encodeURIComponent(uniqueEmail)}`
    );
    await expect(page.locator(`text=${orderRef}`).first()).toBeVisible();
    await expect(page.locator('text=Club Event Ticket').first()).toBeVisible();

    // 5. Admin marks the ticket as Payment Received (triggers QR email) and checks in the UUID at the door
    await page.goto('/admin');
    const cmsHeader = page.locator('text=Organiser CMS');
    await cmsHeader.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    if (!(await cmsHeader.isVisible())) {
      await pwdInput.fill(adminPassword);
      await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/admin/login') && r.ok()),
        page.click('button[type="submit"]'),
      ]);
    }

    await page.click('button:has-text("Events & Tickets")');
    const ticketRow = page.getByTestId(`event-ticket-row-${orderRef}`);
    await expect(ticketRow).toBeVisible();

    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/event-tickets/${orderRef}/status`)),
      ticketRow.locator('button:has-text("Mark Payment Received & Send Ticket")').click(),
    ]);

    await expect(ticketRow.locator('text=Payment Received (Ticket Sent)')).toBeVisible();
    await expect(ticketRow.locator('text=QR Email Sent')).toBeVisible();

    // Extract the generated ticket UUID from the admin row and verify it on the dedicated Door QR Scanner screen
    const uuidText = await ticketRow.locator('text=Ticket UUID:').innerText();
    const ticketUuid = uuidText.replace('Ticket UUID:', '').trim();
    expect(ticketUuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    await page.getByTestId('open-door-scanner-link').click();
    await expect(page.getByTestId('door-qr-scanner-screen')).toBeVisible();

    const uuidInput = page.locator('input[aria-label="Ticket UUID"]');
    await uuidInput.fill(ticketUuid);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/events/verify-qr') && r.ok()),
      page.click('button:has-text("Verify & Check In")'),
    ]);

    const scanResult = page.getByTestId('qr-scan-result');
    await expect(scanResult).toBeVisible();
    await expect(page.getByTestId('qr-flash-banner')).toContainText(
      'VALID TICKET — ENTRY CONFIRMED!'
    );
    await expect(scanResult.locator('text=Entry Confirmed — Checked In')).toBeVisible();
    await expect(scanResult.locator('text=Festive Runner').first()).toBeVisible();

    // Scanning the same QR UUID a second time should alert that the customer is already checked in
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/events/verify-qr') && r.ok()),
      page.click('button:has-text("Verify & Check In")'),
    ]);
    await expect(scanResult.locator('text=Already Checked In')).toBeVisible();
  });
});
