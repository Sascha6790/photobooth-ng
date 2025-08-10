import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface PrintJob {
  id: string;
  imageUrl: string;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  copies: number;
  userId?: string;
}

@Injectable()
export class LiveUpdateService {
  private server: Server;
  private readonly logger = new Logger(LiveUpdateService.name);
  private readonly eventEmitter = new EventEmitter2();
  private printQueue: PrintJob[] = [];
  private currentSettings: any = {};

  setServer(server: Server) {
    this.server = server;
    this.logger.log('Live Update Service initialized with Socket.IO server');
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.eventEmitter.on('gallery.image.added', (data) => {
      this.broadcastGalleryUpdate('image-added', data);
    });

    this.eventEmitter.on('gallery.image.deleted', (data) => {
      this.broadcastGalleryUpdate('image-deleted', data);
    });

    this.eventEmitter.on('print.job.added', (data) => {
      this.broadcastPrintUpdate('job-added', data);
    });

    this.eventEmitter.on('print.job.updated', (data) => {
      this.broadcastPrintUpdate('job-updated', data);
    });

    this.eventEmitter.on('settings.updated', (data) => {
      this.broadcastSettingsUpdate(data);
    });
  }

  async handleGalleryUpdate(
    data: { action: string; imageData?: any; room?: string },
    client: Socket,
  ) {
    const { action, imageData, room } = data;

    switch (action) {
      case 'new-image':
        return this.handleNewImage(imageData, room, client);
      
      case 'delete-image':
        return this.handleDeleteImage(imageData, room, client);
      
      case 'update-metadata':
        return this.handleUpdateMetadata(imageData, room, client);
      
      case 'refresh':
        return this.handleGalleryRefresh(room, client);
      
      default:
        return {
          success: false,
          error: 'Unknown gallery action',
        };
    }
  }

  private handleNewImage(imageData: any, room: string, client: Socket) {
    if (!imageData) {
      return {
        success: false,
        error: 'Image data is required',
      };
    }

    const event = {
      type: 'gallery-image-added',
      image: {
        ...imageData,
        timestamp: new Date().toISOString(),
        addedBy: client.id,
      },
    };

    if (room) {
      this.server.to(room).emit('gallery-update', event);
    } else {
      this.server.emit('gallery-update', event);
    }

    this.eventEmitter.emit('gallery.image.added', imageData);
    
    this.logger.log(`New image added to gallery: ${imageData.id || 'unknown'}`);

    return {
      success: true,
      message: 'Image added to gallery',
    };
  }

  private handleDeleteImage(imageData: any, room: string, client: Socket) {
    if (!imageData?.id) {
      return {
        success: false,
        error: 'Image ID is required',
      };
    }

    const event = {
      type: 'gallery-image-deleted',
      imageId: imageData.id,
      timestamp: new Date().toISOString(),
      deletedBy: client.id,
    };

    if (room) {
      this.server.to(room).emit('gallery-update', event);
    } else {
      this.server.emit('gallery-update', event);
    }

    this.eventEmitter.emit('gallery.image.deleted', { id: imageData.id });
    
    this.logger.log(`Image deleted from gallery: ${imageData.id}`);

    return {
      success: true,
      message: 'Image deleted from gallery',
    };
  }

  private handleUpdateMetadata(imageData: any, room: string, client: Socket) {
    if (!imageData?.id) {
      return {
        success: false,
        error: 'Image ID is required',
      };
    }

    const event = {
      type: 'gallery-metadata-updated',
      imageId: imageData.id,
      metadata: imageData.metadata,
      timestamp: new Date().toISOString(),
      updatedBy: client.id,
    };

    if (room) {
      this.server.to(room).emit('gallery-update', event);
    } else {
      this.server.emit('gallery-update', event);
    }

    this.logger.log(`Image metadata updated: ${imageData.id}`);

    return {
      success: true,
      message: 'Image metadata updated',
    };
  }

  private handleGalleryRefresh(room: string, client: Socket) {
    const event = {
      type: 'gallery-refresh-requested',
      timestamp: new Date().toISOString(),
      requestedBy: client.id,
    };

    if (room) {
      this.server.to(room).emit('gallery-update', event);
    } else {
      this.server.emit('gallery-update', event);
    }

    this.logger.log('Gallery refresh requested');

    return {
      success: true,
      message: 'Gallery refresh triggered',
    };
  }

  async handleSettingsSync(
    data: { settings: any; room?: string },
    client: Socket,
  ) {
    const { settings, room } = data;

    if (!settings) {
      return {
        success: false,
        error: 'Settings data is required',
      };
    }

    this.currentSettings = { ...this.currentSettings, ...settings };

    const event = {
      type: 'settings-updated',
      settings: this.currentSettings,
      timestamp: new Date().toISOString(),
      updatedBy: client.id,
    };

    if (room) {
      client.to(room).emit('settings-sync', event);
    } else {
      client.broadcast.emit('settings-sync', event);
    }

    this.eventEmitter.emit('settings.updated', this.currentSettings);
    
    this.logger.log('Settings synchronized across clients');

    return {
      success: true,
      message: 'Settings synchronized',
      settings: this.currentSettings,
    };
  }

  async handlePrintQueueUpdate(
    data: { action: string; jobId?: string; job?: any; room?: string },
    client: Socket,
  ) {
    const { action, jobId, job, room } = data;

    switch (action) {
      case 'add':
        return this.addPrintJob(job, room, client);
      
      case 'update':
        return this.updatePrintJob(jobId, job, room, client);
      
      case 'remove':
        return this.removePrintJob(jobId, room, client);
      
      case 'status':
        return this.getPrintQueueStatus();
      
      case 'clear':
        return this.clearPrintQueue(room, client);
      
      default:
        return {
          success: false,
          error: 'Unknown print queue action',
        };
    }
  }

  private addPrintJob(job: any, room: string, client: Socket) {
    if (!job) {
      return {
        success: false,
        error: 'Job data is required',
      };
    }

    const printJob: PrintJob = {
      id: job.id || `job-${Date.now()}`,
      imageUrl: job.imageUrl,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      copies: job.copies || 1,
      userId: job.userId,
    };

    this.printQueue.push(printJob);

    const event = {
      type: 'print-job-added',
      job: printJob,
      queueLength: this.printQueue.length,
      timestamp: new Date().toISOString(),
    };

    if (room) {
      this.server.to(room).emit('print-queue-update', event);
    } else {
      this.server.emit('print-queue-update', event);
    }

    this.eventEmitter.emit('print.job.added', printJob);
    
    this.logger.log(`Print job added: ${printJob.id}`);

    return {
      success: true,
      jobId: printJob.id,
      message: 'Print job added to queue',
    };
  }

  private updatePrintJob(jobId: string, updates: any, room: string, client: Socket) {
    if (!jobId) {
      return {
        success: false,
        error: 'Job ID is required',
      };
    }

    const jobIndex = this.printQueue.findIndex(j => j.id === jobId);
    
    if (jobIndex === -1) {
      return {
        success: false,
        error: 'Job not found',
      };
    }

    this.printQueue[jobIndex] = {
      ...this.printQueue[jobIndex],
      ...updates,
      updatedAt: new Date(),
    };

    const event = {
      type: 'print-job-updated',
      job: this.printQueue[jobIndex],
      timestamp: new Date().toISOString(),
    };

    if (room) {
      this.server.to(room).emit('print-queue-update', event);
    } else {
      this.server.emit('print-queue-update', event);
    }

    this.eventEmitter.emit('print.job.updated', this.printQueue[jobIndex]);
    
    this.logger.log(`Print job updated: ${jobId}`);

    return {
      success: true,
      message: 'Print job updated',
    };
  }

  private removePrintJob(jobId: string, room: string, client: Socket) {
    if (!jobId) {
      return {
        success: false,
        error: 'Job ID is required',
      };
    }

    const jobIndex = this.printQueue.findIndex(j => j.id === jobId);
    
    if (jobIndex === -1) {
      return {
        success: false,
        error: 'Job not found',
      };
    }

    const removedJob = this.printQueue.splice(jobIndex, 1)[0];

    const event = {
      type: 'print-job-removed',
      jobId,
      queueLength: this.printQueue.length,
      timestamp: new Date().toISOString(),
    };

    if (room) {
      this.server.to(room).emit('print-queue-update', event);
    } else {
      this.server.emit('print-queue-update', event);
    }

    this.logger.log(`Print job removed: ${jobId}`);

    return {
      success: true,
      message: 'Print job removed from queue',
    };
  }

  private getPrintQueueStatus() {
    return {
      success: true,
      queue: this.printQueue,
      queueLength: this.printQueue.length,
      pendingJobs: this.printQueue.filter(j => j.status === 'pending').length,
      printingJobs: this.printQueue.filter(j => j.status === 'printing').length,
      completedJobs: this.printQueue.filter(j => j.status === 'completed').length,
      failedJobs: this.printQueue.filter(j => j.status === 'failed').length,
    };
  }

  private clearPrintQueue(room: string, client: Socket) {
    const previousLength = this.printQueue.length;
    this.printQueue = [];

    const event = {
      type: 'print-queue-cleared',
      previousLength,
      timestamp: new Date().toISOString(),
      clearedBy: client.id,
    };

    if (room) {
      this.server.to(room).emit('print-queue-update', event);
    } else {
      this.server.emit('print-queue-update', event);
    }

    this.logger.log('Print queue cleared');

    return {
      success: true,
      message: 'Print queue cleared',
      jobsCleared: previousLength,
    };
  }

  private broadcastGalleryUpdate(type: string, data: any) {
    this.server.emit('gallery-update', {
      type,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  private broadcastPrintUpdate(type: string, data: any) {
    this.server.emit('print-queue-update', {
      type,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  private broadcastSettingsUpdate(settings: any) {
    this.server.emit('settings-sync', {
      type: 'settings-updated',
      settings,
      timestamp: new Date().toISOString(),
    });
  }
}