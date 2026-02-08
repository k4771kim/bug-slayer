import { test, expect } from '@playwright/test';

/**
 * E2E Test: Battle Flow
 * Tests class selection and Chapter 1 battle completion
 */

test.describe('Battle System', () => {
  test.beforeEach(async ({ page }) => {
    // Create a test account and login
    const timestamp = Date.now();
    await page.goto('/register');
    await page.fill('input[name="username"]', `battle_test_${timestamp}`);
    await page.fill('input[name="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/class-select');
  });

  test('should complete a battle with Debugger class', async ({ page }) => {
    // Select Debugger class
    await page.click('[data-class="debugger"], button:has-text("Debugger")');

    // Wait for battle scene to load (canvas should appear)
    await page.waitForSelector('canvas', { timeout: 15000 });

    // Wait a bit for scene initialization
    await page.waitForTimeout(2000);

    // Click attack button multiple times to defeat enemy
    // Adjust selector based on actual implementation
    for (let i = 0; i < 10; i++) {
      const attackBtn = page.locator('[data-action="attack"], button:has-text("Attack")').first();

      // Check if battle is still ongoing
      const victoryVisible = await page.locator('text=Victory').isVisible().catch(() => false);
      if (victoryVisible) break;

      await attackBtn.click().catch(() => {});
      await page.waitForTimeout(1500); // Wait for turn processing
    }

    // Victory screen should appear
    await expect(page.locator('text=Victory')).toBeVisible({ timeout: 30000 });
  });

  test('should use skill in battle', async ({ page }) => {
    await page.click('[data-class="debugger"], button:has-text("Debugger")');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Click skill button
    const skillBtn = page.locator('[data-action="skill"], button:has-text("Skill")').first();
    await skillBtn.click();

    // Select first skill (if skill selection UI appears)
    const firstSkill = page.locator('[data-skill-index="0"], .skill-option').first();
    if (await firstSkill.isVisible().catch(() => false)) {
      await firstSkill.click();
    }

    // Battle should continue (no errors)
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('game');
  });

  test('should use Focus action', async ({ page }) => {
    await page.click('[data-class="debugger"], button:has-text("Debugger")');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Click Focus button
    const focusBtn = page.locator('[data-action="focus"], button:has-text("Focus")').first();
    await focusBtn.click();

    // Turn should process successfully
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('game');
  });
});
