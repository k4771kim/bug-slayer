import { test, expect } from '@playwright/test';

test.describe('Game Page', () => {
  test('should load game page', async ({ page }) => {
    await page.goto('/game');
    // Game page should render (even without auth, should show something)
    await expect(page).toHaveURL(/\/game/);
  });

  test('should render Phaser canvas', async ({ page }) => {
    await page.goto('/game');
    // Wait for canvas element (Phaser renders to canvas)
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });
  });
});
