import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface BackupOptions {
  compress?: boolean;
  includeImages?: boolean;
  includeLogs?: boolean;
  excludeTables?: string[];
}

export interface RestoreOptions {
  dropExisting?: boolean;
  validateSchema?: boolean;
  skipImages?: boolean;
}

export interface BackupMetadata {
  version: string;
  createdAt: Date;
  databaseType: string;
  tables: string[];
  recordCounts: Record<string, number>;
  fileSize: number;
  compressed: boolean;
  checksum?: string;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly maxBackups: number;
  private readonly autoBackupInterval: number;
  private autoBackupTimer?: NodeJS.Timeout;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService
  ) {
    this.backupDir = this.configService.get<string>(
      'BACKUP_DIR',
      path.join(process.cwd(), 'backups')
    );
    this.maxBackups = this.configService.get<number>('MAX_BACKUPS', 10);
    this.autoBackupInterval = this.configService.get<number>(
      'AUTO_BACKUP_INTERVAL',
      86400000 // 24 hours
    );
  }

  async onModuleInit() {
    // Ensure backup directory exists
    await this.ensureBackupDir();

    // Start auto-backup if configured
    if (this.configService.get<boolean>('AUTO_BACKUP_ENABLED', false)) {
      this.startAutoBackup();
    }
  }

  async onModuleDestroy() {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
    }
  }

  /**
   * Create a full database backup
   */
  async createBackup(options: BackupOptions = {}): Promise<string> {
    const {
      compress = true,
      includeImages = false,
      includeLogs = false,
      excludeTables = [],
    } = options;

    try {
      this.logger.log('Starting database backup...');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true });

      // Get all tables
      const tables = await this.getTables();
      const tablesToBackup = tables.filter(t => !excludeTables.includes(t));

      const metadata: BackupMetadata = {
        version: '1.0.0',
        createdAt: new Date(),
        databaseType: this.dataSource.options.type,
        tables: tablesToBackup,
        recordCounts: {},
        fileSize: 0,
        compressed: compress,
      };

      // Backup each table
      for (const table of tablesToBackup) {
        await this.backupTable(table, backupPath, metadata);
      }

      // Backup images if requested
      if (includeImages) {
        await this.backupImages(backupPath);
      }

      // Backup logs if requested
      if (includeLogs) {
        await this.backupLogs(backupPath);
      }

      // Save metadata
      await fs.writeFile(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Compress if requested
      let finalPath = backupPath;
      if (compress) {
        finalPath = await this.compressBackup(backupPath);
        await this.removeDirectory(backupPath);
      }

      // Calculate final size
      const stats = await fs.stat(finalPath);
      metadata.fileSize = stats.size;

      // Clean up old backups
      await this.cleanupOldBackups();

      this.logger.log(`Backup completed: ${finalPath}`);
      return finalPath;
    } catch (error) {
      this.logger.error(`Backup failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(
    backupPath: string,
    options: RestoreOptions = {}
  ): Promise<void> {
    const {
      dropExisting = false,
      validateSchema = true,
      skipImages = false,
    } = options;

    try {
      this.logger.log(`Starting restore from: ${backupPath}`);

      // Decompress if needed
      let workingPath = backupPath;
      if (backupPath.endsWith('.tar.gz')) {
        workingPath = await this.decompressBackup(backupPath);
      }

      // Read metadata
      const metadataPath = path.join(workingPath, 'metadata.json');
      const metadata: BackupMetadata = JSON.parse(
        await fs.readFile(metadataPath, 'utf-8')
      );

      // Validate schema if requested
      if (validateSchema) {
        await this.validateSchema(metadata);
      }

      // Drop existing tables if requested
      if (dropExisting) {
        await this.dropAllTables();
      }

      // Restore each table
      for (const table of metadata.tables) {
        await this.restoreTable(table, workingPath);
      }

      // Restore images if available and not skipped
      if (!skipImages) {
        await this.restoreImages(workingPath);
      }

      // Clean up temporary files
      if (workingPath !== backupPath) {
        await this.removeDirectory(workingPath);
      }

      this.logger.log('Restore completed successfully');
    } catch (error) {
      this.logger.error(`Restore failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<Array<{
    name: string;
    path: string;
    size: number;
    createdAt: Date;
    metadata?: BackupMetadata;
  }>> {
    const files = await fs.readdir(this.backupDir);
    const backups = [];

    for (const file of files) {
      if (file.startsWith('backup-')) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);

        let metadata: BackupMetadata | undefined;
        try {
          if (file.endsWith('.tar.gz')) {
            // For compressed backups, we'd need to extract metadata
            // For now, we'll skip metadata for compressed files
          } else {
            const metadataPath = path.join(filePath, 'metadata.json');
            metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
          }
        } catch {
          // Metadata not available
        }

        backups.push({
          name: file,
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          metadata,
        });
      }
    }

    return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupName: string): Promise<void> {
    const backupPath = path.join(this.backupDir, backupName);
    const stats = await fs.stat(backupPath);

    if (stats.isDirectory()) {
      await this.removeDirectory(backupPath);
    } else {
      await fs.unlink(backupPath);
    }

    this.logger.log(`Deleted backup: ${backupName}`);
  }

  /**
   * Schedule automatic backups
   */
  startAutoBackup(): void {
    this.logger.log('Starting automatic backup schedule');

    // Create initial backup
    this.createBackup({ compress: true })
      .catch(error => this.logger.error('Auto-backup failed', error));

    // Schedule recurring backups
    this.autoBackupTimer = setInterval(() => {
      this.createBackup({ compress: true })
        .catch(error => this.logger.error('Auto-backup failed', error));
    }, this.autoBackupInterval);
  }

  /**
   * Stop automatic backups
   */
  stopAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = undefined;
      this.logger.log('Stopped automatic backup schedule');
    }
  }

  /**
   * Private: Backup a single table
   */
  private async backupTable(
    tableName: string,
    backupPath: string,
    metadata: BackupMetadata
  ): Promise<void> {
    const repository = this.dataSource.getRepository(tableName);
    const data = await repository.find();

    metadata.recordCounts[tableName] = data.length;

    const filePath = path.join(backupPath, `${tableName}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    this.logger.debug(`Backed up ${data.length} records from ${tableName}`);
  }

  /**
   * Private: Restore a single table
   */
  private async restoreTable(tableName: string, backupPath: string): Promise<void> {
    const filePath = path.join(backupPath, `${tableName}.json`);
    const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));

    const repository = this.dataSource.getRepository(tableName);
    
    // Use chunks to avoid memory issues with large datasets
    const chunkSize = 100;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await repository.save(chunk);
    }

    this.logger.debug(`Restored ${data.length} records to ${tableName}`);
  }

  /**
   * Private: Get all table names
   */
  private async getTables(): Promise<string[]> {
    const entities = this.dataSource.entityMetadatas;
    return entities.map(entity => entity.tableName);
  }

  /**
   * Private: Drop all tables
   */
  private async dropAllTables(): Promise<void> {
    await this.dataSource.dropDatabase();
    await this.dataSource.synchronize();
    this.logger.warn('Dropped and recreated all database tables');
  }

  /**
   * Private: Validate schema compatibility
   */
  private async validateSchema(metadata: BackupMetadata): Promise<void> {
    const currentTables = await this.getTables();
    const missingTables = metadata.tables.filter(t => !currentTables.includes(t));

    if (missingTables.length > 0) {
      throw new Error(
        `Schema mismatch: Missing tables ${missingTables.join(', ')}`
      );
    }
  }

  /**
   * Private: Backup image files
   */
  private async backupImages(backupPath: string): Promise<void> {
    const imagesDir = this.configService.get<string>(
      'IMAGES_DIR',
      path.join(process.cwd(), 'data', 'images')
    );

    const imagesBackupDir = path.join(backupPath, 'images');
    await fs.mkdir(imagesBackupDir, { recursive: true });

    // Copy images directory
    await this.copyDirectory(imagesDir, imagesBackupDir);
    this.logger.debug('Backed up image files');
  }

  /**
   * Private: Restore image files
   */
  private async restoreImages(backupPath: string): Promise<void> {
    const imagesBackupDir = path.join(backupPath, 'images');
    
    try {
      await fs.access(imagesBackupDir);
    } catch {
      // Images not included in backup
      return;
    }

    const imagesDir = this.configService.get<string>(
      'IMAGES_DIR',
      path.join(process.cwd(), 'data', 'images')
    );

    await this.copyDirectory(imagesBackupDir, imagesDir);
    this.logger.debug('Restored image files');
  }

  /**
   * Private: Backup log files
   */
  private async backupLogs(backupPath: string): Promise<void> {
    const logsDir = this.configService.get<string>(
      'LOGS_DIR',
      path.join(process.cwd(), 'logs')
    );

    const logsBackupDir = path.join(backupPath, 'logs');
    await fs.mkdir(logsBackupDir, { recursive: true });

    await this.copyDirectory(logsDir, logsBackupDir);
    this.logger.debug('Backed up log files');
  }

  /**
   * Private: Compress backup directory
   */
  private async compressBackup(backupPath: string): Promise<string> {
    const tarPath = `${backupPath}.tar.gz`;
    
    // This is a simplified version - in production, use a proper tar library
    const tar = await import('tar');
    await tar.c(
      {
        gzip: true,
        file: tarPath,
        cwd: path.dirname(backupPath),
      },
      [path.basename(backupPath)]
    );

    return tarPath;
  }

  /**
   * Private: Decompress backup file
   */
  private async decompressBackup(backupPath: string): Promise<string> {
    const extractPath = backupPath.replace('.tar.gz', '');
    
    const tar = await import('tar');
    await tar.x({
      file: backupPath,
      cwd: path.dirname(backupPath),
    });

    return extractPath;
  }

  /**
   * Private: Clean up old backups
   */
  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups();
    
    if (backups.length > this.maxBackups) {
      const toDelete = backups.slice(this.maxBackups);
      
      for (const backup of toDelete) {
        await this.deleteBackup(backup.name);
      }

      this.logger.log(`Cleaned up ${toDelete.length} old backups`);
    }
  }

  /**
   * Private: Ensure backup directory exists
   */
  private async ensureBackupDir(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  /**
   * Private: Copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Private: Remove directory recursively
   */
  private async removeDirectory(dirPath: string): Promise<void> {
    await fs.rm(dirPath, { recursive: true, force: true });
  }
}