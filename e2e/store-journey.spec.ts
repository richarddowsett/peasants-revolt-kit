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

    // Verify Admin Header & Tab
    await expect(page.locator('header', { hasText: 'Organiser CMS' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Products Catalog' })).toBeVisible();

    // Click Add New Kit Item
    await page.click('button:has-text("Add New Kit Item")');

    // Fill Product Details in Modal
    await page.fill('input[placeholder="e.g. Official Club Running Vest"]', productName);
    await page.fill('textarea', 'High-performance moisture-wicking club running top for E2E tests.');
    await page.fill('input[type="number"]', '29.99');

    // Save Product
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/products') && resp.ok()),
      page.click('button:has-text("Save Product")'),
    ]);

    // Verify product exists in Admin catalog
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

    // ----------------------------------------------------
    // STEP 3: Organiser Manages Order in Admin CMS
    // ----------------------------------------------------
    await page.goto('/admin');

    // If login prompt appears (session empty across new tab), log in again
    const pwdInput = page.locator('input[type="password"]');
    await pwdInput.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
    if (await pwdInput.isVisible()) {
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

  });
});
