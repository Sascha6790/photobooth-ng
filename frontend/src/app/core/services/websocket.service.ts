import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WebSocketConfig {
  url?: string;
  options?: any;
}

export interface BuzzerSession {
  sessionId: string;
  pin?: string;
  isMaster?: boolean;
  participantCount?: number;
}

export interface GalleryUpdate {
  type: string;
  image?: any;
  imageId?: string;
  timestamp: string;
}

export interface PrintQueueUpdate {
  type: string;
  job?: any;
  jobId?: string;
  queueLength?: number;
  timestamp: string;
}

export interface CollaborationEvent {
  type: string;
  sessionId: string;
  data: any;
  timestamp: string;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket!: Socket;
  private connectionStatus$ = new BehaviorSubject<boolean>(false);
  private connectionState$ = new BehaviorSubject<ConnectionState>(ConnectionState.DISCONNECTED);
  private currentRoom$ = new BehaviorSubject<string | null>(null);
  private buzzerSession$ = new BehaviorSubject<BuzzerSession | null>(null);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout?: any;
  private isIntentionalDisconnect = false;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket(config?: WebSocketConfig) {
    const url = config?.url || environment.wsUrl || 'http://localhost:3000';
    const options = config?.options || {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
      autoConnect: true
    };

    this.connectionState$.next(ConnectionState.CONNECTING);
    this.socket = io(url, options);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket.id);
      this.connectionStatus$.next(true);
      this.connectionState$.next(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
      
      // Re-join room if we were in one before disconnect
      const currentRoom = this.currentRoom$.value;
      if (currentRoom && !this.isIntentionalDisconnect) {
        this.joinRoom(currentRoom).catch(err => 
          console.warn('Failed to rejoin room after reconnect:', err)
        );
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.connectionStatus$.next(false);
      
      if (!this.isIntentionalDisconnect) {
        this.connectionState$.next(ConnectionState.RECONNECTING);
        // Don't clear room on unintentional disconnect
      } else {
        this.connectionState$.next(ConnectionState.DISCONNECTED);
        this.currentRoom$.next(null);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      this.connectionStatus$.next(false);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.connectionState$.next(ConnectionState.ERROR);
        console.error('Max reconnection attempts reached. Please check your connection.');
      } else {
        this.connectionState$.next(ConnectionState.RECONNECTING);
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      this.connectionState$.next(ConnectionState.CONNECTED);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('WebSocket reconnection attempt', attemptNumber);
      this.connectionState$.next(ConnectionState.RECONNECTING);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
      this.connectionState$.next(ConnectionState.ERROR);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.connectionState$.next(ConnectionState.ERROR);
    });
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus$.asObservable();
  }

  getConnectionState(): Observable<ConnectionState> {
    return this.connectionState$.asObservable();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getCurrentRoom(): Observable<string | null> {
    return this.currentRoom$.asObservable();
  }

  getBuzzerSession(): Observable<BuzzerSession | null> {
    return this.buzzerSession$.asObservable();
  }

  connect(config?: WebSocketConfig) {
    this.isIntentionalDisconnect = false;
    if (this.socket) {
      this.socket.disconnect();
    }
    this.initializeSocket(config);
  }

  reconnect() {
    this.isIntentionalDisconnect = false;
    this.reconnectAttempts = 0;
    if (this.socket) {
      this.socket.connect();
    } else {
      this.initializeSocket();
    }
  }

  disconnect() {
    this.isIntentionalDisconnect = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  joinRoom(room: string, userId?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject('WebSocket is not connected. Please check your connection.');
        return;
      }
      
      const timeout = setTimeout(() => {
        reject('Join room request timed out');
      }, 5000);
      
      this.socket.emit('join-room', { room, userId }, (response: any) => {
        clearTimeout(timeout);
        if (response?.success) {
          this.currentRoom$.next(room);
          resolve(response);
        } else {
          reject(response?.error || 'Failed to join room');
        }
      });
    });
  }

  leaveRoom(room: string, userId?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('leave-room', { room, userId }, (response: any) => {
        if (response?.success) {
          if (this.currentRoom$.value === room) {
            this.currentRoom$.next(null);
          }
          resolve(response);
        } else {
          reject(response?.error || 'Failed to leave room');
        }
      });
    });
  }

  createBuzzerSession(sessionId: string, pin: string, userId?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('remote-buzzer', {
        action: 'create',
        sessionId,
        pin,
        userId
      }, (response: any) => {
        if (response?.success) {
          this.buzzerSession$.next({
            sessionId,
            pin,
            isMaster: true,
            participantCount: 1
          });
          resolve(response);
        } else {
          reject(response?.error || 'Failed to create buzzer session');
        }
      });
    });
  }

  joinBuzzerSession(sessionId: string, pin: string, userId?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('remote-buzzer', {
        action: 'join',
        sessionId,
        pin,
        userId
      }, (response: any) => {
        if (response?.success) {
          this.buzzerSession$.next({
            sessionId,
            isMaster: response.isMaster,
            participantCount: response.participantCount
          });
          resolve(response);
        } else {
          reject(response?.error || 'Failed to join buzzer session');
        }
      });
    });
  }

  triggerBuzzer(sessionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('remote-buzzer', {
        action: 'trigger',
        sessionId
      }, (response: any) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response?.error || 'Failed to trigger buzzer');
        }
      });
    });
  }

  leaveBuzzerSession(sessionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('remote-buzzer', {
        action: 'leave',
        sessionId
      }, (response: any) => {
        if (response?.success) {
          this.buzzerSession$.next(null);
          resolve(response);
        } else {
          reject(response?.error || 'Failed to leave buzzer session');
        }
      });
    });
  }

  onBuzzerTriggered(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('buzzer-triggered', (data) => {
        observer.next(data);
      });
    });
  }

  onGalleryUpdate(): Observable<GalleryUpdate> {
    return new Observable(observer => {
      this.socket.on('gallery-update', (data: GalleryUpdate) => {
        observer.next(data);
      });
    });
  }

  emitGalleryUpdate(action: string, imageData?: any, room?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('gallery-update', {
        action,
        imageData,
        room
      }, (response: any) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response?.error || 'Gallery update failed');
        }
      });
    });
  }

  onSettingsSync(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('settings-sync', (data) => {
        observer.next(data);
      });
    });
  }

  syncSettings(settings: any, room?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('settings-sync', {
        settings,
        room
      }, (response: any) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response?.error || 'Settings sync failed');
        }
      });
    });
  }

  onPrintQueueUpdate(): Observable<PrintQueueUpdate> {
    return new Observable(observer => {
      this.socket.on('print-queue-update', (data: PrintQueueUpdate) => {
        observer.next(data);
      });
    });
  }

  updatePrintQueue(action: string, jobId?: string, job?: any, room?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('print-queue-update', {
        action,
        jobId,
        job,
        room
      }, (response: any) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response?.error || 'Print queue update failed');
        }
      });
    });
  }

  voteForImage(imageId: string, userId: string, vote: number, sessionId?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('vote-image', {
        imageId,
        userId,
        vote,
        sessionId
      }, (response: any) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response?.error || 'Vote failed');
        }
      });
    });
  }

  onCollaborationUpdate(): Observable<CollaborationEvent> {
    return new Observable(observer => {
      const events = [
        'collaboration-user-joined',
        'collaboration-user-left',
        'collaboration-host-changed',
        'collaboration-vote-updated',
        'collaboration-slideshow-started',
        'collaboration-slideshow-stopped',
        'collaboration-slideshow-next',
        'collaboration-slideshow-previous'
      ];

      events.forEach(event => {
        this.socket.on(event, (data) => {
          observer.next({
            type: event,
            sessionId: data.sessionId,
            data,
            timestamp: data.timestamp || new Date().toISOString()
          });
        });
      });
    });
  }

  controlSlideshow(action: 'start' | 'stop' | 'next' | 'previous', sessionId: string, interval?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('slideshow-control', {
        action,
        sessionId,
        interval
      }, (response: any) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response?.error || 'Slideshow control failed');
        }
      });
    });
  }

  getSystemMetrics(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('get-metrics', {}, (response: any) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response?.error || 'Failed to get metrics');
        }
      });
    });
  }

  getActiveSessions(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('get-active-sessions', {}, (response: any) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response?.error || 'Failed to get active sessions');
        }
      });
    });
  }

  onMonitoringUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('monitoring-metrics-update', (data) => {
        observer.next(data);
      });
    });
  }

  broadcastToRoom(room: string, event: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit('broadcast-to-room', {
        room,
        event,
        payload
      }, (response: any) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response?.error || 'Broadcast failed');
        }
      });
    });
  }

  on(event: string): Observable<any> {
    return new Observable(observer => {
      this.socket.on(event, (data) => {
        observer.next(data);
      });
    });
  }

  emit(event: string, data: any): void {
    this.socket.emit(event, data);
  }

  emitWithAck(event: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject('WebSocket is not connected. Please check your connection.');
        return;
      }
      
      const timeout = setTimeout(() => {
        reject(`Request '${event}' timed out`);
      }, 10000);
      
      this.socket.emit(event, data, (response: any) => {
        clearTimeout(timeout);
        if (response?.success) {
          resolve(response);
        } else {
          reject(response?.error || 'Request failed');
        }
      });
    });
  }
}