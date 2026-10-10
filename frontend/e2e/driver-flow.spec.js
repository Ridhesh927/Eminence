import { test, expect } from '@playwright/test';

test.describe('Driver Portal E2E Flow', () => {

  test('Driver Login -> Toggle Duty -> Check Heatmap', async ({ page }) => {
    // 1. Driver Login (TC-W-AUTH-04)
    await page.goto('/login');
    
    await page.getByRole('button', { name: 'Driver' }).click();
    await page.getByRole('textbox', { name: 'Email / Username / Phone' }).fill('9876543210');
    // Intercept the initial login request to bypass real Firebase SMS sending which causes flakiness
    await page.route('**/api/auth/phone-login*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OTP sent' })
      });
    });
    
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Fill OTP (using standard bypass '123456')
    const otpInputs = page.locator('input[type="text"]');
    await otpInputs.nth(0).fill('1');
    await otpInputs.nth(1).fill('2');
    await otpInputs.nth(2).fill('3');
    await otpInputs.nth(3).fill('4');
    await otpInputs.nth(4).fill('5');
    await otpInputs.nth(5).fill('6');
    // Intercept OTP Verification to bypass dynamic backend OTPs
    await page.route('**/api/auth/phone-verify*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'fake-jwt-token',
          user: { id: 2, phone: '9876543210', name: 'Test Driver', role: 'driver', isProfileComplete: true }
        })
      });
    });
    await page.getByRole('button', { name: 'Verify & Continue' }).click();

    await expect(page).toHaveURL(/\/driver\/dashboard/);

    // 2. Check Duty Toggle (TC-W-DRV-02)
    // Assuming driver starts ONLINE or OFFLINE, we can just check if the button exists and is clickable
    const dutyButton = page.getByRole('button', { name: /ONLINE|OFFLINE/ });
    await expect(dutyButton).toBeVisible();
    await dutyButton.click(); // Toggle it

    // 3. Demand Surge Heatmap (TC-W-DRV-03)
    // We must set up the mock BEFORE clicking the tab, otherwise the real request fires first!
    await page.route('**/api/drivers/heatmap*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            hotspots: [
              { id: 1, name: 'Swargate Bus Stand', surgeMultiplier: 1.5, intensity: 'High' }
            ]
          }
        })
      });
    });
    
    await page.getByRole('button', { name: /Heatmap/i }).click();

    // Verify faked heatmap data is rendered
    await expect(page.getByText('Swargate Bus Stand')).toBeVisible();

    // 4. Earnings API (TC-W-DRV-05)
    await page.getByRole('button', { name: /earnings/i }).click();
    await expect(page.getByText("Today's Earnings")).toBeVisible();
  });
});
