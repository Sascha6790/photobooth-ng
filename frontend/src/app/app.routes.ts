import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: '/photobooth',
    pathMatch: 'full'
  },
  {
    path: 'photobooth',
    loadChildren: () => import('./features/photobooth/photobooth-module').then(m => m.PhotoboothModule)
  },
  {
    path: 'gallery',
    loadChildren: () => import('./features/gallery/gallery-module').then(m => m.GalleryModule)
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin-module').then(m => m.AdminModule)
  },
  {
    path: '**',
    redirectTo: '/photobooth'
  }
];
