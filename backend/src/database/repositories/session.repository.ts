import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { BaseRepository, PaginatedResult, PaginationOptions } from './base.repository';
import { Session, SessionStatus } from '../entities/session.entity';

export interface SessionFilterOptions {
  status?: SessionStatus;
  fromDate?: Date;
  toDate?: Date;
  ipAddress?: string;
  deviceType?: string;
  isRemoteControlled?: boolean;
}

export interface SessionStatistics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  expiredSessions: number;
  averageDuration: number;
  averageImageCount: number;
  averagePrintCount: number;
  totalImages: number;
  totalPrints: number;
  deviceTypes: Record<string, number>;
}

@Injectable()
export class SessionRepository extends BaseRepository<Session> {
  constructor(
    @InjectRepository(Session)
    protected readonly repository: Repository<Session>
  ) {
    super(repository);
  }

  /**
   * Find active sessions
   */
  async findActive(): Promise<Session[]> {
    return await this.repository.find({
      where: { status: SessionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find session by token
   */
  async findByToken(token: string): Promise<Session | null> {
    return await this.repository.findOne({
      where: [
        { qrCodeToken: token },
        { remoteControlToken: token },
      ],
    });
  }

  /**
   * Find sessions with filters
   */
  async findWithFilters(
    filters: SessionFilterOptions = {},
    paginationOptions: PaginationOptions = {}
  ): Promise<PaginatedResult<Session>> {
    const queryBuilder = this.repository.createQueryBuilder('session');

    if (filters.status) {
      queryBuilder.andWhere('session.status = :status', { status: filters.status });
    }

    if (filters.fromDate) {
      queryBuilder.andWhere('session.createdAt >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters.toDate) {
      queryBuilder.andWhere('session.createdAt <= :toDate', {
        toDate: filters.toDate,
      });
    }

    if (filters.ipAddress) {
      queryBuilder.andWhere('session.ipAddress = :ipAddress', {
        ipAddress: filters.ipAddress,
      });
    }

    if (filters.deviceType) {
      queryBuilder.andWhere('session.deviceType = :deviceType', {
        deviceType: filters.deviceType,
      });
    }

    if (filters.isRemoteControlled !== undefined) {
      queryBuilder.andWhere('session.isRemoteControlled = :isRemoteControlled', {
        isRemoteControlled: filters.isRemoteControlled,
      });
    }

    const {
      page = 1,
      limit = 20,
      orderBy = 'createdAt',
      orderDirection = 'DESC',
    } = paginationOptions;

    const skip = (page - 1) * limit;

    queryBuilder
      .orderBy(`session.${orderBy}`, orderDirection)
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

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
   * Create or get current session
   */
  async createOrGetCurrent(data: Partial<Session>): Promise<Session> {
    // Check for existing active session from same IP
    if (data.ipAddress) {
      const existing = await this.repository.findOne({
        where: {
          ipAddress: data.ipAddress,
          status: SessionStatus.ACTIVE,
          createdAt: MoreThan(new Date(Date.now() - 3600000)), // Last hour
        },
      });

      if (existing) {
        return existing;
      }
    }

    // Create new session
    const session = this.repository.create(data);
    session.start();
    return await this.repository.save(session);
  }

  /**
   * Complete a session
   */
  async completeSession(id: string): Promise<Session | null> {
    const session = await this.findById(id);
    if (!session) {
      return null;
    }

    session.complete();
    return await this.repository.save(session);
  }

  /**
   * Expire old sessions
   */
  async expireOldSessions(hoursOld: number = 24): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursOld);

    const result = await this.repository
      .createQueryBuilder()
      .update(Session)
      .set({ status: SessionStatus.EXPIRED })
      .where('status = :status', { status: SessionStatus.ACTIVE })
      .andWhere('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * Get session statistics
   */
  async getStatistics(fromDate?: Date, toDate?: Date): Promise<SessionStatistics> {
    const queryBuilder = this.repository.createQueryBuilder('session');

    if (fromDate) {
      queryBuilder.andWhere('session.createdAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere('session.createdAt <= :toDate', { toDate });
    }

    const sessions = await queryBuilder.getMany();

    const stats: SessionStatistics = {
      totalSessions: sessions.length,
      activeSessions: 0,
      completedSessions: 0,
      expiredSessions: 0,
      averageDuration: 0,
      averageImageCount: 0,
      averagePrintCount: 0,
      totalImages: 0,
      totalPrints: 0,
      deviceTypes: {},
    };

    let totalDuration = 0;
    let durationCount = 0;

    sessions.forEach(session => {
      // Count by status
      switch (session.status) {
        case SessionStatus.ACTIVE:
          stats.activeSessions++;
          break;
        case SessionStatus.COMPLETED:
          stats.completedSessions++;
          break;
        case SessionStatus.EXPIRED:
          stats.expiredSessions++;
          break;
      }

      // Sum totals
      stats.totalImages += session.imageCount || 0;
      stats.totalPrints += session.printCount || 0;

      // Calculate duration
      if (session.duration > 0) {
        totalDuration += session.duration;
        durationCount++;
      }

      // Count device types
      if (session.deviceType) {
        stats.deviceTypes[session.deviceType] = 
          (stats.deviceTypes[session.deviceType] || 0) + 1;
      }
    });

    // Calculate averages
    if (sessions.length > 0) {
      stats.averageImageCount = Math.round(stats.totalImages / sessions.length);
      stats.averagePrintCount = Math.round(stats.totalPrints / sessions.length);
    }

    if (durationCount > 0) {
      stats.averageDuration = Math.round(totalDuration / durationCount);
    }

    return stats;
  }

  /**
   * Find sessions with high activity
   */
  async findHighActivity(threshold: number = 10): Promise<Session[]> {
    return await this.repository
      .createQueryBuilder('session')
      .where('session.imageCount >= :threshold', { threshold })
      .orderBy('session.imageCount', 'DESC')
      .getMany();
  }

  /**
   * Update session statistics
   */
  async updateStatistics(id: string, stats: Partial<Session['statistics']>): Promise<void> {
    const session = await this.findById(id);
    if (session) {
      session.updateStatistics(stats);
      await this.repository.save(session);
    }
  }

  /**
   * Find sessions with relations
   */
  async findWithRelations(id: string): Promise<Session | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['images', 'printJobs'],
    });
  }

  /**
   * Clean up old sessions
   */
  async cleanup(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(Session)
      .where('createdAt < :cutoffDate', { cutoffDate })
      .andWhere('status != :status', { status: SessionStatus.ACTIVE })
      .execute();

    return result.affected || 0;
  }
}