import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: AdminDashboardComponent,
    children: [
      {
        path: '',
        redirectTo: 'settings',
        pathMatch: 'full'
      },
      {
        path: 'settings',
        loadComponent: () => import('./components/settings-form/settings-form.component').then(c => c.SettingsFormComponent)
      },
      {
        path: 'gallery',
        loadComponent: () => import('./components/gallery-management/gallery-management.component').then(c => c.GalleryManagementComponent)
      },
      {
        path: 'system',
        loadComponent: () => import('./components/system-control/system-control.component').then(c => c.SystemControlComponent)
      },
      {
        path: 'chromakey',
        loadComponent: () => import('./components/chromakey-settings/chromakey-settings.component').then(c => c.ChromakeySettingsComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
