import { Injectable, Logger } from '@nestjs/common';
import { CameraStrategy } from '../strategies/camera.strategy';
import { Observable, of, delay } from 'rxjs';
import { map } from 'rxjs/operators';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

@Injectable()
export class MockCameraStrategy implements CameraStrategy {
  private readonly logger = new Logger(MockCameraStrategy.name);
  private mockImagePath = path.join(process.cwd(), 'assets', 'mock-photo.jpg');

  async initialize(): Promise<void> {
    this.logger.log('Mock camera initialized');
    
    // Create a mock image if it doesn't exist
    if (!fs.existsSync(this.mockImagePath)) {
      await this.createMockImage();
    }
  }

  async capturePhoto(): Promise<string> {
    this.logger.log('Capturing mock photo');
    
    // Simulate capture delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const timestamp = Date.now();
    const outputPath = path.join(process.cwd(), 'uploads', `mock_${timestamp}.jpg`);
    
    // Ensure uploads directory exists
    const uploadsDir = path.dirname(outputPath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Copy mock image with timestamp overlay
    await this.createTimestampedImage(outputPath, timestamp);
    
    this.logger.log(`Mock photo captured: ${outputPath}`);
    return outputPath;
  }

  getPreviewStream(): Observable<Buffer> {
    // Return a mock video stream (just repeated images)
    return new Observable(subscriber => {
      const interval = setInterval(async () => {
        try {
          const buffer = await this.generatePreviewFrame();
          subscriber.next(buffer);
        } catch (error) {
          subscriber.error(error);
        }
      }, 100); // 10 FPS

      return () => clearInterval(interval);
    });
  }

  async adjustSettings(settings: any): Promise<void> {
    this.logger.log('Mock camera settings adjusted:', settings);
  }

  async cleanup(): Promise<void> {
    this.logger.log('Mock camera cleanup');
  }

  private async createMockImage(): Promise<void> {
    const dir = path.dirname(this.mockImagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create a simple colored rectangle with text
    await sharp({
      create: {
        width: 1920,
        height: 1080,
        channels: 3,
        background: { r: 100, g: 150, b: 200 }
      }
    })
    .composite([
      {
        input: Buffer.from(
          `<svg width="1920" height="1080">
            <text x="50%" y="50%" text-anchor="middle" font-size="60" fill="white">
              Mock Camera Image
            </text>
            <text x="50%" y="60%" text-anchor="middle" font-size="40" fill="white">
              For Testing Only
            </text>
          </svg>`
        ),
        top: 0,
        left: 0
      }
    ])
    .jpeg()
    .toFile(this.mockImagePath);
  }

  private async createTimestampedImage(outputPath: string, timestamp: number): Promise<void> {
    const date = new Date(timestamp).toLocaleString();
    
    await sharp(this.mockImagePath)
      .composite([
        {
          input: Buffer.from(
            `<svg width="1920" height="100">
              <rect width="1920" height="100" fill="rgba(0,0,0,0.5)"/>
              <text x="50%" y="60" text-anchor="middle" font-size="40" fill="white">
                ${date}
              </text>
            </svg>`
          ),
          top: 980,
          left: 0
        }
      ])
      .toFile(outputPath);
  }

  private async generatePreviewFrame(): Promise<Buffer> {
    const timestamp = new Date().toLocaleTimeString();
    
    return sharp({
      create: {
        width: 640,
        height: 480,
        channels: 3,
        background: { 
          r: Math.floor(Math.random() * 50) + 100,
          g: Math.floor(Math.random() * 50) + 150,
          b: Math.floor(Math.random() * 50) + 200
        }
      }
    })
    .composite([
      {
        input: Buffer.from(
          `<svg width="640" height="480">
            <text x="50%" y="50%" text-anchor="middle" font-size="30" fill="white">
              Mock Camera Preview
            </text>
            <text x="50%" y="60%" text-anchor="middle" font-size="20" fill="white">
              ${timestamp}
            </text>
          </svg>`
        ),
        top: 0,
        left: 0
      }
    ])
    .jpeg()
    .toBuffer();
  }
}