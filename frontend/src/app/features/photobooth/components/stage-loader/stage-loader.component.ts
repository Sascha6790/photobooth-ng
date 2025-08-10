import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../../shared/shared-module';
import { LanguageService } from '../../../../core/services/language/language';

export type LoaderStage = 'capturing' | 'processing' | 'saving' | 'printing' | 'uploading';

@Component({
  selector: 'app-stage-loader',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './stage-loader.component.html',
  styleUrls: ['./stage-loader.component.scss']
})
export class StageLoaderComponent implements OnInit {
  @Input() stage: LoaderStage = 'capturing';
  @Input() progress = 0;
  @Input() message = '';
  
  animationClass = '';
  iconMap: Record<LoaderStage, string> = {
    capturing: '📷',
    processing: '⚙️',
    saving: '💾',
    printing: '🖨️',
    uploading: '☁️'
  };
  
  constructor(private languageService: LanguageService) {}
  
  ngOnInit(): void {
    this.updateAnimation();
  }
  
  ngOnChanges(): void {
    this.updateAnimation();
  }
  
  private updateAnimation(): void {
    switch (this.stage) {
      case 'capturing':
        this.animationClass = 'pulse';
        break;
      case 'processing':
        this.animationClass = 'spin';
        break;
      case 'saving':
        this.animationClass = 'bounce';
        break;
      case 'printing':
        this.animationClass = 'slide';
        break;
      case 'uploading':
        this.animationClass = 'float';
        break;
    }
  }
  
  getIcon(): string {
    return this.iconMap[this.stage] || '⏳';
  }
  
  getMessage(): string {
    if (this.message) {
      return this.message;
    }
    return this.languageService.translate(`loader.${this.stage}`);
  }
}