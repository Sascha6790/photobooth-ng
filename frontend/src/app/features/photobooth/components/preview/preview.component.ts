import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../../shared/shared-module';
import { ConfigService } from '../../../../core/services/config/config';
import { ApiService } from '../../../../core/services/api/api';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss']
})
export class PreviewComponent implements OnInit, OnDestroy {
  @ViewChild('video', { static: false }) videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: false }) canvasElement?: ElementRef<HTMLCanvasElement>;
  @Output() actionTriggered = new EventEmitter<string>();
  
  stream: MediaStream | null = null;
  countdown = 0;
  isCountingDown = false;
  frameUrl = '';
  showFrame = false;
  captureMode: 'photo' | 'collage' | 'video' = 'photo';
  private countdownSubscription?: Subscription;
  
  constructor(
    private configService: ConfigService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.checkCameraPermission();
    this.loadConfig();
  }

  private async checkCameraPermission(): Promise<void> {
    try {
      // Check if Permissions API is available
      if ('permissions' in navigator) {
        const permission = await (navigator as any).permissions.query({ name: 'camera' });
        console.log('Camera permission state:', permission.state);
        
        if (permission.state === 'granted') {
          this.initializeCamera();
        } else if (permission.state === 'prompt') {
          // Permission will be requested when getUserMedia is called
          this.initializeCamera();
        } else if (permission.state === 'denied') {
          console.error('Camera permission is denied');
          alert('Camera access is blocked. Please enable camera access in your browser settings:\n\n' +
                '1. Click the lock/info icon in the address bar\n' +
                '2. Find Camera permissions\n' +
                '3. Change to "Allow"\n' +
                '4. Refresh the page');
        }
      } else {
        // Permissions API not available, try to initialize directly
        console.log('Permissions API not available, trying direct initialization');
        this.initializeCamera();
      }
    } catch (error) {
      console.error('Error checking camera permission:', error);
      // Try to initialize anyway
      this.initializeCamera();
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }

  private loadConfig(): void {
    this.configService.config$.subscribe(config => {
      if (config) {
        this.showFrame = config.ui.theme === 'classic';
        if (this.showFrame) {
          this.frameUrl = '/resources/img/frames/frame.png';
        }
      }
    });
  }

  private async initializeCamera(): Promise<void> {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia is not supported in this browser');
        alert('Camera API is not supported in your browser. Please use a modern browser.');
        return;
      }

      const constraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user'
        },
        audio: false
      };

      console.log('Requesting camera permission with constraints:', constraints);
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera stream obtained successfully');
      
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        console.log('Stream attached to video element');
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      
      // Better error handling with specific messages
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('Camera permission was denied. Please allow camera access and refresh the page.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        alert('No camera found. Please connect a camera and refresh the page.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        alert('Camera is already in use by another application.');
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        // Try with simpler constraints
        console.log('Trying with simpler constraints...');
        try {
          this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (this.videoElement?.nativeElement) {
            this.videoElement.nativeElement.srcObject = this.stream;
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          alert('Unable to access camera. Please check your camera settings.');
        }
      } else {
        alert(`Camera error: ${error.message || error.name || 'Unknown error'}`);
      }
    }
  }

  private stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  startCountdown(): void {
    const config = this.configService.getConfig();
    if (!config?.countdown.enabled) {
      this.capture();
      return;
    }

    this.isCountingDown = true;
    this.countdown = config.countdown.duration;

    this.countdownSubscription = interval(1000).subscribe(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.countdownSubscription?.unsubscribe();
        this.isCountingDown = false;
        this.capture();
      }
    });
  }
  
  onCaptureClick(): void {
    // Emit capture event to parent container
    this.actionTriggered.emit('capture');
  }

  private capture(): void {
    if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        this.uploadCapture(blob);
      }
    }, 'image/jpeg', 0.95);
  }

  private uploadCapture(blob: Blob): void {
    this.apiService.capture(this.captureMode).subscribe({
      next: (response) => {
        if (response.success && response.filename) {
          console.log('Capture successful:', response.filename);
        }
      },
      error: (error) => {
        console.error('Capture failed:', error);
      }
    });
  }

  cancelCountdown(): void {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
      this.isCountingDown = false;
      this.countdown = 0;
    }
  }
}