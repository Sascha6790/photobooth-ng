import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import * as os from 'os';
import * as process from 'process';

interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  peakConnections: number;
  averageConnectionDuration: number;
  connectionsByHour: Map<number, number>;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  uptime: {
    system: number;
    process: number;
  };
  network: {
    hostname: string;
    interfaces: any[];
  };
}

interface ErrorLog {
  timestamp: Date;
  type: string;
  message: string;
  clientId?: string;
  stack?: string;
  metadata?: any;
}

interface ActiveConnection {
  clientId: string;
  clientIp: string;
  connectedAt: Date;
  lastActivity: Date;
  rooms: string[];
  eventsEmitted: number;
  eventsReceived: number;
}

@Injectable()
export class MonitoringService {
  private server: Server;
  private readonly logger = new Logger(MonitoringService.name);
  
  private connections = new Map<string, ActiveConnection>();
  private errorLogs: ErrorLog[] = [];
  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    peakConnections: 0,
    averageConnectionDuration: 0,
    connectionsByHour: new Map(),
  };
  
  private metricsInterval: NodeJS.Timeout;
  private readonly MAX_ERROR_LOGS = 1000;

  setServer(server: Server) {
    this.server = server;
    this.logger.log('Monitoring Service initialized with Socket.IO server');
    this.startMetricsCollection();
  }

  private startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      this.updateSystemMetrics();
      this.cleanupOldErrors();
    }, 60000);
  }

  trackConnection(clientId: string, clientIp: string) {
    const connection: ActiveConnection = {
      clientId,
      clientIp,
      connectedAt: new Date(),
      lastActivity: new Date(),
      rooms: [],
      eventsEmitted: 0,
      eventsReceived: 0,
    };

    this.connections.set(clientId, connection);
    this.metrics.totalConnections++;
    this.metrics.activeConnections = this.connections.size;

    if (this.metrics.activeConnections > this.metrics.peakConnections) {
      this.metrics.peakConnections = this.metrics.activeConnections;
    }

    const hour = new Date().getHours();
    const currentCount = this.metrics.connectionsByHour.get(hour) || 0;
    this.metrics.connectionsByHour.set(hour, currentCount + 1);

    this.logger.log(`Connection tracked: ${clientId} from ${clientIp}`);
  }

  trackDisconnection(clientId: string) {
    const connection = this.connections.get(clientId);
    
    if (connection) {
      const duration = Date.now() - connection.connectedAt.getTime();
      this.updateAverageConnectionDuration(duration);
      this.connections.delete(clientId);
      this.metrics.activeConnections = this.connections.size;
      
      this.logger.log(`Disconnection tracked: ${clientId}`);
    }
  }

  trackEvent(clientId: string, eventType: 'emitted' | 'received') {
    const connection = this.connections.get(clientId);
    
    if (connection) {
      connection.lastActivity = new Date();
      
      if (eventType === 'emitted') {
        connection.eventsEmitted++;
      } else {
        connection.eventsReceived++;
      }
    }
  }

  trackError(error: Error, clientId?: string, metadata?: any) {
    const errorLog: ErrorLog = {
      timestamp: new Date(),
      type: error.name || 'UnknownError',
      message: error.message,
      clientId,
      stack: error.stack,
      metadata,
    };

    this.errorLogs.push(errorLog);
    
    if (this.errorLogs.length > this.MAX_ERROR_LOGS) {
      this.errorLogs.shift();
    }

    this.logger.error(`Error tracked: ${error.message}`, error.stack);

    this.server.emit('monitoring-error', {
      type: errorLog.type,
      message: errorLog.message,
      timestamp: errorLog.timestamp,
      clientId,
    });
  }

  getMetrics() {
    const systemMetrics = this.getSystemMetrics();
    const connectionMetrics = this.getConnectionMetrics();
    const errorMetrics = this.getErrorMetrics();

    return {
      success: true,
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      connections: connectionMetrics,
      errors: errorMetrics,
      websocket: {
        rooms: this.getRoomMetrics(),
        events: this.getEventMetrics(),
      },
    };
  }

  getActiveSessions() {
    const sessions = Array.from(this.connections.values()).map(conn => ({
      clientId: conn.clientId,
      clientIp: conn.clientIp,
      connectedAt: conn.connectedAt,
      lastActivity: conn.lastActivity,
      duration: Date.now() - conn.connectedAt.getTime(),
      rooms: conn.rooms,
      eventsEmitted: conn.eventsEmitted,
      eventsReceived: conn.eventsReceived,
    }));

    return {
      success: true,
      totalSessions: sessions.length,
      sessions,
      timestamp: new Date().toISOString(),
    };
  }

  private getSystemMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      cpu: {
        usage: this.getCPUUsage(),
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        percentage: (usedMemory / totalMemory) * 100,
      },
      uptime: {
        system: os.uptime(),
        process: process.uptime(),
      },
      network: {
        hostname: os.hostname(),
        interfaces: this.getNetworkInterfaces(),
      },
    };
  }

  private getConnectionMetrics() {
    return {
      total: this.metrics.totalConnections,
      active: this.metrics.activeConnections,
      peak: this.metrics.peakConnections,
      averageDuration: Math.round(this.metrics.averageConnectionDuration / 1000),
      byHour: Array.from(this.metrics.connectionsByHour.entries()).map(([hour, count]) => ({
        hour,
        count,
      })),
    };
  }

  private getErrorMetrics() {
    const recentErrors = this.errorLogs.slice(-100);
    const errorsByType = new Map<string, number>();
    
    for (const error of this.errorLogs) {
      const count = errorsByType.get(error.type) || 0;
      errorsByType.set(error.type, count + 1);
    }

    return {
      total: this.errorLogs.length,
      recent: recentErrors.map(e => ({
        timestamp: e.timestamp,
        type: e.type,
        message: e.message,
        clientId: e.clientId,
      })),
      byType: Array.from(errorsByType.entries()).map(([type, count]) => ({
        type,
        count,
      })),
    };
  }

  private getRoomMetrics() {
    if (!this.server) {
      return { totalRooms: 0, rooms: [] };
    }

    const rooms = this.server.sockets.adapter.rooms;
    const roomMetrics = [];

    for (const [roomName, sockets] of rooms) {
      if (!sockets.has(roomName)) {
        roomMetrics.push({
          name: roomName,
          size: sockets.size,
        });
      }
    }

    return {
      totalRooms: roomMetrics.length,
      rooms: roomMetrics,
    };
  }

  private getEventMetrics() {
    let totalEmitted = 0;
    let totalReceived = 0;

    for (const connection of this.connections.values()) {
      totalEmitted += connection.eventsEmitted;
      totalReceived += connection.eventsReceived;
    }

    return {
      totalEmitted,
      totalReceived,
      averagePerConnection: this.connections.size > 0 
        ? Math.round((totalEmitted + totalReceived) / this.connections.size)
        : 0,
    };
  }

  private getCPUUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    return usage;
  }

  private getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const result = [];

    for (const [name, iface] of Object.entries(interfaces)) {
      if (iface) {
        for (const address of iface) {
          if (address.family === 'IPv4' && !address.internal) {
            result.push({
              name,
              address: address.address,
              netmask: address.netmask,
              mac: address.mac,
            });
          }
        }
      }
    }

    return result;
  }

  private updateAverageConnectionDuration(newDuration: number) {
    const totalDuration = this.metrics.averageConnectionDuration * (this.metrics.totalConnections - 1);
    this.metrics.averageConnectionDuration = (totalDuration + newDuration) / this.metrics.totalConnections;
  }

  private updateSystemMetrics() {
    const metrics = this.getMetrics();
    
    this.server.emit('monitoring-metrics-update', metrics);
  }

  private cleanupOldErrors() {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
    this.errorLogs = this.errorLogs.filter(
      error => error.timestamp.getTime() > cutoffTime
    );
  }

  async exportMetrics(format: 'json' | 'csv' = 'json') {
    const metrics = this.getMetrics();
    
    if (format === 'json') {
      return JSON.stringify(metrics, null, 2);
    }
    
    return metrics;
  }

  onModuleDestroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
}