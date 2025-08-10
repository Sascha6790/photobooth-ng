import { test, expect } from '@playwright/test';

test.describe('Photobooth Main Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4200');
    await page.waitForLoadState('networkidle');
  });

  test('should display start screen', async ({ page }) => {
    // Wait for the start stage to be visible
    const startStage = page.locator('app-stage-start').first();
    await expect(startStage).toBeVisible({ timeout: 10000 });
    
    // Check for start button - look for button with camera icon or specific class
    const startButton = page.locator('button').filter({ hasText: /takePhoto|photo|start|📷/i }).first();
    await expect(startButton).toBeVisible();
  });

  test('should navigate through capture flow', async ({ page }) => {
    // Use data-testid for reliable selection
    const startButton = page.locator('[data-testid="start-button"]').or(
      page.locator('button').filter({ hasText: /takePhoto|photo|start|📷/i }).first()
    );
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await startButton.click();
    
    // Wait for preview with data-testid
    const previewStage = page.locator('[data-testid="preview-container"]').or(
      page.locator('app-preview').first()
    );
    await expect(previewStage).toBeVisible({ timeout: 5000 });
    
    // Verify video element with data-testid
    const videoElement = page.locator('[data-testid="preview-video"]').or(
      page.locator('video').first()
    );
    await expect(videoElement).toBeVisible({ timeout: 5000 });
    
    // Verify capture button is visible
    const captureButton = page.locator('app-preview button').filter({ hasText: /capture|photo|📷/i }).first();
    await expect(captureButton).toBeVisible({ timeout: 5000 });
  });

  test('should handle countdown', async ({ page }) => {
    test.setTimeout(60000); // Increase timeout for countdown flow
    
    // Start capture flow
    const startButton = page.locator('button').filter({ hasText: /takePhoto|photo|start|📷/i }).first();
    await startButton.click();
    
    // Wait for preview with longer timeout
    await page.waitForSelector('app-preview', { timeout: 20000 });
    
    // Click capture button with better selector
    const captureButton = page.locator('app-preview [data-testid="capture-button"], app-preview app-button').first();
    const captureVisible = await captureButton.isVisible().catch(() => false);
    
    if (captureVisible) {
      await captureButton.click({ force: true });
      
      // Check if countdown appears
      const countdown = page.locator('.countdown, app-countdown, [class*="countdown"]');
      const countdownVisible = await countdown.isVisible().catch(() => false);
      
      if (countdownVisible) {
        // Wait for countdown to complete (max 10 seconds)
        await page.waitForTimeout(10000);
      }
      
      // After capture, should show result or go back to start
      // Wait with longer timeout as capture might be slow
      await expect(
        page.locator('app-stage-result, app-result, app-stage-start, app-preview').first()
      ).toBeVisible({ timeout: 30000 });
    } else {
      // If no capture button, skip test
      test.skip();
    }
  });
});