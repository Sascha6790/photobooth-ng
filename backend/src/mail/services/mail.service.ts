import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface SendPhotoEmailDto {
  to: string;
  photoPath: string;
  photoUrl?: string;
  message?: string;
}

export interface SendGalleryLinkDto {
  to: string;
  galleryUrl: string;
  photoCount: number;
}

export interface SendEventSummaryDto {
  to: string;
  eventName: string;
  photoCount: number;
  printCount: number;
  startTime: Date;
  endTime: Date;
  galleryUrl?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  async sendPhotoEmail(dto: SendPhotoEmailDto): Promise<boolean> {
    try {
      const filename = path.basename(dto.photoPath);
      const photoBuffer = await fs.readFile(dto.photoPath);
      
      await this.mailerService.sendMail({
        to: dto.to,
        subject: 'Your Photobooth Photo',
        template: './photo',
        context: {
          message: dto.message || 'Here is your photo from the photobooth!',
          photoUrl: dto.photoUrl,
        },
        attachments: [
          {
            filename,
            content: photoBuffer,
            contentType: 'image/jpeg',
          },
        ],
      });

      this.logger.log(`Photo email sent to ${dto.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send photo email to ${dto.to}`, error);
      return false;
    }
  }

  async sendGalleryLink(dto: SendGalleryLinkDto): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to: dto.to,
        subject: 'Photobooth Gallery Link',
        template: './gallery',
        context: {
          galleryUrl: dto.galleryUrl,
          photoCount: dto.photoCount,
        },
      });

      this.logger.log(`Gallery link sent to ${dto.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send gallery link to ${dto.to}`, error);
      return false;
    }
  }

  async sendEventSummary(dto: SendEventSummaryDto): Promise<boolean> {
    try {
      const duration = Math.round(
        (dto.endTime.getTime() - dto.startTime.getTime()) / (1000 * 60)
      );

      await this.mailerService.sendMail({
        to: dto.to,
        subject: `Photobooth Event Summary: ${dto.eventName}`,
        template: './event-summary',
        context: {
          eventName: dto.eventName,
          photoCount: dto.photoCount,
          printCount: dto.printCount,
          startTime: dto.startTime.toLocaleString(),
          endTime: dto.endTime.toLocaleString(),
          duration,
          galleryUrl: dto.galleryUrl,
        },
      });

      this.logger.log(`Event summary sent to ${dto.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send event summary to ${dto.to}`, error);
      return false;
    }
  }

  async sendTestEmail(to: string): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Photobooth Test Email',
        template: './test',
        context: {
          timestamp: new Date().toLocaleString(),
        },
      });

      this.logger.log(`Test email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send test email to ${to}`, error);
      return false;
    }
  }

  async sendBulkEmails(
    recipients: string[],
    subject: string,
    content: string,
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = {
      success: [] as string[],
      failed: [] as string[],
    };

    for (const recipient of recipients) {
      try {
        await this.mailerService.sendMail({
          to: recipient,
          subject,
          html: content,
        });
        results.success.push(recipient);
      } catch (error) {
        this.logger.error(`Failed to send email to ${recipient}`, error);
        results.failed.push(recipient);
      }
    }

    return results;
  }
}