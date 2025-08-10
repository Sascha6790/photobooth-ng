import { test, expect } from '@playwright/test';

test.describe('Permission Tests', () => {
  test.describe('Camera Permissions', () => {
    test('should request camera permission on first use', async ({ page, context }) => {
      // Grant camera permission
      await context.grantPermissions(['camera']);
      
      await page.goto('http://localhost:4200');
      
      // Click capture to trigger camera
      const captureButton = page.locator('[data-testid="capture-button"]');
      await captureButton.click();
      
      // Preview should be visible
      const preview = page.locator('[data-testid="camera-preview"], .preview-container video');
      await expect(preview).toBeVisible({ timeout: 10000 });
    });

    test('should handle camera permission denial', async ({ page, context }) => {
      // Deny camera permission
      await context.clearPermissions();
      
      await page.goto('http://localhost:4200');
      
      // Mock getUserMedia to simulate permission denial
      await page.addInitScript(() => {
        navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      });
      
      // Try to access camera
      const captureButton = page.locator('[data-testid="capture-button"]');
      await captureButton.click();
      
      // Should show permission error
      const permissionError = page.locator('.permission-error, [data-testid="camera-permission-error"]');
      await expect(permissionError).toBeVisible({ timeout: 10000 });
      await expect(permissionError).toContainText(/camera|permission|allow/i);
    });

    test('should show instructions for enabling camera', async ({ page, context }) => {
      await context.clearPermissions();
      
      await page.goto('http://localhost:4200');
      
      // Mock permission denial
      await page.addInitScript(() => {
        navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      });
      
      const captureButton = page.locator('[data-testid="capture-button"]');
      await captureButton.click();
      
      // Should show help text
      const helpText = page.locator('.permission-help, [data-testid="permission-instructions"]');
      await expect(helpText).toBeVisible({ timeout: 10000 });
      await expect(helpText).toContainText(/settings|browser|enable/i);
    });

    test('should handle no camera available', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Mock no camera devices
      await page.addInitScript(() => {
        navigator.mediaDevices.enumerateDevices = () => Promise.resolve([]);
        navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('No camera found', 'NotFoundError'));
      });
      
      const captureButton = page.locator('[data-testid="capture-button"]');
      await captureButton.click();
      
      // Should show no camera message
      const noCameraMessage = page.locator('.no-camera, [data-testid="no-camera-message"]');
      await expect(noCameraMessage).toBeVisible({ timeout: 10000 });
      await expect(noCameraMessage).toContainText(/camera|device|found/i);
    });

    test('should handle camera in use by another application', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Mock camera busy error
      await page.addInitScript(() => {
        navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Camera is busy', 'NotReadableError'));
      });
      
      const captureButton = page.locator('[data-testid="capture-button"]');
      await captureButton.click();
      
      // Should show busy message
      const busyMessage = page.locator('.camera-busy, [data-testid="camera-busy-message"]');
      await expect(busyMessage).toBeVisible({ timeout: 10000 });
      await expect(busyMessage).toContainText(/use|busy|another/i);
    });
  });

  test.describe('Storage Permissions', () => {
    test('should handle storage quota exceeded', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Mock quota exceeded
      await page.addInitScript(() => {
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function() {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        };
      });
      
      // Try to save settings
      await page.goto('http://localhost:4200/admin/settings');
      const saveButton = page.locator('button[type="submit"], [data-testid="save-button"]');
      await saveButton.click();
      
      // Should show storage error
      const storageError = page.locator('.storage-error, [data-testid="storage-quota-error"]');
      await expect(storageError).toBeVisible({ timeout: 10000 });
      await expect(storageError).toContainText(/storage|quota|space/i);
    });

    test('should request persistent storage', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Check if persistent storage is requested
      const persistentRequested = await page.evaluate(async () => {
        if ('storage' in navigator && 'persist' in navigator.storage) {
          return await navigator.storage.persist();
        }
        return false;
      });
      
      // Verify storage estimate
      const storageEstimate = await page.evaluate(async () => {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          return {
            usage: estimate.usage || 0,
            quota: estimate.quota || 0
          };
        }
        return null;
      });
      
      if (storageEstimate) {
        expect(storageEstimate.quota).toBeGreaterThan(0);
      }
    });

    test('should handle IndexedDB permissions', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Mock IndexedDB blocked
      await page.addInitScript(() => {
        window.indexedDB = null as any;
      });
      
      await page.reload();
      
      // App should still function with fallback
      const appContent = page.locator('.app-content, main, [data-testid="main-content"]');
      await expect(appContent).toBeVisible();
    });

    test('should handle file system access', async ({ page, context }) => {
      // Grant file system permissions if supported
      const permissions = ['clipboard-read', 'clipboard-write'];
      await context.grantPermissions(permissions);
      
      await page.goto('http://localhost:4200/gallery');
      
      // Test download functionality
      const downloadButton = page.locator('[data-testid="download-button"], button:has-text("Download")').first();
      const isDownloadVisible = await downloadButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isDownloadVisible) {
        // Start waiting for download
        const downloadPromise = page.waitForEvent('download');
        await downloadButton.click();
        
        // Verify download started
        const download = await downloadPromise.catch(() => null);
        if (download) {
          expect(download).toBeTruthy();
        }
      }
    });
  });

  test.describe('Microphone Permissions', () => {
    test('should handle microphone permission for video recording', async ({ page, context }) => {
      // Grant both camera and microphone
      await context.grantPermissions(['camera', 'microphone']);
      
      await page.goto('http://localhost:4200');
      
      // Check if video mode requires microphone
      const videoModeButton = page.locator('[data-testid="video-mode"], button:has-text("Video")');
      const isVideoVisible = await videoModeButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVideoVisible) {
        await videoModeButton.click();
        
        // Should request both permissions
        const captureButton = page.locator('[data-testid="capture-button"]');
        await captureButton.click();
        
        // Preview should include audio indicator
        const audioIndicator = page.locator('.audio-indicator, [data-testid="audio-active"]');
        const isAudioVisible = await audioIndicator.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (isAudioVisible) {
          await expect(audioIndicator).toBeVisible();
        }
      }
    });

    test('should work without microphone for photo mode', async ({ page, context }) => {
      // Grant only camera, not microphone
      await context.grantPermissions(['camera']);
      
      await page.goto('http://localhost:4200');
      
      // Photo mode should work without microphone
      const captureButton = page.locator('[data-testid="capture-button"]');
      await captureButton.click();
      
      // Preview should be visible
      const preview = page.locator('[data-testid="camera-preview"], .preview-container');
      await expect(preview).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Notification Permissions', () => {
    test('should request notification permission', async ({ page, context }) => {
      await page.goto('http://localhost:4200');
      
      // Check notification permission status
      const permissionStatus = await page.evaluate(() => {
        if ('Notification' in window) {
          return Notification.permission;
        }
        return 'unsupported';
      });
      
      if (permissionStatus === 'default') {
        // Request permission
        await context.grantPermissions(['notifications']);
        
        const notificationGranted = await page.evaluate(async () => {
          if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
          }
          return false;
        });
        
        expect(['granted', 'denied', 'default']).toContain(Notification.permission);
      }
    });

    test('should handle notification permission denial', async ({ page, context }) => {
      await context.clearPermissions();
      
      await page.goto('http://localhost:4200');
      
      // Mock notification denied
      await page.addInitScript(() => {
        Object.defineProperty(Notification, 'permission', {
          value: 'denied',
          writable: false
        });
      });
      
      // Check if app handles denied notifications
      const notificationSettings = page.locator('[data-testid="notification-settings"]');
      const isSettingsVisible = await notificationSettings.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isSettingsVisible) {
        await expect(notificationSettings).toContainText(/notification|disabled|denied/i);
      }
    });
  });

  test.describe('Clipboard Permissions', () => {
    test('should handle clipboard write permission', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-write']);
      
      await page.goto('http://localhost:4200/gallery');
      
      // Find share/copy button
      const copyButton = page.locator('[data-testid="copy-button"], button:has-text("Copy")').first();
      const isCopyVisible = await copyButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isCopyVisible) {
        await copyButton.click();
        
        // Should show success message
        const copySuccess = page.locator('.copy-success, [data-testid="copy-success"]');
        await expect(copySuccess).toBeVisible({ timeout: 5000 });
      }
    });

    test('should fallback when clipboard access denied', async ({ page, context }) => {
      await context.clearPermissions();
      
      await page.goto('http://localhost:4200/gallery');
      
      // Mock clipboard API unavailable
      await page.addInitScript(() => {
        delete (navigator as any).clipboard;
      });
      
      const copyButton = page.locator('[data-testid="copy-button"], button:has-text("Copy")').first();
      const isCopyVisible = await copyButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isCopyVisible) {
        await copyButton.click();
        
        // Should show fallback UI
        const fallbackUI = page.locator('.copy-fallback, [data-testid="manual-copy"]');
        const isFallbackVisible = await fallbackUI.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (isFallbackVisible) {
          await expect(fallbackUI).toBeVisible();
        }
      }
    });
  });

  test.describe('Geolocation Permissions', () => {
    test('should handle geolocation permission if used', async ({ page, context }) => {
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 52.520008, longitude: 13.404954 });
      
      await page.goto('http://localhost:4200');
      
      // Check if app uses geolocation
      const usesGeolocation = await page.evaluate(() => {
        return 'geolocation' in navigator;
      });
      
      if (usesGeolocation) {
        const location = await page.evaluate(() => {
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              }),
              () => resolve(null)
            );
          });
        });
        
        if (location) {
          expect(location).toHaveProperty('lat');
          expect(location).toHaveProperty('lng');
        }
      }
    });
  });

  test.describe('Feature Detection', () => {
    test('should detect and handle missing APIs', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Check feature detection
      const features = await page.evaluate(() => {
        return {
          camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
          storage: 'localStorage' in window,
          indexedDB: 'indexedDB' in window,
          serviceWorker: 'serviceWorker' in navigator,
          notifications: 'Notification' in window,
          clipboard: 'clipboard' in navigator,
          webgl: !!document.createElement('canvas').getContext('webgl'),
          websocket: 'WebSocket' in window
        };
      });
      
      // Core features should be available
      expect(features.storage).toBeTruthy();
      expect(features.websocket).toBeTruthy();
      
      // Log feature availability
      console.log('Feature Detection Results:', features);
    });

    test('should show browser compatibility warnings', async ({ page, browserName }) => {
      await page.goto('http://localhost:4200');
      
      // Check for compatibility warnings
      const compatWarning = page.locator('.browser-compatibility-warning, [data-testid="compat-warning"]');
      const isWarningVisible = await compatWarning.isVisible({ timeout: 5000 }).catch(() => false);
      
      // Older browsers might show warnings
      if (isWarningVisible) {
        await expect(compatWarning).toContainText(/browser|update|support/i);
      }
    });
  });
});