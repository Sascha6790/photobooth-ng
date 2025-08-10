import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/services/api/api';

@Component({
  selector: 'app-system-control',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="system-control">
      <h2>System Control</h2>
      <div class="system-info">
        <h3>System Status</h3>
        <div class="status-grid">
          <div class="status-item">
            <span class="label">Status:</span>
            <span class="value">{{ systemStatus }}</span>
          </div>
          <div class="status-item">
            <span class="label">Uptime:</span>
            <span class="value">{{ uptime }}</span>
          </div>
          <div class="status-item">
            <span class="label">Version:</span>
            <span class="value">{{ version }}</span>
          </div>
        </div>
      </div>
      <div class="system-actions">
        <button class="btn btn-warning" (click)="restart()">Restart Application</button>
        <button class="btn btn-danger" (click)="shutdown()">Shutdown</button>
      </div>
    </div>
  `,
  styles: [`
    .system-control {
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h2 {
      margin: 0 0 2rem 0;
      color: #333;
    }
    h3 {
      margin: 0 0 1rem 0;
      color: #555;
      font-size: 1.1rem;
    }
    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .status-item {
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 4px;
    }
    .label {
      font-weight: 500;
      margin-right: 0.5rem;
    }
    .system-actions {
      display: flex;
      gap: 1rem;
    }
    .btn {
      padding: 0.5rem 1.25rem;
      border: none;
      border-radius: 4px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-warning {
      background: #f39c12;
      color: white;
    }
    .btn-danger {
      background: #e74c3c;
      color: white;
    }
  `]
})
export class SystemControlComponent implements OnInit {
  systemStatus = 'Running';
  uptime = '0 days, 0 hours';
  version = '1.0.0';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadSystemInfo();
  }

  loadSystemInfo(): void {
    // TODO: Load system info from API
  }

  restart(): void {
    if (confirm('Are you sure you want to restart the application?')) {
      // TODO: Call restart API
    }
  }

  shutdown(): void {
    if (confirm('Are you sure you want to shutdown the application?')) {
      // TODO: Call shutdown API
    }
  }
}