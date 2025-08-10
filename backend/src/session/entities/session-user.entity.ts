import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { Session } from './session.entity';

export enum UserRole {
  HOST = 'host',
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
  GUEST = 'guest'
}

export enum UserStatus {
  ONLINE = 'online',
  AWAY = 'away',
  OFFLINE = 'offline'
}

@Entity('session_users')
@Index(['sessionId', 'userId'])
@Index(['status'])
export class SessionUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  userName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ONLINE
  })
  status: UserStatus;

  @Column({ nullable: true })
  deviceType: string; // 'web', 'mobile', 'kiosk', 'tablet'

  @Column({ nullable: true })
  deviceId: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  socketId: string;

  @Column('json', { nullable: true })
  permissions: {
    canCapture?: boolean;
    canPrint?: boolean;
    canDelete?: boolean;
    canShare?: boolean;
    canVote?: boolean;
    canControlSlideshow?: boolean;
  };

  @Column('json', { nullable: true })
  statistics: {
    captureCount?: number;
    printCount?: number;
    voteCount?: number;
    lastCapture?: Date;
    favoriteImages?: string[];
  };

  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  leftAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date;

  @Column({ default: 0 })
  activityScore: number; // Track user engagement

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Session, session => session.users)
  session: Session;

  // Virtual properties
  get isOnline(): boolean {
    return this.status === UserStatus.ONLINE;
  }

  get isHost(): boolean {
    return this.role === UserRole.HOST;
  }

  get isAdmin(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.HOST;
  }

  get sessionDuration(): number {
    if (!this.joinedAt) return 0;
    const endTime = this.leftAt || new Date();
    return endTime.getTime() - this.joinedAt.getTime();
  }
}