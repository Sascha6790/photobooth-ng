import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('should work on mobile (iPhone SE)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:4200');
    await page.waitForLoadState('networkidle');
    
    // Check if main elements are visible and accessible
    const startStage = page.locator('app-stage-start').first();
    await expect(startStage).toBeVisible({ timeout: 10000 });
    
    // Check if buttons are large enough for mobile
    const startButton = page.locator('button').filter({ hasText: /takePhoto|photo|start|📷/i }).first();
    await expect(startButton).toBeVisible();
    
    // Get button size
    const buttonBox = await startButton.boundingBox();
    if (buttonBox) {
      // Button should be at least 44x44 pixels (iOS HIG minimum)
      expect(buttonBox.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('should work on tablet (iPad)', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:4200');
    await page.waitForLoadState('networkidle');
    
    // Check if UI adapts
    const startStage = page.locator('app-stage-start').first();
    await expect(startStage).toBeVisible({ timeout: 10000 });
    
    const startButton = page.locator('button').filter({ hasText: /takePhoto|photo|start|📷/i }).first();
    await expect(startButton).toBeVisible();
  });

  test('should work on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:4200');
    await page.waitForLoadState('networkidle');
    
    // Check if UI elements are present
    const startStage = page.locator('app-stage-start').first();
    await expect(startStage).toBeVisible({ timeout: 10000 });
    
    const startButton = page.locator('button').filter({ hasText: /takePhoto|photo|start|📷/i }).first();
    await expect(startButton).toBeVisible();
  });

  test('should handle orientation change', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:4200');
    await page.waitForLoadState('networkidle');
    
    const startStage = page.locator('app-stage-start').first();
    await expect(startStage).toBeVisible({ timeout: 10000 });
    
    // Change to landscape
    await page.setViewportSize({ width: 812, height: 375 });
    await page.waitForTimeout(500); // Wait for layout adjustment
    
    // UI should still be functional
    await expect(startStage).toBeVisible();
    
    const startButton = page.locator('button').filter({ hasText: /takePhoto|photo|start|📷/i }).first();
    await expect(startButton).toBeVisible();
  });

  test('mobile navigation should work', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:4200');
    await page.waitForLoadState('networkidle');
    
    // Try to navigate to gallery
    await page.goto('http://localhost:4200/gallery');
    await page.waitForLoadState('networkidle');
    
    const galleryComponent = page.locator('app-gallery').first();
    await expect(galleryComponent).toBeVisible({ timeout: 10000 });
    
    // Check if back navigation works
    await page.goBack();
    const startStage = page.locator('app-stage-start').first();
    await expect(startStage).toBeVisible({ timeout: 10000 });
  });

  test('touch interactions should work', async ({ page, browserName, isMobile }) => {
    // Skip this test on desktop browsers - touch should only be tested on mobile
    if (!isMobile) {
      test.skip();
      return;
    }
    
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:4200');
    await page.waitForLoadState('networkidle');
    
    // Test touch/tap on button
    const startButton = page.locator('button').filter({ hasText: /takePhoto|photo|start|📷/i }).first();
    await expect(startButton).toBeVisible();
    
    // Use click instead of tap for compatibility
    await startButton.click();
    
    // Should navigate to preview
    const previewStage = page.locator('app-preview').first();
    await expect(previewStage).toBeVisible({ timeout: 10000 });
  });
});