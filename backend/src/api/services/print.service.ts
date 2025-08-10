import { Injectable } from '@nestjs/common';
import { ConfigurationService } from '../../config/configuration.service';
import { LoggerService } from '../../services/logger.service';
import { spawn } from 'child_process';

interface PrintJob {
  id: string;
  imageId: string;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  copies: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

@Injectable()
export class PrintService {
  private printQueue: PrintJob[] = [];
  private isProcessing = false;
  private readonly logger: LoggerService;
  
  constructor(
    private readonly configService: ConfigurationService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createChild('PrintService');
  }
  
  async printImage(imageId: string, copies: number = 1): Promise<PrintJob> {
    const config = this.configService.get();
    
    if (!config.print.enabled) {
      throw new Error('Printing is disabled');
    }
    
    if (!config.print.printerName) {
      throw new Error('No printer configured');
    }
    
    const job: PrintJob = {
      id: `print-${Date.now()}`,
      imageId,
      status: 'pending',
      copies,
      createdAt: new Date(),
    };
    
    this.printQueue.push(job);
    this.processQueue();
    
    return job;
  }
  
  async getQueue(): Promise<PrintJob[]> {
    return this.printQueue;
  }
  
  async getJob(jobId: string): Promise<PrintJob | undefined> {
    return this.printQueue.find(job => job.id === jobId);
  }
  
  async cancelJob(jobId: string): Promise<boolean> {
    const jobIndex = this.printQueue.findIndex(job => job.id === jobId);
    
    if (jobIndex === -1) {
      return false;
    }
    
    const job = this.printQueue[jobIndex];
    
    if (job.status === 'printing') {
      // Cannot cancel job in progress
      return false;
    }
    
    this.printQueue.splice(jobIndex, 1);
    return true;
  }
  
  private async processQueue() {
    if (this.isProcessing || this.printQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.printQueue.length > 0) {
      const job = this.printQueue.find(j => j.status === 'pending');
      
      if (!job) {
        break;
      }
      
      job.status = 'printing';
      
      try {
        await this.executePrintJob(job);
        job.status = 'completed';
        job.completedAt = new Date();
        this.logger.log(`Print job ${job.id} completed`);
      } catch (error) {
        job.status = 'failed';
        job.error = error.message;
        this.logger.error(`Print job ${job.id} failed: ${error.message}`);
      }
      
      // Remove completed/failed jobs after some time
      setTimeout(() => {
        const index = this.printQueue.indexOf(job);
        if (index !== -1) {
          this.printQueue.splice(index, 1);
        }
      }, 60000); // Remove after 1 minute
    }
    
    this.isProcessing = false;
  }
  
  private async executePrintJob(job: PrintJob): Promise<void> {
    const config = this.configService.get();
    
    // This is a simplified implementation using lp command (CUPS)
    // Real implementation would depend on the OS and printer setup
    
    return new Promise((resolve, reject) => {
      const args = [
        '-d', config.print.printerName,
        '-n', job.copies.toString(),
      ];
      
      // Add image path
      // TODO: Get actual image path from imageId
      const imagePath = `/path/to/image/${job.imageId}`;
      args.push(imagePath);
      
      const process = spawn('lp', args);
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Print command failed with code ${code}`));
        }
      });
      
      process.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  async getPrinters(): Promise<string[]> {
    // Get list of available printers using lpstat
    return new Promise((resolve, reject) => {
      const process = spawn('lpstat', ['-p']);
      let stdout = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          // Parse printer names from lpstat output
          const printers = stdout
            .split('\n')
            .filter(line => line.startsWith('printer'))
            .map(line => line.split(' ')[1]);
          resolve(printers);
        } else {
          resolve([]);
        }
      });
      
      process.on('error', () => {
        resolve([]);
      });
    });
  }
  
  async testPrint(): Promise<boolean> {
    try {
      const config = this.configService.get();
      
      if (!config.print.enabled || !config.print.printerName) {
        return false;
      }
      
      // Print a test page
      await new Promise((resolve, reject) => {
        const process = spawn('lp', [
          '-d', config.print.printerName,
          '/usr/share/cups/data/testprint'
        ]);
        
        process.on('close', (code) => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error('Test print failed'));
          }
        });
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Test print failed: ${error.message}`);
      return false;
    }
  }
}