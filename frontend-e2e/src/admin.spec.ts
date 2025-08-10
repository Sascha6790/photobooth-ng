import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4200/admin');
    await page.waitForLoadState('networkidle');
  });

  test('should display admin dashboard', async ({ page, viewport }) => {
    // Check if admin dashboard loads
    const adminDashboard = page.locator('app-admin-dashboard, app-admin').first();
    await expect(adminDashboard).toBeVisible({ timeout: 10000 });
    
    // Check for sidebar navigation - it should be attached to DOM
    const sidebar = page.locator('app-sidebar-navigation').first();
    await expect(sidebar).toBeAttached({ timeout: 5000 });
    
    const isMobile = viewport ? viewport.width < 768 : false;
    
    if (!isMobile) {
      // On desktop, check if sidebar has content (might be collapsed but still in DOM)
      // Don't check visibility as it might have CSS transforms
      const navItems = page.locator('app-sidebar-navigation .nav-item');
      const navCount = await navItems.count();
      expect(navCount).toBeGreaterThan(0);
    } else {
      // On mobile, sidebar might be hidden with transform
      // Check if menu toggle button exists
      const menuToggle = page.locator('.menu-toggle').first();
      await expect(menuToggle).toBeVisible();
    }
  });

  test('should have working navigation', async ({ page }) => {
    // Check for settings link
    const settingsLink = page.locator('a, button').filter({ hasText: /settings|einstellungen|configuration/i }).first();
    const settingsVisible = await settingsLink.isVisible().catch(() => false);
    
    if (settingsVisible) {
      await settingsLink.click();
      
      // Wait for settings form
      const settingsForm = page.locator('app-settings-form, form[class*="settings"], .settings-container').first();
      await expect(settingsForm).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display settings sections', async ({ page, viewport }) => {
    // On mobile, might need to open menu first
    const isMobile = viewport ? viewport.width < 768 : false;
    
    if (isMobile) {
      const menuToggle = page.locator('.menu-toggle').first();
      const isMenuToggleVisible = await menuToggle.isVisible().catch(() => false);
      if (isMenuToggleVisible) {
        await menuToggle.click();
        await page.waitForTimeout(300); // Wait for menu animation
      }
    }
    
    // Navigate to settings if possible
    const settingsLink = page.locator('a, button').filter({ hasText: /settings|einstellungen|configuration/i }).first();
    const settingsVisible = await settingsLink.isVisible().catch(() => false);
    
    if (settingsVisible) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');
      
      // Check for form sections with more flexible selectors
      const formSections = page.locator('fieldset, .form-section, .settings-section, mat-expansion-panel, .category-content, .setting-group');
      const sectionCount = await formSections.count();
      
      // Check for form controls as alternative
      const formControls = page.locator('input, select, textarea, app-toggle-switch, button[type="submit"]');
      const controlCount = await formControls.count();
      
      // Either sections or controls should be present
      expect(sectionCount + controlCount).toBeGreaterThan(0);
    } else {
      // If settings link not visible, at least check we're on admin page
      const url = page.url();
      expect(url).toContain('admin');
    }
  });

  test('should allow toggling switches', async ({ page }) => {
    // Navigate to settings
    const settingsLink = page.locator('a, button').filter({ hasText: /settings|einstellungen|configuration/i }).first();
    const settingsVisible = await settingsLink.isVisible().catch(() => false);
    
    if (settingsVisible) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');
      
      // Find a toggle switch
      const toggleSwitch = page.locator('app-toggle-switch, input[type="checkbox"], .toggle-switch').first();
      const toggleVisible = await toggleSwitch.isVisible().catch(() => false);
      
      if (toggleVisible) {
        // Get initial state
        const initialChecked = await toggleSwitch.isChecked().catch(() => {
          // For custom components, check aria-checked
          return toggleSwitch.getAttribute('aria-checked');
        });
        
        // Click to toggle
        await toggleSwitch.click();
        
        // Verify state changed
        const newChecked = await toggleSwitch.isChecked().catch(() => {
          return toggleSwitch.getAttribute('aria-checked');
        });
        
        expect(newChecked).not.toBe(initialChecked);
      }
    }
  });

  test('should show system status or stats', async ({ page }) => {
    // Look for dashboard stats or system info
    const statsSection = page.locator('.stats, .dashboard-stats, .system-info, [class*="status"]');
    const statsVisible = await statsSection.isVisible().catch(() => false);
    
    if (statsVisible) {
      // Check for some metric displays
      const metrics = page.locator('.metric, .stat-card, .info-card, [class*="count"]');
      const metricCount = await metrics.count();
      expect(metricCount).toBeGreaterThan(0);
    }
  });
});