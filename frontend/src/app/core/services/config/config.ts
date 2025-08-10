import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface PhotoboothConfig {
  language: string;
  gallery: {
    enabled: boolean;
    limit: number;
  };
  camera: {
    type: 'webcam' | 'gphoto2' | 'mock';
    resolution: string;
  };
  print: {
    enabled: boolean;
    copies: number;
  };
  collage: {
    enabled: boolean;
    layout: string;
  };
  chromakey: {
    enabled: boolean;
    color: string;
  };
  countdown: {
    enabled: boolean;
    duration: number;
  };
  ui: {
    theme: 'classic' | 'modern';
    showLogo: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private configSubject = new BehaviorSubject<PhotoboothConfig | null>(null);
  public config$ = this.configSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadConfig();
  }

  loadConfig(): Observable<PhotoboothConfig> {
    return this.http.get<PhotoboothConfig>('/api/settings').pipe(
      tap(config => this.configSubject.next(config))
    );
  }

  updateConfig(config: Partial<PhotoboothConfig>): Observable<PhotoboothConfig> {
    return this.http.post<PhotoboothConfig>('/api/settings', config).pipe(
      tap(updatedConfig => this.configSubject.next(updatedConfig))
    );
  }

  getConfig(): PhotoboothConfig | null {
    return this.configSubject.value;
  }
}
