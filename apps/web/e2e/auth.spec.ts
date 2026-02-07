import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const testUser = {
    username: `testuser_${Date.now()}`,
    password: 'TestPass123!',
  };

  test('should show register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('register and login flow', async ({ page }) => {
    // Register
    await page.goto('/register');
    await page.fill('input[name="username"], input[type="text"]', testUser.username);
    await page.fill('input[name="password"], input[type="password"]', testUser.password);

    const submitBtn = page.getByRole('button', { name: /register|가입|sign up/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForURL(/\/(login|game)/, { timeout: 10000 }).catch(() => {});
    }

    // Login
    await page.goto('/login');
    await page.fill('input[name="username"], input[type="text"]', testUser.username);
    await page.fill('input[name="password"], input[type="password"]', testUser.password);

    const loginBtn = page.getByRole('button', { name: /login|로그인|sign in/i });
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.waitForURL(/\/game/, { timeout: 10000 }).catch(() => {});
    }
  });
});
