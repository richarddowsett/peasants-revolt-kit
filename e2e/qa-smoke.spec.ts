import { test, expect } from '@playwright/test';

test.describe('Peasants Running Kit Live QA Deployment Smoke Tests', () => {
  const adminPassword = process.env.QA_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'peasants2026!';
  const testUserEmail = process.env.QA_TEST_USER_EMAIL;
  const testUserPassword = process.env.QA_TEST_USER_PASSWORD || 'peasants2026!';

  test('1. Unauthenticated Health Check: Cloud Run backend API /api/health responds with status ok', async ({ request, baseURL }) => {
    const base = (baseURL || 'https://peasants-running-kit-qa.web.app').replace(/\/+$/, '');
    const healthUrl = `${base}/api/health`;

    await expect.poll(async () => {
      const response = await request.get(healthUrl).catch(() => null);
      if (!response) return 'network_error';
      if (!response.ok()) {
        const text = await response.text().catch(() => '');
        return `http_${response.status()}:${text.slice(0, 100)}`;
      }
      const data = await response.json().catch(() => null);
      if (!data) {
        const text = await response.text().catch(() => '');
        return `non_json:${text.slice(0, 100)}`;
      }
      return data.status;
    }, {
      message: `API health check at ${healthUrl} did not return status 'ok'`,
      intervals: [2000, 4000, 8000],
      timeout: 60000,
    }).toBe('ok');
  });

  test('2. Unauthenticated Products API: /api/products returns HTTP 200 and products list', async ({ request, baseURL }) => {
    const base = (baseURL || 'https://peasants-running-kit-qa.web.app').replace(/\/+$/, '');
    const productsUrl = `${base}/api/products`;

    await expect.poll(async () => {
      const response = await request.get(productsUrl).catch(() => null);
      if (!response || !response.ok()) return false;
      const data = await response.json().catch(() => null);
      return Array.isArray(data);
    }, {
      message: `Products API at ${productsUrl} did not return a JSON array`,
      intervals: [2000, 4000],
      timeout: 30000,
    }).toBe(true);
  });

  test('3. Storefront UI: Landing page serves HTML, static assets, and header navigation', async ({ page }) => {
    const response = await page.goto('/');
    expect(response, 'Failed to navigate to storefront landing page').not.toBeNull();
    expect(response!.status(), `Storefront landing page returned error status ${response!.status()}`).toBeLessThan(400);

    // Verify key brand / UI element is rendered
    const brandElement = page
      .locator('text=Peasants')
      .or(page.locator('text=Official Gear & Kit'))
      .or(page.locator('input[placeholder="runner@peasants.store"]'));
    await expect(brandElement.first()).toBeVisible({ timeout: 15000 });
  });

  test('4. Admin CMS Authentication: Successfully login to /admin using QA_ADMIN_PASSWORD', async ({ page }) => {
    await page.goto('/admin');

    // Verify admin login form renders
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 10000 });

    await passwordInput.fill(adminPassword);

    // Wait for the admin login API call
    const [loginResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/admin/login')),
      page.click('button[type="submit"]'),
    ]);
    if (!loginResp.ok()) {
      const errBody = await loginResp.text().catch(() => '');
      expect(loginResp.ok(), `Admin login failed with status ${loginResp.status()}: ${errBody}`).toBe(true);
    }

    // Check for potential UI auth error banner or dashboard header
    const cmsHeader = page.locator('header', { hasText: 'Organiser CMS' });
    const authErrorAlert = page.locator('div.bg-red-50');
    await Promise.race([
      cmsHeader.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
      authErrorAlert.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
    ]);

    if (await authErrorAlert.isVisible()) {
      const errorText = await authErrorAlert.innerText();
      throw new Error(`Admin CMS login failed with error message: ${errorText.trim()}`);
    }

    // Verify Admin CMS Dashboard navigation
    await expect(cmsHeader).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button', { hasText: 'Products Catalog' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Customer Orders' })).toBeVisible();

    // Verify tab switching to Customer Orders without client errors
    await page.click('button:has-text("Customer Orders")');
    await expect(
      page.locator('text=Manage Customer Orders')
        .or(page.locator('text=No customer orders yet'))
        .or(page.locator('text=Order Ref'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('5. Storefront Runner Journey: Authenticate via ephemeral account or QA_TEST_USER credentials', async ({ page }) => {
    await page.goto('/');

    const loginInput = page.locator('input[placeholder="runner@peasants.store"]');
    const storeBanner = page.locator('text=Official Gear & Kit');

    // Wait for auth check or store render
    await Promise.race([
      loginInput.waitFor({ timeout: 10000 }).catch(() => null),
      storeBanner.waitFor({ timeout: 10000 }).catch(() => null),
    ]);

    if (await loginInput.isVisible()) {
      if (testUserEmail) {
        // Authenticate with predefined QA test user credentials
        await loginInput.fill(testUserEmail);
        await page.fill('input[type="password"]', testUserPassword);
        await page.locator('button:has-text("Sign In to Store")').or(page.locator('button[type="submit"]')).first().click();
      } else {
        // Register a dynamic ephemeral account for isolated smoke verification
        const ephemeralEmail = `qa_smoke_${Date.now()}@peasants.store`;
        await page.click('text=Register now');
        await page.fill('input[placeholder="Alex"]', 'QA');
        await page.fill('input[placeholder="Runner"]', 'Smoke');
        await page.fill('input[placeholder="runner@peasants.store"]', ephemeralEmail);
        await page.fill('input[type="password"]', testUserPassword);
        await page.click('button:has-text("Register & Access Store")');
      }

      // Check for either successful catalog unlock or an auth error banner
      const catalogBanner = page.locator('text=Official Gear & Kit').first();
      const authErrorAlert = page.locator('div.bg-red-50');

      await Promise.race([
        catalogBanner.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
        authErrorAlert.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
      ]);

      if (await authErrorAlert.isVisible()) {
        const errorText = await authErrorAlert.innerText();
        throw new Error(`QA Storefront authentication failed: ${errorText.trim()}`);
      }
    }

    // Verify Storefront Catalog is unlocked
    await expect(page.locator('text=Official Gear & Kit').first()).toBeVisible({ timeout: 10000 });
  });

  test('6. Order Tracking: Dedicated /store/orders page loads and renders order status UI', async ({ page }) => {
    const response = await page.goto('/store/orders');
    expect(response, 'Failed to navigate to /store/orders page').not.toBeNull();
    expect(response!.status(), `/store/orders page returned error status ${response!.status()}`).toBeLessThan(400);

    // Verify page header and order UI state (either sign-in prompt, empty state, or orders list)
    await expect(page.locator('h1', { hasText: 'My Orders' })).toBeVisible({ timeout: 10000 });
    const orderStateElement = page
      .locator('text=Please Sign In')
      .or(page.locator('text=No Orders Found'))
      .or(page.locator('text=Order Ref'));
    await expect(orderStateElement.first()).toBeVisible({ timeout: 10000 });
  });
});
