import {
  Repository,
  DeepPartial,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
  SaveOptions,
  RemoveOptions,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Base repository with common CRUD operations and pagination
 */
export abstract class BaseRepository<T> {
  constructor(protected readonly repository: Repository<T>) {}

  /**
   * Create and save a new entity
   */
  async create(entityData: DeepPartial<T>, options?: SaveOptions): Promise<T> {
    const entity = this.repository.create(entityData);
    return await this.repository.save(entity, options);
  }

  /**
   * Create multiple entities
   */
  async createMany(entities: DeepPartial<T>[], options?: SaveOptions): Promise<T[]> {
    const createdEntities = this.repository.create(entities);
    return await this.repository.save(createdEntities, options);
  }

  /**
   * Find one entity by ID
   */
  async findById(id: string | number, options?: FindOneOptions<T>): Promise<T | null> {
    return await this.repository.findOne({
      ...options,
      where: { id } as any,
    });
  }

  /**
   * Find one entity by conditions
   */
  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return await this.repository.findOne(options);
  }

  /**
   * Find multiple entities
   */
  async find(options?: FindManyOptions<T>): Promise<T[]> {
    return await this.repository.find(options);
  }

  /**
   * Find all entities
   */
  async findAll(): Promise<T[]> {
    return await this.repository.find();
  }

  /**
   * Find entities with pagination
   */
  async findPaginated(
    options: FindManyOptions<T> = {},
    paginationOptions: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const {
      page = 1,
      limit = 10,
      orderBy = 'createdAt',
      orderDirection = 'DESC',
    } = paginationOptions;

    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      ...options,
      skip,
      take: limit,
      order: {
        [orderBy]: orderDirection,
      } as any,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Count entities
   */
  async count(options?: FindManyOptions<T>): Promise<number> {
    return await this.repository.count(options);
  }

  /**
   * Update an entity
   */
  async update(
    id: string | number,
    partialEntity: QueryDeepPartialEntity<T>
  ): Promise<T | null> {
    await this.repository.update(id, partialEntity);
    return await this.findById(id);
  }

  /**
   * Update multiple entities
   */
  async updateMany(
    criteria: FindOptionsWhere<T>,
    partialEntity: QueryDeepPartialEntity<T>
  ): Promise<void> {
    await this.repository.update(criteria, partialEntity);
  }

  /**
   * Save an entity (create or update)
   */
  async save(entity: DeepPartial<T>, options?: SaveOptions): Promise<T> {
    return await this.repository.save(entity, options);
  }

  /**
   * Save multiple entities
   */
  async saveMany(entities: DeepPartial<T>[], options?: SaveOptions): Promise<T[]> {
    return await this.repository.save(entities, options);
  }

  /**
   * Delete an entity by ID
   */
  async delete(id: string | number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  /**
   * Delete multiple entities
   */
  async deleteMany(criteria: FindOptionsWhere<T>): Promise<number> {
    const result = await this.repository.delete(criteria);
    return result.affected || 0;
  }

  /**
   * Remove an entity
   */
  async remove(entity: T, options?: RemoveOptions): Promise<T> {
    return await this.repository.remove(entity, options);
  }

  /**
   * Remove multiple entities
   */
  async removeMany(entities: T[], options?: RemoveOptions): Promise<T[]> {
    return await this.repository.remove(entities, options);
  }

  /**
   * Check if entity exists
   */
  async exists(options: FindManyOptions<T>): Promise<boolean> {
    const count = await this.repository.count(options);
    return count > 0;
  }

  /**
   * Check if entity exists by ID
   */
  async existsById(id: string | number): Promise<boolean> {
    const count = await this.repository.count({
      where: { id } as any,
    });
    return count > 0;
  }

  /**
   * Execute a raw query
   */
  async query(query: string, parameters?: any[]): Promise<any> {
    return await this.repository.query(query, parameters);
  }

  /**
   * Get the repository instance for advanced operations
   */
  getRepository(): Repository<T> {
    return this.repository;
  }

  /**
   * Create a query builder for complex queries
   */
  createQueryBuilder(alias?: string) {
    return this.repository.createQueryBuilder(alias);
  }

  /**
   * Soft delete (if entity supports it)
   */
  async softDelete(id: string | number): Promise<void> {
    await this.repository.softDelete(id);
  }

  /**
   * Restore soft deleted entity
   */
  async restore(id: string | number): Promise<void> {
    await this.repository.restore(id);
  }

  /**
   * Find with deleted entities included
   */
  async findWithDeleted(options?: FindManyOptions<T>): Promise<T[]> {
    return await this.repository.find({
      ...options,
      withDeleted: true,
    });
  }
}