import { test, expect } from '@playwright/test';

/**
 * E2E Test: Authentication Flow
 * Tests user registration and login
 */

test.describe('Authentication', () => {
  const timestamp = Date.now();
  const testPassword = 'TestPass12345'; // Must be 8+ chars

  test('should register a new user and redirect to /game', async ({ page }) => {
    const testEmail = `test-${timestamp}@example.com`;

    // Navigate to register page
    await page.goto('/register');

    // Fill registration form - ALL 4 fields required
    await page.fill('input[name="displayName"]', `TestUser${timestamp}`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to /game after successful registration
    await page.waitForURL('**/game', { timeout: 10000 });
    expect(page.url()).toContain('/game');
  });

  test('should login with existing credentials', async ({ page }) => {
    const loginEmail = `login-test-${timestamp}@example.com`;
    const loginDisplayName = `LoginUser${timestamp}`;

    // First create an account via API (faster than UI)
    const registerResponse = await page.request.post('http://localhost:3001/api/auth/register', {
      data: {
        email: loginEmail,
        password: testPassword,
        displayName: loginDisplayName,
      },
    });
    expect(registerResponse.ok()).toBeTruthy();

    // Now test UI login
    await page.goto('/login');
    await page.fill('input[name="email"]', loginEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Should redirect to /game after successful login
    await page.waitForURL('**/game', { timeout: 10000 });
    expect(page.url()).toContain('/game');
  });

  test('should show error on invalid login', async ({ page }) => {
    await page.goto('/login');

    // Fill with non-existent credentials
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');

    // Should show error message in red error div
    await expect(page.locator('div.bg-red-900')).toBeVisible({ timeout: 5000 });
  });

  test('should show error on password mismatch during registration', async ({ page }) => {
    const testEmail = `mismatch-${timestamp}@example.com`;

    await page.goto('/register');

    // Fill form with mismatched passwords
    await page.fill('input[name="displayName"]', `MismatchUser${timestamp}`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123');

    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('div.bg-red-900')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/password.*do not match/i')).toBeVisible();
  });

  test('should show error on short password during registration', async ({ page }) => {
    const testEmail = `short-${timestamp}@example.com`;

    await page.goto('/register');

    // Fill form with short password
    await page.fill('input[name="displayName"]', `ShortUser${timestamp}`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'short');
    await page.fill('input[name="confirmPassword"]', 'short');

    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('div.bg-red-900')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/password.*at least 8 characters/i')).toBeVisible();
  });
});
