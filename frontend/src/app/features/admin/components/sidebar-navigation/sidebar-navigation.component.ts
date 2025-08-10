import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  children?: NavItem[];
}

@Component({
  selector: 'app-sidebar-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './sidebar-navigation.component.html',
  styleUrls: ['./sidebar-navigation.component.scss']
})
export class SidebarNavigationComponent {
  @Input() collapsed = false;
  @Output() toggleCollapse = new EventEmitter<void>();
  
  activeRoute = '';
  expandedItems: Set<string> = new Set();
  
  navItems: NavItem[] = [
    {
      label: 'admin.dashboard',
      icon: '📊',
      route: '/admin'
    },
    {
      label: 'admin.settings',
      icon: '⚙️',
      route: '/admin/settings',
      children: [
        { label: 'settings.language', icon: '🌐', route: '/admin/settings' },
        { label: 'settings.camera', icon: '📷', route: '/admin/settings#camera' },
        { label: 'settings.print', icon: '🖨️', route: '/admin/settings#printer' },
        { label: 'admin.gallery', icon: '🖼️', route: '/admin/settings#gallery' }
      ]
    },
    {
      label: 'admin.gallery',
      icon: '🖼️',
      route: '/admin/gallery'
    },
    {
      label: 'settings.chromakey',
      icon: '🎨',
      route: '/admin/chromakey'
    },
    {
      label: 'admin.system',
      icon: '💻',
      route: '/admin/system',
      children: [
        { label: 'admin.statistics', icon: '📈', route: '/admin/system' },
        { label: 'admin.logs', icon: '📄', route: '/admin/system#logs' },
        { label: 'settings.storage', icon: '💾', route: '/admin/system#backup' }
      ]
    }
  ];

  constructor(private router: Router) {
    this.activeRoute = this.router.url;
    this.router.events.subscribe(() => {
      this.activeRoute = this.router.url;
    });
  }

  toggleSidebar(): void {
    this.toggleCollapse.emit();
  }

  toggleExpanded(item: NavItem): void {
    if (item.children) {
      if (this.expandedItems.has(item.label)) {
        this.expandedItems.delete(item.label);
      } else {
        this.expandedItems.add(item.label);
      }
    }
  }

  isExpanded(item: NavItem): boolean {
    return this.expandedItems.has(item.label);
  }

  isActive(route: string): boolean {
    if (route === '/admin' && this.activeRoute === '/admin') {
      return true;
    }
    return this.activeRoute.startsWith(route) && route !== '/admin';
  }

  navigate(route: string): void {
    this.router.navigateByUrl(route);
  }
}