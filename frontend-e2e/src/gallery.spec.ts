import { test, expect } from '@playwright/test';

test.describe('Gallery', () => {
  test('should navigate to gallery', async ({ page }) => {
    // Navigate directly to gallery
    await page.goto('http://localhost:4200/gallery');
    await page.waitForLoadState('networkidle');
    
    // Check if gallery component is displayed
    const galleryComponent = page.locator('app-gallery').first();
    await expect(galleryComponent).toBeVisible({ timeout: 10000 });
    
    // Check for any content in the gallery component
    // More flexible selectors for different possible gallery implementations
    const galleryContent = page.locator('app-gallery').first();
    const contentText = await galleryContent.textContent();
    
    // Gallery should have some content (either images or empty message)
    expect(contentText).toBeTruthy();
    
    // Alternative: Check if gallery has any child elements
    const childElements = await galleryContent.locator('> *').count();
    expect(childElements).toBeGreaterThan(0);
  });

  test('should display gallery items or empty state', async ({ page }) => {
    await page.goto('http://localhost:4200/gallery');
    await page.waitForLoadState('networkidle');
    
    // Wait for gallery to load
    await page.waitForTimeout(2000);
    
    // Check for images
    const galleryItems = page.locator('img[src*="gallery"], img[src*="photo"], .gallery-item img');
    const itemCount = await galleryItems.count();
    
    if (itemCount > 0) {
      // If items exist, at least one should be visible
      await expect(galleryItems.first()).toBeVisible({ timeout: 5000 });
      
      // Check if images have valid src
      const firstImageSrc = await galleryItems.first().getAttribute('src');
      expect(firstImageSrc).toBeTruthy();
    } else {
      // If no items, expect empty state
      const emptyState = page.locator('.empty-state, .no-images, [class*="empty"]').first();
      await expect(emptyState).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate back from gallery', async ({ page }) => {
    // Start from main page
    await page.goto('http://localhost:4200');
    await page.waitForLoadState('networkidle');
    
    // Navigate to gallery
    await page.goto('http://localhost:4200/gallery');
    await page.waitForLoadState('networkidle');
    
    // Look for back button or navigation
    const backButton = page.locator('button, a').filter({ hasText: /back|zurück|home|start/i }).first();
    const backButtonVisible = await backButton.isVisible().catch(() => false);
    
    if (backButtonVisible) {
      await backButton.click();
      
      // Should be back at start
      const startStage = page.locator('app-stage-start').first();
      await expect(startStage).toBeVisible({ timeout: 5000 });
    } else {
      // Use browser back
      await page.goBack();
      
      // Verify we're back at the main page
      await expect(page).toHaveURL('http://localhost:4200');
    }
  });

  test('should handle gallery pagination if present', async ({ page }) => {
    await page.goto('http://localhost:4200/gallery');
    await page.waitForLoadState('networkidle');
    
    // Check if pagination exists
    const pagination = page.locator('.pagination, [class*="paginator"], nav[aria-label*="pagination"]');
    const paginationVisible = await pagination.isVisible().catch(() => false);
    
    if (paginationVisible) {
      // Check for next/previous buttons
      const nextButton = page.locator('button, a').filter({ hasText: /next|weiter|›|>/i });
      const prevButton = page.locator('button, a').filter({ hasText: /prev|zurück|‹|</i });
      
      // At least one navigation element should exist
      const hasNavigation = 
        await nextButton.isVisible().catch(() => false) || 
        await prevButton.isVisible().catch(() => false);
      
      expect(hasNavigation).toBeTruthy();
    }
  });
});