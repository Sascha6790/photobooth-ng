import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StageStartComponent } from '../stage-start/stage-start.component';
import { PreviewComponent } from '../preview/preview.component';
import { StageLoaderComponent } from '../stage-loader/stage-loader.component';
import { StageResultsComponent } from '../stage-results/stage-results.component';
import { ActionButtonsComponent } from '../action-buttons/action-buttons.component';
import { ConfigService } from '../../../../core/services/config/config';
import { ApiService } from '../../../../core/services/api/api';
import { WebsocketService } from '../../../../core/services/websocket/websocket';

export type AppStage = 'start' | 'preview' | 'countdown' | 'capture' | 'processing' | 'result';

@Component({
  selector: 'app-photobooth-container',
  standalone: true,
  imports: [
    CommonModule,
    StageStartComponent,
    PreviewComponent,
    StageLoaderComponent,
    StageResultsComponent,
    ActionButtonsComponent
  ],
  templateUrl: './photobooth-container.component.html',
  styleUrls: ['./photobooth-container.component.scss']
})
export class PhotoboothContainerComponent implements OnInit {
  currentStage: AppStage = 'start';
  loaderStage: 'capturing' | 'processing' | 'saving' | 'printing' | 'uploading' = 'capturing';
  loaderProgress = 0;
  resultImageUrl = '';
  resultFilename = '';
  
  constructor(
    private configService: ConfigService,
    private apiService: ApiService,
    private websocketService: WebsocketService
  ) {}
  
  ngOnInit(): void {
    this.initializeWebSocket();
    this.configService.loadConfig().subscribe();
  }
  
  private initializeWebSocket(): void {
    this.websocketService.connect();
    
    this.websocketService.messages$.subscribe(message => {
      this.handleWebSocketMessage(message);
    });
  }
  
  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'capture-progress':
        this.loaderProgress = message.data.progress;
        break;
      case 'capture-complete':
        this.onCaptureComplete(message.data);
        break;
      case 'remote-trigger':
        this.onRemoteTrigger();
        break;
    }
  }
  
  onActionTriggered(action: string): void {
    switch (action) {
      case 'photo':
      case 'collage':
        this.currentStage = 'preview';
        break;
      case 'capture':
        this.startCapture();
        break;
      case 'cancel':
        this.currentStage = 'start';
        break;
      case 'new':
        this.currentStage = 'start';
        break;
      case 'gallery':
        window.location.href = '/gallery';
        break;
      case 'printed':
      case 'emailed':
      case 'downloaded':
        console.log(`Action completed: ${action}`);
        break;
      case 'deleted':
        this.currentStage = 'start';
        break;
    }
  }
  
  private startCapture(): void {
    this.currentStage = 'capture';
    this.loaderStage = 'capturing';
    this.loaderProgress = 0;
    
    this.apiService.capture('photo').subscribe({
      next: (response) => {
        if (response.success && response.filename) {
          this.processImage(response.filename);
        }
      },
      error: (error) => {
        console.error('Capture failed:', error);
        this.currentStage = 'preview';
      }
    });
  }
  
  private processImage(filename: string): void {
    this.currentStage = 'processing';
    this.loaderStage = 'processing';
    
    setTimeout(() => {
      this.onCaptureComplete({
        filename: filename,
        url: `/images/${filename}`
      });
    }, 2000);
  }
  
  private onCaptureComplete(data: { filename: string; url: string }): void {
    this.resultFilename = data.filename;
    this.resultImageUrl = data.url;
    this.currentStage = 'result';
  }
  
  private onRemoteTrigger(): void {
    if (this.currentStage === 'start') {
      this.currentStage = 'preview';
    } else if (this.currentStage === 'preview') {
      this.startCapture();
    }
  }
}