import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ConfigService } from '../../../../core/services/config/config';
import { ApiService } from '../../../../core/services/api/api';

interface SettingsTab {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-settings-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings-form.component.html',
  styleUrls: ['./settings-form.component.scss']
})
export class SettingsFormComponent implements OnInit {
  settingsForm!: FormGroup;
  activeTab = 'general';
  isLoading = false;
  isSaving = false;
  hasChanges = false;
  
  tabs: SettingsTab[] = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'camera', label: 'Camera', icon: 'camera_alt' },
    { id: 'gallery', label: 'Gallery', icon: 'collections' },
    { id: 'printer', label: 'Printer', icon: 'print' },
    { id: 'effects', label: 'Effects', icon: 'auto_awesome' },
    { id: 'email', label: 'Email', icon: 'email' },
    { id: 'advanced', label: 'Advanced', icon: 'engineering' }
  ];

  constructor(
    private fb: FormBuilder,
    private configService: ConfigService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadSettings();
    this.setupFormChangeDetection();
  }

  private initializeForm(): void {
    this.settingsForm = this.fb.group({
      general: this.fb.group({
        appTitle: ['Photobooth', Validators.required],
        language: ['en', Validators.required],
        timezone: ['UTC', Validators.required],
        dateFormat: ['YYYY-MM-DD', Validators.required],
        countdown: [3, [Validators.required, Validators.min(0), Validators.max(10)]],
        enableSound: [true],
        enableFlash: [true]
      }),
      camera: this.fb.group({
        captureMode: ['webcam', Validators.required],
        resolution: ['1920x1080', Validators.required],
        quality: [85, [Validators.required, Validators.min(1), Validators.max(100)]],
        flipHorizontal: [false],
        captureDelay: [0, [Validators.min(0), Validators.max(5000)]],
        gphotoDevice: [''],
        webcamDevice: ['']
      }),
      gallery: this.fb.group({
        enabled: [true],
        itemsPerPage: [20, [Validators.required, Validators.min(10), Validators.max(100)]],
        showMetadata: [false],
        allowDownload: [true],
        allowSharing: [true],
        autoRefresh: [true],
        refreshInterval: [30, [Validators.min(5), Validators.max(300)]]
      }),
      printer: this.fb.group({
        enabled: [false],
        printerName: [''],
        paperSize: ['4x6', Validators.required],
        borderless: [true],
        copies: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
        autoprint: [false],
        printDelay: [0, [Validators.min(0), Validators.max(60)]]
      }),
      effects: this.fb.group({
        enableFilters: [true],
        enableFrames: [true],
        enableChromaKey: [false],
        chromaKeyColor: ['#00FF00'],
        chromaKeyTolerance: [30, [Validators.min(0), Validators.max(100)]],
        defaultFilter: ['none'],
        defaultFrame: ['none']
      }),
      email: this.fb.group({
        enabled: [false],
        smtpHost: [''],
        smtpPort: [587, [Validators.min(1), Validators.max(65535)]],
        smtpUser: [''],
        smtpPassword: [''],
        smtpSecure: [true],
        fromAddress: ['', Validators.email],
        fromName: ['Photobooth'],
        subject: ['Your Photobooth Picture'],
        template: ['default']
      }),
      advanced: this.fb.group({
        debugMode: [false],
        logLevel: ['info', Validators.required],
        storageMode: ['local', Validators.required],
        storagePath: ['./photos', Validators.required],
        backupEnabled: [false],
        backupPath: ['./backups'],
        backupInterval: [24, [Validators.min(1), Validators.max(168)]],
        maxStorageSize: [10, [Validators.min(1), Validators.max(1000)]],
        cleanupOldFiles: [false],
        cleanupAge: [30, [Validators.min(1), Validators.max(365)]]
      })
    });
  }

  private loadSettings(): void {
    this.isLoading = true;
    this.apiService.get('/settings').subscribe({
      next: (settings: any) => {
        this.settingsForm.patchValue(settings);
        this.isLoading = false;
        this.hasChanges = false;
      },
      error: (error: any) => {
        console.error('Failed to load settings:', error);
        this.isLoading = false;
      }
    });
  }

  private setupFormChangeDetection(): void {
    this.settingsForm.valueChanges.subscribe(() => {
      this.hasChanges = true;
    });
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
  }

  saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.markFormGroupTouched(this.settingsForm);
      return;
    }

    this.isSaving = true;
    const settings = this.settingsForm.value;

    this.apiService.post('/settings', settings).subscribe({
      next: () => {
        this.isSaving = false;
        this.hasChanges = false;
        this.showSuccessMessage();
      },
      error: (error: any) => {
        console.error('Failed to save settings:', error);
        this.isSaving = false;
        this.showErrorMessage();
      }
    });
  }

  resetForm(): void {
    this.loadSettings();
    this.hasChanges = false;
  }

  exportSettings(): void {
    const settings = this.settingsForm.value;
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `photobooth-settings-${new Date().toISOString()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  importSettings(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const settings = JSON.parse(e.target?.result as string);
          this.settingsForm.patchValue(settings);
          this.hasChanges = true;
          this.showSuccessMessage('Settings imported successfully');
        } catch (error) {
          console.error('Failed to import settings:', error);
          this.showErrorMessage('Invalid settings file');
        }
      };
      
      reader.readAsText(file);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private showSuccessMessage(message = 'Settings saved successfully'): void {
    // TODO: Implement toast notification
    console.log(message);
  }

  private showErrorMessage(message = 'Failed to save settings'): void {
    // TODO: Implement toast notification
    console.error(message);
  }

  getFormGroup(tabId: string): FormGroup {
    return this.settingsForm.get(tabId) as FormGroup;
  }

  isFieldInvalid(tabId: string, fieldName: string): boolean {
    const field = this.settingsForm.get(`${tabId}.${fieldName}`);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(tabId: string, fieldName: string): string {
    const field = this.settingsForm.get(`${tabId}.${fieldName}`);
    if (field?.hasError('required')) {
      return 'This field is required';
    }
    if (field?.hasError('min')) {
      return `Minimum value is ${field.getError('min').min}`;
    }
    if (field?.hasError('max')) {
      return `Maximum value is ${field.getError('max').max}`;
    }
    if (field?.hasError('email')) {
      return 'Invalid email address';
    }
    return '';
  }
}