import { Component, forwardRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="color-picker-wrapper">
      <div class="color-preview" [style.background-color]="value" (click)="openPicker()">
        <input 
          #colorInput
          type="color" 
          [value]="value"
          (change)="onColorChange($event)"
          [disabled]="disabled"
          class="hidden-input">
      </div>
      <div class="color-value">{{ value }}</div>
      <div class="preset-colors" *ngIf="showPresets">
        <div 
          *ngFor="let color of presetColors"
          class="preset-color"
          [style.background-color]="color"
          (click)="selectPreset(color)"
          [title]="color">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .color-picker-wrapper {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .color-preview {
      width: 60px;
      height: 40px;
      border: 2px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      position: relative;
      transition: border-color 0.2s;
      
      &:hover {
        border-color: #667eea;
      }
    }
    
    .hidden-input {
      position: absolute;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }
    
    .color-value {
      font-family: monospace;
      font-size: 0.9rem;
      color: #555;
      min-width: 80px;
    }
    
    .preset-colors {
      display: flex;
      gap: 0.5rem;
    }
    
    .preset-color {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid #ddd;
      cursor: pointer;
      transition: transform 0.2s, border-color 0.2s;
      
      &:hover {
        transform: scale(1.2);
        border-color: #667eea;
      }
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ColorPickerComponent),
      multi: true
    }
  ]
})
export class ColorPickerComponent implements ControlValueAccessor {
  @Input() showPresets = false;
  @Input() presetColors: string[] = [
    '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF',
    '#000000', '#FFFFFF', '#808080'
  ];
  
  value = '#000000';
  disabled = false;
  
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  
  writeValue(value: string): void {
    if (value) {
      this.value = value;
    }
  }
  
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
  
  onColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this.onChange(this.value);
    this.onTouched();
  }
  
  selectPreset(color: string): void {
    this.value = color;
    this.onChange(this.value);
    this.onTouched();
  }
  
  openPicker(): void {
    const input = document.querySelector('.hidden-input') as HTMLInputElement;
    if (input && !this.disabled) {
      input.click();
    }
  }
}