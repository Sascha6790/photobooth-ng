import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

export interface LogoConfig {
  src: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  clickable?: boolean;
  animated?: boolean;
  customClass?: string;
}

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss'],
  animations: [
    trigger('logoAnimation', [
      state('in', style({ 
        opacity: 1,
        transform: 'scale(1) rotate(0deg)'
      })),
      transition('void => *', [
        style({ 
          opacity: 0,
          transform: 'scale(0.5) rotate(-180deg)'
        }),
        animate('600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)')
      ]),
      transition('* => pulse', [
        animate('300ms', style({
          transform: 'scale(1.1)'
        })),
        animate('300ms', style({
          transform: 'scale(1)'
        }))
      ])
    ])
  ]
})
export class LogoComponent implements OnInit {
  @Input() config: LogoConfig = {
    src: '/assets/logo.png',
    position: 'top-left'
  };
  @Input() visible = true;
  @Input() animateOnHover = true;
  @Output() logoClick = new EventEmitter<void>();
  
  animationState = 'in';
  isHovered = false;
  
  get positionClass(): string {
    return `logo-${this.config.position || 'top-left'}`;
  }
  
  get logoStyle(): any {
    const style: any = {};
    
    if (this.config.width) {
      style.width = typeof this.config.width === 'number' 
        ? `${this.config.width}px` 
        : this.config.width;
    }
    
    if (this.config.height) {
      style.height = typeof this.config.height === 'number' 
        ? `${this.config.height}px` 
        : this.config.height;
    }
    
    return style;
  }
  
  ngOnInit(): void {
    if (this.config.animated) {
      this.startAnimation();
    }
  }
  
  private startAnimation(): void {
    // Pulse animation every 5 seconds
    setInterval(() => {
      if (!this.isHovered) {
        this.pulse();
      }
    }, 5000);
  }
  
  pulse(): void {
    this.animationState = 'pulse';
    setTimeout(() => {
      this.animationState = 'in';
    }, 600);
  }
  
  onMouseEnter(): void {
    this.isHovered = true;
    if (this.animateOnHover) {
      this.pulse();
    }
  }
  
  onMouseLeave(): void {
    this.isHovered = false;
  }
  
  onClick(): void {
    if (this.config.clickable) {
      this.logoClick.emit();
      this.pulse();
    }
  }
  
  onImageError(event: Event): void {
    console.error('Failed to load logo image:', this.config.src);
    // Fallback to default logo
    const img = event.target as HTMLImageElement;
    img.src = '/assets/img/logo-white-1024.png';
  }
}