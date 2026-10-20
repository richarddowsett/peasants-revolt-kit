import { test, expect } from '@playwright/test';

test.describe('Manufacturer Order Export E2E Tests', () => {
  const adminPassword = process.env.QA_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'peasants2026!';
  const timestamp = Date.now();
  const productName = `Kit Export Tee ${timestamp}`;
  const customerEmail = `runner_export_${timestamp}@peasants.store`;
  const customerName = 'Morgan Export Runner';

  test('1. Authentication Gate: Accessing /admin/export requires valid admin password', async ({ page }) => {
    // Navigate directly to /admin/export without session
    await page.goto('/admin/export');

    // Verify lock screen is shown
    await expect(page.locator('text=Admin Access Required')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter admin password"]')).toBeVisible();

    // Try submitting incorrect password
    await page.fill('input[placeholder="Enter admin password"]', 'wrong-password-123');
    await page.click('button:has-text("Unlock Manufacturer Export")');
    await expect(page.locator('text=Incorrect admin password.')).toBeVisible();

    // Enter correct password and unlock
    await page.fill('input[placeholder="Enter admin password"]', adminPassword);
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/admin/login') && resp.ok()),
      page.click('button:has-text("Unlock Manufacturer Export")'),
    ]);

    // Verify unlocked header
    await expect(page.locator('header', { hasText: 'Manufacturer Order Export' })).toBeVisible();
    await expect(page.locator('text=Peasants Revolt Running Club').first()).toBeVisible();
  });

  test('2. Admin CMS Navigation & Empty State: Export button links to export page, and empty state handles 0 paid orders', async ({ page }) => {
    await page.goto('/admin');

    // Fill in password if prompted
    const pwdInput = page.locator('input[type="password"]');
    if (await pwdInput.isVisible()) {
      await pwdInput.fill(adminPassword);
      await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/admin/login') && r.ok()),
        page.click('button[type="submit"]'),
      ]);
    }

    // Switch to Customer Orders tab
    await page.click('button:has-text("Customer Orders")');

    // Verify "Export for Manufacturer" button is visible
    const exportBtn = page.locator('a', { hasText: 'Export for Manufacturer' });
    await expect(exportBtn).toBeVisible();

    // Click Export for Manufacturer
    await exportBtn.click();
    await expect(page).toHaveURL(/\/admin\/export/);

    // Verify top controls and Back to Admin link works
    const backBtn = page.locator('a', { hasText: 'Back to Admin' });
    await expect(backBtn).toBeVisible();

    // If there are currently no paid orders, verify empty state is cleanly shown
    const emptyStateHeading = page.locator('h3:has-text("No Orders Ready for Export")');
    const orderSheet = page.locator('text=Manufacturer Production Order');
    await expect(emptyStateHeading.or(orderSheet)).toBeVisible();
  });

  test('3. Full Lifecycle & Customisation: Order kit -> Mark Payment Received -> Verify Branding, Custom Email & Shipping Address -> Verify No Signatures -> Mark as Sent', async ({ page }) => {
    page.on('console', (msg) => console.log('EXPORT E2E LOG:', msg.text()));

    // ----------------------------------------------------
    // STEP 1: Add a new kit item in Admin CMS
    // ----------------------------------------------------
    await page.goto('/admin');
    const pwdInput = page.locator('input[type="password"]');
    if (await pwdInput.isVisible()) {
      await pwdInput.fill(adminPassword);
      await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/admin/login') && r.ok()),
        page.click('button[type="submit"]'),
      ]);
    }

    await page.click('button:has-text("Add New Kit Item")');
    await page.fill('input[placeholder="e.g. Official Club Running Vest"]', productName);
    await page.fill('textarea', 'High quality export test product');
    await page.fill('input[type="number"]', '35.00');

    // Add Men's L size
    await page.click('button:has-text("Add Men\'s")');
    await page.fill('input[placeholder="e.g. S, M, L"]', 'L');

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/products') && r.ok()),
      page.click('button:has-text("Save Product")'),
    ]);

    await expect(page.locator(`text=${productName}`)).toBeVisible();

    // ----------------------------------------------------
    // STEP 2: Place an order from Storefront
    // ----------------------------------------------------
    await page.goto('/');
    const productCard = page.locator('.bg-white', { hasText: productName });
    await expect(productCard.first()).toBeVisible({ timeout: 10000 });

    // Select Size L and Add to Basket
    await productCard.locator('button', { hasText: /^L$/ }).first().click();
    await productCard.locator('button', { hasText: 'Add to Basket' }).click();

    // Proceed to Checkout
    await expect(page.getByRole('heading', { name: 'Your Basket' })).toBeVisible();
    await page.click('button:has-text("Proceed to Checkout")');

    await page.fill('input[placeholder="e.g. Alex Smith"]', customerName);
    await page.fill('input[placeholder="alex@example.com"]', customerEmail);

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/orders') && r.ok()),
      page.click('button[type="submit"]:has-text("Generate Monzo Payment Link")'),
    ]);

    await expect(page.locator('text=Order Placed!')).toBeVisible();
    const orderRefElement = page.locator('span.font-mono.underline');
    const orderRef = (await orderRefElement.innerText()).trim();

    // ----------------------------------------------------
    // STEP 3: Admin Marks Order as Payment Received
    // ----------------------------------------------------
    await page.goto('/admin');
    // Since Step 1 authenticated in this browser context, wait for sessionStorage auth effect or login if needed
    const cmsHeader = page.locator('header', { hasText: 'Organiser CMS' });
    const isAlreadyLoggedIn = await cmsHeader
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (!isAlreadyLoggedIn) {
      const adminPwd = page.locator('input[type="password"]');
      if (await adminPwd.isVisible()) {
        await adminPwd.fill(adminPassword);
        await Promise.all([
          page.waitForResponse((r) => r.url().includes('/api/admin/login') && r.ok()),
          page.click('button[type="submit"]'),
        ]);
      }
    }

    await page.click('button:has-text("Customer Orders")');
    const orderCard = page.locator('.bg-white', { hasText: orderRef });
    await expect(orderCard).toBeVisible({ timeout: 10000 });

    // Click Mark Payment Received
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/status') && r.ok()),
      orderCard.locator('button:has-text("Mark Payment Received")').click(),
    ]);
    await expect(orderCard.locator('text=Payment Received')).toBeVisible();

    // ----------------------------------------------------
    // STEP 4: Navigate to Export for Manufacturer Sheet
    // ----------------------------------------------------
    await page.click('a:has-text("Export for Manufacturer")');
    await expect(page).toHaveURL(/\/admin\/export/);

    // Verify Club Logo in Document Header
    const logo = page.locator('img[alt="Peasants Revolt Running Club Logo"]');
    await expect(logo).toBeVisible({ timeout: 10000 });
    await expect(logo).toHaveAttribute('src', '/logo.png');

    // Verify Document Title
    await expect(page.locator('text=Manufacturer Production Order')).toBeVisible();

    // Verify Print Button is initially disabled because email & address are required
    const printBtn = page.locator('button:has-text("Print / Save as PDF")');
    await expect(printBtn).toBeVisible();
    await expect(printBtn).toBeDisabled();

    // ----------------------------------------------------
    // STEP 5: Verify & Test Mandatory Customisation Fields & Error Labels
    // ----------------------------------------------------
    // Verify initial red error labels are displayed
    const emailError = page.locator('[data-testid="admin-email-error"]');
    const addressError = page.locator('[data-testid="shipping-address-error"]');
    await expect(emailError).toBeVisible();
    await expect(emailError).toHaveText('Club admin email is required');
    await expect(addressError).toBeVisible();
    await expect(addressError).toHaveText('Shipping address is required');

    // 1. Fill Mandatory Club Admin Email
    const emailInput = page.locator('input[placeholder="e.g. admin@peasantsrc.co.uk"]');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveValue('');

    await emailInput.fill('kit-director@peasantsrc.org');
    await expect(emailInput).toHaveValue('kit-director@peasantsrc.org');
    // Admin email error should disappear, but address error and disabled print remain
    await expect(emailError).not.toBeVisible();
    await expect(addressError).toBeVisible();
    await expect(printBtn).toBeDisabled();

    // 2. Fill Mandatory Shipping Address
    const addressInput = page.locator('textarea[placeholder="Enter shipping address..."]');
    await expect(addressInput).toBeVisible();
    await expect(addressInput).toHaveValue('');

    await addressInput.fill('PRRC Clubhouse & Dispatch\nUnit 5, Riverside Mile\nLondon SW1A 2AA');
    await expect(addressInput).toHaveValue('PRRC Clubhouse & Dispatch\nUnit 5, Riverside Mile\nLondon SW1A 2AA');
    // Shipping address error should disappear, and print button becomes enabled
    await expect(addressError).not.toBeVisible();
    await expect(printBtn).toBeEnabled();

    // 3. Verify Production & Packaging Notes are NOT Present
    await expect(page.locator('text=Production & Packaging Notes')).not.toBeVisible();
    await expect(page.locator('textarea[placeholder="Add specific instructions for the manufacturer..."]')).not.toBeVisible();

    // 4. Verify Signature Boxes are NOT Present
    await expect(page.locator('text=Authorized Club Representative')).not.toBeVisible();
    await expect(page.locator('text=Manufacturer Production Acknowledgment')).not.toBeVisible();
    await expect(page.locator('text=Target Dispatch Date')).not.toBeVisible();

    // ----------------------------------------------------
    // STEP 6: Verify Product Grouping & Grand Total
    // ----------------------------------------------------
    await expect(page.locator(`h3:has-text("${productName}")`)).toBeVisible();
    await expect(page.locator('td', { hasText: "Men's" }).first()).toBeVisible();
    await expect(page.locator('td', { hasText: 'L' }).first()).toBeVisible();
    await expect(page.locator('td', { hasText: '£35.00' }).first()).toBeVisible();

    await expect(page.locator('text=Grand Total Batch')).toBeVisible();
    await expect(page.locator('text=Total Quantity')).toBeVisible();
    await expect(page.locator('text=Total Value')).toBeVisible();

    // ----------------------------------------------------
    // STEP 7: Mark Batch as Order Sent
    // ----------------------------------------------------
    // Handle confirmation dialog
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Order Sent');
      await dialog.accept();
    });

    const markSentBtn = page.locator('button:has-text("as Sent")');
    await expect(markSentBtn).toBeVisible();

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/status') && r.ok()),
      markSentBtn.click(),
    ]);

    // Verify success confirmation banner
    await expect(page.locator('text=Successfully marked')).toBeVisible();

    // Toggle "Include previously Order Sent orders" to verify it remains viewable in sent history
    const sentCheckbox = page.locator('input[type="checkbox"]');
    if (!(await sentCheckbox.isChecked())) {
      await sentCheckbox.check();
    }

    await expect(page.locator(`h3:has-text("${productName}")`)).toBeVisible();
  });
});
