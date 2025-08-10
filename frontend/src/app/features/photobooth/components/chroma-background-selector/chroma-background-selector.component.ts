import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChromaBackground {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
}

@Component({
  selector: 'app-chroma-background-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chroma-background-selector.component.html',
  styleUrls: ['./chroma-background-selector.component.scss']
})
export class ChromaBackgroundSelectorComponent {
  @Input() backgrounds: ChromaBackground[] = [
    {
      id: 'beach',
      name: 'Beach',
      url: '/resources/img/backgrounds/beach.jpg',
      thumbnail: '/resources/img/backgrounds/beach-thumb.jpg'
    },
    {
      id: 'city',
      name: 'City',
      url: '/resources/img/backgrounds/city.jpg',
      thumbnail: '/resources/img/backgrounds/city-thumb.jpg'
    },
    {
      id: 'forest',
      name: 'Forest',
      url: '/resources/img/backgrounds/forest.jpg',
      thumbnail: '/resources/img/backgrounds/forest-thumb.jpg'
    },
    {
      id: 'space',
      name: 'Space',
      url: '/resources/img/backgrounds/space.jpg',
      thumbnail: '/resources/img/backgrounds/space-thumb.jpg'
    },
    {
      id: 'studio',
      name: 'Studio',
      url: '/resources/img/backgrounds/studio.jpg',
      thumbnail: '/resources/img/backgrounds/studio-thumb.jpg'
    }
  ];
  
  @Input() selectedBackground: ChromaBackground | null = null;
  @Output() backgroundSelected = new EventEmitter<ChromaBackground>();
  @Output() settingsChanged = new EventEmitter<{ color: string; tolerance: number }>();
  
  chromaColor = '#00ff00';
  chromaTolerance = 0.2;
  showSettings = false;
  
  selectBackground(background: ChromaBackground): void {
    this.selectedBackground = background;
    this.backgroundSelected.emit(background);
  }
  
  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }
  
  updateColor(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.chromaColor = input.value;
    this.emitSettings();
  }
  
  updateTolerance(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.chromaTolerance = parseFloat(input.value);
    this.emitSettings();
  }
  
  private emitSettings(): void {
    this.settingsChanged.emit({
      color: this.chromaColor,
      tolerance: this.chromaTolerance
    });
  }
  
  uploadCustomBackground(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const customBackground: ChromaBackground = {
          id: 'custom-' + Date.now(),
          name: 'Custom',
          url: url,
          thumbnail: url
        };
        this.backgrounds.push(customBackground);
        this.selectBackground(customBackground);
      };
      reader.readAsDataURL(file);
    }
  }
}