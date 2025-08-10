import { Component, ViewChild, ElementRef, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chroma-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chroma-canvas.component.html',
  styleUrls: ['./chroma-canvas.component.scss']
})
export class ChromaCanvasComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('video', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;
  
  @Input() backgroundImage = '';
  @Input() chromaColor = '#00ff00';
  @Input() tolerance = 0.2;
  @Output() captureComplete = new EventEmitter<Blob>();
  
  private context!: CanvasRenderingContext2D;
  private stream: MediaStream | null = null;
  private animationId: number | null = null;
  
  ngOnInit(): void {
    this.initializeCanvas();
    this.startCamera();
  }
  
  ngOnDestroy(): void {
    this.stopCamera();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
  
  private initializeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.context = canvas.getContext('2d')!;
    canvas.width = 1280;
    canvas.height = 720;
  }
  
  private async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false
      });
      
      const video = this.videoRef.nativeElement;
      video.srcObject = this.stream;
      
      video.onloadedmetadata = () => {
        this.processFrame();
      };
    } catch (error) {
      console.error('Failed to access camera:', error);
    }
  }
  
  private stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
  
  private processFrame(): void {
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      this.context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      if (this.backgroundImage) {
        this.applyChromaKey();
      }
    }
    
    this.animationId = requestAnimationFrame(() => this.processFrame());
  }
  
  private applyChromaKey(): void {
    const canvas = this.canvasRef.nativeElement;
    const imageData = this.context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const chromaRGB = this.hexToRgb(this.chromaColor);
    const tolerance = this.tolerance * 255;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const distance = Math.sqrt(
        Math.pow(r - chromaRGB.r, 2) +
        Math.pow(g - chromaRGB.g, 2) +
        Math.pow(b - chromaRGB.b, 2)
      );
      
      if (distance < tolerance) {
        data[i + 3] = 0;
      }
    }
    
    const background = new Image();
    background.src = this.backgroundImage;
    background.onload = () => {
      this.context.drawImage(background, 0, 0, canvas.width, canvas.height);
      this.context.putImageData(imageData, 0, 0);
    };
  }
  
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 255, b: 0 };
  }
  
  capture(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.toBlob((blob) => {
      if (blob) {
        this.captureComplete.emit(blob);
      }
    }, 'image/jpeg', 0.95);
  }
  
  updateSettings(settings: { color?: string; tolerance?: number; background?: string }): void {
    if (settings.color) this.chromaColor = settings.color;
    if (settings.tolerance !== undefined) this.tolerance = settings.tolerance;
    if (settings.background) this.backgroundImage = settings.background;
  }
}