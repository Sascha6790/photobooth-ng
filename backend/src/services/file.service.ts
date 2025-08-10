import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class FileService {
  /**
   * Check if a file or directory exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if path is a directory
   */
  async isDirectory(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
  
  /**
   * Check if path is a file
   */
  async isFile(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }
  
  /**
   * Ensure directory exists, create if not
   */
  async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }
  
  /**
   * Read file content as string
   */
  async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    return fs.readFile(filePath, encoding);
  }
  
  /**
   * Read file content as buffer
   */
  async readFileBuffer(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }
  
  /**
   * Write content to file
   */
  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    await this.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
  }
  
  /**
   * Copy file from source to destination
   */
  async copyFile(source: string, destination: string): Promise<void> {
    await this.ensureDir(path.dirname(destination));
    await fs.copyFile(source, destination);
  }
  
  /**
   * Move file from source to destination
   */
  async moveFile(source: string, destination: string): Promise<void> {
    await this.ensureDir(path.dirname(destination));
    await fs.rename(source, destination);
  }
  
  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
  
  /**
   * Delete directory recursively
   */
  async deleteDir(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
  
  /**
   * List files in directory
   */
  async listFiles(dirPath: string, options?: {
    recursive?: boolean;
    pattern?: RegExp;
    extensions?: string[];
  }): Promise<string[]> {
    const files: string[] = [];
    
    async function* walk(dir: string): AsyncGenerator<string> {
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      for (const dirent of dirents) {
        const res = path.resolve(dir, dirent.name);
        if (dirent.isDirectory() && options?.recursive) {
          yield* walk(res);
        } else if (dirent.isFile()) {
          yield res;
        }
      }
    }
    
    for await (const file of walk(dirPath)) {
      // Filter by pattern
      if (options?.pattern && !options.pattern.test(file)) {
        continue;
      }
      
      // Filter by extensions
      if (options?.extensions) {
        const ext = path.extname(file).toLowerCase();
        if (!options.extensions.includes(ext)) {
          continue;
        }
      }
      
      files.push(file);
    }
    
    return files;
  }
  
  /**
   * Get file stats
   */
  async getStats(filePath: string): Promise<fsSync.Stats> {
    return fs.stat(filePath);
  }
  
  /**
   * Get file size in bytes
   */
  async getFileSize(filePath: string): Promise<number> {
    const stats = await this.getStats(filePath);
    return stats.size;
  }
  
  /**
   * Get file modification time
   */
  async getModifiedTime(filePath: string): Promise<Date> {
    const stats = await this.getStats(filePath);
    return stats.mtime;
  }
  
  /**
   * Calculate file hash (MD5, SHA256, etc.)
   */
  async getFileHash(filePath: string, algorithm: string = 'sha256'): Promise<string> {
    const hash = crypto.createHash(algorithm);
    const stream = fsSync.createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
  
  /**
   * Create a unique filename with timestamp
   */
  generateUniqueFilename(prefix: string = 'file', extension: string = ''): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}${extension}`;
  }
  
  /**
   * Get MIME type from file extension
   */
  getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
  
  /**
   * Clean old files from directory
   */
  async cleanOldFiles(dirPath: string, maxAgeMs: number): Promise<number> {
    let deletedCount = 0;
    const now = Date.now();
    
    const files = await this.listFiles(dirPath);
    
    for (const file of files) {
      const mtime = await this.getModifiedTime(file);
      if (now - mtime.getTime() > maxAgeMs) {
        await this.deleteFile(file);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
  
  /**
   * Get directory size recursively
   */
  async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    
    const files = await this.listFiles(dirPath, { recursive: true });
    
    for (const file of files) {
      const size = await this.getFileSize(file);
      totalSize += size;
    }
    
    return totalSize;
  }
  
  /**
   * Create a temporary file
   */
  async createTempFile(prefix: string = 'tmp', extension: string = ''): Promise<string> {
    const tmpDir = path.join(process.cwd(), 'data', 'tmp');
    await this.ensureDir(tmpDir);
    
    const filename = this.generateUniqueFilename(prefix, extension);
    const filepath = path.join(tmpDir, filename);
    
    await this.writeFile(filepath, '');
    return filepath;
  }
  
  /**
   * Create a backup of a file
   */
  async backupFile(filePath: string): Promise<string> {
    const backupDir = path.join(path.dirname(filePath), 'backup');
    await this.ensureDir(backupDir);
    
    const filename = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${timestamp}_${filename}`);
    
    await this.copyFile(filePath, backupPath);
    return backupPath;
  }
}