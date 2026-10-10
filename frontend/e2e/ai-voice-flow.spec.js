import { test, expect } from '@playwright/test';

test.describe('AI Voice Booking Flow', () => {

  test('Customer AI Voice Booking -> Parse NLP -> Create Booking', async ({ page }) => {
    
    // 1. Login as Customer
    await page.goto('/login');
    await page.getByRole('button', { name: 'Customer' }).click();
    await page.getByRole('textbox', { name: 'Email / Username / Phone' }).fill('1234567890');
    
    // Intercept login to bypass actual Fast2SMS OTP creation
    await page.route('**/api/auth/phone-login*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'OTP sent' }) });
    });
    await page.getByRole('button', { name: 'Sign In' }).click();
    
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

    // 2. Go to New Booking section
    await page.waitForURL('**/customer/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await page.getByRole('link', { name: 'Book Tempo' }).click();

    // 3. Open the AI Voice Booking Modal
    await page.getByTestId('ai-voice-booking-btn').click();
    await expect(page.getByText('AI Voice Booking Agent')).toBeVisible();

    // 4. Fill in the "Voice Transcript / Manual Prompt" as if Speech Recognition captured it
    const nlpPrompt = "I need a large tempo tomorrow at 6 PM to move some furniture from Shivaji Nagar to Hinjewadi.";
    await page.getByTestId('voice-manual-input').fill(nlpPrompt);

    // 5. Submit to the Groq LLM API
    // Intercept the API call because the fake JWT token will be rejected by the real backend
    await page.route('**/api/bookings/ai-booking', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          booking: { id: 999 }
        })
      });
    });

    await page.getByRole('button', { name: 'Instant Book with AI' }).click();

    // 6. Wait for the success response
    // The UI redirects to the tracking page for this specific booking
    await page.waitForURL('**/tracking/*');
    await expect(page.getByRole('heading', { name: /Track Ride/i })).toBeVisible({ timeout: 15000 });
    
    // Check that we got redirected to the tracking interface and the mock booking ID is displayed
    await expect(page.getByText('Booking ID: 999')).toBeVisible();
  });

});
