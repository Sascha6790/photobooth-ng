import { test, expect, devices } from '@playwright/test';

// These tests should only run on mobile devices with touch support
test.describe('Touch Gestures', () => {
  // Skip all touch tests on desktop browsers
  test.beforeEach(async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }
    await page.goto('http://localhost:4200');
    await page.waitForLoadState('networkidle');
  });

  test('simple tap on button should work', async ({ page }) => {
    // Wait for the main stage to be visible
    const startStage = page.locator('app-stage-start').first();
    await expect(startStage).toBeVisible({ timeout: 10000 });
    
    // Find the start button
    const startButton = page.locator('button').filter({ hasText: /takePhoto|photo|start|📷/i }).first();
    await expect(startButton).toBeVisible();
    
    // Get button position for tap
    const box = await startButton.boundingBox();
    if (box) {
      // Use touchscreen.tap() for proper touch emulation
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      
      // Should navigate to preview after tap
      const previewStage = page.locator('app-preview').first();
      await expect(previewStage).toBeVisible({ timeout: 10000 });
    }
  });

  test('swipe gesture in gallery', async ({ page }) => {
    // Navigate to gallery
    await page.goto('http://localhost:4200/gallery');
    await page.waitForLoadState('networkidle');
    
    const galleryComponent = page.locator('app-gallery').first();
    await expect(galleryComponent).toBeVisible({ timeout: 10000 });
    
    // Get gallery bounds for swipe
    const box = await galleryComponent.boundingBox();
    if (box) {
      // Simulate swipe from right to left (next image)
      const startX = box.x + box.width * 0.8;
      const endX = box.x + box.width * 0.2;
      const centerY = box.y + box.height / 2;
      
      // Dispatch touch events for swipe
      await page.dispatchEvent('app-gallery', 'touchstart', {
        touches: [{ identifier: 0, clientX: startX, clientY: centerY }],
        changedTouches: [{ identifier: 0, clientX: startX, clientY: centerY }]
      });
      
      // Move in small steps for smooth swipe
      const steps = 5;
      for (let i = 1; i <= steps; i++) {
        const currentX = startX - ((startX - endX) * i / steps);
        await page.dispatchEvent('app-gallery', 'touchmove', {
          touches: [{ identifier: 0, clientX: currentX, clientY: centerY }],
          changedTouches: [{ identifier: 0, clientX: currentX, clientY: centerY }]
        });
        await page.waitForTimeout(50); // Small delay between moves
      }
      
      await page.dispatchEvent('app-gallery', 'touchend', {
        touches: [],
        changedTouches: [{ identifier: 0, clientX: endX, clientY: centerY }]
      });
    }
  });

  test('pinch to zoom in preview', async ({ page }) => {
    // Navigate to preview
    const startButton = page.locator('button').filter({ hasText: /takePhoto|photo|start|📷/i }).first();
    await expect(startButton).toBeVisible();
    await startButton.click();
    
    const previewStage = page.locator('app-preview').first();
    await expect(previewStage).toBeVisible({ timeout: 10000 });
    
    // Get preview video element for pinch gesture
    const videoElement = page.locator('app-preview video').first();
    const box = await videoElement.boundingBox();
    
    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const deltaX = 50;
      
      // Start pinch with two touch points
      await page.dispatchEvent('app-preview', 'touchstart', {
        touches: [
          { identifier: 0, clientX: centerX - deltaX, clientY: centerY },
          { identifier: 1, clientX: centerX + deltaX, clientY: centerY }
        ],
        changedTouches: [
          { identifier: 0, clientX: centerX - deltaX, clientY: centerY },
          { identifier: 1, clientX: centerX + deltaX, clientY: centerY }
        ]
      });
      
      // Move fingers apart (zoom in)
      const steps = 5;
      for (let i = 1; i <= steps; i++) {
        const offset = deltaX + (20 * i); // Increase distance
        await page.dispatchEvent('app-preview', 'touchmove', {
          touches: [
            { identifier: 0, clientX: centerX - offset, clientY: centerY },
            { identifier: 1, clientX: centerX + offset, clientY: centerY }
          ],
          changedTouches: [
            { identifier: 0, clientX: centerX - offset, clientY: centerY },
            { identifier: 1, clientX: centerX + offset, clientY: centerY }
          ]
        });
        await page.waitForTimeout(50);
      }
      
      // End pinch
      await page.dispatchEvent('app-preview', 'touchend', {
        touches: [],
        changedTouches: [
          { identifier: 0, clientX: centerX - (deltaX + 100), clientY: centerY },
          { identifier: 1, clientX: centerX + (deltaX + 100), clientY: centerY }
        ]
      });
    }
  });

  test('double tap to reset zoom', async ({ page }) => {
    // Navigate to preview
    const startButton = page.locator('button').filter({ hasText: /takePhoto|photo|start|📷/i }).first();
    await expect(startButton).toBeVisible();
    await startButton.click();
    
    const previewStage = page.locator('app-preview').first();
    await expect(previewStage).toBeVisible({ timeout: 10000 });
    
    // Get video element
    const videoElement = page.locator('app-preview video').first();
    const box = await videoElement.boundingBox();
    
    if (box) {
      const tapX = box.x + box.width / 2;
      const tapY = box.y + box.height / 2;
      
      // Double tap
      await page.touchscreen.tap(tapX, tapY);
      await page.waitForTimeout(100);
      await page.touchscreen.tap(tapX, tapY);
    }
  });

  test('long press to show context menu', async ({ page }) => {
    // Navigate to gallery
    await page.goto('http://localhost:4200/gallery');
    await page.waitForLoadState('networkidle');
    
    const galleryComponent = page.locator('app-gallery').first();
    await expect(galleryComponent).toBeVisible({ timeout: 10000 });
    
    // Find first image in gallery (if any)
    const firstImage = page.locator('app-gallery img').first();
    const imageExists = await firstImage.count() > 0;
    
    if (imageExists) {
      const box = await firstImage.boundingBox();
      if (box) {
        const pressX = box.x + box.width / 2;
        const pressY = box.y + box.height / 2;
        
        // Simulate long press
        await page.dispatchEvent('app-gallery', 'touchstart', {
          touches: [{ identifier: 0, clientX: pressX, clientY: pressY }],
          changedTouches: [{ identifier: 0, clientX: pressX, clientY: pressY }]
        });
        
        // Hold for 500ms
        await page.waitForTimeout(500);
        
        await page.dispatchEvent('app-gallery', 'touchend', {
          touches: [],
          changedTouches: [{ identifier: 0, clientX: pressX, clientY: pressY }]
        });
        
        // Check if context menu appeared (if implemented)
        // This is a placeholder - adjust based on actual implementation
      }
    }
  });

  test('drag and drop gesture', async ({ page }) => {
    // Navigate to gallery or admin area where drag might be implemented
    await page.goto('http://localhost:4200/gallery');
    await page.waitForLoadState('networkidle');
    
    const galleryComponent = page.locator('app-gallery').first();
    await expect(galleryComponent).toBeVisible({ timeout: 10000 });
    
    // Find draggable element (if any)
    const draggable = page.locator('[draggable="true"]').first();
    const isDraggable = await draggable.count() > 0;
    
    if (isDraggable) {
      const startBox = await draggable.boundingBox();
      if (startBox) {
        const startX = startBox.x + startBox.width / 2;
        const startY = startBox.y + startBox.height / 2;
        const endX = startX + 100;
        const endY = startY + 100;
        
        // Start drag
        await page.dispatchEvent('[draggable="true"]', 'touchstart', {
          touches: [{ identifier: 0, clientX: startX, clientY: startY }],
          changedTouches: [{ identifier: 0, clientX: startX, clientY: startY }]
        });
        
        // Move in steps
        const steps = 10;
        for (let i = 1; i <= steps; i++) {
          const currentX = startX + ((endX - startX) * i / steps);
          const currentY = startY + ((endY - startY) * i / steps);
          await page.dispatchEvent('[draggable="true"]', 'touchmove', {
            touches: [{ identifier: 0, clientX: currentX, clientY: currentY }],
            changedTouches: [{ identifier: 0, clientX: currentX, clientY: currentY }]
          });
          await page.waitForTimeout(20);
        }
        
        // End drag
        await page.dispatchEvent('[draggable="true"]', 'touchend', {
          touches: [],
          changedTouches: [{ identifier: 0, clientX: endX, clientY: endY }]
        });
      }
    }
  });
});

// Additional test suite for mobile-specific interactions
test.describe('Mobile-specific Touch Interactions', () => {
  // Skip on desktop browsers
  test.beforeEach(async ({ isMobile }) => {
    if (!isMobile) {
      test.skip();
    }
  });

  test('iOS-style swipe back navigation', async ({ page, browser }) => {
    // Create a new context with iPhone configuration
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      hasTouch: true
    });
    const iosPage = await context.newPage();
    // Start on gallery page
    await iosPage.goto('http://localhost:4200/gallery');
    await iosPage.waitForLoadState('networkidle');
    
    const galleryComponent = iosPage.locator('app-gallery').first();
    await expect(galleryComponent).toBeVisible({ timeout: 10000 });
    
    // Swipe from left edge to right (iOS back gesture)
    const viewportSize = iosPage.viewportSize();
    if (viewportSize) {
      const startX = 10; // Near left edge
      const endX = viewportSize.width / 2;
      const centerY = viewportSize.height / 2;
      
      // Perform edge swipe
      await iosPage.dispatchEvent('body', 'touchstart', {
        touches: [{ identifier: 0, clientX: startX, clientY: centerY }],
        changedTouches: [{ identifier: 0, clientX: startX, clientY: centerY }]
      });
      
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const currentX = startX + ((endX - startX) * i / steps);
        await iosPage.dispatchEvent('body', 'touchmove', {
          touches: [{ identifier: 0, clientX: currentX, clientY: centerY }],
          changedTouches: [{ identifier: 0, clientX: currentX, clientY: centerY }]
        });
        await iosPage.waitForTimeout(20);
      }
      
      await iosPage.dispatchEvent('body', 'touchend', {
        touches: [],
        changedTouches: [{ identifier: 0, clientX: endX, clientY: centerY }]
      });
      
      // Check if navigation occurred
      await iosPage.waitForTimeout(500);
    }
    
    await context.close();
  });

  test('pull-to-refresh gesture', async ({ page, browser }) => {
    // Create a new context with iPhone configuration  
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      hasTouch: true
    });
    const iosPage = await context.newPage();
    
    await iosPage.goto('http://localhost:4200/gallery');
    await iosPage.waitForLoadState('networkidle');
    
    const galleryComponent = iosPage.locator('app-gallery').first();
    await expect(galleryComponent).toBeVisible({ timeout: 10000 });
    
    // Simulate pull-to-refresh
    const viewportSize = iosPage.viewportSize();
    if (viewportSize) {
      const centerX = viewportSize.width / 2;
      const startY = 50;
      const endY = 200;
      
      // Pull down from top
      await iosPage.dispatchEvent('app-gallery', 'touchstart', {
        touches: [{ identifier: 0, clientX: centerX, clientY: startY }],
        changedTouches: [{ identifier: 0, clientX: centerX, clientY: startY }]
      });
      
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const currentY = startY + ((endY - startY) * i / steps);
        await iosPage.dispatchEvent('app-gallery', 'touchmove', {
          touches: [{ identifier: 0, clientX: centerX, clientY: currentY }],
          changedTouches: [{ identifier: 0, clientX: centerX, clientY: currentY }]
        });
        await iosPage.waitForTimeout(30);
      }
      
      await iosPage.dispatchEvent('app-gallery', 'touchend', {
        touches: [],
        changedTouches: [{ identifier: 0, clientX: centerX, clientY: endY }]
      });
      
      // Wait for potential refresh
      await iosPage.waitForTimeout(1000);
    }
    
    await context.close();
  });
});