import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface Session {
  id: string;
  users: Map<string, SessionUser>;
  images: Map<string, SessionImage>;
  slideshow: SlideshowState;
  createdAt: Date;
  lastActivity: Date;
}

interface SessionUser {
  userId: string;
  clientId: string;
  nickname?: string;
  joinedAt: Date;
  isHost: boolean;
}

interface SessionImage {
  id: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
  votes: Map<string, number>;
  averageRating: number;
  metadata?: any;
}

interface SlideshowState {
  isActive: boolean;
  currentIndex: number;
  interval: number;
  autoPlay: boolean;
  images: string[];
}

@Injectable()
export class CollaborationService {
  private server: Server;
  private readonly logger = new Logger(CollaborationService.name);
  private sessions = new Map<string, Session>();
  private userSessions = new Map<string, string>();

  setServer(server: Server) {
    this.server = server;
    this.logger.log('Collaboration Service initialized with Socket.IO server');
  }

  addUserToSession(sessionId: string, userId: string, clientId: string) {
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      session = this.createSession(sessionId);
    }

    const isHost = session.users.size === 0;
    
    const user: SessionUser = {
      userId,
      clientId,
      joinedAt: new Date(),
      isHost,
    };

    session.users.set(userId, user);
    session.lastActivity = new Date();
    this.userSessions.set(userId, sessionId);

    this.server.to(sessionId).emit('collaboration-user-joined', {
      sessionId,
      user: {
        userId,
        isHost,
        joinedAt: user.joinedAt,
      },
      totalUsers: session.users.size,
    });

    this.logger.log(`User ${userId} joined session ${sessionId}`);

    return {
      success: true,
      sessionId,
      isHost,
      totalUsers: session.users.size,
    };
  }

  removeUserFromSession(sessionId: string, userId: string) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    const user = session.users.get(userId);
    
    if (!user) {
      return {
        success: false,
        error: 'User not in session',
      };
    }

    session.users.delete(userId);
    this.userSessions.delete(userId);

    if (user.isHost && session.users.size > 0) {
      const newHost = session.users.values().next().value;
      newHost.isHost = true;
      
      this.server.to(sessionId).emit('collaboration-host-changed', {
        sessionId,
        newHostId: newHost.userId,
      });
    }

    if (session.users.size === 0) {
      this.sessions.delete(sessionId);
      this.logger.log(`Session ${sessionId} ended (no users)`);
    } else {
      this.server.to(sessionId).emit('collaboration-user-left', {
        sessionId,
        userId,
        totalUsers: session.users.size,
      });
    }

    return {
      success: true,
      message: 'User removed from session',
    };
  }

  handleDisconnect(clientId: string) {
    for (const [sessionId, session] of this.sessions.entries()) {
      for (const [userId, user] of session.users.entries()) {
        if (user.clientId === clientId) {
          this.removeUserFromSession(sessionId, userId);
          break;
        }
      }
    }
  }

  async handleVote(
    data: { imageId: string; userId: string; vote: number; sessionId?: string },
    client: Socket,
  ) {
    const { imageId, userId, vote, sessionId } = data;

    if (vote < 1 || vote > 5) {
      return {
        success: false,
        error: 'Vote must be between 1 and 5',
      };
    }

    const userSessionId = sessionId || this.userSessions.get(userId);
    
    if (!userSessionId) {
      return {
        success: false,
        error: 'User not in any session',
      };
    }

    const session = this.sessions.get(userSessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    let image = session.images.get(imageId);
    
    if (!image) {
      image = {
        id: imageId,
        url: '',
        uploadedBy: '',
        uploadedAt: new Date(),
        votes: new Map(),
        averageRating: 0,
      };
      session.images.set(imageId, image);
    }

    image.votes.set(userId, vote);
    
    const totalVotes = Array.from(image.votes.values());
    image.averageRating = totalVotes.reduce((a, b) => a + b, 0) / totalVotes.length;

    this.server.to(userSessionId).emit('collaboration-vote-updated', {
      sessionId: userSessionId,
      imageId,
      userId,
      vote,
      averageRating: image.averageRating,
      totalVotes: image.votes.size,
    });

    this.logger.log(`Vote recorded: Image ${imageId} by User ${userId}: ${vote}`);

    return {
      success: true,
      averageRating: image.averageRating,
      totalVotes: image.votes.size,
    };
  }

  async handleSlideshowControl(
    data: { action: 'start' | 'stop' | 'next' | 'previous'; sessionId: string; interval?: number },
    client: Socket,
  ) {
    const { action, sessionId, interval } = data;

    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    switch (action) {
      case 'start':
        return this.startSlideshow(session, sessionId, interval);
      
      case 'stop':
        return this.stopSlideshow(session, sessionId);
      
      case 'next':
        return this.nextSlide(session, sessionId);
      
      case 'previous':
        return this.previousSlide(session, sessionId);
      
      default:
        return {
          success: false,
          error: 'Unknown slideshow action',
        };
    }
  }

  private startSlideshow(session: Session, sessionId: string, interval?: number) {
    const images = Array.from(session.images.keys());
    
    if (images.length === 0) {
      return {
        success: false,
        error: 'No images in session',
      };
    }

    session.slideshow = {
      isActive: true,
      currentIndex: 0,
      interval: interval || 5000,
      autoPlay: true,
      images,
    };

    this.server.to(sessionId).emit('collaboration-slideshow-started', {
      sessionId,
      currentImage: images[0],
      totalImages: images.length,
      interval: session.slideshow.interval,
    });

    this.startSlideshowTimer(sessionId);

    this.logger.log(`Slideshow started for session ${sessionId}`);

    return {
      success: true,
      message: 'Slideshow started',
      currentImage: images[0],
      totalImages: images.length,
    };
  }

  private stopSlideshow(session: Session, sessionId: string) {
    if (!session.slideshow.isActive) {
      return {
        success: false,
        error: 'Slideshow not active',
      };
    }

    session.slideshow.isActive = false;
    session.slideshow.autoPlay = false;

    this.server.to(sessionId).emit('collaboration-slideshow-stopped', {
      sessionId,
    });

    this.logger.log(`Slideshow stopped for session ${sessionId}`);

    return {
      success: true,
      message: 'Slideshow stopped',
    };
  }

  private nextSlide(session: Session, sessionId: string) {
    if (!session.slideshow.isActive) {
      return {
        success: false,
        error: 'Slideshow not active',
      };
    }

    const { images, currentIndex } = session.slideshow;
    const nextIndex = (currentIndex + 1) % images.length;
    
    session.slideshow.currentIndex = nextIndex;

    this.server.to(sessionId).emit('collaboration-slideshow-next', {
      sessionId,
      currentImage: images[nextIndex],
      currentIndex: nextIndex,
      totalImages: images.length,
    });

    return {
      success: true,
      currentImage: images[nextIndex],
      currentIndex: nextIndex,
    };
  }

  private previousSlide(session: Session, sessionId: string) {
    if (!session.slideshow.isActive) {
      return {
        success: false,
        error: 'Slideshow not active',
      };
    }

    const { images, currentIndex } = session.slideshow;
    const previousIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    
    session.slideshow.currentIndex = previousIndex;

    this.server.to(sessionId).emit('collaboration-slideshow-previous', {
      sessionId,
      currentImage: images[previousIndex],
      currentIndex: previousIndex,
      totalImages: images.length,
    });

    return {
      success: true,
      currentImage: images[previousIndex],
      currentIndex: previousIndex,
    };
  }

  private startSlideshowTimer(sessionId: string) {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.slideshow.isActive || !session.slideshow.autoPlay) {
      return;
    }

    setTimeout(() => {
      if (session.slideshow.isActive && session.slideshow.autoPlay) {
        this.nextSlide(session, sessionId);
        this.startSlideshowTimer(sessionId);
      }
    }, session.slideshow.interval);
  }

  private createSession(sessionId: string): Session {
    const session: Session = {
      id: sessionId,
      users: new Map(),
      images: new Map(),
      slideshow: {
        isActive: false,
        currentIndex: 0,
        interval: 5000,
        autoPlay: false,
        images: [],
      },
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);
    this.logger.log(`New collaboration session created: ${sessionId}`);
    
    return session;
  }

  getSessionInfo(sessionId: string) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    return {
      id: session.id,
      userCount: session.users.size,
      imageCount: session.images.size,
      slideshowActive: session.slideshow.isActive,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      users: Array.from(session.users.values()).map(u => ({
        userId: u.userId,
        nickname: u.nickname,
        isHost: u.isHost,
        joinedAt: u.joinedAt,
      })),
    };
  }

  getAllSessions() {
    return Array.from(this.sessions.entries()).map(([id, session]) => ({
      id,
      userCount: session.users.size,
      imageCount: session.images.size,
      slideshowActive: session.slideshow.isActive,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    }));
  }

  getTopRatedImages(sessionId: string, limit: number = 10) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return [];
    }

    const sortedImages = Array.from(session.images.values())
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, limit);

    return sortedImages.map(img => ({
      id: img.id,
      url: img.url,
      averageRating: img.averageRating,
      voteCount: img.votes.size,
      uploadedBy: img.uploadedBy,
      uploadedAt: img.uploadedAt,
    }));
  }
}