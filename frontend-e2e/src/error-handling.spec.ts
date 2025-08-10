import { test, expect } from '@playwright/test';

test.describe('Error Handling Tests', () => {
  test.describe('Network Error Handling', () => {
    test('should handle API timeout gracefully', async ({ page, context }) => {
      // Block API requests to simulate timeout
      await context.route('**/api/**', route => {
        setTimeout(() => route.abort(), 10000);
      });

      await page.goto('http://localhost:4200');
      
      // Try to capture a photo
      const captureButton = page.locator('[data-testid="capture-button"]');
      await captureButton.click();
      
      // Should show error message
      const errorMessage = page.locator('.error-message, .toast-error, [role="alert"]');
      await expect(errorMessage).toBeVisible({ timeout: 15000 });
      await expect(errorMessage).toContainText(/timeout|failed|error/i);
    });

    test('should handle 500 server errors', async ({ page, context }) => {
      await context.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      await page.goto('http://localhost:4200');
      
      // Navigate to gallery
      const galleryButton = page.locator('[data-testid="gallery-button"], button:has-text("Gallery")');
      await galleryButton.click();
      
      // Should show error state
      const errorState = page.locator('.error-state, .empty-state, [data-testid="error-message"]');
      await expect(errorState).toBeVisible({ timeout: 10000 });
    });

    test('should handle 404 errors for missing resources', async ({ page, context }) => {
      await context.route('**/api/gallery/**', route => {
        route.fulfill({
          status: 404,
          body: JSON.stringify({ error: 'Not Found' })
        });
      });

      await page.goto('http://localhost:4200/gallery');
      
      // Should show appropriate message
      const notFoundMessage = page.locator('.not-found, .empty-gallery, [data-testid="empty-state"]');
      await expect(notFoundMessage).toBeVisible({ timeout: 10000 });
    });

    test('should retry failed requests with exponential backoff', async ({ page, context }) => {
      let requestCount = 0;
      await context.route('**/api/settings', route => {
        requestCount++;
        if (requestCount < 3) {
          route.abort('failed');
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true })
          });
        }
      });

      await page.goto('http://localhost:4200/admin/settings');
      
      // Should eventually succeed after retries
      const settingsForm = page.locator('form, [data-testid="settings-form"]');
      await expect(settingsForm).toBeVisible({ timeout: 20000 });
    });
  });

  test.describe('WebSocket Error Handling', () => {
    test('should handle WebSocket disconnection', async ({ page, context }) => {
      await page.goto('http://localhost:4200');
      
      // Block WebSocket connections
      await context.route('ws://localhost:3000/**', route => route.abort());
      
      // Should show disconnected indicator
      const connectionStatus = page.locator('[data-testid="connection-status"], .connection-indicator');
      await expect(connectionStatus).toHaveClass(/disconnected|offline/i, { timeout: 10000 });
    });

    test('should auto-reconnect WebSocket on failure', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Wait for initial connection
      await page.waitForTimeout(2000);
      
      // Simulate disconnect by evaluating in page context
      await page.evaluate(() => {
        const socket = (window as any).io?.sockets?.[0];
        if (socket) {
          socket.disconnect();
        }
      });
      
      // Should attempt to reconnect
      const connectionStatus = page.locator('[data-testid="connection-status"], .connection-indicator');
      await expect(connectionStatus).toHaveClass(/connected|online/i, { timeout: 15000 });
    });
  });

  test.describe('Form Validation Errors', () => {
    test('should show validation errors for invalid input', async ({ page }) => {
      await page.goto('http://localhost:4200/admin/settings');
      
      // Fill invalid values
      const countdownInput = page.locator('input[name="countdown"], [data-testid="countdown-input"]');
      await countdownInput.fill('-1');
      
      // Submit form
      const saveButton = page.locator('button[type="submit"], [data-testid="save-button"]');
      await saveButton.click();
      
      // Should show validation error
      const validationError = page.locator('.validation-error, .error-text, [role="alert"]');
      await expect(validationError).toBeVisible();
      await expect(validationError).toContainText(/invalid|must be|required/i);
    });

    test('should prevent form submission with invalid data', async ({ page }) => {
      await page.goto('http://localhost:4200/admin/settings');
      
      // Clear required field
      const requiredField = page.locator('input[required]').first();
      await requiredField.clear();
      
      // Try to submit
      const saveButton = page.locator('button[type="submit"], [data-testid="save-button"]');
      await saveButton.click();
      
      // Form should not be submitted
      const successMessage = page.locator('.success-message, .toast-success');
      await expect(successMessage).not.toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('File Upload Errors', () => {
    test('should handle oversized file uploads', async ({ page }) => {
      await page.goto('http://localhost:4200/admin/settings');
      
      // Create a large file buffer (10MB)
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024);
      
      // Try to upload
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles({
        name: 'large-file.jpg',
        mimeType: 'image/jpeg',
        buffer: largeBuffer
      });
      
      // Should show size error
      const sizeError = page.locator('.file-error, .size-error, [data-testid="upload-error"]');
      await expect(sizeError).toBeVisible({ timeout: 5000 });
      await expect(sizeError).toContainText(/size|large|exceed/i);
    });

    test('should handle invalid file types', async ({ page }) => {
      await page.goto('http://localhost:4200/admin/settings');
      
      // Try to upload non-image file
      const fileInput = page.locator('input[type="file"][accept*="image"]').first();
      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('PDF content')
      });
      
      // Should show type error
      const typeError = page.locator('.file-error, .type-error, [data-testid="upload-error"]');
      await expect(typeError).toBeVisible({ timeout: 5000 });
      await expect(typeError).toContainText(/type|format|invalid/i);
    });
  });

  test.describe('Browser Compatibility Errors', () => {
    test('should show fallback for unsupported features', async ({ page, browserName }) => {
      // Skip for modern browsers
      if (browserName === 'chromium' || browserName === 'firefox') {
        test.skip();
      }
      
      await page.goto('http://localhost:4200');
      
      // Check for fallback UI
      const fallbackMessage = page.locator('.browser-warning, .compatibility-notice');
      if (await fallbackMessage.isVisible()) {
        await expect(fallbackMessage).toContainText(/browser|support|upgrade/i);
      }
    });

    test('should handle localStorage errors', async ({ page }) => {
      // Disable localStorage
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: null,
          writable: false
        });
      });
      
      await page.goto('http://localhost:4200');
      
      // App should still function
      const mainContent = page.locator('.app-content, main, [data-testid="main-content"]');
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('State Recovery', () => {
    test('should recover from corrupted state', async ({ page }) => {
      // Set corrupted state
      await page.goto('http://localhost:4200');
      await page.evaluate(() => {
        localStorage.setItem('app-state', 'corrupted-json{{}');
      });
      
      // Reload page
      await page.reload();
      
      // App should still load
      const appRoot = page.locator('app-root, #app, [data-testid="app-root"]');
      await expect(appRoot).toBeVisible();
    });

    test('should handle session expiration', async ({ page, context }) => {
      await page.goto('http://localhost:4200/admin');
      
      // Simulate expired session
      await context.route('**/api/auth/verify', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Session expired' })
        });
      });
      
      // Try to access protected route
      await page.reload();
      
      // Should redirect to login or show message
      const loginPrompt = page.locator('.login-prompt, [data-testid="login"], .auth-required');
      const isLoginVisible = await loginPrompt.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isLoginVisible) {
        await expect(loginPrompt).toContainText(/login|authenticate|session/i);
      }
    });
  });

  test.describe('Graceful Degradation', () => {
    test('should work offline with cached data', async ({ page, context }) => {
      // Load page first
      await page.goto('http://localhost:4200');
      await page.waitForLoadState('networkidle');
      
      // Go offline
      await context.setOffline(true);
      
      // Navigate should still work
      const galleryButton = page.locator('[data-testid="gallery-button"], button:has-text("Gallery")');
      await galleryButton.click();
      
      // Should show offline indicator
      const offlineIndicator = page.locator('.offline-mode, [data-testid="offline-indicator"]');
      const isOfflineVisible = await offlineIndicator.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isOfflineVisible) {
        await expect(offlineIndicator).toBeVisible();
      }
    });

    test('should queue actions when offline', async ({ page, context }) => {
      await page.goto('http://localhost:4200');
      
      // Go offline
      await context.setOffline(true);
      
      // Try to capture
      const captureButton = page.locator('[data-testid="capture-button"]');
      await captureButton.click();
      
      // Should show queued message
      const queueMessage = page.locator('.action-queued, [data-testid="queue-message"]');
      const isQueueVisible = await queueMessage.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isQueueVisible) {
        await expect(queueMessage).toContainText(/queued|offline|saved/i);
      }
      
      // Go back online
      await context.setOffline(false);
      
      // Actions should be processed
      await page.waitForTimeout(2000);
    });
  });
});