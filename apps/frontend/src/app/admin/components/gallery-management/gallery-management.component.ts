import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { WebsocketService } from '../../../core/services/websocket.service';

interface GalleryImage {
  id: string;
  filename: string;
  path: string;
  thumbnail?: string;
  size: number;
  width: number;
  height: number;
  createdAt: Date;
  printCount: number;
  selected?: boolean;
}

interface GalleryStats {
  totalImages: number;
  totalSize: number;
  averageSize: number;
  oldestImage?: GalleryImage;
  newestImage?: GalleryImage;
}

@Component({
  selector: 'app-gallery-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './gallery-management.component.html',
  styleUrls: ['./gallery-management.component.scss']
})
export class GalleryManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  images: GalleryImage[] = [];
  selectedImages: GalleryImage[] = [];
  statistics: GalleryStats | null = null;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;
  totalItems = 0;
  
  // Filters
  sortBy: 'date' | 'name' | 'size' = 'date';
  sortOrder: 'asc' | 'desc' = 'desc';
  searchTerm = '';
  fromDate = '';
  toDate = '';
  
  // UI States
  isLoading = false;
  selectAll = false;
  viewMode: 'grid' | 'list' = 'grid';
  showDeleteConfirm = false;
  showRebuildConfirm = false;
  rebuildProgress = 0;
  
  constructor(
    private apiService: ApiService,
    private websocketService: WebsocketService
  ) {}
  
  ngOnInit(): void {
    this.loadImages();
    this.loadStatistics();
    this.subscribeToGalleryUpdates();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private subscribeToGalleryUpdates(): void {
    this.websocketService.on('gallery-update')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadImages();
        this.loadStatistics();
      });
  }
  
  loadImages(): void {
    this.isLoading = true;
    
    const params = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      search: this.searchTerm,
      fromDate: this.fromDate,
      toDate: this.toDate
    };
    
    this.apiService.get<any>('/gallery', { params })
      .subscribe({
        next: (response) => {
          this.images = response.images.map((img: any) => ({
            ...img,
            selected: false
          }));
          this.totalItems = response.total;
          this.totalPages = response.totalPages;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load images:', error);
          this.isLoading = false;
        }
      });
  }
  
  loadStatistics(): void {
    this.apiService.get<GalleryStats>('/gallery/statistics')
      .subscribe({
        next: (stats) => {
          this.statistics = stats;
        },
        error: (error) => {
          console.error('Failed to load statistics:', error);
        }
      });
  }
  
  toggleImageSelection(image: GalleryImage): void {
    image.selected = !image.selected;
    this.updateSelectedImages();
  }
  
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    this.images.forEach(img => img.selected = this.selectAll);
    this.updateSelectedImages();
  }
  
  private updateSelectedImages(): void {
    this.selectedImages = this.images.filter(img => img.selected);
  }
  
  deleteSelected(): void {
    if (this.selectedImages.length === 0) return;
    
    this.showDeleteConfirm = true;
  }
  
  confirmDelete(): void {
    const ids = this.selectedImages.map(img => img.id);
    
    this.apiService.post('/gallery/bulk-delete', { ids })
      .subscribe({
        next: (response: any) => {
          console.log(`Deleted ${response.deleted} images`);
          this.showDeleteConfirm = false;
          this.loadImages();
          this.loadStatistics();
        },
        error: (error) => {
          console.error('Failed to delete images:', error);
          this.showDeleteConfirm = false;
        }
      });
  }
  
  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }
  
  rebuildDatabase(): void {
    this.showRebuildConfirm = true;
  }
  
  confirmRebuild(): void {
    this.showRebuildConfirm = false;
    this.rebuildProgress = 0;
    
    this.apiService.post('/gallery/rebuild', {})
      .subscribe({
        next: (response: any) => {
          console.log(`Database rebuilt: ${response.count} images in ${response.duration}ms`);
          this.loadImages();
          this.loadStatistics();
        },
        error: (error) => {
          console.error('Failed to rebuild database:', error);
        }
      });
  }
  
  cancelRebuild(): void {
    this.showRebuildConfirm = false;
  }
  
  downloadSelected(): void {
    if (this.selectedImages.length === 0) return;
    
    // Create zip download
    const ids = this.selectedImages.map(img => img.id);
    
    this.apiService.post('/gallery/download', { ids }, { responseType: 'blob' })
      .subscribe({
        next: (blob: any) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `photos_${new Date().getTime()}.zip`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Failed to download images:', error);
        }
      });
  }
  
  printSelected(): void {
    if (this.selectedImages.length === 0) return;
    
    const ids = this.selectedImages.map(img => img.id);
    
    this.apiService.post('/print/batch', { imageIds: ids })
      .subscribe({
        next: (response) => {
          console.log('Print jobs created:', response);
        },
        error: (error) => {
          console.error('Failed to create print jobs:', error);
        }
      });
  }
  
  onSortChange(): void {
    this.currentPage = 1;
    this.loadImages();
  }
  
  onFilterChange(): void {
    this.currentPage = 1;
    this.loadImages();
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadImages();
    }
  }
  
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadImages();
    }
  }
  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadImages();
    }
  }
  
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  formatDate(date: Date | string): string {
    return new Date(date).toLocaleString();
  }
}