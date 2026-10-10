import { test, expect } from '@playwright/test';

test.describe('AI Voice Booking Flow', () => {

  test('Customer AI Voice Booking -> Parse NLP -> Create Booking', async ({ page }) => {
    
    // 1. Login as Customer
    await page.goto('/login');
    await page.getByRole('button', { name: 'Customer' }).click();
    await page.getByRole('textbox', { name: 'Email / Username / Phone' }).fill('1234567890');
    
    await page.locator('input[type="password"]').fill('password123'); // Assume password is password123 or doesn't matter for mock
    
    // Intercept login to bypass actual DB check
    await page.route('**/api/auth/login*', async (route) => {
      await route.fulfill({ 
        status: 200, 
        contentType: 'application/json', 
        body: JSON.stringify({ 
          success: true, 
          token: 'mock-jwt', 
          user: { id: 'cust123', name: 'Demo User', role: 'customer', isProfileComplete: true } 
        }) 
      });
    });
    
    await page.getByRole('button', { name: 'Login' }).click();

    // 2. Go to New Booking section

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
