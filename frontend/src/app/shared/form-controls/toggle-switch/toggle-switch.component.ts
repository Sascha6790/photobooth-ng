import { Component, forwardRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="toggle-switch" [class.disabled]="disabled">
      <input 
        type="checkbox"
        [checked]="value"
        [disabled]="disabled"
        (change)="onToggle($event)"
        class="toggle-input">
      <span class="toggle-slider" [class.checked]="value">
        <span class="toggle-thumb"></span>
      </span>
      <span class="toggle-label" *ngIf="label">{{ label }}</span>
    </label>
  `,
  styles: [`
    .toggle-switch {
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      user-select: none;
      
      &.disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
    
    .toggle-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .toggle-slider {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 24px;
      background-color: #ccc;
      border-radius: 24px;
      transition: background-color 0.3s;
      
      &.checked {
        background-color: #667eea;
        
        .toggle-thumb {
          transform: translateX(24px);
        }
      }
    }
    
    .toggle-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background-color: white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      transition: transform 0.3s;
    }
    
    .toggle-label {
      margin-left: 0.75rem;
      font-size: 0.9rem;
      color: #333;
    }
    
    .toggle-input:focus + .toggle-slider {
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleSwitchComponent),
      multi: true
    }
  ]
})
export class ToggleSwitchComponent implements ControlValueAccessor {
  @Input() label = '';
  
  value = false;
  disabled = false;
  
  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};
  
  writeValue(value: boolean): void {
    this.value = !!value;
  }
  
  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
  
  onToggle(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.value = input.checked;
    this.onChange(this.value);
    this.onTouched();
  }
}