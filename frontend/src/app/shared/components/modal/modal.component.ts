import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent {
  @Input() title = '';
  @Input() visible = false;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}