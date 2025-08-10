import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { EventEmitter } from 'events';

export interface LogQuery {
  level?: string;
  context?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  limit?: number;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  category?: string;
  metadata?: any;
}

export interface LogStatistics {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  debugCount: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  topErrors: Array<{ message: string; count: number }>;
  topContexts: Array<{ context: string; count: number }>;
}

@Injectable()
export class LogAggregationService implements OnModuleInit {
  private logDirectory = 'logs';
  private logCache: Map<string, LogEntry[]> = new Map();
  private logEventEmitter = new EventEmitter();

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('LogAggregationService');
  }

  onModuleInit() {
    this.ensureLogDirectory();
    this.startLogWatching();
  }

  // Ensure log directory exists
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  // Start watching log files for changes
  private startLogWatching(): void {
    fs.watch(this.logDirectory, (eventType, filename) => {
      if (filename && filename.endsWith('.log')) {
        this.logEventEmitter.emit('logFileChanged', filename);
      }
    });
  }

  // Query logs based on criteria
  async queryLogs(query: LogQuery): Promise<LogEntry[]> {
    const logFiles = await this.getLogFiles(query.startDate, query.endDate);
    const logs: LogEntry[] = [];

    for (const file of logFiles) {
      const fileLogs = await this.parseLogFile(file);
      logs.push(...fileLogs);
    }

    // Apply filters
    let filteredLogs = logs;

    if (query.level) {
      filteredLogs = filteredLogs.filter(log => log.level === query.level);
    }

    if (query.context) {
      filteredLogs = filteredLogs.filter(log => log.context === query.context);
    }

    if (query.category) {
      filteredLogs = filteredLogs.filter(log => log.category === query.category);
    }

    if (query.searchTerm) {
      const searchLower = query.searchTerm.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.metadata).toLowerCase().includes(searchLower)
      );
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply limit
    if (query.limit) {
      filteredLogs = filteredLogs.slice(0, query.limit);
    }

    return filteredLogs;
  }

  // Get log statistics
  async getLogStatistics(startDate?: Date, endDate?: Date): Promise<LogStatistics> {
    const logs = await this.queryLogs({ startDate, endDate });
    
    const stats: LogStatistics = {
      totalLogs: logs.length,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      debugCount: 0,
      timeRange: {
        start: new Date(),
        end: new Date(),
      },
      topErrors: [],
      topContexts: [],
    };

    const errorMessages = new Map<string, number>();
    const contexts = new Map<string, number>();

    logs.forEach(log => {
      // Count by level
      switch (log.level) {
        case 'error':
          stats.errorCount++;
          if (log.message) {
            errorMessages.set(log.message, (errorMessages.get(log.message) || 0) + 1);
          }
          break;
        case 'warn':
          stats.warningCount++;
          break;
        case 'info':
          stats.infoCount++;
          break;
        case 'debug':
          stats.debugCount++;
          break;
      }

      // Count contexts
      if (log.context) {
        contexts.set(log.context, (contexts.get(log.context) || 0) + 1);
      }

      // Update time range
      const logTime = new Date(log.timestamp);
      if (logTime < stats.timeRange.start) {
        stats.timeRange.start = logTime;
      }
      if (logTime > stats.timeRange.end) {
        stats.timeRange.end = logTime;
      }
    });

    // Get top errors
    stats.topErrors = Array.from(errorMessages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));

    // Get top contexts
    stats.topContexts = Array.from(contexts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([context, count]) => ({ context, count }));

    return stats;
  }

  // Stream logs in real-time
  streamLogs(callback: (log: LogEntry) => void): () => void {
    const listener = (filename: string) => {
      this.tailLogFile(path.join(this.logDirectory, filename), callback);
    };

    this.logEventEmitter.on('logFileChanged', listener);

    // Return unsubscribe function
    return () => {
      this.logEventEmitter.off('logFileChanged', listener);
    };
  }

  // Get log files within date range
  private async getLogFiles(startDate?: Date, endDate?: Date): Promise<string[]> {
    const files = fs.readdirSync(this.logDirectory)
      .filter(file => file.endsWith('.log'))
      .map(file => path.join(this.logDirectory, file));

    if (!startDate && !endDate) {
      return files;
    }

    // Filter by date if provided
    const filteredFiles: string[] = [];
    for (const file of files) {
      const stat = fs.statSync(file);
      const fileDate = stat.mtime;

      if (startDate && fileDate < startDate) continue;
      if (endDate && fileDate > endDate) continue;

      filteredFiles.push(file);
    }

    return filteredFiles;
  }

  // Parse log file
  private async parseLogFile(filePath: string): Promise<LogEntry[]> {
    // Check cache
    const cacheKey = `${filePath}_${fs.statSync(filePath).mtime.getTime()}`;
    if (this.logCache.has(cacheKey)) {
      return this.logCache.get(cacheKey)!;
    }

    const logs: LogEntry[] = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      try {
        const logEntry = JSON.parse(line);
        logs.push(this.normalizeLogEntry(logEntry));
      } catch (error) {
        // Skip invalid JSON lines
        continue;
      }
    }

    // Cache parsed logs
    this.logCache.set(cacheKey, logs);

    // Clean old cache entries
    if (this.logCache.size > 100) {
      const oldestKey = this.logCache.keys().next().value;
      this.logCache.delete(oldestKey);
    }

    return logs;
  }

  // Tail log file for real-time streaming
  private async tailLogFile(filePath: string, callback: (log: LogEntry) => void): Promise<void> {
    if (!fs.existsSync(filePath)) return;

    const stream = fs.createReadStream(filePath, { start: fs.statSync(filePath).size });
    const rl = readline.createInterface({ input: stream });

    rl.on('line', (line) => {
      try {
        const logEntry = JSON.parse(line);
        callback(this.normalizeLogEntry(logEntry));
      } catch (error) {
        // Skip invalid JSON lines
      }
    });
  }

  // Normalize log entry structure
  private normalizeLogEntry(rawLog: any): LogEntry {
    return {
      timestamp: rawLog.timestamp || new Date().toISOString(),
      level: rawLog.level || 'info',
      message: rawLog.message || '',
      context: rawLog.context,
      category: rawLog.category || rawLog.metadata?.category,
      metadata: rawLog.metadata || rawLog.meta,
    };
  }

  // Export logs to different formats
  async exportLogs(query: LogQuery, format: 'json' | 'csv' | 'txt'): Promise<string> {
    const logs = await this.queryLogs(query);

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      
      case 'csv':
        const headers = ['timestamp', 'level', 'message', 'context', 'category'];
        const rows = logs.map(log => [
          log.timestamp,
          log.level,
          `"${log.message.replace(/"/g, '""')}"`,
          log.context || '',
          log.category || '',
        ]);
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      
      case 'txt':
        return logs.map(log => 
          `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.context ? `[${log.context}] ` : ''}${log.message}`
        ).join('\n');
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Clean old logs
  async cleanOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const files = fs.readdirSync(this.logDirectory)
      .filter(file => file.endsWith('.log'))
      .map(file => path.join(this.logDirectory, file));

    let deletedCount = 0;

    for (const file of files) {
      const stat = fs.statSync(file);
      if (stat.mtime < cutoffDate) {
        fs.unlinkSync(file);
        deletedCount++;
        this.logger.log(`Deleted old log file: ${file}`);
      }
    }

    return deletedCount;
  }
}