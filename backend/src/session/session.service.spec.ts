import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionService } from './session.service';
import { Session, SessionStatus, SessionType } from './entities/session.entity';
import { SessionUser, UserRole, UserStatus } from './entities/session-user.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepository: Repository<Session>;
  let sessionUserRepository: Repository<SessionUser>;

  const mockSessionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockSessionUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: getRepositoryToken(Session),
          useValue: mockSessionRepository,
        },
        {
          provide: getRepositoryToken(SessionUser),
          useValue: mockSessionUserRepository,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    sessionRepository = module.get<Repository<Session>>(getRepositoryToken(Session));
    sessionUserRepository = module.get<Repository<SessionUser>>(getRepositoryToken(SessionUser));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const createSessionDto: CreateSessionDto = {
        type: SessionType.MULTI,
        name: 'Test Session',
        maxUsers: 5,
      };

      const mockSession = {
        id: 'uuid-123',
        sessionId: 'MLT-ABC123',
        name: 'Test Session',
        type: SessionType.MULTI,
        status: SessionStatus.ACTIVE,
        maxUsers: 5,
        currentUsers: 0,
        settings: {},
        metadata: {},
        capturedImages: [],
        totalCaptures: 0,
        totalPrints: 0,
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSessionRepository.findOne.mockResolvedValue(null);
      mockSessionRepository.create.mockReturnValue(mockSession);
      mockSessionRepository.save.mockResolvedValue(mockSession);

      const result = await service.createSession(createSessionDto);

      expect(result).toEqual(mockSession);
      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SessionType.MULTI,
          name: 'Test Session',
          maxUsers: 5,
        })
      );
      expect(mockSessionRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if session ID already exists', async () => {
      const createSessionDto: CreateSessionDto = {
        type: SessionType.SINGLE,
      };

      mockSessionRepository.findOne.mockResolvedValue({ id: 'existing' });

      await expect(service.createSession(createSessionDto)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('joinSession', () => {
    it('should allow user to join an active session', async () => {
      const sessionId = 'MLT-ABC123';
      const joinDto: JoinSessionDto = {
        userId: 'user-123',
        userName: 'John Doe',
        role: UserRole.USER,
        socketId: 'socket-123',
      };

      const mockSession = {
        id: 'uuid-123',
        sessionId,
        status: SessionStatus.ACTIVE,
        currentUsers: 2,
        maxUsers: 5,
        isActive: true,
        isFull: false,
        expiresAt: new Date(Date.now() + 86400000),
      };

      const mockSessionUser = {
        id: 'user-uuid-123',
        sessionId: 'uuid-123',
        userId: 'user-123',
        userName: 'John Doe',
        role: UserRole.USER,
        status: UserStatus.ONLINE,
        socketId: 'socket-123',
      };

      mockSessionRepository.findOne.mockResolvedValue(mockSession);
      mockSessionUserRepository.findOne.mockResolvedValue(null);
      mockSessionUserRepository.create.mockReturnValue(mockSessionUser);
      mockSessionUserRepository.save.mockResolvedValue(mockSessionUser);
      mockSessionRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.joinSession(sessionId, joinDto);

      expect(result).toEqual(mockSessionUser);
      expect(mockSessionUserRepository.save).toHaveBeenCalled();
      expect(mockSessionRepository.update).toHaveBeenCalledWith(
        'uuid-123',
        { currentUsers: 3 }
      );
    });

    it('should update existing user if already in session', async () => {
      const sessionId = 'MLT-ABC123';
      const joinDto: JoinSessionDto = {
        userId: 'user-123',
        socketId: 'new-socket-456',
      };

      const mockSession = {
        id: 'uuid-123',
        sessionId,
        status: SessionStatus.ACTIVE,
        isActive: true,
        isFull: false,
      };

      const existingUser = {
        id: 'user-uuid-123',
        sessionId: 'uuid-123',
        userId: 'user-123',
        status: UserStatus.OFFLINE,
        socketId: 'old-socket-123',
      };

      mockSessionRepository.findOne.mockResolvedValue(mockSession);
      mockSessionUserRepository.findOne.mockResolvedValue(existingUser);
      mockSessionUserRepository.save.mockResolvedValue({
        ...existingUser,
        status: UserStatus.ONLINE,
        socketId: 'new-socket-456',
      });

      const result = await service.joinSession(sessionId, joinDto);

      expect(result.socketId).toBe('new-socket-456');
      expect(result.status).toBe(UserStatus.ONLINE);
      expect(mockSessionRepository.update).not.toHaveBeenCalled(); // User count shouldn't increase
    });

    it('should throw BadRequestException if session is not active', async () => {
      const sessionId = 'MLT-ABC123';
      const joinDto: JoinSessionDto = {
        userId: 'user-123',
      };

      const mockSession = {
        id: 'uuid-123',
        sessionId,
        status: SessionStatus.ENDED,
        isActive: false,
      };

      mockSessionRepository.findOne.mockResolvedValue(mockSession);

      await expect(service.joinSession(sessionId, joinDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if session is full', async () => {
      const sessionId = 'MLT-ABC123';
      const joinDto: JoinSessionDto = {
        userId: 'user-123',
        role: UserRole.USER,
      };

      const mockSession = {
        id: 'uuid-123',
        sessionId,
        status: SessionStatus.ACTIVE,
        currentUsers: 5,
        maxUsers: 5,
        isActive: true,
        isFull: true,
      };

      mockSessionRepository.findOne.mockResolvedValue(mockSession);

      await expect(service.joinSession(sessionId, joinDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('leaveSession', () => {
    it('should allow user to leave session', async () => {
      const sessionId = 'MLT-ABC123';
      const userId = 'user-123';

      const mockSession = {
        id: 'uuid-123',
        sessionId,
        currentUsers: 3,
      };

      const mockSessionUser = {
        id: 'user-uuid-123',
        sessionId: 'uuid-123',
        userId,
        status: UserStatus.ONLINE,
      };

      mockSessionRepository.findOne.mockResolvedValue(mockSession);
      mockSessionUserRepository.findOne.mockResolvedValue(mockSessionUser);
      mockSessionUserRepository.save.mockResolvedValue({
        ...mockSessionUser,
        status: UserStatus.OFFLINE,
        leftAt: new Date(),
      });
      mockSessionRepository.update.mockResolvedValue({ affected: 1 });

      await service.leaveSession(sessionId, userId);

      expect(mockSessionUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.OFFLINE,
        })
      );
      expect(mockSessionRepository.update).toHaveBeenCalledWith(
        'uuid-123',
        { currentUsers: 2 }
      );
    });

    it('should throw NotFoundException if user not in session', async () => {
      const sessionId = 'MLT-ABC123';
      const userId = 'user-123';

      const mockSession = {
        id: 'uuid-123',
        sessionId,
      };

      mockSessionRepository.findOne.mockResolvedValue(mockSession);
      mockSessionUserRepository.findOne.mockResolvedValue(null);

      await expect(service.leaveSession(sessionId, userId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getSessionStatistics', () => {
    it('should return session statistics', async () => {
      const sessionId = 'MLT-ABC123';

      const mockSession = {
        id: 'uuid-123',
        sessionId,
        name: 'Test Session',
        type: SessionType.MULTI,
        status: SessionStatus.ACTIVE,
        capturedImages: ['img1', 'img2', 'img3'],
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      const mockUsers = [
        {
          userId: 'user-1',
          userName: 'User 1',
          status: UserStatus.ONLINE,
          activityScore: 10,
          statistics: {
            captureCount: 5,
            printCount: 2,
            voteCount: 8,
          },
          isOnline: true,
        },
        {
          userId: 'user-2',
          userName: 'User 2',
          status: UserStatus.OFFLINE,
          activityScore: 5,
          statistics: {
            captureCount: 3,
            printCount: 1,
            voteCount: 4,
          },
          isOnline: false,
        },
      ];

      mockSessionRepository.findOne.mockResolvedValue(mockSession);
      mockSessionUserRepository.find.mockResolvedValue(mockUsers);

      const stats = await service.getSessionStatistics(sessionId);

      expect(stats).toMatchObject({
        sessionId: 'MLT-ABC123',
        name: 'Test Session',
        type: SessionType.MULTI,
        status: SessionStatus.ACTIVE,
        users: {
          total: 2,
          online: 1,
          mostActive: {
            userId: 'user-1',
            userName: 'User 1',
            activityScore: 10,
          },
        },
        activity: {
          captures: 8,
          prints: 3,
          votes: 12,
          images: 3,
        },
      });
    });
  });

  describe('endSession', () => {
    it('should end session and set all users offline', async () => {
      const sessionId = 'MLT-ABC123';

      const mockSession = {
        id: 'uuid-123',
        sessionId,
        status: SessionStatus.ACTIVE,
      };

      mockSessionRepository.findOne.mockResolvedValue(mockSession);
      mockSessionRepository.save.mockResolvedValue({
        ...mockSession,
        status: SessionStatus.ENDED,
      });
      mockSessionUserRepository.update.mockResolvedValue({ affected: 3 });

      const result = await service.endSession(sessionId);

      expect(result.status).toBe(SessionStatus.ENDED);
      expect(mockSessionUserRepository.update).toHaveBeenCalledWith(
        { sessionId: 'uuid-123' },
        {
          status: UserStatus.OFFLINE,
          leftAt: expect.any(Date),
        }
      );
    });
  });
});