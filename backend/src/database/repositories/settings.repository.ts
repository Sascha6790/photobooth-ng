import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Settings, SettingCategory, SettingType } from '../entities/settings.entity';
import { CacheService, Cacheable, CacheInvalidate } from '../services/cache.service';

export interface SettingValue {
  key: string;
  value: any;
  category?: SettingCategory;
}

export interface SettingsExport {
  version: string;
  exportedAt: Date;
  settings: Array<{
    key: string;
    value: any;
    category: SettingCategory;
    type: SettingType;
  }>;
}

@Injectable()
export class SettingsRepository extends BaseRepository<Settings> {
  constructor(
    @InjectRepository(Settings)
    protected readonly repository: Repository<Settings>,
    private readonly cacheService: CacheService
  ) {
    super(repository);
  }

  /**
   * Get setting by key
   */
  @Cacheable({ ttl: 600 })
  async getSetting(key: string): Promise<Settings | null> {
    return await this.repository.findOne({ where: { key } });
  }

  /**
   * Get setting value
   */
  @Cacheable({ ttl: 600 })
  async getValue<T = any>(key: string, defaultValue?: T): Promise<T> {
    const setting = await this.getSetting(key);
    if (!setting) {
      return defaultValue as T;
    }
    return setting.getValue<T>();
  }

  /**
   * Set setting value
   */
  @CacheInvalidate(['Settings:*'])
  async setValue(key: string, value: any, modifiedBy?: string): Promise<Settings> {
    let setting = await this.getSetting(key);
    
    if (!setting) {
      // Create new setting
      setting = this.repository.create({
        key,
        type: this.detectType(value),
        category: SettingCategory.GENERAL,
      });
    }

    // Validate value
    if (!setting.validate(value)) {
      throw new Error(`Invalid value for setting ${key}`);
    }

    setting.setValue(value, modifiedBy);
    return await this.repository.save(setting);
  }

  /**
   * Set multiple settings
   */
  @CacheInvalidate(['Settings:*'])
  async setMultiple(
    settings: SettingValue[],
    modifiedBy?: string
  ): Promise<Settings[]> {
    const results: Settings[] = [];

    for (const { key, value, category } of settings) {
      let setting = await this.getSetting(key);
      
      if (!setting) {
        setting = this.repository.create({
          key,
          type: this.detectType(value),
          category: category || SettingCategory.GENERAL,
        });
      }

      if (!setting.validate(value)) {
        throw new Error(`Invalid value for setting ${key}`);
      }

      setting.setValue(value, modifiedBy);
      results.push(await this.repository.save(setting));
    }

    return results;
  }

  /**
   * Get settings by category
   */
  @Cacheable({ ttl: 600 })
  async getByCategory(category: SettingCategory): Promise<Settings[]> {
    return await this.repository.find({
      where: { category, isActive: true },
      order: { key: 'ASC' },
    });
  }

  /**
   * Get all settings
   */
  @Cacheable({ ttl: 600 })
  async getAllSettings(includeSystem: boolean = false): Promise<Settings[]> {
    const where: any = { isActive: true };
    if (!includeSystem) {
      where.isSystem = false;
    }

    return await this.repository.find({
      where,
      order: { category: 'ASC', key: 'ASC' },
    });
  }

  /**
   * Get settings as key-value map
   */
  async getAsMap(category?: SettingCategory): Promise<Map<string, any>> {
    const settings = category
      ? await this.getByCategory(category)
      : await this.getAllSettings();

    const map = new Map<string, any>();
    settings.forEach(setting => {
      map.set(setting.key, setting.getValue());
    });

    return map;
  }

  /**
   * Get settings as object
   */
  async getAsObject(category?: SettingCategory): Promise<Record<string, any>> {
    const settings = category
      ? await this.getByCategory(category)
      : await this.getAllSettings();

    const obj: Record<string, any> = {};
    settings.forEach(setting => {
      obj[setting.key] = setting.getValue();
    });

    return obj;
  }

  /**
   * Reset setting to default
   */
  @CacheInvalidate(['Settings:*'])
  async resetToDefault(key: string, modifiedBy?: string): Promise<Settings | null> {
    const setting = await this.getSetting(key);
    if (!setting) {
      return null;
    }

    setting.resetToDefault(modifiedBy);
    return await this.repository.save(setting);
  }

  /**
   * Reset all settings in category to defaults
   */
  @CacheInvalidate(['Settings:*'])
  async resetCategoryToDefaults(
    category: SettingCategory,
    modifiedBy?: string
  ): Promise<number> {
    const settings = await this.getByCategory(category);
    
    for (const setting of settings) {
      setting.resetToDefault(modifiedBy);
      await this.repository.save(setting);
    }

    return settings.length;
  }

  /**
   * Create or update setting definition
   */
  @CacheInvalidate(['Settings:*'])
  async upsertDefinition(definition: Partial<Settings>): Promise<Settings> {
    let setting = await this.getSetting(definition.key!);
    
    if (!setting) {
      setting = this.repository.create(definition);
    } else {
      Object.assign(setting, definition);
    }

    return await this.repository.save(setting);
  }

  /**
   * Export settings
   */
  async exportSettings(category?: SettingCategory): Promise<SettingsExport> {
    const settings = category
      ? await this.getByCategory(category)
      : await this.getAllSettings();

    return {
      version: '1.0.0',
      exportedAt: new Date(),
      settings: settings.map(s => ({
        key: s.key,
        value: s.getValue(),
        category: s.category,
        type: s.type,
      })),
    };
  }

  /**
   * Import settings
   */
  @CacheInvalidate(['Settings:*'])
  async importSettings(
    data: SettingsExport,
    modifiedBy?: string,
    overwrite: boolean = false
  ): Promise<number> {
    let imported = 0;

    for (const item of data.settings) {
      const existing = await this.getSetting(item.key);
      
      if (!existing || overwrite) {
        await this.setValue(item.key, item.value, modifiedBy);
        imported++;
      }
    }

    return imported;
  }

  /**
   * Search settings
   */
  async searchSettings(term: string): Promise<Settings[]> {
    return await this.repository
      .createQueryBuilder('settings')
      .where('settings.key LIKE :term', { term: `%${term}%` })
      .orWhere('settings.label LIKE :term', { term: `%${term}%` })
      .orWhere('settings.description LIKE :term', { term: `%${term}%` })
      .andWhere('settings.isActive = :isActive', { isActive: true })
      .orderBy('settings.key', 'ASC')
      .getMany();
  }

  /**
   * Get change history
   */
  async getChangeHistory(key: string): Promise<Array<any>> {
    const setting = await this.getSetting(key);
    return setting?.changeHistory || [];
  }

  /**
   * Validate all settings
   */
  async validateAll(): Promise<Array<{ key: string; valid: boolean; error?: string }>> {
    const settings = await this.getAllSettings(true);
    const results: Array<{ key: string; valid: boolean; error?: string }> = [];

    for (const setting of settings) {
      const value = setting.getValue();
      const valid = setting.validate(value);
      
      results.push({
        key: setting.key,
        valid,
        error: valid ? undefined : 'Validation failed',
      });
    }

    return results;
  }

  /**
   * Get settings that require restart
   */
  async getRestartRequired(): Promise<Settings[]> {
    return await this.repository
      .createQueryBuilder('settings')
      .where("settings.metadata->>'requiresRestart' = 'true'")
      .getMany();
  }

  /**
   * Warm up cache with all settings
   */
  async warmUpCache(): Promise<void> {
    const settings = await this.getAllSettings(true);
    
    const cacheData = settings.map(s => ({
      key: `Settings:getSetting:["${s.key}"]`,
      value: s,
      ttl: 600,
    }));

    await this.cacheService.warmUp(cacheData);
  }

  /**
   * Private: Detect setting type from value
   */
  private detectType(value: any): SettingType {
    if (typeof value === 'boolean') return SettingType.BOOLEAN;
    if (typeof value === 'number') return SettingType.NUMBER;
    if (typeof value === 'object') return SettingType.JSON;
    if (typeof value === 'string') {
      if (value.startsWith('#') && value.length === 7) return SettingType.COLOR;
      if (value.startsWith('http://') || value.startsWith('https://')) return SettingType.URL;
      if (value.includes('/') || value.includes('\\')) return SettingType.FILE_PATH;
    }
    return SettingType.STRING;
  }
}