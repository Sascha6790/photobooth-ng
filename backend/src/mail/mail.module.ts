import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MailService } from './services/mail.service';
import { MailController } from './controllers/mail.controller';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST', 'localhost'),
          port: configService.get('MAIL_PORT', 1025),
          secure: configService.get('MAIL_SECURE', false),
          auth: configService.get('MAIL_USER') ? {
            user: configService.get('MAIL_USER'),
            pass: configService.get('MAIL_PASSWORD'),
          } : undefined,
        },
        defaults: {
          from: configService.get('MAIL_FROM', '"Photobooth" <noreply@photobooth.local>'),
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}