import { Component, forwardRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-number-stepper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="number-stepper" [class.disabled]="disabled">
      <button 
        type="button"
        class="stepper-btn decrease"
        [disabled]="disabled || value <= min"
        (click)="decrease()">
        -
      </button>
      
      <input 
        type="number"
        class="stepper-input"
        [value]="value"
        [min]="min"
        [max]="max"
        [step]="step"
        [disabled]="disabled"
        (input)="onInputChange($event)"
        (blur)="onTouched()">
      
      <button 
        type="button"
        class="stepper-btn increase"
        [disabled]="disabled || value >= max"
        (click)="increase()">
        +
      </button>
      
      <span class="stepper-suffix" *ngIf="suffix">{{ suffix }}</span>
    </div>
  `,
  styles: [`
    .number-stepper {
      display: inline-flex;
      align-items: center;
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
      background: white;
      
      &.disabled {
        opacity: 0.6;
        background: #f5f5f5;
      }
    }
    
    .stepper-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: #f9f9f9;
      color: #333;
      font-size: 1.2rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:hover:not(:disabled) {
        background: #667eea;
        color: white;
      }
      
      &:disabled {
        cursor: not-allowed;
        opacity: 0.4;
      }
      
      &.decrease {
        border-right: 1px solid #ddd;
      }
      
      &.increase {
        border-left: 1px solid #ddd;
      }
    }
    
    .stepper-input {
      width: 80px;
      height: 36px;
      border: none;
      text-align: center;
      font-size: 1rem;
      font-weight: 500;
      color: #333;
      background: transparent;
      
      &:focus {
        outline: none;
        background: #f5f7ff;
      }
      
      // Hide spinner buttons
      &::-webkit-inner-spin-button,
      &::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      
      &[type=number] {
        -moz-appearance: textfield;
      }
    }
    
    .stepper-suffix {
      padding: 0 0.75rem;
      color: #666;
      font-size: 0.9rem;
      border-left: 1px solid #ddd;
      background: #f9f9f9;
      height: 36px;
      display: flex;
      align-items: center;
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NumberStepperComponent),
      multi: true
    }
  ]
})
export class NumberStepperComponent implements ControlValueAccessor {
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() suffix = '';
  
  value = 0;
  disabled = false;
  
  private onChange: (value: number) => void = () => {};
  onTouched: () => void = () => {};
  
  writeValue(value: number): void {
    if (value !== null && value !== undefined) {
      this.value = this.clampValue(value);
    }
  }
  
  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
  
  increase(): void {
    if (this.value < this.max) {
      this.value = this.clampValue(this.value + this.step);
      this.onChange(this.value);
      this.onTouched();
    }
  }
  
  decrease(): void {
    if (this.value > this.min) {
      this.value = this.clampValue(this.value - this.step);
      this.onChange(this.value);
      this.onTouched();
    }
  }
  
  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    
    if (!isNaN(value)) {
      this.value = this.clampValue(value);
      this.onChange(this.value);
    }
  }
  
  private clampValue(value: number): number {
    return Math.min(Math.max(value, this.min), this.max);
  }
}