import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from '../api/api';

export interface Settings {
  general: GeneralSettings;
  camera: CameraSettings;
  gallery: GallerySettings;
  printer: PrinterSettings;
  effects: EffectsSettings;
  email: EmailSettings;
  advanced: AdvancedSettings;
}

export interface GeneralSettings {
  appTitle: string;
  language: string;
  timezone: string;
  dateFormat: string;
  countdown: number;
  enableSound: boolean;
  enableFlash: boolean;
}

export interface CameraSettings {
  captureMode: string;
  resolution: string;
  quality: number;
  flipHorizontal: boolean;
  captureDelay: number;
  gphotoDevice: string;
  webcamDevice: string;
}

export interface GallerySettings {
  enabled: boolean;
  itemsPerPage: number;
  showMetadata: boolean;
  allowDownload: boolean;
  allowSharing: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface PrinterSettings {
  enabled: boolean;
  printerName: string;
  paperSize: string;
  borderless: boolean;
  copies: number;
  autoprint: boolean;
  printDelay: number;
}

export interface EffectsSettings {
  enableFilters: boolean;
  enableFrames: boolean;
  enableChromaKey: boolean;
  chromaKeyColor: string;
  chromaKeyTolerance: number;
  defaultFilter: string;
  defaultFrame: string;
}

export interface EmailSettings {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  fromAddress: string;
  fromName: string;
  subject: string;
  template: string;
}

export interface AdvancedSettings {
  debugMode: boolean;
  logLevel: string;
  storageMode: string;
  storagePath: string;
  backupEnabled: boolean;
  backupPath: string;
  backupInterval: number;
  maxStorageSize: number;
  cleanupOldFiles: boolean;
  cleanupAge: number;
}

interface SettingsHistoryEntry {
  timestamp: number;
  settings: Settings;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'photobooth_settings';
  private readonly HISTORY_KEY = 'photobooth_settings_history';
  private readonly MAX_HISTORY_SIZE = 20;
  
  private settingsSubject = new BehaviorSubject<Settings>(this.getDefaultSettings());
  private historySubject = new BehaviorSubject<SettingsHistoryEntry[]>([]);
  private currentHistoryIndex = -1;
  
  public settings$ = this.settingsSubject.asObservable();
  public history$ = this.historySubject.asObservable();
  
  constructor(private apiService: ApiService) {
    this.loadFromLocalStorage();
  }
  
  getSettings(): Settings {
    return this.settingsSubject.value;
  }
  
  async loadSettings(): Promise<Settings> {
    try {
      const settings = await this.apiService.get<Settings>('/settings').toPromise();
      if (settings) {
        this.updateSettings(settings, 'Loaded from server');
        return settings;
      }
    } catch (error) {
      console.error('Failed to load settings from server:', error);
    }
    return this.getSettings();
  }
  
  async saveSettings(settings: Partial<Settings>, description = 'Manual save'): Promise<void> {
    const mergedSettings = { ...this.getSettings(), ...settings };
    
    try {
      await this.apiService.post('/settings', mergedSettings).toPromise();
      this.updateSettings(mergedSettings, description);
      this.saveToLocalStorage();
    } catch (error) {
      console.error('Failed to save settings to server:', error);
      throw error;
    }
  }
  
  updateSettings(settings: Settings, description?: string): void {
    this.settingsSubject.next(settings);
    this.addToHistory(settings, description);
    this.saveToLocalStorage();
  }
  
  updateSectionSettings<K extends keyof Settings>(
    section: K,
    settings: Partial<Settings[K]>,
    description?: string
  ): void {
    const currentSettings = this.getSettings();
    const updatedSettings = {
      ...currentSettings,
      [section]: {
        ...currentSettings[section],
        ...settings
      }
    };
    this.updateSettings(updatedSettings, description || `Updated ${section} settings`);
  }
  
  resetToDefaults(): void {
    const defaults = this.getDefaultSettings();
    this.updateSettings(defaults, 'Reset to defaults');
  }
  
  // History management
  private addToHistory(settings: Settings, description?: string): void {
    const history = this.historySubject.value;
    const entry: SettingsHistoryEntry = {
      timestamp: Date.now(),
      settings: JSON.parse(JSON.stringify(settings)),
      description
    };
    
    // Remove any entries after current index if we're not at the end
    const newHistory = history.slice(0, this.currentHistoryIndex + 1);
    newHistory.push(entry);
    
    // Limit history size
    if (newHistory.length > this.MAX_HISTORY_SIZE) {
      newHistory.shift();
    }
    
    this.historySubject.next(newHistory);
    this.currentHistoryIndex = newHistory.length - 1;
  }
  
  undo(): boolean {
    const history = this.historySubject.value;
    if (this.currentHistoryIndex > 0) {
      this.currentHistoryIndex--;
      const entry = history[this.currentHistoryIndex];
      this.settingsSubject.next(entry.settings);
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }
  
  redo(): boolean {
    const history = this.historySubject.value;
    if (this.currentHistoryIndex < history.length - 1) {
      this.currentHistoryIndex++;
      const entry = history[this.currentHistoryIndex];
      this.settingsSubject.next(entry.settings);
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }
  
  canUndo(): boolean {
    return this.currentHistoryIndex > 0;
  }
  
  canRedo(): boolean {
    return this.currentHistoryIndex < this.historySubject.value.length - 1;
  }
  
  getHistory(): SettingsHistoryEntry[] {
    return this.historySubject.value;
  }
  
  // Local storage
  private saveToLocalStorage(): void {
    try {
      const settings = this.getSettings();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      
      const history = this.historySubject.value;
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save to local storage:', error);
    }
  }
  
  private loadFromLocalStorage(): void {
    try {
      const settingsJson = localStorage.getItem(this.STORAGE_KEY);
      if (settingsJson) {
        const settings = JSON.parse(settingsJson) as Settings;
        this.settingsSubject.next(settings);
      }
      
      const historyJson = localStorage.getItem(this.HISTORY_KEY);
      if (historyJson) {
        const history = JSON.parse(historyJson) as SettingsHistoryEntry[];
        this.historySubject.next(history);
        this.currentHistoryIndex = history.length - 1;
      }
    } catch (error) {
      console.error('Failed to load from local storage:', error);
    }
  }
  
  clearLocalStorage(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.HISTORY_KEY);
  }
  
  // Export/Import
  exportSettings(): string {
    const settings = this.getSettings();
    return JSON.stringify(settings, null, 2);
  }
  
  importSettings(json: string): void {
    try {
      const settings = JSON.parse(json) as Settings;
      this.updateSettings(settings, 'Imported settings');
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw new Error('Invalid settings format');
    }
  }
  
  // Default settings
  private getDefaultSettings(): Settings {
    return {
      general: {
        appTitle: 'Photobooth',
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        countdown: 3,
        enableSound: true,
        enableFlash: true
      },
      camera: {
        captureMode: 'webcam',
        resolution: '1920x1080',
        quality: 85,
        flipHorizontal: false,
        captureDelay: 0,
        gphotoDevice: '',
        webcamDevice: ''
      },
      gallery: {
        enabled: true,
        itemsPerPage: 20,
        showMetadata: false,
        allowDownload: true,
        allowSharing: true,
        autoRefresh: true,
        refreshInterval: 30
      },
      printer: {
        enabled: false,
        printerName: '',
        paperSize: '4x6',
        borderless: true,
        copies: 1,
        autoprint: false,
        printDelay: 0
      },
      effects: {
        enableFilters: true,
        enableFrames: true,
        enableChromaKey: false,
        chromaKeyColor: '#00FF00',
        chromaKeyTolerance: 30,
        defaultFilter: 'none',
        defaultFrame: 'none'
      },
      email: {
        enabled: false,
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        smtpSecure: true,
        fromAddress: '',
        fromName: 'Photobooth',
        subject: 'Your Photobooth Picture',
        template: 'default'
      },
      advanced: {
        debugMode: false,
        logLevel: 'info',
        storageMode: 'local',
        storagePath: './photos',
        backupEnabled: false,
        backupPath: './backups',
        backupInterval: 24,
        maxStorageSize: 10,
        cleanupOldFiles: false,
        cleanupAge: 30
      }
    };
  }
}