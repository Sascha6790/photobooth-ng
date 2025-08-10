import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, interval, takeUntil } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { WebsocketService } from '../../../core/services/websocket.service';

interface PrintJob {
  id: string;
  imageId: string;
  imagePath: string;
  thumbnail?: string;
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  copies: number;
  printerName: string;
  paperSize: string;
  orientation: 'portrait' | 'landscape';
  quality: 'draft' | 'normal' | 'high';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  progress?: number;
  userId?: string;
  userName?: string;
}

interface Printer {
  name: string;
  status: 'ready' | 'busy' | 'offline' | 'error';
  isDefault: boolean;
  capabilities: PrinterCapabilities;
  queueLength: number;
  currentJob?: string;
}

interface PrinterCapabilities {
  paperSizes: string[];
  colorModes: string[];
  duplexModes: string[];
  maxCopies: number;
  supportsCustomSize: boolean;
}

interface PrintStatistics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  averagePrintTime: number;
  totalPages: number;
  todayJobs: number;
  weekJobs: number;
  monthJobs: number;
}

@Component({
  selector: 'app-print-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './print-queue.component.html',
  styleUrls: ['./print-queue.component.scss']
})
export class PrintQueueComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Print Jobs
  printJobs: PrintJob[] = [];
  selectedJobs: PrintJob[] = [];
  
  // Printers
  printers: Printer[] = [];
  selectedPrinter: Printer | null = null;
  
  // Statistics
  statistics: PrintStatistics | null = null;
  
  // Filters
  statusFilter: 'all' | 'pending' | 'printing' | 'completed' | 'failed' = 'all';
  dateFilter: 'all' | 'today' | 'week' | 'month' = 'all';
  searchTerm = '';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;
  totalItems = 0;
  
  // UI States
  isLoading = false;
  autoRefresh = true;
  refreshInterval = 5000;
  showJobDetails: PrintJob | null = null;
  showPrinterSettings = false;
  showBulkActions = false;
  
  // Bulk Actions
  selectAll = false;
  bulkAction: 'print' | 'cancel' | 'delete' | 'priority' = 'print';
  
  constructor(
    private apiService: ApiService,
    private websocketService: WebsocketService
  ) {}
  
  ngOnInit(): void {
    this.loadPrintJobs();
    this.loadPrinters();
    this.loadStatistics();
    this.subscribeToUpdates();
    this.startAutoRefresh();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private subscribeToUpdates(): void {
    this.websocketService.on('print-job-update')
      .pipe(takeUntil(this.destroy$))
      .subscribe((job: PrintJob) => {
        const index = this.printJobs.findIndex(j => j.id === job.id);
        if (index >= 0) {
          this.printJobs[index] = job;
        } else {
          this.printJobs.unshift(job);
        }
        this.sortJobs();
      });
    
    this.websocketService.on('printer-status')
      .pipe(takeUntil(this.destroy$))
      .subscribe((printer: Printer) => {
        const index = this.printers.findIndex(p => p.name === printer.name);
        if (index >= 0) {
          this.printers[index] = printer;
        }
      });
  }
  
  private startAutoRefresh(): void {
    interval(this.refreshInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.autoRefresh) {
          this.loadPrintJobs();
          this.loadPrinters();
        }
      });
  }
  
  loadPrintJobs(): void {
    this.isLoading = true;
    
    const params: any = {
      page: this.currentPage,
      limit: this.itemsPerPage,
    };
    
    if (this.statusFilter !== 'all') {
      params.status = this.statusFilter;
    }
    
    if (this.dateFilter !== 'all') {
      const now = new Date();
      switch (this.dateFilter) {
        case 'today':
          params.fromDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          break;
        case 'week':
          params.fromDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
          break;
        case 'month':
          params.fromDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
          break;
      }
    }
    
    if (this.searchTerm) {
      params.search = this.searchTerm;
    }
    
    this.apiService.get<any>('/print/jobs', { params })
      .subscribe({
        next: (response) => {
          this.printJobs = response.jobs.map((job: any) => ({
            ...job,
            createdAt: new Date(job.createdAt),
            startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
            completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
          }));
          this.totalItems = response.total;
          this.totalPages = response.totalPages;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load print jobs:', error);
          this.isLoading = false;
        }
      });
  }
  
  loadPrinters(): void {
    this.apiService.get<Printer[]>('/print/printers')
      .subscribe({
        next: (printers) => {
          this.printers = printers;
          if (!this.selectedPrinter && printers.length > 0) {
            this.selectedPrinter = printers.find(p => p.isDefault) || printers[0];
          }
        },
        error: (error) => {
          console.error('Failed to load printers:', error);
        }
      });
  }
  
  loadStatistics(): void {
    this.apiService.get<PrintStatistics>('/print/statistics')
      .subscribe({
        next: (stats) => {
          this.statistics = stats;
        },
        error: (error) => {
          console.error('Failed to load statistics:', error);
        }
      });
  }
  
  private sortJobs(): void {
    this.printJobs.sort((a, b) => {
      // Priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Then by status (printing > pending > others)
      const statusOrder = { printing: 0, pending: 1, completed: 2, failed: 3, cancelled: 4 };
      const aOrder = statusOrder[a.status] ?? 5;
      const bOrder = statusOrder[b.status] ?? 5;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      // Finally by creation date
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }
  
  selectJob(job: PrintJob): void {
    const index = this.selectedJobs.findIndex(j => j.id === job.id);
    if (index >= 0) {
      this.selectedJobs.splice(index, 1);
    } else {
      this.selectedJobs.push(job);
    }
  }
  
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.selectedJobs = [...this.printJobs];
    } else {
      this.selectedJobs = [];
    }
  }
  
  isJobSelected(job: PrintJob): boolean {
    return this.selectedJobs.some(j => j.id === job.id);
  }
  
  printJob(job: PrintJob): void {
    if (job.status !== 'pending' && job.status !== 'failed') {
      return;
    }
    
    this.apiService.post(`/print/jobs/${job.id}/print`, {})
      .subscribe({
        next: () => {
          job.status = 'printing';
          job.startedAt = new Date();
        },
        error: (error) => {
          console.error('Failed to print job:', error);
        }
      });
  }
  
  reprintJob(job: PrintJob): void {
    this.apiService.post('/print/jobs', {
      imageId: job.imageId,
      copies: job.copies,
      printerName: job.printerName,
      paperSize: job.paperSize,
      orientation: job.orientation,
      quality: job.quality,
    }).subscribe({
      next: (newJob: any) => {
        this.printJobs.unshift(newJob);
        this.sortJobs();
      },
      error: (error) => {
        console.error('Failed to reprint job:', error);
      }
    });
  }
  
  cancelJob(job: PrintJob): void {
    if (job.status === 'completed' || job.status === 'cancelled') {
      return;
    }
    
    this.apiService.post(`/print/jobs/${job.id}/cancel`, {})
      .subscribe({
        next: () => {
          job.status = 'cancelled';
          job.completedAt = new Date();
        },
        error: (error) => {
          console.error('Failed to cancel job:', error);
        }
      });
  }
  
  deleteJob(job: PrintJob): void {
    if (job.status === 'printing') {
      if (!confirm('This job is currently printing. Are you sure you want to delete it?')) {
        return;
      }
    }
    
    this.apiService.delete(`/print/jobs/${job.id}`)
      .subscribe({
        next: () => {
          const index = this.printJobs.indexOf(job);
          if (index > -1) {
            this.printJobs.splice(index, 1);
          }
        },
        error: (error) => {
          console.error('Failed to delete job:', error);
        }
      });
  }
  
  changePriority(job: PrintJob, priority: number): void {
    this.apiService.patch(`/print/jobs/${job.id}`, { priority })
      .subscribe({
        next: () => {
          job.priority = priority;
          this.sortJobs();
        },
        error: (error) => {
          console.error('Failed to change priority:', error);
        }
      });
  }
  
  executeBulkAction(): void {
    if (this.selectedJobs.length === 0) {
      return;
    }
    
    switch (this.bulkAction) {
      case 'print':
        this.bulkPrint();
        break;
      case 'cancel':
        this.bulkCancel();
        break;
      case 'delete':
        this.bulkDelete();
        break;
      case 'priority':
        this.bulkChangePriority();
        break;
    }
  }
  
  private bulkPrint(): void {
    const jobIds = this.selectedJobs
      .filter(j => j.status === 'pending' || j.status === 'failed')
      .map(j => j.id);
    
    if (jobIds.length === 0) {
      return;
    }
    
    this.apiService.post('/print/jobs/bulk-print', { jobIds })
      .subscribe({
        next: () => {
          this.selectedJobs.forEach(job => {
            if (jobIds.includes(job.id)) {
              job.status = 'printing';
              job.startedAt = new Date();
            }
          });
          this.selectedJobs = [];
        },
        error: (error) => {
          console.error('Failed to bulk print:', error);
        }
      });
  }
  
  private bulkCancel(): void {
    const jobIds = this.selectedJobs
      .filter(j => j.status !== 'completed' && j.status !== 'cancelled')
      .map(j => j.id);
    
    if (jobIds.length === 0) {
      return;
    }
    
    this.apiService.post('/print/jobs/bulk-cancel', { jobIds })
      .subscribe({
        next: () => {
          this.selectedJobs.forEach(job => {
            if (jobIds.includes(job.id)) {
              job.status = 'cancelled';
              job.completedAt = new Date();
            }
          });
          this.selectedJobs = [];
        },
        error: (error) => {
          console.error('Failed to bulk cancel:', error);
        }
      });
  }
  
  private bulkDelete(): void {
    if (!confirm(`Delete ${this.selectedJobs.length} selected jobs?`)) {
      return;
    }
    
    const jobIds = this.selectedJobs.map(j => j.id);
    
    this.apiService.post('/print/jobs/bulk-delete', { jobIds })
      .subscribe({
        next: () => {
          this.printJobs = this.printJobs.filter(j => !jobIds.includes(j.id));
          this.selectedJobs = [];
        },
        error: (error) => {
          console.error('Failed to bulk delete:', error);
        }
      });
  }
  
  private bulkChangePriority(): void {
    const priority = prompt('Enter new priority (0-10):', '5');
    if (!priority) {
      return;
    }
    
    const priorityNum = parseInt(priority, 10);
    if (isNaN(priorityNum) || priorityNum < 0 || priorityNum > 10) {
      alert('Invalid priority. Must be between 0 and 10.');
      return;
    }
    
    const jobIds = this.selectedJobs.map(j => j.id);
    
    this.apiService.post('/print/jobs/bulk-priority', { jobIds, priority: priorityNum })
      .subscribe({
        next: () => {
          this.selectedJobs.forEach(job => {
            job.priority = priorityNum;
          });
          this.sortJobs();
          this.selectedJobs = [];
        },
        error: (error) => {
          console.error('Failed to change priority:', error);
        }
      });
  }
  
  clearQueue(): void {
    if (!confirm('Clear all pending jobs from the queue?')) {
      return;
    }
    
    this.apiService.post('/print/queue/clear', {})
      .subscribe({
        next: () => {
          this.printJobs = this.printJobs.filter(j => 
            j.status !== 'pending' && j.status !== 'failed'
          );
        },
        error: (error) => {
          console.error('Failed to clear queue:', error);
        }
      });
  }
  
  pauseQueue(): void {
    this.apiService.post('/print/queue/pause', {})
      .subscribe({
        next: () => {
          console.log('Print queue paused');
        },
        error: (error) => {
          console.error('Failed to pause queue:', error);
        }
      });
  }
  
  resumeQueue(): void {
    this.apiService.post('/print/queue/resume', {})
      .subscribe({
        next: () => {
          console.log('Print queue resumed');
        },
        error: (error) => {
          console.error('Failed to resume queue:', error);
        }
      });
  }
  
  testPrint(printer: Printer): void {
    this.apiService.post('/print/test', { printerName: printer.name })
      .subscribe({
        next: () => {
          console.log('Test page sent to printer');
        },
        error: (error) => {
          console.error('Failed to print test page:', error);
        }
      });
  }
  
  onFilterChange(): void {
    this.currentPage = 1;
    this.loadPrintJobs();
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadPrintJobs();
    }
  }
  
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadPrintJobs();
    }
  }
  
  formatDate(date: Date): string {
    return date.toLocaleString();
  }
  
  formatDuration(start: Date, end?: Date): string {
    if (!end) {
      end = new Date();
    }
    const duration = end.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
  
  getStatusClass(status: string): string {
    return `status-${status}`;
  }
  
  getPrinterStatusClass(status: string): string {
    return `printer-${status}`;
  }
}