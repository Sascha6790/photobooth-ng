import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Session } from './session.entity';

export enum PrintJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PRINTING = 'printing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PrintJobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('print_jobs')
@Index(['status', 'priority', 'createdAt'])
@Index(['sessionId', 'createdAt'])
export class PrintJob extends BaseEntity {
  @Column({ type: 'varchar', length: 500 })
  imageFilePath: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageId?: string;

  @Column({
    type: 'simple-enum',
    enum: PrintJobStatus,
    default: PrintJobStatus.PENDING,
  })
  @Index()
  status: PrintJobStatus;

  @Column({
    type: 'simple-enum',
    enum: PrintJobPriority,
    default: PrintJobPriority.NORMAL,
  })
  priority: PrintJobPriority;

  @Column({ type: 'int', default: 1 })
  copies: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  printerName?: string;

  @Column({ type: 'simple-json', nullable: true })
  printerSettings?: {
    paperSize?: string;
    orientation?: 'portrait' | 'landscape';
    quality?: 'draft' | 'normal' | 'high';
    colorMode?: 'color' | 'grayscale' | 'blackwhite';
    margins?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
    scaling?: 'fit' | 'fill' | 'none';
    [key: string]: any;
  };

  @Column({ type: 'datetime', nullable: true })
  startedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  @Column({ type: 'int', default: 3 })
  maxAttempts: number;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'simple-json', nullable: true })
  errorDetails?: Record<string, any>;

  @Column({ type: 'varchar', nullable: true })
  sessionId?: string;

  @ManyToOne(() => Session, session => session.printJobs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'sessionId' })
  session?: Session;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: {
    requestedBy?: string;
    requestedAt?: Date;
    userEmail?: string;
    notes?: string;
    [key: string]: any;
  };

  @Column({ type: 'int', nullable: true })
  queuePosition?: number;

  @Column({ type: 'int', nullable: true })
  estimatedPrintTime?: number; // in seconds

  @Column({ type: 'int', nullable: true })
  actualPrintTime?: number; // in seconds

  // Helper methods
  start(): void {
    this.status = PrintJobStatus.PROCESSING;
    this.startedAt = new Date();
    this.attemptCount += 1;
  }

  markAsPrinting(): void {
    this.status = PrintJobStatus.PRINTING;
  }

  complete(): void {
    this.status = PrintJobStatus.COMPLETED;
    this.completedAt = new Date();
    if (this.startedAt) {
      this.actualPrintTime = Math.floor((this.completedAt.getTime() - this.startedAt.getTime()) / 1000);
    }
  }

  fail(errorMessage: string, errorDetails?: Record<string, any>): void {
    this.status = PrintJobStatus.FAILED;
    this.errorMessage = errorMessage;
    this.errorDetails = errorDetails;
    this.completedAt = new Date();
  }

  cancel(): void {
    this.status = PrintJobStatus.CANCELLED;
    this.completedAt = new Date();
  }

  canRetry(): boolean {
    return this.attemptCount < this.maxAttempts && 
           this.status === PrintJobStatus.FAILED;
  }

  retry(): void {
    if (this.canRetry()) {
      this.status = PrintJobStatus.PENDING;
      this.errorMessage = null;
      this.errorDetails = null;
    }
  }

  updateQueuePosition(position: number): void {
    this.queuePosition = position;
  }
}