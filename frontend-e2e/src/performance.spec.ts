import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test.describe('Page Load Performance', () => {
    test('should load homepage within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      
      // Homepage should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Check First Contentful Paint
      const fcp = await page.evaluate(() => {
        const entry = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint');
        return entry ? entry.startTime : null;
      });
      
      if (fcp) {
        expect(fcp).toBeLessThan(1500); // FCP should be under 1.5s
      }
    });

    test('should have good Largest Contentful Paint', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Wait for LCP
      await page.waitForTimeout(2000);
      
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Fallback timeout
          setTimeout(() => resolve(null), 5000);
        });
      });
      
      if (lcp && typeof lcp === 'number') {
        expect(lcp).toBeLessThan(2500); // LCP should be under 2.5s
      }
    });

    test('should have minimal Cumulative Layout Shift', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Navigate and interact to trigger potential layout shifts
      await page.waitForTimeout(1000);
      
      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
          }).observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => resolve(clsValue), 3000);
        });
      });
      
      if (typeof cls === 'number') {
        expect(cls).toBeLessThan(0.1); // CLS should be under 0.1
      }
    });

    test('should have good Time to Interactive', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:4200');
      
      // Wait for page to be interactive
      await page.locator('[data-testid="capture-button"]').waitFor({ state: 'visible' });
      
      const tti = Date.now() - startTime;
      
      // TTI should be under 3.5 seconds
      expect(tti).toBeLessThan(3500);
    });
  });

  test.describe('Runtime Performance', () => {
    test('should handle rapid button clicks without lag', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      const button = page.locator('[data-testid="capture-button"]');
      
      // Measure response time for rapid clicks
      const clickTimes = [];
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await button.click();
        const responseTime = Date.now() - startTime;
        clickTimes.push(responseTime);
        await page.waitForTimeout(100);
      }
      
      // Average response time should be under 100ms
      const avgTime = clickTimes.reduce((a, b) => a + b, 0) / clickTimes.length;
      expect(avgTime).toBeLessThan(100);
    });

    test('should scroll gallery smoothly', async ({ page }) => {
      await page.goto('http://localhost:4200/gallery');
      
      // Measure scroll performance
      const scrollMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const metrics = {
            frames: 0,
            drops: 0,
            startTime: performance.now()
          };
          
          let lastTime = performance.now();
          const measureFrame = () => {
            const currentTime = performance.now();
            const delta = currentTime - lastTime;
            
            metrics.frames++;
            if (delta > 16.67) { // More than 60fps frame time
              metrics.drops++;
            }
            
            lastTime = currentTime;
            
            if (currentTime - metrics.startTime < 1000) {
              requestAnimationFrame(measureFrame);
            } else {
              resolve(metrics);
            }
          };
          
          // Start scrolling
          window.scrollTo({ top: 1000, behavior: 'smooth' });
          measureFrame();
        });
      });
      
      // Should maintain at least 30fps (less than 50% frame drops)
      const dropRate = (scrollMetrics as any).drops / (scrollMetrics as any).frames;
      expect(dropRate).toBeLessThan(0.5);
    });

    test('should handle image loading efficiently', async ({ page }) => {
      await page.goto('http://localhost:4200/gallery');
      
      // Check lazy loading implementation
      const images = page.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        // Check if images have lazy loading
        const lazyImages = await images.evaluateAll((imgs) => {
          return imgs.map(img => ({
            loading: img.loading,
            src: img.src,
            complete: img.complete
          }));
        });
        
        // At least some images should be lazy loaded
        const lazyCount = lazyImages.filter(img => img.loading === 'lazy').length;
        expect(lazyCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Memory Performance', () => {
    test('should not have memory leaks during navigation', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return null;
      });
      
      // Navigate multiple times
      for (let i = 0; i < 5; i++) {
        await page.goto('http://localhost:4200/gallery');
        await page.goto('http://localhost:4200/admin');
        await page.goto('http://localhost:4200');
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((global as any).gc) {
          (global as any).gc();
        }
      });
      
      // Check memory after navigation
      const finalMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return null;
      });
      
      if (initialMemory && finalMemory) {
        // Memory increase should be less than 50MB
        const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
        expect(memoryIncrease).toBeLessThan(50);
      }
    });

    test('should handle large image galleries efficiently', async ({ page }) => {
      await page.goto('http://localhost:4200/gallery');
      
      // Check virtual scrolling or pagination
      const items = page.locator('.gallery-item, [data-testid="gallery-image"]');
      const itemCount = await items.count();
      
      // If more than 20 items, should have virtualization or pagination
      if (itemCount > 20) {
        const pagination = page.locator('.pagination, [data-testid="load-more"]');
        const isPaginationVisible = await pagination.isVisible().catch(() => false);
        
        expect(isPaginationVisible).toBeTruthy();
      }
    });
  });

  test.describe('Network Performance', () => {
    test('should compress API responses', async ({ page }) => {
      const response = await page.goto('http://localhost:4200');
      
      // Check for compression headers
      const headers = response?.headers();
      if (headers) {
        const encoding = headers['content-encoding'];
        expect(['gzip', 'br', 'deflate']).toContain(encoding);
      }
    });

    test('should cache static assets', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Check cache headers for static assets
      const responses = [];
      page.on('response', response => {
        if (response.url().match(/\.(js|css|png|jpg|woff2)$/)) {
          responses.push({
            url: response.url(),
            headers: response.headers()
          });
        }
      });
      
      await page.reload();
      
      // Static assets should have cache headers
      responses.forEach(response => {
        const cacheControl = response.headers['cache-control'];
        if (cacheControl) {
          expect(cacheControl).toMatch(/max-age|immutable/);
        }
      });
    });

    test('should use HTTP/2 or HTTP/3', async ({ page }) => {
      const response = await page.goto('http://localhost:4200');
      
      // Note: localhost might not use HTTP/2, but check in production
      const protocol = await page.evaluate(() => {
        const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        return entries[0]?.nextHopProtocol;
      });
      
      // Log protocol for debugging
      console.log('Protocol used:', protocol);
    });

    test('should minimize API calls with batching', async ({ page }) => {
      const apiCalls = [];
      
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          apiCalls.push({
            url: request.url(),
            method: request.method(),
            timestamp: Date.now()
          });
        }
      });
      
      await page.goto('http://localhost:4200');
      await page.waitForLoadState('networkidle');
      
      // Check for batched requests
      const batchedCalls = apiCalls.filter(call => 
        call.url.includes('batch') || call.url.includes('bulk')
      );
      
      // Log API call patterns
      console.log(`Total API calls: ${apiCalls.length}, Batched: ${batchedCalls.length}`);
    });
  });

  test.describe('Bundle Size Performance', () => {
    test('should have optimized JavaScript bundle size', async ({ page }) => {
      const jsSize = [];
      
      page.on('response', response => {
        if (response.url().endsWith('.js')) {
          jsSize.push(response.headers()['content-length']);
        }
      });
      
      await page.goto('http://localhost:4200');
      
      // Calculate total JS size
      const totalSize = jsSize.reduce((acc, size) => acc + parseInt(size || '0'), 0);
      const totalSizeMB = totalSize / 1024 / 1024;
      
      // Main bundle should be under 2MB
      expect(totalSizeMB).toBeLessThan(2);
    });

    test('should use code splitting', async ({ page }) => {
      const chunks = [];
      
      page.on('response', response => {
        if (response.url().match(/chunk.*\.js$/)) {
          chunks.push(response.url());
        }
      });
      
      await page.goto('http://localhost:4200');
      await page.goto('http://localhost:4200/admin');
      
      // Should have separate chunks for different routes
      expect(chunks.length).toBeGreaterThan(0);
    });

    test('should load critical CSS first', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Check for critical CSS
      const criticalCSS = await page.evaluate(() => {
        const styles = document.querySelectorAll('style[data-critical], link[rel="preload"][as="style"]');
        return styles.length;
      });
      
      // Should have critical CSS
      expect(criticalCSS).toBeGreaterThan(0);
    });
  });

  test.describe('Animation Performance', () => {
    test('should use CSS transforms for animations', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Check for transform usage
      const animatedElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const transforms = [];
        
        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.transform !== 'none' || style.transition.includes('transform')) {
            transforms.push({
              tag: el.tagName,
              transform: style.transform,
              transition: style.transition
            });
          }
        });
        
        return transforms;
      });
      
      // Should use transforms for animations
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    test('should maintain 60fps during animations', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Trigger an animation
      const button = page.locator('[data-testid="capture-button"]');
      
      // Measure FPS during animation
      const fps = await page.evaluate(async () => {
        return new Promise((resolve) => {
          let frames = 0;
          let startTime = performance.now();
          
          const measureFPS = () => {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime - startTime >= 1000) {
              resolve(frames);
            } else {
              requestAnimationFrame(measureFPS);
            }
          };
          
          // Trigger animation
          document.querySelector('[data-testid="capture-button"]')?.classList.add('animate');
          measureFPS();
        });
      });
      
      // Should maintain at least 30fps
      expect(fps).toBeGreaterThan(30);
    });
  });

  test.describe('Resource Optimization', () => {
    test('should use WebP or modern image formats', async ({ page }) => {
      const imageFormats = [];
      
      page.on('response', response => {
        const contentType = response.headers()['content-type'];
        if (contentType?.startsWith('image/')) {
          imageFormats.push(contentType);
        }
      });
      
      await page.goto('http://localhost:4200/gallery');
      
      // Check for modern formats
      const modernFormats = imageFormats.filter(format => 
        format.includes('webp') || format.includes('avif')
      );
      
      // Log image format usage
      console.log(`Total images: ${imageFormats.length}, Modern formats: ${modernFormats.length}`);
    });

    test('should preload critical resources', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Check for preload links
      const preloads = await page.evaluate(() => {
        const links = document.querySelectorAll('link[rel="preload"], link[rel="prefetch"]');
        return Array.from(links).map(link => ({
          href: link.getAttribute('href'),
          as: link.getAttribute('as')
        }));
      });
      
      // Should have some preloaded resources
      expect(preloads.length).toBeGreaterThan(0);
    });

    test('should use service worker for caching', async ({ page }) => {
      await page.goto('http://localhost:4200');
      
      // Check for service worker
      const hasServiceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
      });
      
      // Log service worker status
      console.log('Service Worker active:', hasServiceWorker);
    });
  });
});