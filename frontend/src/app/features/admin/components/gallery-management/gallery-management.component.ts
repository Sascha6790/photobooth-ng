import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/services/api/api';

@Component({
  selector: 'app-gallery-management',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gallery-management">
      <h2>Gallery Management</h2>
      <p>Gallery management features will be implemented here.</p>
    </div>
  `,
  styles: [`
    .gallery-management {
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h2 {
      margin: 0 0 1rem 0;
      color: #333;
    }
  `]
})
export class GalleryManagementComponent implements OnInit {
  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    // TODO: Load gallery data
  }
}