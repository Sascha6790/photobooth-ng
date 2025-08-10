import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import * as path from 'path';
import { ConfigurationService } from '../../config/configuration.service';
import { FileService } from '../../services/file.service';
import { LoggerService } from '../../services/logger.service';

@Injectable()
export class ImageProcessingService {
  private readonly logger: LoggerService;
  
  constructor(
    private readonly configService: ConfigurationService,
    private readonly fileService: FileService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createChild('ImageProcessingService');
  }
  
  async applyFilter(imageBuffer: Buffer, filterName: string): Promise<Buffer> {
    try {
      let image = sharp(imageBuffer);
      
      switch (filterName) {
        case 'grayscale':
          image = image.grayscale();
          break;
        case 'sepia':
          image = image.recomb([
            [0.393, 0.769, 0.189],
            [0.349, 0.686, 0.168],
            [0.272, 0.534, 0.131],
          ]);
          break;
        case 'blur':
          image = image.blur(5);
          break;
        case 'sharpen':
          image = image.sharpen();
          break;
        case 'vintage':
          image = image
            .modulate({ brightness: 0.9, saturation: 0.8 })
            .tint({ r: 255, g: 240, b: 200 });
          break;
        case 'cold':
          image = image.tint({ r: 200, g: 220, b: 255 });
          break;
        case 'warm':
          image = image.tint({ r: 255, g: 220, b: 200 });
          break;
        case 'high-contrast':
          image = image.linear(1.5, -(128 * 1.5) + 128);
          break;
        default:
          this.logger.warn(`Unknown filter: ${filterName}`);
      }
      
      return await image.toBuffer();
    } catch (error) {
      this.logger.error(`Failed to apply filter ${filterName}: ${error.message}`);
      throw error;
    }
  }
  
  async applyFrame(imageBuffer: Buffer, frameName: string): Promise<Buffer> {
    try {
      const config = this.configService.get();
      const framePath = path.join(config.paths.frames, `${frameName}.png`);
      
      if (!(await this.fileService.exists(framePath))) {
        this.logger.warn(`Frame not found: ${framePath}`);
        return imageBuffer;
      }
      
      const frameBuffer = await this.fileService.readFileBuffer(framePath);
      const metadata = await sharp(imageBuffer).metadata();
      
      // Resize frame to match image dimensions
      const resizedFrame = await sharp(frameBuffer)
        .resize(metadata.width, metadata.height)
        .toBuffer();
      
      // Composite frame over image
      return await sharp(imageBuffer)
        .composite([{ input: resizedFrame, gravity: 'center' }])
        .toBuffer();
    } catch (error) {
      this.logger.error(`Failed to apply frame ${frameName}: ${error.message}`);
      throw error;
    }
  }
  
  async generateThumbnail(imagePath: string): Promise<string> {
    try {
      const config = this.configService.get();
      const filename = path.basename(imagePath);
      const thumbnailPath = path.join(config.paths.thumbs, filename);
      
      await this.fileService.ensureDir(config.paths.thumbs);
      
      await sharp(imagePath)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      
      return thumbnailPath;
    } catch (error) {
      this.logger.error(`Failed to generate thumbnail for ${imagePath}: ${error.message}`);
      throw error;
    }
  }
  
  async applyChromakey(imageId: string, backgroundPath: string): Promise<Buffer> {
    // TODO: Implement chromakey processing
    this.logger.warn('Chromakey not yet implemented');
    return Buffer.from('');
  }
  
  async applyChromakeyBuffer(imageBuffer: Buffer, backgroundPath: string): Promise<Buffer> {
    try {
      const config = this.configService.get();
      const bgFullPath = path.join(config.paths.backgrounds, backgroundPath);
      
      if (!(await this.fileService.exists(bgFullPath))) {
        this.logger.warn(`Background not found: ${bgFullPath}`);
        return imageBuffer;
      }
      
      // This is a simplified chromakey implementation
      // A real implementation would need more sophisticated color detection
      const backgroundBuffer = await this.fileService.readFileBuffer(bgFullPath);
      const metadata = await sharp(imageBuffer).metadata();
      
      // Resize background to match image dimensions
      const resizedBackground = await sharp(backgroundBuffer)
        .resize(metadata.width, metadata.height)
        .toBuffer();
      
      // For now, just return the original image
      // Real chromakey would require pixel-by-pixel processing
      return imageBuffer;
    } catch (error) {
      this.logger.error(`Failed to apply chromakey: ${error.message}`);
      throw error;
    }
  }
  
  async getAvailableBackgrounds(): Promise<string[]> {
    try {
      const config = this.configService.get();
      const backgrounds = await this.fileService.listFiles(config.paths.backgrounds, {
        extensions: ['.jpg', '.jpeg', '.png'],
      });
      
      return backgrounds.map(bg => path.basename(bg));
    } catch (error) {
      this.logger.error(`Failed to get backgrounds: ${error.message}`);
      throw error;
    }
  }
  
  async createCollage(images: Buffer[], layout: string): Promise<Buffer> {
    try {
      // Parse layout (e.g., "2x2", "3x2")
      const [cols, rows] = layout.split('x').map(Number);
      const totalImages = cols * rows;
      
      if (images.length !== totalImages) {
        throw new Error(`Layout ${layout} requires ${totalImages} images, got ${images.length}`);
      }
      
      // Calculate dimensions for each image
      const collageWidth = 1920;
      const collageHeight = 1280;
      const imageWidth = Math.floor(collageWidth / cols);
      const imageHeight = Math.floor(collageHeight / rows);
      
      // Resize all images
      const resizedImages = await Promise.all(
        images.map(img =>
          sharp(img)
            .resize(imageWidth, imageHeight, { fit: 'cover' })
            .toBuffer()
        )
      );
      
      // Create composite array
      const composites = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const index = row * cols + col;
          composites.push({
            input: resizedImages[index],
            left: col * imageWidth,
            top: row * imageHeight,
          });
        }
      }
      
      // Create collage
      return await sharp({
        create: {
          width: collageWidth,
          height: collageHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .composite(composites)
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (error) {
      this.logger.error(`Failed to create collage: ${error.message}`);
      throw error;
    }
  }
  
  async rotateImage(imageBuffer: Buffer, degrees: number): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .rotate(degrees)
        .toBuffer();
    } catch (error) {
      this.logger.error(`Failed to rotate image: ${error.message}`);
      throw error;
    }
  }
  
  async flipImage(imageBuffer: Buffer, horizontal: boolean = true): Promise<Buffer> {
    try {
      const image = sharp(imageBuffer);
      return horizontal ? await image.flop().toBuffer() : await image.flip().toBuffer();
    } catch (error) {
      this.logger.error(`Failed to flip image: ${error.message}`);
      throw error;
    }
  }
  
  async addText(
    imageBuffer: Buffer,
    text: string,
    options?: {
      font?: string;
      size?: number;
      color?: string;
      position?: string;
    }
  ): Promise<Buffer> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      const fontSize = options?.size || 48;
      const fontColor = options?.color || 'white';
      
      // Create SVG with text
      const svg = `
        <svg width="${metadata.width}" height="${metadata.height}">
          <text x="50%" y="95%" font-family="Arial" font-size="${fontSize}" 
                fill="${fontColor}" text-anchor="middle" stroke="black" stroke-width="2">
            ${text}
          </text>
        </svg>
      `;
      
      return await sharp(imageBuffer)
        .composite([{ input: Buffer.from(svg), gravity: 'south' }])
        .toBuffer();
    } catch (error) {
      this.logger.error(`Failed to add text: ${error.message}`);
      throw error;
    }
  }
}