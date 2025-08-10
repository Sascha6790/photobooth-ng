import { 
  Controller, 
  Post, 
  Body, 
  UseGuards,
  HttpCode,
  HttpStatus 
} from '@nestjs/common';
import { MailService } from '../services/mail.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('api/mail')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MailController {
  constructor(private mailService: MailService) {}

  @Post('send-photo')
  @HttpCode(HttpStatus.OK)
  async sendPhoto(
    @Body() body: {
      to: string;
      photoPath: string;
      photoUrl?: string;
      message?: string;
    },
  ) {
    const success = await this.mailService.sendPhotoEmail(body);
    return { 
      success,
      message: success ? 'Photo sent successfully' : 'Failed to send photo'
    };
  }

  @Post('send-gallery')
  @HttpCode(HttpStatus.OK)
  async sendGalleryLink(
    @Body() body: {
      to: string;
      galleryUrl: string;
      photoCount: number;
    },
  ) {
    const success = await this.mailService.sendGalleryLink(body);
    return { 
      success,
      message: success ? 'Gallery link sent successfully' : 'Failed to send gallery link'
    };
  }

  @Post('send-event-summary')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @HttpCode(HttpStatus.OK)
  async sendEventSummary(
    @Body() body: {
      to: string;
      eventName: string;
      photoCount: number;
      printCount: number;
      startTime: string;
      endTime: string;
      galleryUrl?: string;
    },
  ) {
    const success = await this.mailService.sendEventSummary({
      ...body,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
    });
    
    return { 
      success,
      message: success ? 'Event summary sent successfully' : 'Failed to send event summary'
    };
  }

  @Post('test')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(@Body('to') to: string) {
    const success = await this.mailService.sendTestEmail(to);
    return { 
      success,
      message: success ? 'Test email sent successfully' : 'Failed to send test email'
    };
  }

  @Post('bulk')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async sendBulkEmails(
    @Body() body: {
      recipients: string[];
      subject: string;
      content: string;
    },
  ) {
    const results = await this.mailService.sendBulkEmails(
      body.recipients,
      body.subject,
      body.content,
    );
    
    return {
      ...results,
      message: `Sent to ${results.success.length} recipients, failed for ${results.failed.length}`
    };
  }
}