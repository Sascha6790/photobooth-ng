import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { SharedModule } from '../../../../shared/shared-module';
import { ApiService } from '../../../../core/services/api/api';
import { ConfigService, PhotoboothConfig } from '../../../../core/services/config/config';
import { LanguageService } from '../../../../core/services/language/language';

@Component({
  selector: 'app-stage-results',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './stage-results.component.html',
  styleUrls: ['./stage-results.component.scss']
})
export class StageResultsComponent implements OnInit {
  @Input() imageUrl = '';
  @Input() filename = '';
  @Output() actionSelected = new EventEmitter<string>();
  
  showQrCode = false;
  qrCodeUrl = '';
  showEmailModal = false;
  email = '';
  isPrinting = false;
  config$!: Observable<PhotoboothConfig | null>;
  
  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private languageService: LanguageService
  ) {}
  
  ngOnInit(): void {
    this.config$ = this.configService.config$;
    if (this.imageUrl) {
      this.generateQrCode();
    }
  }
  
  translate(key: string): string {
    return this.languageService.translate(key);
  }
  
  onPrint(): void {
    const config = this.configService.getConfig();
    if (!config?.print?.enabled) {
      return;
    }
    
    this.isPrinting = true;
    this.apiService.print({
      filename: this.filename,
      copies: config?.print?.copies || 1
    }).subscribe({
      next: () => {
        this.isPrinting = false;
        this.actionSelected.emit('printed');
      },
      error: (error) => {
        console.error('Print failed:', error);
        this.isPrinting = false;
      }
    });
  }
  
  onEmail(): void {
    this.showEmailModal = true;
  }
  
  sendEmail(): void {
    if (!this.email) {
      return;
    }
    
    this.apiService.sendEmail(this.filename, this.email).subscribe({
      next: () => {
        this.showEmailModal = false;
        this.email = '';
        this.actionSelected.emit('emailed');
      },
      error: (error) => {
        console.error('Email failed:', error);
      }
    });
  }
  
  onQrCode(): void {
    this.showQrCode = !this.showQrCode;
  }
  
  onDownload(): void {
    this.apiService.downloadPhoto(this.filename).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.filename;
        link.click();
        window.URL.revokeObjectURL(url);
        this.actionSelected.emit('downloaded');
      },
      error: (error) => {
        console.error('Download failed:', error);
      }
    });
  }
  
  onNewPhoto(): void {
    this.actionSelected.emit('new');
  }
  
  onDelete(): void {
    if (confirm(this.translate('result.confirmDelete'))) {
      this.apiService.deletePhoto(this.filename).subscribe({
        next: () => {
          this.actionSelected.emit('deleted');
        },
        error: (error) => {
          console.error('Delete failed:', error);
        }
      });
    }
  }
  
  private generateQrCode(): void {
    const url = `${window.location.origin}/gallery/${this.filename}`;
    this.apiService.getQrCode(url).subscribe({
      next: (blob) => {
        this.qrCodeUrl = window.URL.createObjectURL(blob);
      },
      error: (error) => {
        console.error('QR Code generation failed:', error);
      }
    });
  }
}