export interface CameraCapabilities {
  canTakePicture: boolean;
  canRecordVideo: boolean;
  canLiveView: boolean;
  canAdjustSettings: boolean;
  supportedFormats: string[];
  supportedResolutions: Resolution[];
}

export interface Resolution {
  width: number;
  height: number;
  label?: string;
}

export interface CameraSettings {
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  whiteBalance?: string;
  focusMode?: 'auto' | 'manual';
  imageFormat?: 'jpeg' | 'raw' | 'raw+jpeg';
  imageQuality?: 'low' | 'normal' | 'fine' | 'superfine';
}

export interface CaptureResult {
  filePath: string;
  fileName: string;
  timestamp: Date;
  metadata?: ImageMetadata;
  thumbnailPath?: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  format: string;
  camera?: string;
  settings?: CameraSettings;
  exif?: Record<string, any>;
}

export interface LiveViewStream {
  start(): Promise<void>;
  stop(): Promise<void>;
  getFrame(): Promise<Buffer>;
  onFrame(callback: (frame: Buffer) => void): void;
}

export interface ICameraStrategy {
  name: string;
  
  initialize(): Promise<void>;
  
  isAvailable(): Promise<boolean>;
  
  getCapabilities(): CameraCapabilities;
  
  takePicture(settings?: CameraSettings): Promise<CaptureResult>;
  
  startVideo(): Promise<void>;
  
  stopVideo(): Promise<CaptureResult>;
  
  getLiveView(): Promise<LiveViewStream>;
  
  getSettings(): Promise<CameraSettings>;
  
  updateSettings(settings: Partial<CameraSettings>): Promise<void>;
  
  cleanup(): Promise<void>;
}

export interface CameraConfig {
  strategy: 'mock' | 'webcam' | 'gphoto2' | 'digicam';
  device?: string;
  outputPath: string;
  thumbnailPath?: string;
  settings?: CameraSettings;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}