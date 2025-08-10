import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Session } from './session.entity';

export enum ImageType {
  SINGLE = 'single',
  COLLAGE = 'collage',
  ANIMATION = 'animation',
  VIDEO = 'video',
}

export enum ImageStatus {
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
  DELETED = 'deleted',
}

@Entity('images')
@Index(['sessionId', 'createdAt'])
@Index(['status', 'createdAt'])
export class Image extends BaseEntity {
  @Column({ type: 'varchar', length: 500 })
  filename: string;

  @Column({ type: 'varchar', length: 500 })
  @Index()
  filepath: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailPath?: string;

  @Column({
    type: 'simple-enum',
    enum: ImageType,
    default: ImageType.SINGLE,
  })
  type: ImageType;

  @Column({
    type: 'simple-enum',
    enum: ImageStatus,
    default: ImageStatus.PROCESSING,
  })
  @Index()
  status: ImageStatus;

  @Column({ type: 'int', default: 0 })
  fileSize: number;

  @Column({ type: 'int', nullable: true })
  width?: number;

  @Column({ type: 'int', nullable: true })
  height?: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  printCount: number;

  @Column({ type: 'int', default: 0 })
  downloadCount: number;

  @Column({ type: 'boolean', default: false })
  isFavorite: boolean;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: {
    camera?: string;
    settings?: Record<string, any>;
    effects?: string[];
    filter?: string;
    chromaKey?: boolean;
    collageLayout?: string;
    processingTime?: number;
    [key: string]: any;
  };

  @Column({ type: 'simple-json', nullable: true })
  exifData?: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  qrCodeUrl?: string;

  @Column({ type: 'varchar', nullable: true })
  sessionId?: string;

  @ManyToOne(() => Session, session => session.images, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'sessionId' })
  session?: Session;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'datetime', nullable: true })
  deletedAt?: Date;

  // Helper methods
  markAsDeleted(): void {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.status = ImageStatus.DELETED;
  }

  incrementViewCount(): void {
    this.viewCount += 1;
  }

  incrementPrintCount(): void {
    this.printCount += 1;
  }

  incrementDownloadCount(): void {
    this.downloadCount += 1;
  }

  toggleFavorite(): void {
    this.isFavorite = !this.isFavorite;
  }
}