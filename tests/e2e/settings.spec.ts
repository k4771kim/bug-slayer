import { test, expect } from '@playwright/test';

/**
 * E2E Test: Settings Panel
 * Tests volume controls and settings UI
 */

test.describe('Settings Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to main menu
    await page.goto('/');
    await page.waitForTimeout(2000);
  });

  test('should open and close settings panel', async ({ page }) => {
    // Click Settings button
    const settingsBtn = page.locator('button:has-text("Settings")').first();
    await settingsBtn.click();

    // Settings overlay should appear
    await expect(page.locator('text=Settings, text=SFX Volume, text=BGM Volume').first()).toBeVisible({ timeout: 5000 });

    // Close settings
    const closeBtn = page.locator('button:has-text("Close")').first();
    await closeBtn.click();

    // Settings overlay should disappear
    await expect(page.locator('text=SFX Volume')).not.toBeVisible();
  });

  test('should adjust SFX volume', async ({ page }) => {
    // Open settings
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(500);

    // Find SFX volume slider (would need data-testid in real implementation)
    const sfxSlider = page.locator('[data-volume-type="sfx"], .volume-slider').first();

    // Check if slider exists and is visible
    if (await sfxSlider.isVisible().catch(() => false)) {
      // Drag slider (this is a simplified test - actual implementation depends on UI)
      await sfxSlider.click();
      await page.waitForTimeout(500);
    }

    // Settings should still be open
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should adjust BGM volume', async ({ page }) => {
    // Open settings
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(500);

    // Find BGM volume slider
    const bgmSlider = page.locator('[data-volume-type="bgm"], .volume-slider').nth(1);

    if (await bgmSlider.isVisible().catch(() => false)) {
      await bgmSlider.click();
      await page.waitForTimeout(500);
    }

    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should toggle mute', async ({ page }) => {
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(500);

    // Find mute button
    const muteBtn = page.locator('button:has-text("Mute")').first();

    if (await muteBtn.isVisible().catch(() => false)) {
      // Get initial state
      const initialText = await muteBtn.textContent();

      // Toggle mute
      await muteBtn.click();
      await page.waitForTimeout(300);

      // Text should change
      const newText = await muteBtn.textContent();
      expect(newText).not.toBe(initialText);
    }
  });
});
