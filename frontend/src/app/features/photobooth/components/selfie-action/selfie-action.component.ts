import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../../shared/shared-module';
import { LanguageService } from '../../../../core/services/language/language';

export interface SelfieMode {
  id: string;
  label: string;
  icon: string;
  countdown: number;
  shots: number;
}

@Component({
  selector: 'app-selfie-action',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './selfie-action.component.html',
  styleUrls: ['./selfie-action.component.scss']
})
export class SelfieActionComponent implements OnInit {
  @Input() isActive = false;
  @Output() modeSelected = new EventEmitter<SelfieMode>();
  @Output() captureTriggered = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  
  modes: SelfieMode[] = [
    {
      id: 'single',
      label: 'Single Shot',
      icon: '📷',
      countdown: 3,
      shots: 1
    },
    {
      id: 'burst',
      label: 'Burst Mode',
      icon: '📸',
      countdown: 3,
      shots: 5
    },
    {
      id: 'timer',
      label: '10s Timer',
      icon: '⏰',
      countdown: 10,
      shots: 1
    },
    {
      id: 'series',
      label: 'Photo Series',
      icon: '🎬',
      countdown: 5,
      shots: 3
    }
  ];
  
  selectedMode: SelfieMode | null = null;
  countdown = 0;
  isCountingDown = false;
  currentShot = 0;
  totalShots = 0;
  
  constructor(private languageService: LanguageService) {}
  
  ngOnInit(): void {
    this.selectedMode = this.modes[0];
  }
  
  selectMode(mode: SelfieMode): void {
    this.selectedMode = mode;
    this.modeSelected.emit(mode);
  }
  
  startCapture(): void {
    if (!this.selectedMode) return;
    
    this.isCountingDown = true;
    this.countdown = this.selectedMode.countdown;
    this.currentShot = 0;
    this.totalShots = this.selectedMode.shots;
    
    this.runCountdown();
  }
  
  private runCountdown(): void {
    if (this.countdown > 0) {
      setTimeout(() => {
        this.countdown--;
        this.runCountdown();
      }, 1000);
    } else {
      this.capture();
    }
  }
  
  private capture(): void {
    this.currentShot++;
    this.captureTriggered.emit();
    
    if (this.currentShot < this.totalShots) {
      this.countdown = 2;
      setTimeout(() => this.runCountdown(), 1000);
    } else {
      this.isCountingDown = false;
      this.currentShot = 0;
    }
  }
  
  cancel(): void {
    this.isCountingDown = false;
    this.countdown = 0;
    this.currentShot = 0;
    this.cancelled.emit();
  }
  
  translate(key: string): string {
    return this.languageService.translate(key);
  }
}