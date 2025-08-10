import { Component, forwardRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  data?: string;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="file-upload-wrapper" [class.disabled]="disabled">
      <div 
        class="drop-zone"
        [class.dragover]="isDragOver"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()">
        
        <input 
          #fileInput
          type="file"
          [accept]="accept"
          [multiple]="multiple"
          [disabled]="disabled"
          (change)="onFileSelect($event)"
          hidden>
        
        <div class="drop-zone-content" *ngIf="!files || files.length === 0">
          <div class="upload-icon">📁</div>
          <p class="upload-text">
            Click to browse or drag and drop files here
          </p>
          <p class="upload-hint">{{ getAcceptHint() }}</p>
        </div>
        
        <div class="file-list" *ngIf="files && files.length > 0">
          <div *ngFor="let file of files; let i = index" class="file-item">
            <div class="file-icon">{{ getFileIcon(file.type) }}</div>
            <div class="file-info">
              <div class="file-name">{{ file.name }}</div>
              <div class="file-size">{{ formatFileSize(file.size) }}</div>
            </div>
            <button 
              type="button"
              class="remove-btn"
              (click)="removeFile(i, $event)"
              [disabled]="disabled">
              ✕
            </button>
          </div>
        </div>
      </div>
      
      <div class="file-upload-footer" *ngIf="showProgress && uploadProgress > 0">
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="uploadProgress"></div>
        </div>
        <span class="progress-text">{{ uploadProgress }}%</span>
      </div>
    </div>
  `,
  styles: [`
    .file-upload-wrapper {
      width: 100%;
      
      &.disabled {
        opacity: 0.6;
        pointer-events: none;
      }
    }
    
    .drop-zone {
      border: 2px dashed #ddd;
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      background: #f9f9f9;
      min-height: 150px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:hover {
        border-color: #667eea;
        background: #f5f7ff;
      }
      
      &.dragover {
        border-color: #667eea;
        background: #e8ecff;
        transform: scale(1.02);
      }
    }
    
    .drop-zone-content {
      .upload-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }
      
      .upload-text {
        font-size: 1rem;
        color: #333;
        margin-bottom: 0.5rem;
      }
      
      .upload-hint {
        font-size: 0.875rem;
        color: #999;
      }
    }
    
    .file-list {
      width: 100%;
    }
    
    .file-item {
      display: flex;
      align-items: center;
      padding: 0.75rem;
      background: white;
      border-radius: 4px;
      margin-bottom: 0.5rem;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .file-icon {
        font-size: 1.5rem;
        margin-right: 1rem;
      }
      
      .file-info {
        flex: 1;
        text-align: left;
        
        .file-name {
          font-weight: 500;
          color: #333;
          margin-bottom: 0.25rem;
        }
        
        .file-size {
          font-size: 0.875rem;
          color: #999;
        }
      }
      
      .remove-btn {
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s;
        
        &:hover {
          background: #cc0000;
        }
      }
    }
    
    .file-upload-footer {
      margin-top: 1rem;
      
      .progress-bar {
        height: 8px;
        background: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 0.5rem;
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transition: width 0.3s;
        }
      }
      
      .progress-text {
        font-size: 0.875rem;
        color: #666;
      }
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileUploadComponent),
      multi: true
    }
  ]
})
export class FileUploadComponent implements ControlValueAccessor {
  @Input() accept = '*';
  @Input() multiple = false;
  @Input() maxSize = 10485760; // 10MB default
  @Input() showProgress = false;
  @Output() fileSelected = new EventEmitter<FileInfo[]>();
  @Output() fileRemoved = new EventEmitter<number>();
  
  files: FileInfo[] = [];
  isDragOver = false;
  disabled = false;
  uploadProgress = 0;
  
  private onChange: (value: FileInfo[]) => void = () => {};
  private onTouched: () => void = () => {};
  
  writeValue(value: FileInfo[]): void {
    if (value) {
      this.files = value;
    }
  }
  
  registerOnChange(fn: (value: FileInfo[]) => void): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
  
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(input.files);
    }
  }
  
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }
  
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }
  
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    
    if (event.dataTransfer?.files) {
      this.processFiles(event.dataTransfer.files);
    }
  }
  
  private processFiles(fileList: FileList): void {
    const files = Array.from(fileList);
    const validFiles: FileInfo[] = [];
    
    for (const file of files) {
      if (this.validateFile(file)) {
        const fileInfo: FileInfo = {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        };
        
        // Read file as base64 if needed
        const reader = new FileReader();
        reader.onload = (e) => {
          fileInfo.data = e.target?.result as string;
          validFiles.push(fileInfo);
          
          if (validFiles.length === files.length || !this.multiple) {
            this.updateFiles(validFiles);
          }
        };
        reader.readAsDataURL(file);
        
        if (!this.multiple) {
          break;
        }
      }
    }
  }
  
  private validateFile(file: File): boolean {
    // Check file size
    if (file.size > this.maxSize) {
      console.error(`File ${file.name} exceeds maximum size of ${this.formatFileSize(this.maxSize)}`);
      return false;
    }
    
    // Check file type
    if (this.accept !== '*') {
      const acceptedTypes = this.accept.split(',').map(t => t.trim());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const fileType = file.type;
      
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase();
        }
        if (type.endsWith('/*')) {
          return fileType.startsWith(type.replace('/*', ''));
        }
        return fileType === type;
      });
      
      if (!isAccepted) {
        console.error(`File ${file.name} type not accepted`);
        return false;
      }
    }
    
    return true;
  }
  
  private updateFiles(newFiles: FileInfo[]): void {
    if (this.multiple) {
      this.files = [...this.files, ...newFiles];
    } else {
      this.files = newFiles;
    }
    
    this.onChange(this.files);
    this.onTouched();
    this.fileSelected.emit(this.files);
  }
  
  removeFile(index: number, event: Event): void {
    event.stopPropagation();
    this.files.splice(index, 1);
    this.onChange(this.files);
    this.fileRemoved.emit(index);
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  getFileIcon(type: string): string {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    return '📎';
  }
  
  getAcceptHint(): string {
    if (this.accept === '*') return 'All file types accepted';
    if (this.accept.includes('image')) return 'Image files only';
    if (this.accept.includes('video')) return 'Video files only';
    if (this.accept.includes('audio')) return 'Audio files only';
    return `Accepted: ${this.accept}`;
  }
}