import {
  Entity,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Image } from './image.entity';
import { PrintJob } from './print-job.entity';

export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

@Entity('sessions')
@Index(['status', 'createdAt'])
export class Session extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string;

  @Column({
    type: 'simple-enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
  })
  @Index()
  status: SessionStatus;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceType?: string;

  @Column({ type: 'datetime', nullable: true })
  startedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @Column({ type: 'int', default: 0 })
  imageCount: number;

  @Column({ type: 'int', default: 0 })
  printCount: number;

  @Column({ type: 'int', default: 0 })
  duration: number; // in seconds

  @Column({ type: 'simple-json', nullable: true })
  settings?: {
    language?: string;
    theme?: string;
    allowDownload?: boolean;
    allowPrint?: boolean;
    allowShare?: boolean;
    [key: string]: any;
  };

  @Column({ type: 'simple-json', nullable: true })
  statistics?: {
    totalPhotos?: number;
    totalCollages?: number;
    totalAnimations?: number;
    totalPrints?: number;
    averageProcessingTime?: number;
    mostUsedFilter?: string;
    mostUsedEffect?: string;
    [key: string]: any;
  };

  @Column({ type: 'varchar', length: 255, nullable: true })
  qrCodeToken?: string;

  @Column({ type: 'boolean', default: false })
  isRemoteControlled: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remoteControlToken?: string;

  @OneToMany(() => Image, image => image.session)
  images: Image[];

  @OneToMany(() => PrintJob, printJob => printJob.session)
  printJobs: PrintJob[];

  // Helper methods
  start(): void {
    this.startedAt = new Date();
    this.status = SessionStatus.ACTIVE;
  }

  complete(): void {
    this.completedAt = new Date();
    this.status = SessionStatus.COMPLETED;
    if (this.startedAt) {
      this.duration = Math.floor((this.completedAt.getTime() - this.startedAt.getTime()) / 1000);
    }
  }

  expire(): void {
    this.status = SessionStatus.EXPIRED;
    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  }

  incrementImageCount(): void {
    this.imageCount += 1;
  }

  incrementPrintCount(): void {
    this.printCount += 1;
  }

  updateStatistics(stats: Partial<Session['statistics']>): void {
    this.statistics = {
      ...this.statistics,
      ...stats,
    };
  }
}