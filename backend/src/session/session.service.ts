import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, LessThan, In } from 'typeorm';
import { Session, SessionStatus, SessionType } from './entities/session.entity';
import { SessionUser, UserRole, UserStatus } from './entities/session-user.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { v4 as uuidv4 } from 'uuid';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(SessionUser)
    private sessionUserRepository: Repository<SessionUser>,
  ) {}

  /**
   * Create a new session
   */
  async createSession(createSessionDto: CreateSessionDto): Promise<Session> {
    const sessionId = this.generateSessionId(createSessionDto.type);
    
    // Check if session ID already exists
    const existing = await this.sessionRepository.findOne({
      where: { sessionId }
    });
    
    if (existing) {
      throw new ConflictException('Session ID already exists');
    }

    const session = this.sessionRepository.create({
      sessionId,
      name: createSessionDto.name || `Session ${sessionId}`,
      type: createSessionDto.type || SessionType.SINGLE,
      maxUsers: createSessionDto.maxUsers || 10,
      settings: createSessionDto.settings || {},
      metadata: createSessionDto.metadata || {},
      expiresAt: createSessionDto.expiresAt || this.calculateExpiry(24), // 24 hours default
      lastActivityAt: new Date(),
      capturedImages: [],
      totalCaptures: 0,
      totalPrints: 0,
      currentUsers: 0
    });

    const savedSession = await this.sessionRepository.save(session);
    this.logger.log(`Created new session: ${savedSession.sessionId}`);
    
    return savedSession;
  }

  /**
   * Join an existing session
   */
  async joinSession(sessionId: string, joinDto: JoinSessionDto): Promise<SessionUser> {
    const session = await this.findSessionById(sessionId);
    
    if (!session.isActive) {
      throw new BadRequestException('Session is not active');
    }

    if (session.isFull && joinDto.role !== UserRole.ADMIN) {
      throw new BadRequestException('Session is full');
    }

    // Check if user already in session
    let sessionUser = await this.sessionUserRepository.findOne({
      where: {
        sessionId: session.id,
        userId: joinDto.userId
      }
    });

    if (sessionUser) {
      // Update existing user
      sessionUser.status = UserStatus.ONLINE;
      sessionUser.socketId = joinDto.socketId;
      sessionUser.lastActivityAt = new Date();
      sessionUser.deviceType = joinDto.deviceType || sessionUser.deviceType;
      sessionUser.ipAddress = joinDto.ipAddress || sessionUser.ipAddress;
    } else {
      // Create new session user
      sessionUser = this.sessionUserRepository.create({
        sessionId: session.id,
        userId: joinDto.userId,
        userName: joinDto.userName || `User ${joinDto.userId.substring(0, 8)}`,
        email: joinDto.email,
        role: joinDto.role || UserRole.USER,
        status: UserStatus.ONLINE,
        deviceType: joinDto.deviceType,
        deviceId: joinDto.deviceId,
        ipAddress: joinDto.ipAddress,
        userAgent: joinDto.userAgent,
        socketId: joinDto.socketId,
        permissions: this.getDefaultPermissions(joinDto.role || UserRole.USER),
        statistics: {
          captureCount: 0,
          printCount: 0,
          voteCount: 0,
          favoriteImages: []
        },
        joinedAt: new Date(),
        lastActivityAt: new Date(),
        activityScore: 0
      });

      // Update session user count
      await this.sessionRepository.update(session.id, {
        currentUsers: session.currentUsers + 1
      });
    }

    const savedUser = await this.sessionUserRepository.save(sessionUser);
    
    // Update session activity
    await this.updateSessionActivity(session.id);
    
    this.logger.log(`User ${savedUser.userId} joined session ${sessionId}`);
    
    return savedUser;
  }

  /**
   * Leave a session
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.findSessionById(sessionId);
    
    const sessionUser = await this.sessionUserRepository.findOne({
      where: {
        sessionId: session.id,
        userId
      }
    });

    if (!sessionUser) {
      throw new NotFoundException('User not found in session');
    }

    // Update user status
    sessionUser.status = UserStatus.OFFLINE;
    sessionUser.leftAt = new Date();
    await this.sessionUserRepository.save(sessionUser);

    // Update session user count
    await this.sessionRepository.update(session.id, {
      currentUsers: Math.max(0, session.currentUsers - 1)
    });

    this.logger.log(`User ${userId} left session ${sessionId}`);
  }

  /**
   * Get session by ID
   */
  async findSessionById(sessionId: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { sessionId },
      relations: ['users']
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return session;
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions(): Promise<Session[]> {
    return this.sessionRepository.find({
      where: {
        status: SessionStatus.ACTIVE,
        expiresAt: Not(IsNull())
      },
      order: {
        lastActivityAt: 'DESC'
      }
    });
  }

  /**
   * Get session users
   */
  async getSessionUsers(sessionId: string, onlineOnly = false): Promise<SessionUser[]> {
    const session = await this.findSessionById(sessionId);
    
    const where: any = { sessionId: session.id };
    if (onlineOnly) {
      where.status = UserStatus.ONLINE;
    }

    return this.sessionUserRepository.find({
      where,
      order: {
        role: 'ASC',
        joinedAt: 'ASC'
      }
    });
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, updateDto: UpdateSessionDto): Promise<Session> {
    const session = await this.findSessionById(sessionId);

    Object.assign(session, updateDto);
    session.lastActivityAt = new Date();

    return this.sessionRepository.save(session);
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionIdOrUuid: string): Promise<void> {
    await this.sessionRepository.update(
      { id: sessionIdOrUuid },
      { lastActivityAt: new Date() }
    );
  }

  /**
   * Update user activity
   */
  async updateUserActivity(sessionId: string, userId: string, activityData?: any): Promise<void> {
    const session = await this.findSessionById(sessionId);
    
    const sessionUser = await this.sessionUserRepository.findOne({
      where: {
        sessionId: session.id,
        userId
      }
    });

    if (sessionUser) {
      sessionUser.lastActivityAt = new Date();
      sessionUser.activityScore += 1;
      
      if (activityData) {
        // Update statistics based on activity
        if (activityData.type === 'capture') {
          sessionUser.statistics.captureCount++;
          sessionUser.statistics.lastCapture = new Date();
        } else if (activityData.type === 'print') {
          sessionUser.statistics.printCount++;
        } else if (activityData.type === 'vote') {
          sessionUser.statistics.voteCount++;
        }
      }
      
      await this.sessionUserRepository.save(sessionUser);
      await this.updateSessionActivity(session.id);
    }
  }

  /**
   * Add captured image to session
   */
  async addCapturedImage(sessionId: string, imageId: string): Promise<void> {
    const session = await this.findSessionById(sessionId);
    
    if (!session.capturedImages) {
      session.capturedImages = [];
    }
    
    session.capturedImages.push(imageId);
    session.totalCaptures++;
    session.lastActivityAt = new Date();
    
    await this.sessionRepository.save(session);
  }

  /**
   * End session
   */
  async endSession(sessionId: string): Promise<Session> {
    const session = await this.findSessionById(sessionId);
    
    session.status = SessionStatus.ENDED;
    
    // Set all users to offline
    await this.sessionUserRepository.update(
      { sessionId: session.id },
      { 
        status: UserStatus.OFFLINE,
        leftAt: new Date()
      }
    );
    
    const savedSession = await this.sessionRepository.save(session);
    this.logger.log(`Ended session: ${sessionId}`);
    
    return savedSession;
  }

  /**
   * Pause/Resume session
   */
  async pauseSession(sessionId: string, pause = true): Promise<Session> {
    const session = await this.findSessionById(sessionId);
    
    session.status = pause ? SessionStatus.PAUSED : SessionStatus.ACTIVE;
    
    return this.sessionRepository.save(session);
  }

  /**
   * Get session statistics
   */
  async getSessionStatistics(sessionId: string): Promise<any> {
    const session = await this.findSessionById(sessionId);
    const users = await this.getSessionUsers(sessionId);
    
    const onlineUsers = users.filter(u => u.isOnline);
    const totalCaptures = users.reduce((sum, u) => sum + (u.statistics?.captureCount || 0), 0);
    const totalPrints = users.reduce((sum, u) => sum + (u.statistics?.printCount || 0), 0);
    const totalVotes = users.reduce((sum, u) => sum + (u.statistics?.voteCount || 0), 0);
    
    const mostActiveUser = users.reduce((prev, current) => 
      (current.activityScore > prev.activityScore) ? current : prev
    , users[0]);
    
    return {
      sessionId: session.sessionId,
      name: session.name,
      type: session.type,
      status: session.status,
      duration: session.createdAt ? new Date().getTime() - session.createdAt.getTime() : 0,
      users: {
        total: users.length,
        online: onlineUsers.length,
        mostActive: mostActiveUser ? {
          userId: mostActiveUser.userId,
          userName: mostActiveUser.userName,
          activityScore: mostActiveUser.activityScore
        } : null
      },
      activity: {
        captures: totalCaptures,
        prints: totalPrints,
        votes: totalVotes,
        images: session.capturedImages?.length || 0
      },
      timeline: {
        created: session.createdAt,
        lastActivity: session.lastActivityAt,
        expires: session.expiresAt
      }
    };
  }

  /**
   * Clean up expired sessions (runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions(): Promise<void> {
    const expiredSessions = await this.sessionRepository.find({
      where: [
        { expiresAt: LessThan(new Date()) },
        { 
          status: SessionStatus.ACTIVE,
          lastActivityAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)) // 24 hours inactive
        }
      ]
    });

    for (const session of expiredSessions) {
      session.status = SessionStatus.EXPIRED;
      await this.sessionRepository.save(session);
      
      // Set all users to offline
      await this.sessionUserRepository.update(
        { sessionId: session.id },
        { status: UserStatus.OFFLINE }
      );
      
      this.logger.log(`Expired session: ${session.sessionId}`);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(type: SessionType): string {
    const prefix = {
      [SessionType.SINGLE]: 'SNG',
      [SessionType.MULTI]: 'MLT',
      [SessionType.EVENT]: 'EVT',
      [SessionType.KIOSK]: 'KSK'
    };
    
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix[type]}-${randomPart}`;
  }

  /**
   * Calculate session expiry time
   */
  private calculateExpiry(hours: number): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    return expiry;
  }

  /**
   * Get default permissions based on role
   */
  private getDefaultPermissions(role: UserRole): any {
    switch (role) {
      case UserRole.HOST:
      case UserRole.ADMIN:
        return {
          canCapture: true,
          canPrint: true,
          canDelete: true,
          canShare: true,
          canVote: true,
          canControlSlideshow: true
        };
      case UserRole.USER:
        return {
          canCapture: true,
          canPrint: true,
          canDelete: false,
          canShare: true,
          canVote: true,
          canControlSlideshow: false
        };
      case UserRole.VIEWER:
      case UserRole.GUEST:
        return {
          canCapture: false,
          canPrint: false,
          canDelete: false,
          canShare: false,
          canVote: true,
          canControlSlideshow: false
        };
      default:
        return {};
    }
  }
}