import { test, expect } from '@playwright/test';

test.describe('Peasants Running Kit End-to-End E2E User Journeys', () => {
  const timestamp = Date.now();
  const productName = `E2E Club Top ${timestamp}`;
  const customerEmail = `runner_${timestamp}@peasants.store`;
  const customerName = 'Alex Runner';

  test('Complete E2E Journey: Admin product creation -> Storefront order placement -> Admin fulfillment', async ({ page }) => {
    page.on('console', (msg) => console.log('BROWSER LOG:', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('BROWSER ERROR:', err.message));

    // ----------------------------------------------------
    // STEP 1: Organiser Accesses Admin CMS & Adds Product
    // ----------------------------------------------------
    await page.goto('/admin');
    
    // Fill in password and submit
    const adminPassword = process.env.QA_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'peasants2026!';
    await page.fill('input[type="password"]', adminPassword);
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/admin/login') && resp.ok()),
      page.click('button[type="submit"]'),
    ]);

    // Verify Admin Header & Tab (defaults to /admin/orders)
    await expect(page.locator('header', { hasText: 'Organiser CMS' })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/orders/);
    await expect(page.locator('button', { hasText: 'Products Catalogue' })).toBeVisible();

    // Switch to Products Catalogue tab and verify path updates to /admin/catalogue
    await page.click('button:has-text("Products Catalogue")');
    await expect(page).toHaveURL(/\/admin\/catalogue/);

    // Click Add New Kit Item
    await page.click('button:has-text("Add New Kit Item")');

    // Fill Product Details in Modal
    await page.fill('input[placeholder="e.g. Official Club Running Vest"]', productName);
    await page.fill('textarea', 'High-performance moisture-wicking club running top for E2E tests.');
    await page.fill('input[type="number"]', '29.99');

    // Add Size Directly (No default sizes in CMS)
    await page.click('button:has-text("Add Men\'s")');
    await page.fill('input[placeholder="e.g. S, M, L"]', 'M');

    // Save Product
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/products') && resp.ok()),
      page.click('button:has-text("Save Product")'),
    ]);

    // Verify product exists in Admin catalogue
    await expect(page.locator(`text=${productName}`)).toBeVisible();
    await expect(page.locator('text=£29.99').first()).toBeVisible();

    // ----------------------------------------------------
    // STEP 2: Customer Visits Storefront & Places Order
    // ----------------------------------------------------
    await page.goto('/');

    // Wait for either login screen input or store hero banner to render after auth checking
    const loginOrStore = page.locator('input[placeholder="runner@peasants.store"]').or(page.locator('text=Official Gear & Kit'));
    await loginOrStore.first().waitFor({ timeout: 10000 });

    const loginInput = page.locator('input[placeholder="runner@peasants.store"]');
    if (await loginInput.isVisible()) {
      await page.click('text=Register now');
      await page.fill('input[placeholder="Alex"]', 'Alex');
      await page.fill('input[placeholder="Runner"]', 'Runner');
      await page.fill('input[placeholder="runner@peasants.store"]', customerEmail);
      await page.fill('input[type="password"]', 'peasants2026!');
      await page.click('button:has-text("Register & Access Store")');
      await page.waitForSelector('text=Official Gear & Kit', { timeout: 15000 });
    }

    // Verify the newly created product appears on the Storefront
    await expect(page.locator(`text=${productName}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=£29.99').first()).toBeVisible();

    // Select Size 'M'
    const productCard = page.locator('.bg-white', { hasText: productName });
    await productCard.locator('button', { hasText: /^M$/ }).first().click();


    // Add to Basket
    await productCard.locator('button', { hasText: 'Add to Basket' }).click();

    // Verify Basket Drawer Opens
    await expect(page.getByRole('heading', { name: 'Your Basket' })).toBeVisible();
    await expect(page.locator('text=Subtotal')).toBeVisible();

    // Click Proceed to Checkout
    await page.click('button:has-text("Proceed to Checkout")');

    // Fill Checkout Form
    await page.fill('input[placeholder="e.g. Alex Smith"]', customerName);
    await page.fill('input[placeholder="alex@example.com"]', customerEmail);

    // Generate Monzo Payment Link
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/orders') && resp.ok()),
      page.click('button[type="submit"]:has-text("Generate Monzo Payment Link")'),
    ]);

    // Verify Order Placed Screen & Monzo Link
    await expect(page.locator('text=Order Placed!')).toBeVisible();
    await expect(page.locator('text=Order Reference:').first()).toBeVisible();
    await expect(page.locator('a', { hasText: 'Pay £29.99 via Monzo' })).toBeVisible();

    // Extract Order ID (PRRC-XXXX)
    const orderRefElement = page.locator('span.font-mono.underline');
    const orderRef = (await orderRefElement.innerText()).trim();
    expect(orderRef).toMatch(/^PRRC-\d+$/);

    // Verify Guest "Back to Store" button
    const backToStoreBtn = page.locator('button', { hasText: 'Back to Store' });
    if (await backToStoreBtn.isVisible()) {
      await backToStoreBtn.click();
      await expect(page.locator('text=Order Placed!')).not.toBeVisible();
    }

    // ----------------------------------------------------
    // STEP 3: Organiser Manages Order in Admin CMS
    // ----------------------------------------------------
    await page.goto('/admin');

    // If login prompt appears (session empty across new tab), log in again
    const cmsHeader = page.locator('text=Organiser CMS');
    await cmsHeader.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    if (!(await cmsHeader.isVisible())) {
      const pwdInput = page.locator('input[type="password"]');
      await pwdInput.fill(adminPassword);
      await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/admin/login') && r.ok()),
        page.click('button[type="submit"]'),
      ]);
    }

    // Switch to Customer Orders Tab
    await page.click('button:has-text("Customer Orders")');

    // Verify the order exists in Admin CMS
    const orderCard = page.locator('.bg-white', { hasText: orderRef });
    await expect(orderCard).toBeVisible();
    await expect(orderCard.locator(`text=${customerName}`)).toBeVisible();
    await expect(orderCard.locator('text=Pending Payment')).toBeVisible();

    // Mark Payment Received
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/status')),
      orderCard.locator('button:has-text("Mark Payment Received")').click(),
    ]);
    await expect(orderCard.locator('text=Payment Received')).toBeVisible();

    // Mark Order Fulfilled
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/status')),
      orderCard.locator('button:has-text("Mark Order Fulfilled")').click(),
    ]);
    await expect(orderCard.locator('text=Order Fulfilled')).toBeVisible();

    // Cancel the order and verify it is greyed out but still visible
    page.once('dialog', (dialog) => dialog.accept());
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/status')),
      orderCard.locator('button:has-text("Cancel Order")').click(),
    ]);
    const cancelledCard = page.locator('.opacity-60', { hasText: orderRef });
    await expect(cancelledCard).toBeVisible();
    await expect(cancelledCard.locator('text=Cancelled').first()).toBeVisible();
  });

  test('Guest Checkout Flow: Direct product browsing without login -> Add to basket -> Checkout as guest', async ({ page }) => {
    // 1. Visit storefront directly as unauthenticated guest
    await page.goto('/');

    // 2. Verify homepage goes straight to products banner without any login gate
    await expect(page.locator('text=Official Gear & Kit')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Peasants Revolt Running Club Store')).toBeVisible();

    // 3. Header displays Sign In button for guest users
    await expect(page.locator('header').locator('button:has-text("Sign In")')).toBeVisible();

    // 4. Locate first product card and add to basket
    const firstAddButton = page.locator('button:has-text("Add to Basket")').first();
    await firstAddButton.click();

    // 5. Basket drawer opens automatically
    await expect(page.getByRole('heading', { name: 'Your Basket' })).toBeVisible();

    // 6. Proceed to Checkout
    await page.click('button:has-text("Proceed to Checkout")');

    // 7. Verify Checkout as Guest header & fields
    await expect(page.locator('text=Checkout as Guest')).toBeVisible();
    await expect(page.locator('text=Already a club member?')).toBeVisible();

    // 8. Fill Guest Details
    const guestEmail = `guest_${Date.now()}@peasants.store`;
    await page.fill('input[placeholder="e.g. Alex Smith"]', 'Guest Runner');
    await page.fill('input[placeholder="alex@example.com"]', guestEmail);

    // 9. Submit Order
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/orders') && resp.ok()),
      page.click('button[type="submit"]:has-text("Generate Monzo Payment Link")'),
    ]);

    // 10. Verify Order Placed modal
    await expect(page.locator('text=Order Placed!')).toBeVisible();
    await expect(page.locator('a', { hasText: 'via Monzo' })).toBeVisible();
    await expect(page.locator('button:has-text("Back to Store")')).toBeVisible();

    // 11. Click Back to Store
    await page.click('button:has-text("Back to Store")');
    await expect(page.locator('text=Order Placed!')).not.toBeVisible();
  });

  test('Guest Order Tracking Flow: Check order status on My Orders using order reference and email', async ({ page }) => {
    // 1. Visit storefront directly as unauthenticated guest
    await page.goto('/');
    await expect(page.locator('text=Official Gear & Kit')).toBeVisible({ timeout: 10000 });

    // 2. Add product to basket
    const firstAddButton = page.locator('button:has-text("Add to Basket")').first();
    await firstAddButton.click();
    await expect(page.getByRole('heading', { name: 'Your Basket' })).toBeVisible();

    // 3. Checkout as guest
    await page.click('button:has-text("Proceed to Checkout")');
    const guestEmail = `guest_tracker_${Date.now()}@peasants.store`;
    const guestName = 'Tracker Runner';
    await page.fill('input[placeholder="e.g. Alex Smith"]', guestName);
    await page.fill('input[placeholder="alex@example.com"]', guestEmail);

    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/orders') && resp.ok()),
      page.click('button[type="submit"]:has-text("Generate Monzo Payment Link")'),
    ]);

    await expect(page.locator('text=Order Placed!')).toBeVisible();

    // 4. Click "Track Order Status ->"
    await page.click('button:has-text("Track Order Status")');

    // 5. Verify navigates to /store/orders with order found
    await expect(page).toHaveURL(/\/store\/orders\?ref=PRRC-\d+&email=/);
    await expect(page.locator('text=Order Found')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${guestName}`)).toBeVisible();
    await expect(page.locator('text=Awaiting Payment Confirmation')).toBeVisible();

    // 6. Test manual lookup: Click "Look up another order"
    await page.click('button:has-text("Look up another order")');
    await expect(page.locator('text=Track Order Status')).toBeVisible();

    // 7. Enter details manually and check status
    const match = page.url().match(/ref=(PRRC-\d+)/);
    const orderRef = match ? match[1] : 'PRRC-0001';
    await page.fill('input#orderRef', orderRef);
    await page.fill('input#guestEmail', guestEmail);
    await page.click('button:has-text("Check Order Status")');

    await expect(page.locator('text=Order Found')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${guestName}`)).toBeVisible();
  });
});

