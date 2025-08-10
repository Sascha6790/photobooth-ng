import { Observable } from 'rxjs';

export interface CameraStrategy {
  initialize(): Promise<void>;
  capturePhoto(): Promise<string>;
  getPreviewStream(): Observable<Buffer>;
  adjustSettings(settings: any): Promise<void>;
  cleanup(): Promise<void>;
}