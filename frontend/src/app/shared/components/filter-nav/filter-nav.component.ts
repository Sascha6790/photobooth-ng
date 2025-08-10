import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

export interface Filter {
  id: string;
  name: string;
  icon?: string;
  preview?: string;
  active?: boolean;
  intensity?: number;
  params?: any;
}

export interface FilterCategory {
  name: string;
  filters: Filter[];
}

@Component({
  selector: 'app-filter-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filter-nav.component.html',
  styleUrls: ['./filter-nav.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(-100%)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class FilterNavComponent implements OnInit {
  @Input() filters: Filter[] = [];
  @Input() categories: FilterCategory[] = [];
  @Input() position: 'left' | 'right' | 'bottom' | 'top' = 'left';
  @Input() showPreview = true;
  @Input() showIntensitySlider = true;
  @Input() multiSelect = false;
  @Input() collapsed = false;
  @Output() filterSelect = new EventEmitter<Filter>();
  @Output() filterChange = new EventEmitter<Filter[]>();
  @Output() intensityChange = new EventEmitter<{filter: Filter, intensity: number}>();
  
  selectedFilters: Filter[] = [];
  activeCategory: FilterCategory | null = null;
  searchTerm = '';
  hoveredFilter: Filter | null = null;
  
  // Default filters if none provided
  defaultFilters: Filter[] = [
    { id: 'none', name: 'Original', icon: '🖼️' },
    { id: 'grayscale', name: 'Black & White', icon: '⚫' },
    { id: 'sepia', name: 'Sepia', icon: '🟤' },
    { id: 'blur', name: 'Blur', icon: '💨' },
    { id: 'sharpen', name: 'Sharpen', icon: '🔍' },
    { id: 'vintage', name: 'Vintage', icon: '📷' },
    { id: 'warm', name: 'Warm', icon: '☀️' },
    { id: 'cool', name: 'Cool', icon: '❄️' },
    { id: 'contrast', name: 'High Contrast', icon: '◐' },
    { id: 'brightness', name: 'Brightness', icon: '💡' },
    { id: 'saturation', name: 'Vibrant', icon: '🌈' },
    { id: 'invert', name: 'Invert', icon: '🔄' }
  ];
  
  defaultCategories: FilterCategory[] = [
    {
      name: 'Basic',
      filters: [
        { id: 'none', name: 'Original', icon: '🖼️' },
        { id: 'grayscale', name: 'Black & White', icon: '⚫' },
        { id: 'sepia', name: 'Sepia', icon: '🟤' }
      ]
    },
    {
      name: 'Effects',
      filters: [
        { id: 'blur', name: 'Blur', icon: '💨' },
        { id: 'sharpen', name: 'Sharpen', icon: '🔍' },
        { id: 'vintage', name: 'Vintage', icon: '📷' }
      ]
    },
    {
      name: 'Color',
      filters: [
        { id: 'warm', name: 'Warm', icon: '☀️' },
        { id: 'cool', name: 'Cool', icon: '❄️' },
        { id: 'saturation', name: 'Vibrant', icon: '🌈' }
      ]
    },
    {
      name: 'Advanced',
      filters: [
        { id: 'contrast', name: 'High Contrast', icon: '◐' },
        { id: 'brightness', name: 'Brightness', icon: '💡' },
        { id: 'invert', name: 'Invert', icon: '🔄' }
      ]
    }
  ];
  
  get displayFilters(): Filter[] {
    if (this.searchTerm) {
      return this.getAllFilters().filter(f => 
        f.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    
    if (this.activeCategory) {
      return this.activeCategory.filters;
    }
    
    return this.filters.length > 0 ? this.filters : this.defaultFilters;
  }
  
  get positionClass(): string {
    return `filter-nav-${this.position}`;
  }
  
  ngOnInit(): void {
    if (this.filters.length === 0 && this.categories.length === 0) {
      this.categories = this.defaultCategories;
    }
    
    // Select first filter by default
    const firstFilter = this.displayFilters[0];
    if (firstFilter && !this.multiSelect) {
      this.selectFilter(firstFilter);
    }
  }
  
  getAllFilters(): Filter[] {
    if (this.categories.length > 0) {
      return this.categories.reduce((acc, cat) => [...acc, ...cat.filters], [] as Filter[]);
    }
    return this.filters.length > 0 ? this.filters : this.defaultFilters;
  }
  
  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
  }
  
  selectCategory(category: FilterCategory | null): void {
    this.activeCategory = category;
  }
  
  selectFilter(filter: Filter): void {
    if (this.multiSelect) {
      const index = this.selectedFilters.findIndex(f => f.id === filter.id);
      if (index >= 0) {
        this.selectedFilters.splice(index, 1);
      } else {
        this.selectedFilters.push(filter);
      }
      this.filterChange.emit(this.selectedFilters);
    } else {
      this.selectedFilters = [filter];
      filter.active = true;
      
      // Deactivate other filters
      this.getAllFilters().forEach(f => {
        if (f.id !== filter.id) {
          f.active = false;
        }
      });
    }
    
    this.filterSelect.emit(filter);
  }
  
  isFilterSelected(filter: Filter): boolean {
    return this.selectedFilters.some(f => f.id === filter.id);
  }
  
  onIntensityChange(filter: Filter, event: Event): void {
    const input = event.target as HTMLInputElement;
    const intensity = parseInt(input.value) / 100;
    filter.intensity = intensity;
    this.intensityChange.emit({ filter, intensity });
  }
  
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
  }
  
  clearSearch(): void {
    this.searchTerm = '';
  }
  
  resetFilters(): void {
    this.selectedFilters = [];
    this.getAllFilters().forEach(f => {
      f.active = false;
      f.intensity = 1;
    });
    
    // Select original/none filter
    const originalFilter = this.getAllFilters().find(f => f.id === 'none');
    if (originalFilter) {
      this.selectFilter(originalFilter);
    }
  }
  
  onFilterHover(filter: Filter): void {
    this.hoveredFilter = filter;
  }
  
  onFilterLeave(): void {
    this.hoveredFilter = null;
  }
}