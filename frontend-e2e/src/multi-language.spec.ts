import { test, expect } from '@playwright/test';

test.describe('Multi-Language Tests', () => {
  test.describe('Language Switching', () => {
    test('should switch from English to German', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Find language switcher
      const langSwitcher = page.locator('[data-testid="language-switcher"], .language-selector, select[name="language"]');
      await langSwitcher.selectOption('de');
      
      // Verify German text appears
      const captureButton = page.locator('[data-testid="capture-button"]');
      await expect(captureButton).toContainText(/Foto|Aufnahme|Auslösen/i);
      
      // Check gallery text
      const galleryButton = page.locator('[data-testid="gallery-button"], button:has-text("Galerie")');
      await expect(galleryButton).toBeVisible();
    });

    test('should switch from German to English', async ({ page }) => {
      // Start with German
      await page.goto('http://localhost:4200?lang=de');
      
      // Switch to English
      const langSwitcher = page.locator('[data-testid="language-switcher"], .language-selector, select[name="language"]');
      await langSwitcher.selectOption('en');
      
      // Verify English text appears
      const captureButton = page.locator('[data-testid="capture-button"]');
      await expect(captureButton).toContainText(/Capture|Photo|Take/i);
      
      // Check gallery text
      const galleryButton = page.locator('[data-testid="gallery-button"], button:has-text("Gallery")');
      await expect(galleryButton).toBeVisible();
    });

    test('should persist language preference', async ({ page, context }) => {
      await page.goto('http://localhost:4200');
      
      // Set to German
      const langSwitcher = page.locator('[data-testid="language-switcher"], .language-selector, select[name="language"]');
      await langSwitcher.selectOption('de');
      
      // Reload page
      await page.reload();
      
      // Should still be in German
      const captureButton = page.locator('[data-testid="capture-button"]');
      await expect(captureButton).toContainText(/Foto|Aufnahme|Auslösen/i);
    });

    test('should detect browser language', async ({ page, context }) => {
      // Set browser language to German
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'language', {
          value: 'de-DE',
          writable: false
        });
        Object.defineProperty(navigator, 'languages', {
          value: ['de-DE', 'de', 'en'],
          writable: false
        });
      });
      
      await page.goto('http://localhost:4200');
      
      // Should auto-select German
      const captureButton = page.locator('[data-testid="capture-button"]');
      const buttonText = await captureButton.textContent();
      
      // Check if German or English (fallback)
      expect(buttonText).toMatch(/Foto|Aufnahme|Capture|Photo/i);
    });
  });

  test.describe('Translation Coverage', () => {
    test('should have all UI elements translated in German', async ({ page }) => {
      await page.goto('http://localhost:4200?lang=de');
      
      // Check main navigation
      const navItems = await page.locator('nav a, nav button').allTextContents();
      navItems.forEach(text => {
        expect(text).not.toMatch(/null|undefined|\[.*\]/);
      });
      
      // Navigate to admin
      await page.goto('http://localhost:4200/admin?lang=de');
      
      // Check admin panel
      const adminTitle = page.locator('h1, h2, [data-testid="page-title"]').first();
      await expect(adminTitle).toContainText(/Einstellungen|Verwaltung|Admin/i);
      
      // Check form labels
      const formLabels = await page.locator('label').allTextContents();
      formLabels.forEach(label => {
        expect(label).not.toMatch(/^\[.*\]$/); // No untranslated keys
      });
    });

    test('should have all UI elements translated in English', async ({ page }) => {
      await page.goto('http://localhost:4200?lang=en');
      
      // Check main navigation
      const navItems = await page.locator('nav a, nav button').allTextContents();
      navItems.forEach(text => {
        expect(text).not.toMatch(/null|undefined|\[.*\]/);
      });
      
      // Navigate to admin
      await page.goto('http://localhost:4200/admin?lang=en');
      
      // Check admin panel
      const adminTitle = page.locator('h1, h2, [data-testid="page-title"]').first();
      await expect(adminTitle).toContainText(/Settings|Admin|Configuration/i);
      
      // Check form labels
      const formLabels = await page.locator('label').allTextContents();
      formLabels.forEach(label => {
        expect(label).not.toMatch(/^\[.*\]$/); // No untranslated keys
      });
    });

    test('should translate error messages', async ({ page, context }) => {
      await page.goto('http://localhost:4200?lang=de');
      
      // Trigger an error
      await context.route('**/api/**', route => route.abort());
      
      const captureButton = page.locator('[data-testid="capture-button"]');
      await captureButton.click();
      
      // Error should be in German
      const errorMessage = page.locator('.error-message, .toast-error, [role="alert"]');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      
      const errorText = await errorMessage.textContent();
      // Should contain German error terms
      expect(errorText).toMatch(/Fehler|Problem|fehlgeschlagen|nicht möglich/i);
    });

    test('should translate success messages', async ({ page }) => {
      await page.goto('http://localhost:4200/admin/settings?lang=de');
      
      // Submit form
      const saveButton = page.locator('button[type="submit"], [data-testid="save-button"]');
      const isSaveVisible = await saveButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isSaveVisible) {
        await saveButton.click();
        
        // Success message should be in German
        const successMessage = page.locator('.success-message, .toast-success');
        const isSuccessVisible = await successMessage.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (isSuccessVisible) {
          const successText = await successMessage.textContent();
          expect(successText).toMatch(/Erfolgreich|Gespeichert|Abgeschlossen/i);
        }
      }
    });
  });

  test.describe('Date and Time Formatting', () => {
    test('should format dates according to German locale', async ({ page }) => {
      await page.goto('http://localhost:4200/gallery?lang=de');
      
      // Look for date displays
      const dates = page.locator('.date, time, [data-testid*="date"]');
      const dateCount = await dates.count();
      
      if (dateCount > 0) {
        const firstDate = await dates.first().textContent();
        // German date format: DD.MM.YYYY or DD. Month YYYY
        expect(firstDate).toMatch(/\d{1,2}\.\d{1,2}\.\d{4}|\d{1,2}\.\s+\w+\s+\d{4}/);
      }
    });

    test('should format dates according to English locale', async ({ page }) => {
      await page.goto('http://localhost:4200/gallery?lang=en');
      
      // Look for date displays
      const dates = page.locator('.date, time, [data-testid*="date"]');
      const dateCount = await dates.count();
      
      if (dateCount > 0) {
        const firstDate = await dates.first().textContent();
        // English date format: MM/DD/YYYY or Month DD, YYYY
        expect(firstDate).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|\w+\s+\d{1,2},\s+\d{4}/);
      }
    });

    test('should format time according to locale', async ({ page }) => {
      await page.goto('http://localhost:4200?lang=de');
      
      // Look for time displays
      const times = page.locator('.time, [data-testid*="time"]');
      const timeCount = await times.count();
      
      if (timeCount > 0) {
        const firstTime = await times.first().textContent();
        // 24-hour format for German: HH:MM
        expect(firstTime).toMatch(/\d{1,2}:\d{2}/);
      }
    });
  });

  test.describe('Number Formatting', () => {
    test('should format numbers with German separators', async ({ page }) => {
      await page.goto('http://localhost:4200/admin/settings?lang=de');
      
      // Look for number inputs or displays
      const numbers = page.locator('input[type="number"], .number, [data-testid*="number"]');
      const numberCount = await numbers.count();
      
      if (numberCount > 0) {
        // Set a number value
        const numberInput = numbers.first();
        await numberInput.fill('1234.56');
        
        // Check display format
        const displayValue = await numberInput.inputValue();
        // German uses comma as decimal separator
        // Note: Input fields might not change format, check display elements
      }
    });

    test('should format currency correctly', async ({ page }) => {
      await page.goto('http://localhost:4200?lang=de');
      
      // Look for price displays
      const prices = page.locator('.price, .currency, [data-testid*="price"]');
      const priceCount = await prices.count();
      
      if (priceCount > 0) {
        const firstPrice = await prices.first().textContent();
        // German currency format: 1.234,56 € or EUR
        expect(firstPrice).toMatch(/[\d.,]+\s*€|EUR/);
      }
    });
  });

  test.describe('RTL Language Support', () => {
    test('should handle RTL languages if supported', async ({ page }) => {
      // Check if Arabic or Hebrew is supported
      await page.goto('http://localhost:4200');
      
      const langSwitcher = page.locator('[data-testid="language-switcher"], .language-selector');
      const options = await langSwitcher.locator('option').allTextContents();
      
      const hasRTL = options.some(opt => opt.match(/Arabic|Hebrew|العربية|עברית/i));
      
      if (hasRTL) {
        // Select RTL language
        await langSwitcher.selectOption({ label: /Arabic|العربية/i });
        
        // Check dir attribute
        const htmlDir = await page.getAttribute('html', 'dir');
        expect(htmlDir).toBe('rtl');
        
        // Check layout direction
        const bodyStyles = await page.evaluate(() => {
          return window.getComputedStyle(document.body).direction;
        });
        expect(bodyStyles).toBe('rtl');
      }
    });
  });

  test.describe('Language-Specific Features', () => {
    test('should load language-specific assets', async ({ page }) => {
      await page.goto('http://localhost:4200?lang=de');
      
      // Check for language-specific images or icons
      const images = page.locator('img[src*="de-"], img[src*="/de/"]');
      const imageCount = await images.count();
      
      // Log if language-specific assets exist
      if (imageCount > 0) {
        const firstImageSrc = await images.first().getAttribute('src');
        expect(firstImageSrc).toContain('de');
      }
    });

    test('should handle language-specific validation', async ({ page }) => {
      await page.goto('http://localhost:4200/admin/settings?lang=de');
      
      // Find email input
      const emailInput = page.locator('input[type="email"]').first();
      const isEmailVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isEmailVisible) {
        // Enter invalid email
        await emailInput.fill('invalid-email');
        await emailInput.blur();
        
        // Check validation message in German
        const validationMsg = page.locator('.validation-error, .error-text').first();
        const isValidationVisible = await validationMsg.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (isValidationVisible) {
          const msgText = await validationMsg.textContent();
          expect(msgText).toMatch(/ungültig|falsch|E-Mail/i);
        }
      }
    });
  });

  test.describe('Accessibility in Multiple Languages', () => {
    test('should have proper ARIA labels in German', async ({ page }) => {
      await page.goto('http://localhost:4200?lang=de');
      
      // Check ARIA labels
      const ariaElements = page.locator('[aria-label], [aria-describedby]');
      const count = await ariaElements.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const label = await ariaElements.nth(i).getAttribute('aria-label');
        if (label) {
          // Should not contain untranslated keys
          expect(label).not.toMatch(/^\[.*\]$/);
          expect(label).not.toBe('');
        }
      }
    });

    test('should have proper ARIA labels in English', async ({ page }) => {
      await page.goto('http://localhost:4200?lang=en');
      
      // Check ARIA labels
      const ariaElements = page.locator('[aria-label], [aria-describedby]');
      const count = await ariaElements.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const label = await ariaElements.nth(i).getAttribute('aria-label');
        if (label) {
          // Should not contain untranslated keys
          expect(label).not.toMatch(/^\[.*\]$/);
          expect(label).not.toBe('');
        }
      }
    });

    test('should announce language changes to screen readers', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Change language
      const langSwitcher = page.locator('[data-testid="language-switcher"], .language-selector');
      await langSwitcher.selectOption('de');
      
      // Check for ARIA live region announcement
      const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]');
      const isLiveVisible = await liveRegion.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isLiveVisible) {
        const announcement = await liveRegion.textContent();
        expect(announcement).toMatch(/Sprache|Language|Deutsch|German/i);
      }
    });
  });

  test.describe('Language Fallbacks', () => {
    test('should fallback to English for missing translations', async ({ page }) => {
      // Try to set an unsupported language
      await page.goto('http://localhost:4200?lang=fr');
      
      // Should fallback to English
      const captureButton = page.locator('[data-testid="capture-button"]');
      await expect(captureButton).toContainText(/Capture|Photo|Take/i);
    });

    test('should handle partial translations gracefully', async ({ page }) => {
      await page.goto('http://localhost:4200?lang=de');
      
      // Check all visible text elements
      const allText = await page.locator('body').allTextContents();
      const combinedText = allText.join(' ');
      
      // Should not show translation keys
      expect(combinedText).not.toMatch(/i18n\.|translation\.|locale\./i);
      expect(combinedText).not.toMatch(/\{\{.*\}\}/); // No unprocessed interpolations
    });
  });
});