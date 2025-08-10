import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SharedModule } from '../../../../shared/shared-module';
import { ApiService, GalleryResponse } from '../../../../core/services/api/api';
import { ConfigService } from '../../../../core/services/config/config';
import { LanguageService } from '../../../../core/services/language/language';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule, TranslatePipe],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss']
})
export class GalleryComponent implements OnInit {
  images: string[] = [];
  currentPage = 1;
  totalImages = 0;
  imagesPerPage = 20;
  isLoading = false;
  selectedImage: string | null = null;
  showLightbox = false;
  Math = Math;
  
  get totalPages(): number {
    return Math.ceil(this.totalImages / this.imagesPerPage);
  }
  
  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private languageService: LanguageService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadGallery();
  }
  
  loadGallery(): void {
    this.isLoading = true;
    
    this.apiService.getGallery(this.currentPage, this.imagesPerPage).subscribe({
      next: (response: GalleryResponse) => {
        this.images = response.images;
        this.totalImages = response.total;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load gallery:', error);
        this.isLoading = false;
      }
    });
  }
  
  openImage(image: string): void {
    this.selectedImage = image;
    this.showLightbox = true;
  }
  
  closeLightbox(): void {
    this.showLightbox = false;
    this.selectedImage = null;
  }
  
  nextPage(): void {
    if (this.hasNextPage()) {
      this.currentPage++;
      this.loadGallery();
    }
  }
  
  previousPage(): void {
    if (this.hasPreviousPage()) {
      this.currentPage--;
      this.loadGallery();
    }
  }
  
  hasNextPage(): boolean {
    return this.currentPage * this.imagesPerPage < this.totalImages;
  }
  
  hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }
  
  downloadImage(image: string): void {
    const filename = image.split('/').pop() || 'photo.jpg';
    this.apiService.downloadPhoto(filename).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Download failed:', error);
      }
    });
  }
  
  deleteImage(image: string): void {
    const filename = image.split('/').pop() || '';
    
    if (confirm(this.languageService.translate('gallery.confirmDelete') || 'Delete this image?')) {
      this.apiService.deletePhoto(filename).subscribe({
        next: () => {
          this.images = this.images.filter(img => img !== image);
          this.totalImages--;
        },
        error: (error) => {
          console.error('Delete failed:', error);
        }
      });
    }
  }
  
  goBack(): void {
    this.router.navigate(['/photobooth']);
  }
}