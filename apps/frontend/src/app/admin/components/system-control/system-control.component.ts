import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, interval, takeUntil } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { WebsocketService } from '../../../core/services/websocket.service';

interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptime: number;
  environment: string;
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
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  network: {
    interfaces: NetworkInterface[];
  };
  temperature?: number;
}

interface NetworkInterface {
  name: string;
  ip: string;
  mac: string;
  type: string;
}

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime?: number;
  pid?: number;
  memory?: number;
  cpu?: number;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: any;
}

@Component({
  selector: 'app-system-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-control.component.html',
  styleUrls: ['./system-control.component.scss']
})
export class SystemControlComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  systemInfo: SystemInfo | null = null;
  systemMetrics: SystemMetrics | null = null;
  services: ServiceStatus[] = [];
  logs: LogEntry[] = [];
  
  // Control states
  isMaintenanceMode = false;
  isDevelopmentMode = false;
  autoRefresh = true;
  refreshInterval = 5000;
  
  // Action states
  showRestartConfirm = false;
  showShutdownConfirm = false;
  showFactoryResetConfirm = false;
  isPerformingAction = false;
  actionMessage = '';
  
  // Log filters
  logLevel: 'all' | 'info' | 'warn' | 'error' = 'all';
  maxLogs = 100;
  
  constructor(
    private apiService: ApiService,
    private websocketService: WebsocketService
  ) {}
  
  ngOnInit(): void {
    this.loadSystemInfo();
    this.loadSystemMetrics();
    this.loadServices();
    this.loadLogs();
    this.subscribeToSystemUpdates();
    this.startAutoRefresh();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private loadSystemInfo(): void {
    this.apiService.get<SystemInfo>('/admin/system/info')
      .subscribe({
        next: (info) => {
          this.systemInfo = info;
        },
        error: (error) => {
          console.error('Failed to load system info:', error);
        }
      });
  }
  
  private loadSystemMetrics(): void {
    this.apiService.get<SystemMetrics>('/admin/system/metrics')
      .subscribe({
        next: (metrics) => {
          this.systemMetrics = metrics;
        },
        error: (error) => {
          console.error('Failed to load system metrics:', error);
        }
      });
  }
  
  private loadServices(): void {
    this.apiService.get<ServiceStatus[]>('/admin/system/services')
      .subscribe({
        next: (services) => {
          this.services = services;
        },
        error: (error) => {
          console.error('Failed to load services:', error);
        }
      });
  }
  
  private loadLogs(): void {
    const params = {
      level: this.logLevel === 'all' ? undefined : this.logLevel,
      limit: this.maxLogs
    };
    
    this.apiService.get<LogEntry[]>('/admin/system/logs', { params })
      .subscribe({
        next: (logs) => {
          this.logs = logs;
        },
        error: (error) => {
          console.error('Failed to load logs:', error);
        }
      });
  }
  
  private subscribeToSystemUpdates(): void {
    this.websocketService.on('system-metrics')
      .pipe(takeUntil(this.destroy$))
      .subscribe((metrics: SystemMetrics) => {
        this.systemMetrics = metrics;
      });
    
    this.websocketService.on('service-status')
      .pipe(takeUntil(this.destroy$))
      .subscribe((status: ServiceStatus) => {
        const index = this.services.findIndex(s => s.name === status.name);
        if (index >= 0) {
          this.services[index] = status;
        }
      });
    
    this.websocketService.on('log-entry')
      .pipe(takeUntil(this.destroy$))
      .subscribe((log: LogEntry) => {
        if (this.logLevel === 'all' || log.level === this.logLevel) {
          this.logs.unshift(log);
          if (this.logs.length > this.maxLogs) {
            this.logs.pop();
          }
        }
      });
  }
  
  private startAutoRefresh(): void {
    interval(this.refreshInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.autoRefresh) {
          this.loadSystemMetrics();
          this.loadServices();
        }
      });
  }
  
  toggleMaintenanceMode(): void {
    this.isMaintenanceMode = !this.isMaintenanceMode;
    
    this.apiService.post('/admin/system/maintenance', { 
      enabled: this.isMaintenanceMode 
    }).subscribe({
      next: () => {
        console.log(`Maintenance mode ${this.isMaintenanceMode ? 'enabled' : 'disabled'}`);
      },
      error: (error) => {
        console.error('Failed to toggle maintenance mode:', error);
        this.isMaintenanceMode = !this.isMaintenanceMode; // Revert
      }
    });
  }
  
  toggleDevelopmentMode(): void {
    this.isDevelopmentMode = !this.isDevelopmentMode;
    
    this.apiService.post('/admin/system/development', { 
      enabled: this.isDevelopmentMode 
    }).subscribe({
      next: () => {
        console.log(`Development mode ${this.isDevelopmentMode ? 'enabled' : 'disabled'}`);
      },
      error: (error) => {
        console.error('Failed to toggle development mode:', error);
        this.isDevelopmentMode = !this.isDevelopmentMode; // Revert
      }
    });
  }
  
  restartService(service: ServiceStatus): void {
    this.apiService.post(`/admin/system/services/${service.name}/restart`, {})
      .subscribe({
        next: () => {
          console.log(`Service ${service.name} restarted`);
          setTimeout(() => this.loadServices(), 2000);
        },
        error: (error) => {
          console.error(`Failed to restart service ${service.name}:`, error);
        }
      });
  }
  
  stopService(service: ServiceStatus): void {
    this.apiService.post(`/admin/system/services/${service.name}/stop`, {})
      .subscribe({
        next: () => {
          console.log(`Service ${service.name} stopped`);
          setTimeout(() => this.loadServices(), 1000);
        },
        error: (error) => {
          console.error(`Failed to stop service ${service.name}:`, error);
        }
      });
  }
  
  startService(service: ServiceStatus): void {
    this.apiService.post(`/admin/system/services/${service.name}/start`, {})
      .subscribe({
        next: () => {
          console.log(`Service ${service.name} started`);
          setTimeout(() => this.loadServices(), 2000);
        },
        error: (error) => {
          console.error(`Failed to start service ${service.name}:`, error);
        }
      });
  }
  
  clearCache(): void {
    this.isPerformingAction = true;
    this.actionMessage = 'Clearing cache...';
    
    this.apiService.post('/admin/system/cache/clear', {})
      .subscribe({
        next: () => {
          this.actionMessage = 'Cache cleared successfully';
          setTimeout(() => {
            this.isPerformingAction = false;
            this.actionMessage = '';
          }, 2000);
        },
        error: (error) => {
          console.error('Failed to clear cache:', error);
          this.actionMessage = 'Failed to clear cache';
          setTimeout(() => {
            this.isPerformingAction = false;
            this.actionMessage = '';
          }, 2000);
        }
      });
  }
  
  exportLogs(): void {
    this.apiService.get('/admin/system/logs/export', { responseType: 'blob' })
      .subscribe({
        next: (blob: any) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `logs_${new Date().getTime()}.txt`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Failed to export logs:', error);
        }
      });
  }
  
  clearLogs(): void {
    this.logs = [];
    
    this.apiService.post('/admin/system/logs/clear', {})
      .subscribe({
        next: () => {
          console.log('Logs cleared');
        },
        error: (error) => {
          console.error('Failed to clear logs:', error);
        }
      });
  }
  
  restartSystem(): void {
    this.showRestartConfirm = true;
  }
  
  confirmRestart(): void {
    this.showRestartConfirm = false;
    this.isPerformingAction = true;
    this.actionMessage = 'Restarting system...';
    
    this.apiService.post('/admin/system/restart', {})
      .subscribe({
        next: () => {
          this.actionMessage = 'System restart initiated';
        },
        error: (error) => {
          console.error('Failed to restart system:', error);
          this.actionMessage = 'Failed to restart system';
          setTimeout(() => {
            this.isPerformingAction = false;
            this.actionMessage = '';
          }, 2000);
        }
      });
  }
  
  cancelRestart(): void {
    this.showRestartConfirm = false;
  }
  
  shutdownSystem(): void {
    this.showShutdownConfirm = true;
  }
  
  confirmShutdown(): void {
    this.showShutdownConfirm = false;
    this.isPerformingAction = true;
    this.actionMessage = 'Shutting down system...';
    
    this.apiService.post('/admin/system/shutdown', {})
      .subscribe({
        next: () => {
          this.actionMessage = 'System shutdown initiated';
        },
        error: (error) => {
          console.error('Failed to shutdown system:', error);
          this.actionMessage = 'Failed to shutdown system';
          setTimeout(() => {
            this.isPerformingAction = false;
            this.actionMessage = '';
          }, 2000);
        }
      });
  }
  
  cancelShutdown(): void {
    this.showShutdownConfirm = false;
  }
  
  factoryReset(): void {
    this.showFactoryResetConfirm = true;
  }
  
  confirmFactoryReset(): void {
    this.showFactoryResetConfirm = false;
    this.isPerformingAction = true;
    this.actionMessage = 'Performing factory reset...';
    
    this.apiService.post('/admin/system/factory-reset', {})
      .subscribe({
        next: () => {
          this.actionMessage = 'Factory reset completed. System will restart.';
        },
        error: (error) => {
          console.error('Failed to perform factory reset:', error);
          this.actionMessage = 'Failed to perform factory reset';
          setTimeout(() => {
            this.isPerformingAction = false;
            this.actionMessage = '';
          }, 2000);
        }
      });
  }
  
  cancelFactoryReset(): void {
    this.showFactoryResetConfirm = false;
  }
  
  onLogLevelChange(): void {
    this.loadLogs();
  }
  
  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
  
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  getLogLevelClass(level: string): string {
    return `log-${level}`;
  }
  
  getServiceStatusClass(status: string): string {
    return `status-${status}`;
  }
}