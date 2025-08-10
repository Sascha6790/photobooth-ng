import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarNavigationComponent } from '../sidebar-navigation/sidebar-navigation.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarNavigationComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  isSidebarCollapsed = false;
  currentRoute = '';
  
  stats = {
    totalPhotos: 0,
    todayPhotos: 0,
    totalPrints: 0,
    activeSession: false
  };

  ngOnInit(): void {
    // Load initial stats
    this.loadDashboardStats();
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  private loadDashboardStats(): void {
    // TODO: Load stats from API
  }
}