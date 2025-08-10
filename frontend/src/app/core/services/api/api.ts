import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CaptureResponse {
  success: boolean;
  filename?: string;
  error?: string;
}

export interface GalleryResponse {
  images: string[];
  total: number;
}

export interface PrintRequest {
  filename: string;
  copies?: number;
}

export interface EffectRequest {
  filename: string;
  effect: string;
  parameters?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  // Generic methods
  get<T>(url: string): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}${url}`);
  }

  post<T>(url: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}${url}`, body);
  }

  put<T>(url: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}${url}`, body);
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}${url}`);
  }

  capture(mode: 'photo' | 'collage' | 'video' = 'photo'): Observable<CaptureResponse> {
    return this.http.post<CaptureResponse>(`${this.apiUrl}/capture`, { mode });
  }

  getGallery(page = 1, limit = 20): Observable<GalleryResponse> {
    return this.http.get<GalleryResponse>(`${this.apiUrl}/gallery`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }

  print(request: PrintRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/print`, request);
  }

  deletePhoto(filename: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/photo/${filename}`);
  }

  applyEffect(request: EffectRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/effects`, request);
  }

  getQrCode(url: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/qrcode`, {
      params: { url },
      responseType: 'blob'
    });
  }

  downloadPhoto(filename: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/download/${filename}`, {
      responseType: 'blob'
    });
  }

  sendEmail(filename: string, email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/mail`, { filename, email });
  }
}
