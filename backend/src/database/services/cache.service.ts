import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheEntry<T> {
  data: T;
  expiry: number;
  hits: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  maxSize?: number; // Maximum cache size
  strategy?: 'LRU' | 'LFU' | 'FIFO'; // Cache eviction strategy
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL: number;
  private readonly maxCacheSize: number;
  private readonly evictionStrategy: string;
  private cleanupInterval: NodeJS.Timeout;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    sets: 0,
  };

  constructor(private readonly configService: ConfigService) {
    this.defaultTTL = this.configService.get<number>('CACHE_TTL', 300); // 5 minutes
    this.maxCacheSize = this.configService.get<number>('CACHE_MAX_SIZE', 1000);
    this.evictionStrategy = this.configService.get<string>('CACHE_STRATEGY', 'LRU');
  }

  onModuleInit() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Run cleanup every minute
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count and stats
    entry.hits++;
    this.stats.hits++;

    // Update position for LRU
    if (this.evictionStrategy === 'LRU') {
      this.cache.delete(key);
      this.cache.set(key, entry);
    }

    return entry.data as T;
  }

  /**
   * Set cached value
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || this.defaultTTL;
    const expiry = Date.now() + (ttl * 1000);

    // Check cache size and evict if necessary
    if (this.cache.size >= this.maxCacheSize) {
      this.evict();
    }

    const entry: CacheEntry<T> = {
      data: value,
      expiry,
      hits: 0,
    };

    this.cache.set(key, entry);
    this.stats.sets++;
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Delete multiple cached values by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern);
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: hitRate.toFixed(2) + '%',
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Get or set cached value (memoization helper)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate value
    const value = await factory();
    
    // Store in cache
    await this.set(key, value, options);
    
    return value;
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let invalidated = 0;
    
    for (const tag of tags) {
      invalidated += await this.deletePattern(`.*:${tag}:.*`);
    }
    
    return invalidated;
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(data: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    for (const item of data) {
      await this.set(item.key, item.value, { ttl: item.ttl });
    }
  }

  /**
   * Private: Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Private: Evict entries based on strategy
   */
  private evict(): void {
    let keyToEvict: string | null = null;

    switch (this.evictionStrategy) {
      case 'LRU': // Least Recently Used
        // In LRU with Map, first entry is the oldest
        keyToEvict = this.cache.keys().next().value;
        break;

      case 'LFU': // Least Frequently Used
        let minHits = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.hits < minHits) {
            minHits = entry.hits;
            keyToEvict = key;
          }
        }
        break;

      case 'FIFO': // First In First Out
      default:
        keyToEvict = this.cache.keys().next().value;
        break;
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.stats.evictions++;
    }
  }

  /**
   * Private: Estimate memory usage
   */
  private estimateMemoryUsage(): string {
    // Rough estimation
    let bytes = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      bytes += key.length * 2; // UTF-16
      bytes += JSON.stringify(entry.data).length * 2;
      bytes += 24; // Entry overhead
    }

    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

/**
 * Cache decorator for methods
 */
export function Cacheable(options: CacheOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService = (this as any).cacheService;
      if (!cacheService) {
        return originalMethod.apply(this, args);
      }

      const key = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      
      return await cacheService.getOrSet(
        key,
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}

/**
 * Cache invalidation decorator
 */
export function CacheInvalidate(patterns: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      const cacheService = (this as any).cacheService;
      if (cacheService) {
        for (const pattern of patterns) {
          await cacheService.deletePattern(pattern);
        }
      }
      
      return result;
    };

    return descriptor;
  };
}