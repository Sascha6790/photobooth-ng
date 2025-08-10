import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PhotoboothContainerComponent } from './components/photobooth-container/photobooth-container.component';

const routes: Routes = [
  {
    path: '',
    component: PhotoboothContainerComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PhotoboothRoutingModule { }
