import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface AdminShortcutConfig {
  enabled: boolean;
  requirePin: boolean;
  pin?: string;
  gesture?: 'triple-tap' | 'long-press' | 'swipe-up';
  cornerTap?: boolean;
  keyboardShortcut?: string;
}

@Component({
  selector: 'app-admin-shortcut',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-shortcut.component.html',
  styleUrls: ['./admin-shortcut.component.scss']
})
export class AdminShortcutComponent implements OnInit, OnDestroy {
  @Input() config: AdminShortcutConfig = {
    enabled: true,
    requirePin: true,
    pin: '1234',
    gesture: 'triple-tap',
    cornerTap: true,
    keyboardShortcut: 'ctrl+shift+a'
  };
  @Output() adminAccess = new EventEmitter<boolean>();
  
  showPinDialog = false;
  enteredPin = '';
  pinError = false;
  
  private tapCount = 0;
  private tapTimer?: number;
  private longPressTimer?: number;
  private touchStartY = 0;
  private keyboardListener?: (e: KeyboardEvent) => void;
  
  constructor(private router: Router) {}
  
  ngOnInit(): void {
    if (this.config.enabled) {
      this.setupGestureListeners();
      this.setupKeyboardListener();
    }
  }
  
  ngOnDestroy(): void {
    this.cleanup();
  }
  
  private setupGestureListeners(): void {
    // Triple tap detection
    if (this.config.gesture === 'triple-tap') {
      document.addEventListener('click', this.handleTripleTap.bind(this));
    }
    
    // Long press detection
    if (this.config.gesture === 'long-press') {
      document.addEventListener('touchstart', this.handleTouchStart.bind(this));
      document.addEventListener('touchend', this.handleTouchEnd.bind(this));
      document.addEventListener('mousedown', this.handleMouseDown.bind(this));
      document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    // Swipe up detection
    if (this.config.gesture === 'swipe-up') {
      document.addEventListener('touchstart', this.handleSwipeStart.bind(this));
      document.addEventListener('touchend', this.handleSwipeEnd.bind(this));
    }
  }
  
  private setupKeyboardListener(): void {
    if (!this.config.keyboardShortcut) return;
    
    this.keyboardListener = (e: KeyboardEvent) => {
      const shortcut = this.config.keyboardShortcut?.toLowerCase();
      if (!shortcut) return;
      
      const parts = shortcut.split('+');
      const requireCtrl = parts.includes('ctrl');
      const requireShift = parts.includes('shift');
      const requireAlt = parts.includes('alt');
      const key = parts[parts.length - 1];
      
      if (
        e.key.toLowerCase() === key &&
        e.ctrlKey === requireCtrl &&
        e.shiftKey === requireShift &&
        e.altKey === requireAlt
      ) {
        e.preventDefault();
        this.triggerAdminAccess();
      }
    };
    
    document.addEventListener('keydown', this.keyboardListener);
  }
  
  private handleTripleTap(event: MouseEvent): void {
    // Check if corner tap
    if (this.config.cornerTap && this.isCornerTap(event)) {
      this.triggerAdminAccess();
      return;
    }
    
    this.tapCount++;
    
    if (this.tapTimer) {
      clearTimeout(this.tapTimer);
    }
    
    this.tapTimer = window.setTimeout(() => {
      this.tapCount = 0;
    }, 500);
    
    if (this.tapCount >= 3) {
      this.tapCount = 0;
      this.triggerAdminAccess();
    }
  }
  
  private isCornerTap(event: MouseEvent): boolean {
    const threshold = 50;
    const x = event.clientX;
    const y = event.clientY;
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return (
      (x < threshold && y < threshold) || // Top-left
      (x > width - threshold && y < threshold) || // Top-right
      (x < threshold && y > height - threshold) || // Bottom-left
      (x > width - threshold && y > height - threshold) // Bottom-right
    );
  }
  
  private handleTouchStart(event: TouchEvent): void {
    this.longPressTimer = window.setTimeout(() => {
      this.triggerAdminAccess();
    }, 2000);
  }
  
  private handleTouchEnd(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
  }
  
  private handleMouseDown(): void {
    this.longPressTimer = window.setTimeout(() => {
      this.triggerAdminAccess();
    }, 2000);
  }
  
  private handleMouseUp(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
  }
  
  private handleSwipeStart(event: TouchEvent): void {
    this.touchStartY = event.touches[0].clientY;
  }
  
  private handleSwipeEnd(event: TouchEvent): void {
    const touchEndY = event.changedTouches[0].clientY;
    const swipeDistance = this.touchStartY - touchEndY;
    
    if (swipeDistance > 100) { // Swipe up at least 100px
      this.triggerAdminAccess();
    }
  }
  
  private triggerAdminAccess(): void {
    if (this.config.requirePin) {
      this.showPinDialog = true;
      this.enteredPin = '';
      this.pinError = false;
    } else {
      this.grantAdminAccess();
    }
  }
  
  verifyPin(): void {
    if (this.enteredPin === this.config.pin) {
      this.grantAdminAccess();
      this.closePinDialog();
    } else {
      this.pinError = true;
      setTimeout(() => {
        this.pinError = false;
      }, 2000);
    }
  }
  
  private grantAdminAccess(): void {
    this.adminAccess.emit(true);
    this.router.navigate(['/admin']);
  }
  
  closePinDialog(): void {
    this.showPinDialog = false;
    this.enteredPin = '';
    this.pinError = false;
  }
  
  onPinKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.verifyPin();
    } else if (event.key === 'Escape') {
      this.closePinDialog();
    }
  }
  
  private cleanup(): void {
    document.removeEventListener('click', this.handleTripleTap.bind(this));
    document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    document.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    document.removeEventListener('touchstart', this.handleSwipeStart.bind(this));
    document.removeEventListener('touchend', this.handleSwipeEnd.bind(this));
    
    if (this.keyboardListener) {
      document.removeEventListener('keydown', this.keyboardListener);
    }
    
    if (this.tapTimer) {
      clearTimeout(this.tapTimer);
    }
    
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
  }
}