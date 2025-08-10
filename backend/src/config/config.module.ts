import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigurationService } from './configuration.service';
import { FileService } from '../services/file.service';
import { ValidationService } from '../services/validation.service';
import * as Joi from 'joi';
import * as path from 'path';

const configSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'docker', 'staging')
    .default('development'),
  PORT: Joi.number().default(3000),
  
  // Database configuration
  DATABASE_TYPE: Joi.string().valid('sqlite', 'postgres').default('sqlite'),
  DATABASE_PATH: Joi.string().default('data/photobooth.db'),
  
  // File paths
  DATA_DIR: Joi.string().default('data'),
  IMAGES_DIR: Joi.string().default('data/images'),
  THUMBS_DIR: Joi.string().default('data/thumbs'),
  TMP_DIR: Joi.string().default('data/tmp'),
  QR_DIR: Joi.string().default('data/qrcodes'),
  FRAMES_DIR: Joi.string().default('resources/img/frames'),
  BACKGROUNDS_DIR: Joi.string().default('resources/img/background'),
  
  // Camera configuration
  CAMERA_MODE: Joi.string()
    .valid('gphoto2', 'webcam', 'mock', 'raspistill')
    .default('mock'),
  
  // Print configuration
  PRINT_ENABLED: Joi.boolean().default(false),
  PRINTER_NAME: Joi.string().allow('').default(''),
  
  // Mail configuration
  MAIL_ENABLED: Joi.boolean().default(false),
  MAIL_HOST: Joi.string().when('MAIL_ENABLED', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  MAIL_PORT: Joi.number().default(587),
  MAIL_SECURE: Joi.boolean().default(false),
  MAIL_USER: Joi.string().allow('').default(''),
  MAIL_PASSWORD: Joi.string().allow('').default(''),
  
  // GPIO configuration (Raspberry Pi only)
  GPIO_ENABLED: Joi.boolean().default(false),
  GPIO_BUZZER_PIN: Joi.number().default(17),
  GPIO_PRINT_PIN: Joi.number().default(22),
  GPIO_COLLAGE_PIN: Joi.number().default(27),
  
  // Remote storage
  REMOTE_STORAGE_ENABLED: Joi.boolean().default(false),
  REMOTE_STORAGE_TYPE: Joi.string()
    .valid('ftp', 'sftp', 's3')
    .when('REMOTE_STORAGE_ENABLED', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
  REMOTE_STORAGE_HOST: Joi.string().allow('').default(''),
  REMOTE_STORAGE_USER: Joi.string().allow('').default(''),
  REMOTE_STORAGE_PASSWORD: Joi.string().allow('').default(''),
  REMOTE_STORAGE_PATH: Joi.string().default('/'),
  
  // Language
  DEFAULT_LANGUAGE: Joi.string().default('en'),
  
  // Admin
  ADMIN_PASSWORD: Joi.string().allow('').default(''),
  ADMIN_PIN: Joi.string().pattern(/^\d{4,6}$/).allow('').default(''),
  
  // Debug
  DEBUG: Joi.boolean().default(false),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
});

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}.local`,
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env.local',
        '.env',
      ],
      validationSchema: configSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
  ],
  providers: [ConfigurationService, FileService, ValidationService],
  exports: [ConfigurationService, FileService, ValidationService],
})
export class ConfigModule {}