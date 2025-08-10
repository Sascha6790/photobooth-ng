import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../../core/services/api/api';

@Component({
  selector: 'app-chromakey-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="chromakey-settings">
      <h2>Chroma Key Settings</h2>
      <form [formGroup]="chromakeyForm" (ngSubmit)="saveSettings()">
        <div class="form-group">
          <label>
            <input type="checkbox" formControlName="enabled">
            Enable Chroma Key
          </label>
        </div>
        
        <div class="form-group">
          <label for="keyColor">Key Color</label>
          <input 
            id="keyColor" 
            type="color" 
            formControlName="keyColor"
            class="color-input">
        </div>
        
        <div class="form-group">
          <label for="tolerance">Color Tolerance</label>
          <input 
            id="tolerance" 
            type="range" 
            formControlName="tolerance"
            min="0" 
            max="100"
            class="range-input">
          <span class="range-value">{{ chromakeyForm.get('tolerance')?.value }}</span>
        </div>
        
        <div class="form-group">
          <label for="smoothing">Edge Smoothing</label>
          <input 
            id="smoothing" 
            type="range" 
            formControlName="smoothing"
            min="0" 
            max="10"
            class="range-input">
          <span class="range-value">{{ chromakeyForm.get('smoothing')?.value }}</span>
        </div>
        
        <button type="submit" class="btn btn-primary" [disabled]="!chromakeyForm.valid">
          Save Settings
        </button>
      </form>
    </div>
  `,
  styles: [`
    .chromakey-settings {
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 600px;
    }
    h2 {
      margin: 0 0 2rem 0;
      color: #333;
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #555;
    }
    .color-input {
      width: 100px;
      height: 40px;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
    }
    .range-input {
      width: calc(100% - 60px);
      margin-right: 10px;
    }
    .range-value {
      font-weight: 500;
      color: #667eea;
    }
    .btn {
      padding: 0.5rem 1.25rem;
      border: none;
      border-radius: 4px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class ChromakeySettingsComponent implements OnInit {
  chromakeyForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.chromakeyForm = this.fb.group({
      enabled: [false],
      keyColor: ['#00FF00', Validators.required],
      tolerance: [30, [Validators.min(0), Validators.max(100)]],
      smoothing: [2, [Validators.min(0), Validators.max(10)]]
    });
    
    this.loadSettings();
  }

  loadSettings(): void {
    // TODO: Load chromakey settings from API
  }

  saveSettings(): void {
    if (this.chromakeyForm.valid) {
      const settings = this.chromakeyForm.value;
      // TODO: Save settings via API
      console.log('Saving chromakey settings:', settings);
    }
  }
}