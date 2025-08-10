import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { SessionUser } from './session-user.entity';

export enum SessionType {
  SINGLE = 'single',
  MULTI = 'multi',
  EVENT = 'event',
  KIOSK = 'kiosk'
}

export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended',
  EXPIRED = 'expired'
}

@Entity('sessions')
@Index(['sessionId'], { unique: true })
@Index(['status', 'type'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sessionId: string;

  @Column({ nullable: true })
  name: string;

  @Column({
    type: 'enum',
    enum: SessionType,
    default: SessionType.SINGLE
  })
  type: SessionType;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE
  })
  status: SessionStatus;

  @Column({ nullable: true })
  hostUserId: string;

  @Column({ default: 1 })
  maxUsers: number;

  @Column({ default: 0 })
  currentUsers: number;

  @Column('json', { nullable: true })
  settings: {
    allowRemoteCapture?: boolean;
    allowVoting?: boolean;
    allowSharing?: boolean;
    slideshowEnabled?: boolean;
    collaborationMode?: boolean;
    privateGallery?: boolean;
  };

  @Column('json', { nullable: true })
  metadata: {
    location?: string;
    event?: string;
    description?: string;
    tags?: string[];
    customFields?: Record<string, any>;
  };

  @Column('simple-array', { nullable: true })
  capturedImages: string[];

  @Column({ default: 0 })
  totalCaptures: number;

  @Column({ default: 0 })
  totalPrints: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => SessionUser, user => user.session, { cascade: true })
  users: SessionUser[];

  // Virtual properties
  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  get isActive(): boolean {
    return this.status === SessionStatus.ACTIVE && !this.isExpired;
  }

  get isFull(): boolean {
    return this.currentUsers >= this.maxUsers;
  }
}