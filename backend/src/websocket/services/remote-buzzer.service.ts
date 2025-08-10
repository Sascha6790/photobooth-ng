import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface BuzzerSession {
  id: string;
  pin: string;
  createdAt: Date;
  participants: Map<string, BuzzerParticipant>;
  isActive: boolean;
}

interface BuzzerParticipant {
  clientId: string;
  userId?: string;
  joinedAt: Date;
  isMaster: boolean;
}

@Injectable()
export class RemoteBuzzerService {
  private server: Server;
  private readonly logger = new Logger(RemoteBuzzerService.name);
  private buzzerSessions = new Map<string, BuzzerSession>();
  private readonly eventEmitter = new EventEmitter2();

  setServer(server: Server) {
    this.server = server;
    this.logger.log('Remote Buzzer Service initialized with Socket.IO server');
  }

  async handleBuzzerEvent(
    data: { action: string; sessionId: string; pin?: string; userId?: string },
    client: Socket,
  ) {
    const { action, sessionId, pin, userId } = data;

    switch (action) {
      case 'create':
        return this.createBuzzerSession(sessionId, pin, client, userId);
      
      case 'join':
        return this.joinBuzzerSession(sessionId, pin, client, userId);
      
      case 'trigger':
        return this.triggerBuzzer(sessionId, client);
      
      case 'leave':
        return this.leaveBuzzerSession(sessionId, client);
      
      case 'status':
        return this.getSessionStatus(sessionId);
      
      default:
        return {
          success: false,
          error: 'Unknown action',
        };
    }
  }

  private createBuzzerSession(
    sessionId: string,
    pin: string,
    client: Socket,
    userId?: string,
  ) {
    if (this.buzzerSessions.has(sessionId)) {
      return {
        success: false,
        error: 'Session already exists',
      };
    }

    if (!pin || pin.length < 4) {
      return {
        success: false,
        error: 'PIN must be at least 4 characters',
      };
    }

    const session: BuzzerSession = {
      id: sessionId,
      pin,
      createdAt: new Date(),
      participants: new Map(),
      isActive: true,
    };

    const participant: BuzzerParticipant = {
      clientId: client.id,
      userId,
      joinedAt: new Date(),
      isMaster: true,
    };

    session.participants.set(client.id, participant);
    this.buzzerSessions.set(sessionId, session);

    client.join(`buzzer-${sessionId}`);
    
    this.logger.log(`Buzzer session created: ${sessionId}`);
    
    return {
      success: true,
      sessionId,
      isMaster: true,
      message: 'Buzzer session created successfully',
    };
  }

  private joinBuzzerSession(
    sessionId: string,
    pin: string,
    client: Socket,
    userId?: string,
  ) {
    const session = this.buzzerSessions.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    if (session.pin !== pin) {
      return {
        success: false,
        error: 'Invalid PIN',
      };
    }

    if (session.participants.has(client.id)) {
      return {
        success: false,
        error: 'Already in session',
      };
    }

    const participant: BuzzerParticipant = {
      clientId: client.id,
      userId,
      joinedAt: new Date(),
      isMaster: false,
    };

    session.participants.set(client.id, participant);
    client.join(`buzzer-${sessionId}`);

    this.server.to(`buzzer-${sessionId}`).emit('buzzer-participant-joined', {
      sessionId,
      participantId: client.id,
      userId,
      participantCount: session.participants.size,
    });

    this.logger.log(`Client ${client.id} joined buzzer session: ${sessionId}`);

    return {
      success: true,
      sessionId,
      isMaster: false,
      participantCount: session.participants.size,
      message: 'Joined buzzer session successfully',
    };
  }

  private triggerBuzzer(sessionId: string, client: Socket) {
    const session = this.buzzerSessions.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    if (!session.participants.has(client.id)) {
      return {
        success: false,
        error: 'Not a participant of this session',
      };
    }

    const participant = session.participants.get(client.id);
    
    this.server.to(`buzzer-${sessionId}`).emit('buzzer-triggered', {
      sessionId,
      triggeredBy: client.id,
      userId: participant.userId,
      timestamp: new Date().toISOString(),
    });

    this.eventEmitter.emit('photobooth.capture', {
      source: 'remote-buzzer',
      sessionId,
      triggeredBy: participant.userId || client.id,
    });

    this.logger.log(`Buzzer triggered in session ${sessionId} by ${client.id}`);

    return {
      success: true,
      message: 'Buzzer triggered successfully',
    };
  }

  private leaveBuzzerSession(sessionId: string, client: Socket) {
    const session = this.buzzerSessions.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    const participant = session.participants.get(client.id);
    
    if (!participant) {
      return {
        success: false,
        error: 'Not a participant of this session',
      };
    }

    session.participants.delete(client.id);
    client.leave(`buzzer-${sessionId}`);

    if (participant.isMaster && session.participants.size > 0) {
      const newMaster = session.participants.values().next().value;
      newMaster.isMaster = true;
      
      this.server.to(`buzzer-${sessionId}`).emit('buzzer-master-changed', {
        sessionId,
        newMasterId: newMaster.clientId,
      });
    }

    if (session.participants.size === 0) {
      this.buzzerSessions.delete(sessionId);
      this.logger.log(`Buzzer session ${sessionId} ended (no participants)`);
    } else {
      this.server.to(`buzzer-${sessionId}`).emit('buzzer-participant-left', {
        sessionId,
        participantId: client.id,
        participantCount: session.participants.size,
      });
    }

    return {
      success: true,
      message: 'Left buzzer session successfully',
    };
  }

  private getSessionStatus(sessionId: string) {
    const session = this.buzzerSessions.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    return {
      success: true,
      sessionId,
      isActive: session.isActive,
      participantCount: session.participants.size,
      createdAt: session.createdAt,
      participants: Array.from(session.participants.values()).map(p => ({
        clientId: p.clientId,
        userId: p.userId,
        isMaster: p.isMaster,
        joinedAt: p.joinedAt,
      })),
    };
  }

  getAllSessions() {
    return Array.from(this.buzzerSessions.entries()).map(([id, session]) => ({
      id,
      participantCount: session.participants.size,
      isActive: session.isActive,
      createdAt: session.createdAt,
    }));
  }

  endSession(sessionId: string) {
    const session = this.buzzerSessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    this.server.to(`buzzer-${sessionId}`).emit('buzzer-session-ended', {
      sessionId,
      reason: 'Session ended by administrator',
    });

    session.participants.forEach((participant) => {
      const socket = this.server.sockets.sockets.get(participant.clientId);
      if (socket) {
        socket.leave(`buzzer-${sessionId}`);
      }
    });

    this.buzzerSessions.delete(sessionId);
    this.logger.log(`Buzzer session ${sessionId} ended by administrator`);
    
    return true;
  }
}