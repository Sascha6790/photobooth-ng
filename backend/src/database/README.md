# Database Module

## Overview

The Database Module provides a complete data persistence layer for the Photobooth application using TypeORM with support for both SQLite (development) and PostgreSQL (production).

## Features

### 🗄️ Multi-Database Support
- **SQLite** for development - Zero configuration, file-based
- **PostgreSQL** for production - Scalable, robust, full-featured
- Automatic database selection based on environment

### 📊 Entities

#### Image Entity
- Complete metadata tracking (camera, effects, filters)
- View, print, and download counters
- Soft delete support
- Favorite marking
- Session association

#### Session Entity
- User session tracking
- Device and IP tracking
- Remote control support
- Statistics aggregation
- Activity monitoring

#### PrintJob Entity
- Queue management with priorities
- Status tracking (pending, processing, printing, completed, failed)
- Retry mechanism
- Printer settings storage
- Error tracking

#### Settings Entity
- Type-safe configuration storage
- Validation support
- Change history tracking
- Category organization
- Encryption support for sensitive values

### 🔍 Repositories

All repositories extend `BaseRepository` providing:
- Standard CRUD operations
- Pagination support
- Soft delete/restore
- Query builder access
- Batch operations

#### ImageRepository
- Advanced filtering (type, status, date range, file size)
- Statistics generation
- Duplicate detection
- Storage usage tracking
- Batch status updates

#### SessionRepository
- Active session management
- Token-based lookup
- Automatic expiration
- High activity detection
- Device type analytics

#### PrintJobRepository
- Queue management
- Priority handling
- Job retry logic
- Printer usage statistics
- Failed job tracking

#### SettingsRepository
- Category-based organization
- Value type detection
- Import/export functionality
- Change tracking
- Cache integration

### ⚡ Performance Features

#### CacheService
- Multiple eviction strategies (LRU, LFU, FIFO)
- TTL-based expiration
- Memory usage monitoring
- Cache warming
- Pattern-based invalidation
- Statistics tracking

#### Decorators
- `@Cacheable()` - Method result caching
- `@CacheInvalidate()` - Cache invalidation on updates

### 💾 Backup & Restore

#### BackupService
- Automatic scheduled backups
- Compression support (tar.gz)
- Metadata validation
- Image file inclusion
- Log file backup
- Retention policy
- Restore with schema validation

## Configuration

### Environment Variables

```bash
# Database Type
DATABASE_TYPE=sqlite # or postgres

# SQLite Configuration
DATABASE_PATH=./data/photobooth.db

# PostgreSQL Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=photobooth
DATABASE_PASSWORD=secret
DATABASE_NAME=photobooth
DATABASE_SSL=false
DATABASE_POOL_SIZE=10

# Cache Configuration
CACHE_TTL=300 # 5 minutes
CACHE_MAX_SIZE=1000
CACHE_STRATEGY=LRU # LRU, LFU, or FIFO

# Backup Configuration
BACKUP_DIR=./backups
MAX_BACKUPS=10
AUTO_BACKUP_ENABLED=true
AUTO_BACKUP_INTERVAL=86400000 # 24 hours
```

## Usage Examples

### Basic Repository Usage

```typescript
import { ImageRepository } from './repositories/image.repository';

@Injectable()
export class MyService {
  constructor(private imageRepo: ImageRepository) {}

  async getRecentImages() {
    return await this.imageRepo.findRecent(10);
  }

  async getGalleryPage(page: number) {
    return await this.imageRepo.findForGallery(page, 20);
  }
}
```

### Advanced Filtering

```typescript
const filters = {
  type: ImageType.COLLAGE,
  status: ImageStatus.READY,
  fromDate: new Date('2024-01-01'),
  isFavorite: true,
};

const result = await imageRepo.findWithFilters(filters, {
  page: 1,
  limit: 20,
  orderBy: 'createdAt',
  orderDirection: 'DESC',
});
```

### Cache Usage

```typescript
@Injectable()
export class CachedService {
  constructor(private cacheService: CacheService) {}

  @Cacheable({ ttl: 600 })
  async expensiveOperation() {
    // This result will be cached for 10 minutes
    return await someExpensiveCalculation();
  }

  @CacheInvalidate(['Settings:*'])
  async updateSettings(data: any) {
    // This will invalidate all settings cache
    return await this.saveSettings(data);
  }
}
```

### Backup Operations

```typescript
// Create backup
const backupPath = await backupService.createBackup({
  compress: true,
  includeImages: true,
  includeLogs: false,
});

// List backups
const backups = await backupService.listBackups();

// Restore from backup
await backupService.restoreBackup(backupPath, {
  dropExisting: true,
  validateSchema: true,
});
```

## Migrations

### Generate Migration

```bash
npm run typeorm migration:generate -- -n MigrationName
```

### Run Migrations

```bash
npm run typeorm migration:run
```

### Revert Migration

```bash
npm run typeorm migration:revert
```

## Database Schema

### Indexes

The following indexes are created for optimal performance:

- **sessions**: status + createdAt
- **images**: sessionId + createdAt, status + createdAt, filepath, status
- **print_jobs**: status + priority + createdAt, sessionId + createdAt, status
- **settings**: category + key (unique), category, key

## Best Practices

1. **Always use repositories** instead of direct entity manager access
2. **Leverage caching** for frequently accessed data
3. **Use pagination** for large result sets
4. **Implement soft deletes** for recoverable data
5. **Track changes** in settings for audit trails
6. **Regular backups** with retention policies
7. **Monitor cache hit rates** for optimization

## Testing

```bash
# Run database tests
npm run test:db

# Run with specific database
DATABASE_TYPE=postgres npm run test:db
```

## Troubleshooting

### Connection Issues
- Check database credentials in environment variables
- Ensure database server is running
- Verify network connectivity

### Migration Errors
- Check for pending migrations
- Validate entity definitions
- Review migration files for conflicts

### Performance Issues
- Monitor cache hit rates
- Check for missing indexes
- Review query patterns
- Consider connection pooling settings

## Future Enhancements

- [ ] Redis cache adapter
- [ ] Read replicas support
- [ ] Sharding for large datasets
- [ ] Full-text search integration
- [ ] GraphQL resolver integration
- [ ] Event sourcing for audit logs