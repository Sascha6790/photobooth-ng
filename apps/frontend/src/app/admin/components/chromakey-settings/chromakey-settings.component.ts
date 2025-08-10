import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { WebsocketService } from '../../../core/services/websocket.service';

interface ChromakeyConfig {
  enabled: boolean;
  keyColor: string;
  tolerance: number;
  smoothing: number;
  spillSuppression: number;
  edgeBlur: number;
  lightWrap: number;
  preserveDetails: boolean;
  autoDetect: boolean;
}

interface BackgroundImage {
  id: string;
  name: string;
  path: string;
  thumbnail: string;
  category: string;
  isActive: boolean;
}

interface ChromakeyPreset {
  id: string;
  name: string;
  config: ChromakeyConfig;
  description: string;
}

@Component({
  selector: 'app-chromakey-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './chromakey-settings.component.html',
  styleUrls: ['./chromakey-settings.component.scss']
})
export class ChromakeySettingsComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('videoPreview', { static: false }) videoRef!: ElementRef<HTMLVideoElement>;
  
  private destroy$ = new Subject<void>();
  
  chromakeyForm: FormGroup;
  currentConfig: ChromakeyConfig | null = null;
  
  // Backgrounds
  backgrounds: BackgroundImage[] = [];
  selectedBackground: BackgroundImage | null = null;
  backgroundCategories: string[] = ['Nature', 'City', 'Abstract', 'Studio', 'Custom'];
  selectedCategory = 'All';
  
  // Presets
  presets: ChromakeyPreset[] = [
    {
      id: 'green-screen',
      name: 'Green Screen',
      config: {
        enabled: true,
        keyColor: '#00FF00',
        tolerance: 50,
        smoothing: 1,
        spillSuppression: 1,
        edgeBlur: 0,
        lightWrap: 0,
        preserveDetails: false,
        autoDetect: false
      },
      description: 'Standard green screen configuration'
    },
    {
      id: 'blue-screen',
      name: 'Blue Screen',
      config: {
        enabled: true,
        keyColor: '#0000FF',
        tolerance: 45,
        smoothing: 1,
        spillSuppression: 1.2,
        edgeBlur: 0,
        lightWrap: 0,
        preserveDetails: false,
        autoDetect: false
      },
      description: 'Standard blue screen configuration'
    },
    {
      id: 'auto-detect',
      name: 'Auto Detect',
      config: {
        enabled: true,
        keyColor: '#00FF00',
        tolerance: 40,
        smoothing: 2,
        spillSuppression: 1.5,
        edgeBlur: 1,
        lightWrap: 0.5,
        preserveDetails: true,
        autoDetect: true
      },
      description: 'Automatically detects the key color'
    }
  ];
  
  selectedPreset: ChromakeyPreset | null = null;
  
  // Preview
  isPreviewActive = false;
  previewStream: MediaStream | null = null;
  processingFps = 30;
  
  // UI States
  isLoading = false;
  isSaving = false;
  showUploadDialog = false;
  showColorPicker = false;
  
  // Statistics
  processingTime = 0;
  frameRate = 0;
  
  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private websocketService: WebsocketService
  ) {
    this.chromakeyForm = this.createForm();
  }
  
  ngOnInit(): void {
    this.loadConfiguration();
    this.loadBackgrounds();
    this.subscribeToFormChanges();
    this.subscribeToWebSocketEvents();
  }
  
  ngOnDestroy(): void {
    this.stopPreview();
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private createForm(): FormGroup {
    return this.fb.group({
      enabled: [false],
      keyColor: ['#00FF00', Validators.required],
      tolerance: [50, [Validators.min(0), Validators.max(100)]],
      smoothing: [1, [Validators.min(0), Validators.max(10)]],
      spillSuppression: [1, [Validators.min(0), Validators.max(5)]],
      edgeBlur: [0, [Validators.min(0), Validators.max(10)]],
      lightWrap: [0, [Validators.min(0), Validators.max(5)]],
      preserveDetails: [false],
      autoDetect: [false]
    });
  }
  
  private subscribeToFormChanges(): void {
    this.chromakeyForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((values) => {
        if (this.isPreviewActive) {
          this.applyChromakey();
        }
      });
  }
  
  private subscribeToWebSocketEvents(): void {
    this.websocketService.on('chromakey-update')
      .pipe(takeUntil(this.destroy$))
      .subscribe((config: ChromakeyConfig) => {
        this.currentConfig = config;
        this.chromakeyForm.patchValue(config, { emitEvent: false });
      });
  }
  
  private loadConfiguration(): void {
    this.isLoading = true;
    
    this.apiService.get<ChromakeyConfig>('/chromakeying/config')
      .subscribe({
        next: (config) => {
          this.currentConfig = config;
          this.chromakeyForm.patchValue(config);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load chromakey config:', error);
          this.isLoading = false;
        }
      });
  }
  
  private loadBackgrounds(): void {
    this.apiService.get<BackgroundImage[]>('/chromakeying/backgrounds')
      .subscribe({
        next: (backgrounds) => {
          this.backgrounds = backgrounds;
        },
        error: (error) => {
          console.error('Failed to load backgrounds:', error);
        }
      });
  }
  
  saveConfiguration(): void {
    if (this.chromakeyForm.invalid) {
      return;
    }
    
    this.isSaving = true;
    const config = this.chromakeyForm.value;
    
    this.apiService.post('/chromakeying/config', config)
      .subscribe({
        next: () => {
          this.currentConfig = config;
          this.isSaving = false;
          console.log('Chromakey configuration saved');
        },
        error: (error) => {
          console.error('Failed to save configuration:', error);
          this.isSaving = false;
        }
      });
  }
  
  resetConfiguration(): void {
    if (this.currentConfig) {
      this.chromakeyForm.patchValue(this.currentConfig);
    }
  }
  
  applyPreset(preset: ChromakeyPreset): void {
    this.selectedPreset = preset;
    this.chromakeyForm.patchValue(preset.config);
  }
  
  selectBackground(background: BackgroundImage): void {
    this.selectedBackground = background;
    
    // Update active background on server
    this.apiService.post(`/chromakeying/backgrounds/${background.id}/activate`, {})
      .subscribe({
        next: () => {
          this.backgrounds.forEach(bg => bg.isActive = bg.id === background.id);
        },
        error: (error) => {
          console.error('Failed to activate background:', error);
        }
      });
  }
  
  uploadBackground(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    
    const file = input.files[0];
    const formData = new FormData();
    formData.append('image', file);
    formData.append('category', this.selectedCategory === 'All' ? 'Custom' : this.selectedCategory);
    
    this.apiService.post<BackgroundImage>('/chromakeying/backgrounds/upload', formData)
      .subscribe({
        next: (background) => {
          this.backgrounds.push(background);
          this.showUploadDialog = false;
        },
        error: (error) => {
          console.error('Failed to upload background:', error);
        }
      });
  }
  
  deleteBackground(background: BackgroundImage): void {
    if (!confirm(`Delete background "${background.name}"?`)) {
      return;
    }
    
    this.apiService.delete(`/chromakeying/backgrounds/${background.id}`)
      .subscribe({
        next: () => {
          const index = this.backgrounds.indexOf(background);
          if (index > -1) {
            this.backgrounds.splice(index, 1);
          }
          if (this.selectedBackground?.id === background.id) {
            this.selectedBackground = null;
          }
        },
        error: (error) => {
          console.error('Failed to delete background:', error);
        }
      });
  }
  
  async startPreview(): Promise<void> {
    try {
      this.previewStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });
      
      if (this.videoRef) {
        this.videoRef.nativeElement.srcObject = this.previewStream;
        await this.videoRef.nativeElement.play();
      }
      
      this.isPreviewActive = true;
      this.processFrame();
    } catch (error) {
      console.error('Failed to start camera preview:', error);
    }
  }
  
  stopPreview(): void {
    if (this.previewStream) {
      this.previewStream.getTracks().forEach(track => track.stop());
      this.previewStream = null;
    }
    
    if (this.videoRef) {
      this.videoRef.nativeElement.srcObject = null;
    }
    
    this.isPreviewActive = false;
  }
  
  private processFrame(): void {
    if (!this.isPreviewActive) {
      return;
    }
    
    const startTime = performance.now();
    
    if (this.canvasRef && this.videoRef) {
      const canvas = this.canvasRef.nativeElement;
      const video = this.videoRef.nativeElement;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the video frame
        ctx.drawImage(video, 0, 0);
        
        // Apply chromakey if enabled
        if (this.chromakeyForm.value.enabled) {
          this.applyChromakey();
        }
      }
    }
    
    this.processingTime = performance.now() - startTime;
    this.frameRate = 1000 / this.processingTime;
    
    requestAnimationFrame(() => this.processFrame());
  }
  
  private applyChromakey(): void {
    if (!this.canvasRef) {
      return;
    }
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return;
    }
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const config = this.chromakeyForm.value;
    
    // Convert hex color to RGB
    const keyColor = this.hexToRgb(config.keyColor);
    const tolerance = config.tolerance;
    
    // Process pixels
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate color distance
      const distance = Math.sqrt(
        Math.pow(r - keyColor.r, 2) +
        Math.pow(g - keyColor.g, 2) +
        Math.pow(b - keyColor.b, 2)
      );
      
      // Make pixel transparent if within tolerance
      if (distance < tolerance * 2.55) {
        data[i + 3] = 0; // Alpha channel
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Draw background if selected
    if (this.selectedBackground) {
      const img = new Image();
      img.src = this.selectedBackground.path;
      img.onload = () => {
        ctx.globalCompositeOperation = 'destination-over';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      };
    }
  }
  
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 255, b: 0 };
  }
  
  pickColorFromCanvas(event: MouseEvent): void {
    if (!this.canvasRef) {
      return;
    }
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = '#' + ('000000' + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6);
    
    this.chromakeyForm.patchValue({ keyColor: hex });
  }
  
  toggleAutoDetect(): void {
    const autoDetect = this.chromakeyForm.value.autoDetect;
    
    if (autoDetect && this.isPreviewActive) {
      this.detectKeyColor();
    }
  }
  
  private detectKeyColor(): void {
    if (!this.canvasRef) {
      return;
    }
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return;
    }
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Simple edge detection for key color
    const colorCounts = new Map<string, number>();
    
    // Sample edges of the image
    for (let x = 0; x < canvas.width; x += 10) {
      // Top edge
      let i = (x * 4);
      let color = `${data[i]},${data[i + 1]},${data[i + 2]}`;
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      
      // Bottom edge
      i = ((canvas.height - 1) * canvas.width + x) * 4;
      color = `${data[i]},${data[i + 1]},${data[i + 2]}`;
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
    
    // Find most common color
    let maxCount = 0;
    let dominantColor = '0,255,0';
    
    colorCounts.forEach((count, color) => {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = color;
      }
    });
    
    const [r, g, b] = dominantColor.split(',').map(Number);
    const hex = '#' + ('000000' + ((r << 16) | (g << 8) | b).toString(16)).slice(-6);
    
    this.chromakeyForm.patchValue({ keyColor: hex });
  }
  
  getFilteredBackgrounds(): BackgroundImage[] {
    if (this.selectedCategory === 'All') {
      return this.backgrounds;
    }
    return this.backgrounds.filter(bg => bg.category === this.selectedCategory);
  }
}