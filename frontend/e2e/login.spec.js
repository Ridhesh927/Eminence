import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Route mock for successful login
    await page.route('**/api/auth/login', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');
      
      // We will allow 'validuser', 'valid@email.com', or '9999999999' as valid identifiers
      const validIdentifiers = ['validuser', 'valid@email.com', '9999999999'];
      
      if (validIdentifiers.includes(postData.identifier) && postData.password === 'password123') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            token: 'fake-jwt-token',
            user: {
              id: 1,
              name: 'Valid User',
              email: 'valid@email.com',
              role: 'customer',
              isProfileComplete: true
            }
          })
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Invalid credentials'
          })
        });
      }
    });

    await page.goto('/login');
  });

  test('should login successfully with email and password', async ({ page }) => {
    await page.fill('input[id="identifier"]', 'valid@email.com');
    await page.fill('input[id="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should navigate to customer dashboard
    await expect(page).toHaveURL(/.*\/customer\/dashboard/);
  });

  test('should login successfully with phone and password', async ({ page }) => {
    await page.fill('input[id="identifier"]', '9999999999');
    await page.fill('input[id="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/customer\/dashboard/);
  });

  test('should login successfully with username and password', async ({ page }) => {
    await page.fill('input[id="identifier"]', 'validuser');
    await page.fill('input[id="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/customer\/dashboard/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('input[id="identifier"]', 'wronguser');
    await page.fill('input[id="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input[id="password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the eye icon
    await page.click('button:has(svg.lucide-eye)');
    
    // Now it should be text
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await page.click('button:has(svg.lucide-eye-off)');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
