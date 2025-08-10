import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not } from 'typeorm';
import { BaseRepository, PaginatedResult, PaginationOptions } from './base.repository';
import { PrintJob, PrintJobStatus, PrintJobPriority } from '../entities/print-job.entity';

export interface PrintJobFilterOptions {
  status?: PrintJobStatus;
  priority?: PrintJobPriority;
  sessionId?: string;
  printerName?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface PrintQueue {
  pending: PrintJob[];
  processing: PrintJob[];
  printing: PrintJob[];
  total: number;
  estimatedWaitTime: number;
}

export interface PrintStatistics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  averagePrintTime: number;
  successRate: number;
  jobsByPriority: Record<PrintJobPriority, number>;
  jobsByStatus: Record<PrintJobStatus, number>;
  printerUsage: Record<string, number>;
}

@Injectable()
export class PrintJobRepository extends BaseRepository<PrintJob> {
  constructor(
    @InjectRepository(PrintJob)
    protected readonly repository: Repository<PrintJob>
  ) {
    super(repository);
  }

  /**
   * Get next job in queue
   */
  async getNextInQueue(): Promise<PrintJob | null> {
    return await this.repository.findOne({
      where: { status: PrintJobStatus.PENDING },
      order: {
        priority: 'DESC',
        createdAt: 'ASC',
      },
    });
  }

  /**
   * Get print queue
   */
  async getQueue(): Promise<PrintQueue> {
    const [pending, processing, printing] = await Promise.all([
      this.repository.find({
        where: { status: PrintJobStatus.PENDING },
        order: { priority: 'DESC', createdAt: 'ASC' },
      }),
      this.repository.find({
        where: { status: PrintJobStatus.PROCESSING },
        order: { startedAt: 'ASC' },
      }),
      this.repository.find({
        where: { status: PrintJobStatus.PRINTING },
        order: { startedAt: 'ASC' },
      }),
    ]);

    // Update queue positions
    pending.forEach((job, index) => {
      job.queuePosition = index + 1;
    });

    // Calculate estimated wait time
    const averagePrintTime = await this.getAveragePrintTime();
    const activeJobs = processing.length + printing.length;
    const estimatedWaitTime = (activeJobs + pending.length) * averagePrintTime;

    return {
      pending,
      processing,
      printing,
      total: pending.length + processing.length + printing.length,
      estimatedWaitTime,
    };
  }

  /**
   * Find jobs with filters
   */
  async findWithFilters(
    filters: PrintJobFilterOptions = {},
    paginationOptions: PaginationOptions = {}
  ): Promise<PaginatedResult<PrintJob>> {
    const queryBuilder = this.repository.createQueryBuilder('printJob');

    if (filters.status) {
      queryBuilder.andWhere('printJob.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      queryBuilder.andWhere('printJob.priority = :priority', { priority: filters.priority });
    }

    if (filters.sessionId) {
      queryBuilder.andWhere('printJob.sessionId = :sessionId', {
        sessionId: filters.sessionId,
      });
    }

    if (filters.printerName) {
      queryBuilder.andWhere('printJob.printerName = :printerName', {
        printerName: filters.printerName,
      });
    }

    if (filters.fromDate) {
      queryBuilder.andWhere('printJob.createdAt >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters.toDate) {
      queryBuilder.andWhere('printJob.createdAt <= :toDate', {
        toDate: filters.toDate,
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
      .orderBy(`printJob.${orderBy}`, orderDirection)
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
   * Start a print job
   */
  async startJob(id: string): Promise<PrintJob | null> {
    const job = await this.findById(id);
    if (!job) {
      return null;
    }

    job.start();
    return await this.repository.save(job);
  }

  /**
   * Mark job as printing
   */
  async markAsPrinting(id: string): Promise<PrintJob | null> {
    const job = await this.findById(id);
    if (!job) {
      return null;
    }

    job.markAsPrinting();
    return await this.repository.save(job);
  }

  /**
   * Complete a print job
   */
  async completeJob(id: string): Promise<PrintJob | null> {
    const job = await this.findById(id);
    if (!job) {
      return null;
    }

    job.complete();
    return await this.repository.save(job);
  }

  /**
   * Fail a print job
   */
  async failJob(
    id: string,
    errorMessage: string,
    errorDetails?: Record<string, any>
  ): Promise<PrintJob | null> {
    const job = await this.findById(id);
    if (!job) {
      return null;
    }

    job.fail(errorMessage, errorDetails);
    return await this.repository.save(job);
  }

  /**
   * Cancel a print job
   */
  async cancelJob(id: string): Promise<PrintJob | null> {
    const job = await this.findById(id);
    if (!job) {
      return null;
    }

    job.cancel();
    return await this.repository.save(job);
  }

  /**
   * Retry a failed job
   */
  async retryJob(id: string): Promise<PrintJob | null> {
    const job = await this.findById(id);
    if (!job || !job.canRetry()) {
      return null;
    }

    job.retry();
    return await this.repository.save(job);
  }

  /**
   * Cancel multiple jobs
   */
  async cancelJobs(ids: string[]): Promise<number> {
    const result = await this.repository.update(
      {
        id: In(ids),
        status: In([PrintJobStatus.PENDING, PrintJobStatus.PROCESSING]),
      },
      {
        status: PrintJobStatus.CANCELLED,
        completedAt: new Date(),
      }
    );

    return result.affected || 0;
  }

  /**
   * Get average print time
   */
  async getAveragePrintTime(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('printJob')
      .select('AVG(printJob.actualPrintTime)', 'avgTime')
      .where('printJob.status = :status', { status: PrintJobStatus.COMPLETED })
      .andWhere('printJob.actualPrintTime IS NOT NULL')
      .getRawOne();

    return result?.avgTime || 60; // Default to 60 seconds
  }

  /**
   * Get print statistics
   */
  async getStatistics(fromDate?: Date, toDate?: Date): Promise<PrintStatistics> {
    const queryBuilder = this.repository.createQueryBuilder('printJob');

    if (fromDate) {
      queryBuilder.andWhere('printJob.createdAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere('printJob.createdAt <= :toDate', { toDate });
    }

    const jobs = await queryBuilder.getMany();

    const stats: PrintStatistics = {
      totalJobs: jobs.length,
      completedJobs: 0,
      failedJobs: 0,
      cancelledJobs: 0,
      averagePrintTime: 0,
      successRate: 0,
      jobsByPriority: {} as Record<PrintJobPriority, number>,
      jobsByStatus: {} as Record<PrintJobStatus, number>,
      printerUsage: {},
    };

    // Initialize counters
    Object.values(PrintJobPriority).forEach(priority => {
      stats.jobsByPriority[priority] = 0;
    });
    Object.values(PrintJobStatus).forEach(status => {
      stats.jobsByStatus[status] = 0;
    });

    let totalPrintTime = 0;
    let printTimeCount = 0;

    jobs.forEach(job => {
      // Count by status
      stats.jobsByStatus[job.status]++;
      
      switch (job.status) {
        case PrintJobStatus.COMPLETED:
          stats.completedJobs++;
          if (job.actualPrintTime) {
            totalPrintTime += job.actualPrintTime;
            printTimeCount++;
          }
          break;
        case PrintJobStatus.FAILED:
          stats.failedJobs++;
          break;
        case PrintJobStatus.CANCELLED:
          stats.cancelledJobs++;
          break;
      }

      // Count by priority
      stats.jobsByPriority[job.priority]++;

      // Count printer usage
      if (job.printerName) {
        stats.printerUsage[job.printerName] = 
          (stats.printerUsage[job.printerName] || 0) + 1;
      }
    });

    // Calculate averages
    if (printTimeCount > 0) {
      stats.averagePrintTime = Math.round(totalPrintTime / printTimeCount);
    }

    if (stats.totalJobs > 0) {
      stats.successRate = (stats.completedJobs / stats.totalJobs) * 100;
    }

    return stats;
  }

  /**
   * Find jobs with errors
   */
  async findFailedJobs(limit: number = 10): Promise<PrintJob[]> {
    return await this.repository.find({
      where: {
        status: PrintJobStatus.FAILED,
        errorMessage: Not(IsNull()),
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Update queue positions
   */
  async updateQueuePositions(): Promise<void> {
    const pending = await this.repository.find({
      where: { status: PrintJobStatus.PENDING },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });

    for (let i = 0; i < pending.length; i++) {
      pending[i].updateQueuePosition(i + 1);
      await this.repository.save(pending[i]);
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanup(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(PrintJob)
      .where('createdAt < :cutoffDate', { cutoffDate })
      .andWhere('status IN (:...statuses)', {
        statuses: [PrintJobStatus.COMPLETED, PrintJobStatus.CANCELLED, PrintJobStatus.FAILED],
      })
      .execute();

    return result.affected || 0;
  }

  /**
   * Find jobs with relations
   */
  async findWithRelations(id: string): Promise<PrintJob | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['session'],
    });
  }
}