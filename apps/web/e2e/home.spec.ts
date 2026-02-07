import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Bug Slayer/i);
  });

  test('should have navigation to login', async ({ page }) => {
    await page.goto('/');
    const loginLink = page.getByRole('link', { name: /login|로그인|sign in/i });
    await expect(loginLink).toBeVisible();
  });
});
