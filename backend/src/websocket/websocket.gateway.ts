import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { RemoteBuzzerService } from './services/remote-buzzer.service';
import { LiveUpdateService } from './services/live-update.service';
import { CollaborationService } from './services/collaboration.service';
import { MonitoringService } from './services/monitoring.service';
import { SessionService } from '../session/session.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(
    private readonly remoteBuzzerService: RemoteBuzzerService,
    private readonly liveUpdateService: LiveUpdateService,
    private readonly collaborationService: CollaborationService,
    private readonly monitoringService: MonitoringService,
    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    this.remoteBuzzerService.setServer(server);
    this.liveUpdateService.setServer(server);
    this.collaborationService.setServer(server);
    this.monitoringService.setServer(server);
  }

  handleConnection(client: Socket) {
    const clientId = client.id;
    const clientIp = client.handshake.address;
    
    this.logger.log(`Client connected: ${clientId} from ${clientIp}`);
    this.monitoringService.trackConnection(clientId, clientIp);
    
    client.emit('connected', {
      id: clientId,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    const clientId = client.id;
    
    this.logger.log(`Client disconnected: ${clientId}`);
    this.monitoringService.trackDisconnection(clientId);
    this.collaborationService.handleDisconnect(clientId);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): string {
    return 'pong';
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() data: { room: string; userId?: string; userName?: string; role?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { room, userId, userName, role } = data;
    
    if (!room) {
      throw new WsException('Room name is required');
    }

    await client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    
    // Integrate with session management
    if (userId) {
      try {
        await this.sessionService.joinSession(room, {
          userId,
          userName,
          role: role as any,
          socketId: client.id,
          deviceType: 'web',
          ipAddress: client.handshake.address,
          userAgent: client.handshake.headers['user-agent'],
        });
      } catch (error) {
        this.logger.warn(`Failed to join session ${room}: ${error.message}`);
      }
      
      this.collaborationService.addUserToSession(room, userId, client.id);
    }

    client.to(room).emit('user-joined', {
      clientId: client.id,
      userId,
      userName,
      room,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      room,
      message: `Successfully joined room ${room}`,
    };
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @MessageBody() data: { room: string; userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { room, userId } = data;
    
    if (!room) {
      throw new WsException('Room name is required');
    }

    await client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room}`);
    
    // Integrate with session management
    if (userId) {
      try {
        await this.sessionService.leaveSession(room, userId);
      } catch (error) {
        this.logger.warn(`Failed to leave session ${room}: ${error.message}`);
      }
      
      this.collaborationService.removeUserFromSession(room, userId);
    }

    client.to(room).emit('user-left', {
      clientId: client.id,
      userId,
      room,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      room,
      message: `Successfully left room ${room}`,
    };
  }

  @SubscribeMessage('remote-buzzer')
  async handleRemoteBuzzer(
    @MessageBody() data: { action: string; sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    return this.remoteBuzzerService.handleBuzzerEvent(data, client);
  }

  @SubscribeMessage('gallery-update')
  async handleGalleryUpdate(
    @MessageBody() data: { action: string; imageData?: any },
    @ConnectedSocket() client: Socket,
  ) {
    return this.liveUpdateService.handleGalleryUpdate(data, client);
  }

  @SubscribeMessage('settings-sync')
  async handleSettingsSync(
    @MessageBody() data: { settings: any },
    @ConnectedSocket() client: Socket,
  ) {
    return this.liveUpdateService.handleSettingsSync(data, client);
  }

  @SubscribeMessage('print-queue-update')
  async handlePrintQueueUpdate(
    @MessageBody() data: { action: string; jobId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    return this.liveUpdateService.handlePrintQueueUpdate(data, client);
  }

  @SubscribeMessage('vote-image')
  async handleVoteImage(
    @MessageBody() data: { imageId: string; userId: string; vote: number },
    @ConnectedSocket() client: Socket,
  ) {
    return this.collaborationService.handleVote(data, client);
  }

  @SubscribeMessage('slideshow-control')
  async handleSlideshowControl(
    @MessageBody() data: { action: 'start' | 'stop' | 'next' | 'previous'; sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    return this.collaborationService.handleSlideshowControl(data, client);
  }

  @SubscribeMessage('get-metrics')
  async handleGetMetrics(@ConnectedSocket() client: Socket) {
    return this.monitoringService.getMetrics();
  }

  @SubscribeMessage('get-active-sessions')
  async handleGetActiveSessions(@ConnectedSocket() client: Socket) {
    return this.monitoringService.getActiveSessions();
  }

  @SubscribeMessage('broadcast-to-room')
  async handleBroadcastToRoom(
    @MessageBody() data: { room: string; event: string; payload: any },
    @ConnectedSocket() client: Socket,
  ) {
    const { room, event, payload } = data;
    
    if (!room || !event) {
      throw new WsException('Room and event are required');
    }

    this.server.to(room).emit(event, {
      ...payload,
      senderId: client.id,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Broadcast sent to room ${room}`,
    };
  }
}