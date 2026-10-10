import { test, expect } from '@playwright/test';

test.describe('Eminence Complete E2E Flow', () => {

  test('Customer Login -> Book Vehicle -> Intercept Map API -> Verify Summary -> Check Invoice', async ({ page }) => {
    // ==========================================
    // 1. MOCK THE GOOGLE MAPS API (Intercept)
    // ==========================================
    // When the frontend tries to call the distance API, we fake it!
    await page.route('**/api/maps/distance*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          distance: 12.5, // 12.5 km
          duration: 35, // 35 minutes
          surgeMultiplier: 1.0
        })
      });
    });

    // ==========================================
    // 2. AUTHENTICATION (TC-W-AUTH-01)
    // ==========================================
    await page.goto('/login');
    await expect(page).toHaveTitle(/Eminence/);

    // Enter phone
    await page.getByRole('button', { name: 'Customer' }).click();
    await page.getByRole('textbox', { name: 'Email / Username / Phone' }).fill('1234567890');
    // Intercept the initial login request to bypass real Firebase SMS sending which causes flakiness
    await page.route('**/api/auth/phone-login*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OTP sent' })
      });
    });

    await page.getByRole('button', { name: 'Sign In' }).click();

    // The app expects OTP. Let's enter the universal bypass or standard test OTP '123456'
    // Since OTP inputs are split into 6 boxes, we fill them individually
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
          user: { id: 1, phone: '1234567890', name: 'Demo User', role: 'customer', isProfileComplete: true }
        })
      });
    });
    await page.getByRole('button', { name: 'Verify & Continue' }).click();

    // Verify successful login
    await expect(page).toHaveURL(/\/customer\/dashboard/);
    await expect(page.getByText('Demo User')).toBeVisible();

    // ==========================================
    // 3. BOOKING FLOW (TC-W-BOOK-01)
    // ==========================================
    page.on('console', msg => {
      console.log('BROWSER CONSOLE:', msg.text());
    });

    // Intercept Booking APIs because our fake JWT token will be rejected by the real backend
    await page.route('**/api/bookings**', async (route) => {
      console.log(`[Mock] Intercepted ${route.request().method()} ${route.request().url()}`);
      const requestHeaders = route.request().headers();
      const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': requestHeaders.origin || 'http://localhost:5173',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': requestHeaders['access-control-request-headers'] || 'Content-Type, x-xsrf-token, Authorization, Accept',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      };

      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          headers: corsHeaders,
          body: JSON.stringify({ success: true, booking: { id: 'BOOK-999' } })
        });
      } else if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            bookings: [
              {
                id: 'BOOK-999',
                status: 'completed',
                createdAt: new Date().toISOString(),
                pickupAddress: 'Swargate',
                dropAddress: 'Viman Nagar',
                estimatedFare: 350
              }
            ]
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.getByRole('link', { name: 'Book Now' }).first().click();

    // Step 1: Locations
    await page.getByRole('textbox', { name: /pickup location/i }).fill('Swargate, Pune');
    await page.getByRole('textbox', { name: /drop location/i }).fill('Viman Nagar, Pune');
    await page.locator('input[type="date"]').fill('2026-10-15');
    await page.locator('input[type="time"]').fill('10:00');
    await page.getByRole('button', { name: 'Continue to Vehicle & Goods' }).click();

    // Step 2: Vehicle & Goods
    await page.getByText('small', { exact: true }).click();
    await page.locator('input[name="weight"]').fill('200'); // 200 kg
    await page.locator('input[name="goodsType"]').fill('Electronics');
    await page.getByRole('button', { name: 'Continue to Payment' }).click();

    // Step 3: Summary & Verify Faked Distance
    // We expect the distance to be calculated and summary to be visible.
    await expect(page.getByRole('heading', { name: /Confirm & Pay/i })).toBeVisible({ timeout: 10000 });
    
    // Check ESG Emissions calculation (the subscript ₂ makes exact match tricky, so we use a regex)
    await expect(page.getByText(/CO₂/i)).toBeVisible();

    // Complete Booking
    await page.getByRole('textbox', { name: /mobile number/i }).fill('9876543210');
    await page.getByText('Pay to Driver (Cash)').click();
    await page.getByRole('button', { name: 'Confirm Booking' }).click();
    await expect(page).toHaveURL(/\/tracking/); // Redirects to tracking

    // ==========================================
    // 4. VERIFY CUSTOMER DASHBOARD STATS
    // ==========================================
    await page.getByRole('link', { name: 'Dashboard' }).click();
    // Ensure that it's fetching stats from the API
    await expect(page.getByText('Recent Bookings')).toBeVisible();
    await expect(page.getByText('No bookings yet')).toBeHidden();

    // ==========================================
    // 5. TEST PDF INVOICE DOWNLOAD
    // ==========================================
    await page.getByRole('button', { name: /invoices/i }).click();
    
    // Set up download interception
    const downloadPromise = page.waitForEvent('download');
    
    // Click the first download button available
    await page.getByRole('button', { name: 'Download PDF' }).first().click();
    
    const download = await downloadPromise;
    // Verify file name format
    expect(download.suggestedFilename()).toMatch(/INV-.*\.pdf/);
  });
});
