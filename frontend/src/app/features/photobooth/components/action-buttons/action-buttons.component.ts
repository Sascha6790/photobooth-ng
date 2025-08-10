import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../../shared/shared-module';
import { LanguageService } from '../../../../core/services/language/language';

export interface ActionButton {
  id: string;
  label: string;
  icon: string;
  type: 'primary' | 'secondary' | 'danger';
  action: () => void;
}

@Component({
  selector: 'app-action-buttons',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './action-buttons.component.html',
  styleUrls: ['./action-buttons.component.scss']
})
export class ActionButtonsComponent {
  @Input() currentStage: 'start' | 'preview' | 'capture' | 'result' = 'start';
  @Output() actionTriggered = new EventEmitter<string>();
  
  buttons: ActionButton[] = [];
  
  constructor(private languageService: LanguageService) {
    this.updateButtons();
  }
  
  ngOnChanges(): void {
    this.updateButtons();
  }
  
  private updateButtons(): void {
    switch (this.currentStage) {
      case 'start':
        this.buttons = [
          {
            id: 'photo',
            label: this.translate('action.takePhoto'),
            icon: '📷',
            type: 'primary',
            action: () => this.triggerAction('photo')
          },
          {
            id: 'collage',
            label: this.translate('action.takeCollage'),
            icon: '🖼️',
            type: 'secondary',
            action: () => this.triggerAction('collage')
          },
          {
            id: 'gallery',
            label: this.translate('action.viewGallery'),
            icon: '📁',
            type: 'secondary',
            action: () => this.triggerAction('gallery')
          }
        ];
        break;
        
      case 'preview':
        this.buttons = [
          {
            id: 'capture',
            label: this.translate('action.capture'),
            icon: '📷',
            type: 'primary',
            action: () => this.triggerAction('capture')
          },
          {
            id: 'cancel',
            label: this.translate('action.cancel'),
            icon: '❌',
            type: 'danger',
            action: () => this.triggerAction('cancel')
          }
        ];
        break;
        
      case 'result':
        this.buttons = [
          {
            id: 'print',
            label: this.translate('action.print'),
            icon: '🖨️',
            type: 'primary',
            action: () => this.triggerAction('print')
          },
          {
            id: 'email',
            label: this.translate('action.email'),
            icon: '📧',
            type: 'secondary',
            action: () => this.triggerAction('email')
          },
          {
            id: 'qrcode',
            label: this.translate('action.qrcode'),
            icon: '📱',
            type: 'secondary',
            action: () => this.triggerAction('qrcode')
          },
          {
            id: 'new',
            label: this.translate('action.newPhoto'),
            icon: '🔄',
            type: 'primary',
            action: () => this.triggerAction('new')
          }
        ];
        break;
        
      default:
        this.buttons = [];
    }
  }
  
  private translate(key: string): string {
    return this.languageService.translate(key);
  }
  
  private triggerAction(action: string): void {
    this.actionTriggered.emit(action);
  }
}