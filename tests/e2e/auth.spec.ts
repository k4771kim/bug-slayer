import { test, expect } from '@playwright/test';

/**
 * E2E Test: Authentication Flow
 * Tests user registration and login
 */

test.describe('Authentication', () => {
  const timestamp = Date.now();
  const testUsername = `testuser_${timestamp}`;
  const testPassword = 'testpass123';

  test('should register a new user and login successfully', async ({ page }) => {
    // Navigate to register page
    await page.goto('/register');

    // Fill registration form
    await page.fill('input[name="username"]', testUsername);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Should redirect to class selection after successful registration
    await page.waitForURL('**/class-select', { timeout: 10000 });
    expect(page.url()).toContain('class-select');
  });

  test('should login with existing credentials', async ({ page }) => {
    // First create an account
    await page.goto('/register');
    await page.fill('input[name="username"]', `login_test_${timestamp}`);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/class-select');

    // Logout (if there's a logout button, otherwise just navigate away)
    await page.goto('/');

    // Now login
    await page.goto('/login');
    await page.fill('input[name="username"]', `login_test_${timestamp}`);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Should redirect to main menu or appropriate page
    await page.waitForURL('**/class-select', { timeout: 10000 });
    expect(page.url()).toContain('class-select');
  });

  test('should show error on invalid login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="username"]', 'nonexistentuser');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message (adjust selector based on actual implementation)
    await expect(page.locator('text=/error|invalid|failed/i')).toBeVisible({ timeout: 5000 });
  });
});
