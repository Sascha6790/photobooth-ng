import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as path from 'path';
import { ConfigurationService } from '../../config/configuration.service';
import { FileService } from '../../services/file.service';
import { LoggerService } from '../../services/logger.service';

@Injectable()
export class QrcodeService {
  private readonly logger: LoggerService;
  
  constructor(
    private readonly configService: ConfigurationService,
    private readonly fileService: FileService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createChild('QrcodeService');
  }
  
  async generateForImage(imageId: string): Promise<{ qrcode: string; url: string }> {
    const config = this.configService.get();
    
    if (!config.qr.enabled) {
      throw new Error('QR code generation is disabled');
    }
    
    if (!config.qr.url) {
      throw new Error('QR code URL not configured');
    }
    
    try {
      // Build URL for the image
      let url = config.qr.url;
      if (config.qr.append_filename) {
        url = url.endsWith('/') ? url : url + '/';
        url += `gallery/${imageId}`;
      }
      
      // Add custom text if configured
      if (config.qr.custom_text) {
        url += `?text=${encodeURIComponent(config.qr.custom_text)}`;
      }
      
      // Generate QR code
      const qrCodePath = path.join(config.paths.qr, `qr_${imageId}.png`);
      await this.fileService.ensureDir(config.paths.qr);
      
      await QRCode.toFile(qrCodePath, url, {
        width: config.qr.size || 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      
      this.logger.log(`QR code generated for image ${imageId}: ${qrCodePath}`);
      
      return {
        qrcode: qrCodePath,
        url,
      };
    } catch (error) {
      this.logger.error(`Failed to generate QR code for ${imageId}: ${error.message}`);
      throw error;
    }
  }
  
  async generateCustom(text: string, options?: {
    size?: number;
    format?: 'png' | 'svg' | 'base64';
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }): Promise<string> {
    try {
      const size = options?.size || 200;
      const format = options?.format || 'base64';
      const errorCorrectionLevel = options?.errorCorrectionLevel || 'M';
      
      if (format === 'base64') {
        return await QRCode.toDataURL(text, {
          width: size,
          errorCorrectionLevel,
        });
      } else if (format === 'svg') {
        return await QRCode.toString(text, {
          type: 'svg',
          width: size,
          errorCorrectionLevel,
        });
      } else {
        // Generate PNG file
        const filename = `qr_custom_${Date.now()}.png`;
        const config = this.configService.get();
        const filepath = path.join(config.paths.qr, filename);
        
        await this.fileService.ensureDir(config.paths.qr);
        await QRCode.toFile(filepath, text, {
          width: size,
          errorCorrectionLevel,
        });
        
        return filepath;
      }
    } catch (error) {
      this.logger.error(`Failed to generate custom QR code: ${error.message}`);
      throw error;
    }
  }
  
  async generateBatch(
    items: Array<{ id: string; text: string }>
  ): Promise<Array<{ id: string; qrcode: string }>> {
    const results = [];
    
    for (const item of items) {
      try {
        const config = this.configService.get();
        const qrCodePath = path.join(config.paths.qr, `qr_${item.id}.png`);
        
        await this.fileService.ensureDir(config.paths.qr);
        await QRCode.toFile(qrCodePath, item.text, {
          width: config.qr.size || 200,
        });
        
        results.push({
          id: item.id,
          qrcode: qrCodePath,
        });
      } catch (error) {
        this.logger.error(`Failed to generate QR code for ${item.id}: ${error.message}`);
        results.push({
          id: item.id,
          qrcode: null,
        });
      }
    }
    
    return results;
  }
  
  async deleteQrCode(imageId: string): Promise<boolean> {
    try {
      const config = this.configService.get();
      const qrCodePath = path.join(config.paths.qr, `qr_${imageId}.png`);
      
      if (await this.fileService.exists(qrCodePath)) {
        await this.fileService.deleteFile(qrCodePath);
        this.logger.log(`QR code deleted for image ${imageId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Failed to delete QR code for ${imageId}: ${error.message}`);
      return false;
    }
  }
  
  async cleanupOldQrCodes(maxAgeHours: number = 24): Promise<number> {
    try {
      const config = this.configService.get();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      
      const deletedCount = await this.fileService.cleanOldFiles(
        config.paths.qr,
        maxAgeMs
      );
      
      this.logger.log(`Cleaned up ${deletedCount} old QR codes`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to cleanup old QR codes: ${error.message}`);
      return 0;
    }
  }
}