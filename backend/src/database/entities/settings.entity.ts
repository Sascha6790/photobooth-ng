import {
  Entity,
  Column,
  Index,
  VersionColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';

export enum SettingCategory {
  GENERAL = 'general',
  CAMERA = 'camera',
  PRINTER = 'printer',
  GALLERY = 'gallery',
  EFFECTS = 'effects',
  SHARING = 'sharing',
  HARDWARE = 'hardware',
  APPEARANCE = 'appearance',
  ADVANCED = 'advanced',
  SYSTEM = 'system',
}

export enum SettingType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  COLOR = 'color',
  FILE_PATH = 'file_path',
  URL = 'url',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
}

@Entity('settings')
@Index(['category', 'key'], { unique: true })
@Index(['category'])
export class Settings extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  @Index()
  key: string;

  @Column({ type: 'text', nullable: true })
  value?: string;

  @Column({
    type: 'simple-enum',
    enum: SettingType,
    default: SettingType.STRING,
  })
  type: SettingType;

  @Column({
    type: 'simple-enum',
    enum: SettingCategory,
    default: SettingCategory.GENERAL,
  })
  category: SettingCategory;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  defaultValue?: string;

  @Column({ type: 'simple-json', nullable: true })
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    options?: Array<{ value: string; label: string }>;
    fileTypes?: string[];
    [key: string]: any;
  };

  @Column({ type: 'simple-json', nullable: true })
  metadata?: {
    group?: string;
    order?: number;
    hidden?: boolean;
    readonly?: boolean;
    deprecated?: boolean;
    requiresRestart?: boolean;
    affectsPerformance?: boolean;
    experimental?: boolean;
    [key: string]: any;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ type: 'boolean', default: false })
  isEncrypted: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastModifiedBy?: string;

  @Column({ type: 'datetime', nullable: true })
  lastModifiedAt?: Date;

  @VersionColumn()
  version: number;

  @Column({ type: 'simple-json', nullable: true })
  changeHistory?: Array<{
    timestamp: Date;
    oldValue: string;
    newValue: string;
    changedBy: string;
    reason?: string;
  }>;

  // Helper methods
  getValue<T = any>(): T {
    if (!this.value) {
      return this.getDefaultValue<T>();
    }

    switch (this.type) {
      case SettingType.BOOLEAN:
        return (this.value === 'true' || this.value === '1') as any;
      case SettingType.NUMBER:
        return parseFloat(this.value) as any;
      case SettingType.JSON:
      case SettingType.MULTI_SELECT:
        try {
          return JSON.parse(this.value) as T;
        } catch {
          return this.getDefaultValue<T>();
        }
      default:
        return this.value as any;
    }
  }

  getDefaultValue<T = any>(): T {
    if (!this.defaultValue) {
      switch (this.type) {
        case SettingType.BOOLEAN:
          return false as any;
        case SettingType.NUMBER:
          return 0 as any;
        case SettingType.JSON:
        case SettingType.MULTI_SELECT:
          return [] as any;
        default:
          return '' as any;
      }
    }

    switch (this.type) {
      case SettingType.BOOLEAN:
        return (this.defaultValue === 'true' || this.defaultValue === '1') as any;
      case SettingType.NUMBER:
        return parseFloat(this.defaultValue) as any;
      case SettingType.JSON:
      case SettingType.MULTI_SELECT:
        try {
          return JSON.parse(this.defaultValue) as T;
        } catch {
          return [] as any;
        }
      default:
        return this.defaultValue as any;
    }
  }

  setValue(value: any, modifiedBy?: string): void {
    const oldValue = this.value;
    
    switch (this.type) {
      case SettingType.BOOLEAN:
        this.value = String(!!value);
        break;
      case SettingType.NUMBER:
        this.value = String(value);
        break;
      case SettingType.JSON:
      case SettingType.MULTI_SELECT:
        this.value = JSON.stringify(value);
        break;
      default:
        this.value = String(value);
    }

    this.lastModifiedAt = new Date();
    this.lastModifiedBy = modifiedBy || 'system';

    // Add to change history
    if (!this.changeHistory) {
      this.changeHistory = [];
    }
    this.changeHistory.push({
      timestamp: new Date(),
      oldValue: oldValue || '',
      newValue: this.value,
      changedBy: this.lastModifiedBy,
    });

    // Keep only last 10 changes
    if (this.changeHistory.length > 10) {
      this.changeHistory = this.changeHistory.slice(-10);
    }
  }

  resetToDefault(modifiedBy?: string): void {
    this.setValue(this.getDefaultValue(), modifiedBy);
  }

  validate(value: any): boolean {
    if (!this.validation) {
      return true;
    }

    if (this.validation.required && !value) {
      return false;
    }

    switch (this.type) {
      case SettingType.NUMBER:
        const numValue = parseFloat(value);
        if (this.validation.min !== undefined && numValue < this.validation.min) {
          return false;
        }
        if (this.validation.max !== undefined && numValue > this.validation.max) {
          return false;
        }
        break;
      case SettingType.STRING:
      case SettingType.FILE_PATH:
      case SettingType.URL:
        const strValue = String(value);
        if (this.validation.minLength !== undefined && strValue.length < this.validation.minLength) {
          return false;
        }
        if (this.validation.maxLength !== undefined && strValue.length > this.validation.maxLength) {
          return false;
        }
        if (this.validation.pattern) {
          const regex = new RegExp(this.validation.pattern);
          if (!regex.test(strValue)) {
            return false;
          }
        }
        break;
      case SettingType.SELECT:
        if (this.validation.options) {
          const validValues = this.validation.options.map(opt => opt.value);
          if (!validValues.includes(value)) {
            return false;
          }
        }
        break;
    }

    return true;
  }
}