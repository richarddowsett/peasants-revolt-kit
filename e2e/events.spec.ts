import { test, expect, Page } from '@playwright/test';

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

  test('Multiple Events Creation & Orders: Admin creates multiple events -> Customers place orders for each -> Admin verifies orders appear under each event correctly', async ({
    page,
    request,
  }) => {
    const timestamp = Date.now();
    const eventA = {
      title: `PRRC Spring 10K Trail ${timestamp}`,
      description:
        'Scenic 10km trail run through Weald Country Park with medals and refreshments.',
      startDate: '2027-05-20T09:30',
      saleStartAt: '2020-01-01T08:00',
      maxTickets: '15',
      price: '18',
      address: 'Weald Country Park, South Weald, CM14 5QS',
    };

    const eventB = {
      title: `PRRC Summer Solstice 5K ${timestamp}`,
      description: 'Evening midsummer 5K club road race followed by social drinks.',
      startDate: '2027-06-21T19:00',
      saleStartAt: '2020-01-01T08:00',
      maxTickets: '25',
      price: '12',
      address: 'King George Playing Fields, Ingrave Road, CM13 2AQ',
    };

    const customerA1 = {
      name: 'Alice Spring Runner',
      email: `alice.spring.${timestamp}@example.com`,
    };
    const customerA2 = {
      name: 'Aaron Trail Pacer',
      email: `aaron.trail.${timestamp}@example.com`,
    };
    const customerB1 = {
      name: 'Bob Summer Sprinter',
      email: `bob.summer.${timestamp}@example.com`,
    };

    const ensureAdminLoggedIn = async (targetPage: Page) => {
      await targetPage.goto('/admin');
      const pwdInput = targetPage.locator('input[type="password"]');
      await pwdInput.waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
      if (await pwdInput.isVisible()) {
        await pwdInput.fill(adminPassword);
        await Promise.all([
          targetPage.waitForResponse((r) => r.url().includes('/api/admin/login') && r.ok()),
          targetPage.click('button[type="submit"]'),
        ]);
      }
      await targetPage.click('button:has-text("Events & Tickets")');
      await expect(targetPage).toHaveURL(/\/admin\/events/);
    };

    const createEventInAdmin = async (
      targetPage: Page,
      eventData: typeof eventA
    ) => {
      await targetPage.click('button:has-text("Add New Event")');
      await expect(targetPage.getByTestId('event-admin-form')).toBeVisible();

      await targetPage.fill('#admin-event-title', eventData.title);
      await targetPage.fill('#admin-event-description', eventData.description);
      await targetPage.fill('#admin-event-start-date', eventData.startDate);
      await targetPage.fill('#admin-event-sale-date', eventData.saleStartAt);
      await targetPage.fill('#admin-event-max-tickets', eventData.maxTickets);
      await targetPage.fill('#admin-event-price', eventData.price);
      await targetPage.fill('#admin-event-address', eventData.address);

      await Promise.all([
        targetPage.waitForResponse(
          (r) => r.url().includes('/api/events') && r.request().method() === 'POST' && r.ok()
        ),
        targetPage.click('button:has-text("Create Event")'),
      ]);

      await expect(
        targetPage.locator(`text=Created "${eventData.title}" successfully.`)
      ).toBeVisible();
    };

    const purchaseTicket = async (
      targetPage: Page,
      eventTitle: string,
      customer: { name: string; email: string }
    ): Promise<string> => {
      await targetPage.goto('/events');
      await expect(targetPage.getByTestId('events-list')).toBeVisible();

      const eventCard = targetPage
        .getByTestId('event-card')
        .filter({ hasText: eventTitle });
      await expect(eventCard).toBeVisible();
      await eventCard.click();

      await expect(targetPage.getByTestId('event-detail-view')).toBeVisible();
      await expect(targetPage.getByTestId('event-purchase-form')).toBeVisible();

      await targetPage.fill('#ticket-customer-name', customer.name);
      await targetPage.fill('#ticket-customer-email', customer.email);

      await Promise.all([
        targetPage.waitForResponse(
          (r) => r.url().includes('/tickets') && r.request().method() === 'POST' && r.ok()
        ),
        targetPage.click('button:has-text("Buy Ticket")'),
      ]);

      await expect(targetPage.getByTestId('ticket-order-confirmation')).toBeVisible();
      const orderRef = (
        await targetPage.getByTestId('ticket-order-reference').innerText()
      ).trim();
      expect(orderRef).toMatch(/^PRRC-EVT-\d{4}-\d{4}$/);
      return orderRef;
    };

    try {
      // 1. Admin navigates to /admin/events and creates multiple new events through the UI
      await ensureAdminLoggedIn(page);
      await createEventInAdmin(page, eventA);
      await createEventInAdmin(page, eventB);

      // Verify both events appear in the admin event cards
      const adminCardA = page
        .locator('[data-testid^="admin-event-card-"]')
        .filter({ hasText: eventA.title });
      const adminCardB = page
        .locator('[data-testid^="admin-event-card-"]')
        .filter({ hasText: eventB.title });
      await expect(adminCardA).toBeVisible();
      await expect(adminCardB).toBeVisible();

      // 2. Customers browse the public /events directory and place orders for each event
      await page.goto('/events');
      await expect(page.getByTestId('events-list')).toBeVisible();
      await expect(
        page.getByTestId('event-card').filter({ hasText: eventA.title })
      ).toBeVisible();
      await expect(
        page.getByTestId('event-card').filter({ hasText: eventB.title })
      ).toBeVisible();

      // Customer 1 places order for Event A
      const orderRefA1 = await purchaseTicket(page, eventA.title, customerA1);

      // Customer 2 places order for Event A
      const orderRefA2 = await purchaseTicket(page, eventA.title, customerA2);

      // Customer 3 places order for Event B
      const orderRefB1 = await purchaseTicket(page, eventB.title, customerB1);

      // Verify each customer can view their order via /store/orders
      await page.goto(
        `/store/orders?ref=${encodeURIComponent(orderRefA1)}&email=${encodeURIComponent(
          customerA1.email
        )}`
      );
      await expect(page.locator(`text=${orderRefA1}`).first()).toBeVisible();

      await page.goto(
        `/store/orders?ref=${encodeURIComponent(orderRefB1)}&email=${encodeURIComponent(
          customerB1.email
        )}`
      );
      await expect(page.locator(`text=${orderRefB1}`).first()).toBeVisible();

      // 3. Admin visits /admin/events and verifies orders appear correctly segregated under each event
      await ensureAdminLoggedIn(page);

      // Select Event A
      await adminCardA.click();
      await expect(adminCardA).toContainText(`2 / ${eventA.maxTickets}`);
      await expect(adminCardA).toContainText('13'); // 15 - 2 = 13 remaining

      await expect(
        page.locator(`text=Attendees & Ticket Orders — ${eventA.title} (2)`)
      ).toBeVisible();

      // Check Order A1 details in Event A attendee list
      const ticketRowA1 = page.getByTestId(`event-ticket-row-${orderRefA1}`);
      await expect(ticketRowA1).toBeVisible();
      await expect(ticketRowA1).toContainText(customerA1.name);
      await expect(ticketRowA1).toContainText(customerA1.email);
      await expect(ticketRowA1).toContainText('Pending Payment');

      // Check Order A2 details in Event A attendee list
      const ticketRowA2 = page.getByTestId(`event-ticket-row-${orderRefA2}`);
      await expect(ticketRowA2).toBeVisible();
      await expect(ticketRowA2).toContainText(customerA2.name);
      await expect(ticketRowA2).toContainText(customerA2.email);
      await expect(ticketRowA2).toContainText('Pending Payment');

      // Verify Event B order is NOT in Event A's list
      await expect(page.getByTestId(`event-ticket-row-${orderRefB1}`)).not.toBeVisible();

      // Select Event B
      await adminCardB.click();
      await expect(adminCardB).toContainText(`1 / ${eventB.maxTickets}`);
      await expect(adminCardB).toContainText('24'); // 25 - 1 = 24 remaining

      await expect(
        page.locator(`text=Attendees & Ticket Orders — ${eventB.title} (1)`)
      ).toBeVisible();

      // Check Order B1 details in Event B attendee list
      const ticketRowB1 = page.getByTestId(`event-ticket-row-${orderRefB1}`);
      await expect(ticketRowB1).toBeVisible();
      await expect(ticketRowB1).toContainText(customerB1.name);
      await expect(ticketRowB1).toContainText(customerB1.email);
      await expect(ticketRowB1).toContainText('Pending Payment');

      // Verify Event A orders are NOT in Event B's list
      await expect(page.getByTestId(`event-ticket-row-${orderRefA1}`)).not.toBeVisible();
      await expect(page.getByTestId(`event-ticket-row-${orderRefA2}`)).not.toBeVisible();

      // 4. Test Admin Order Actions on these orders
      // In Event B: Admin cancels the unpaid order
      page.once('dialog', (dialog) => dialog.accept());
      await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes(`/api/event-tickets/${orderRefB1}/status`) && r.ok()
        ),
        ticketRowB1.locator('button:has-text("Cancel Order (Unpaid)")').click(),
      ]);
      await expect(ticketRowB1.locator('text=Cancelled')).toBeVisible();
      await expect(
        ticketRowB1.locator('text=Cancellation: Payment not received in good time')
      ).toBeVisible();

      // Capacity should be released on Event B card
      await expect(adminCardB).toContainText(`0 / ${eventB.maxTickets}`);
      await expect(adminCardB).toContainText(eventB.maxTickets);

      // Switch back to Event A: mark Order A1 as paid
      await adminCardA.click();
      await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes(`/api/event-tickets/${orderRefA1}/status`) && r.ok()
        ),
        ticketRowA1
          .locator('button:has-text("Mark Payment Received & Send Ticket")')
          .click(),
      ]);
      await expect(
        ticketRowA1.locator('text=Payment Received (Ticket Sent)')
      ).toBeVisible();
      await expect(ticketRowA1.locator('text=QR Email Sent')).toBeVisible();

      // Order A2 remains unchanged
      await expect(ticketRowA2.locator('text=Pending Payment')).toBeVisible();
    } finally {
      // Clean up the created test events
      const allEventsRes = await request.get('/api/events?includePast=true');
      if (allEventsRes.ok()) {
        const allEvents = await allEventsRes.json();
        for (const item of allEvents) {
          if (
            item?.event?.id &&
            (item.event.title === eventA.title || item.event.title === eventB.title)
          ) {
            await request.delete(`/api/events/${item.event.id}`);
          }
        }
      }
    }
  });
});
