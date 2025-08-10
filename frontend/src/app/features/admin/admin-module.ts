import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { AdminRoutingModule } from './admin-routing-module';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { SidebarNavigationComponent } from './components/sidebar-navigation/sidebar-navigation.component';
import { SharedModule } from '../../shared/shared-module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AdminRoutingModule,
    SharedModule,
    AdminDashboardComponent,
    SidebarNavigationComponent
  ]
})
export class AdminModule { }
