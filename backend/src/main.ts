/**
 * Photobooth Backend Server
 * Production-ready NestJS server with enhanced security
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { sessionMiddleware } from './session/session.config';
import { SecurityMiddleware } from './middleware/security.middleware';
import { CsrfMiddleware } from './middleware/csrf.middleware';
import { HttpsConfig } from './config/https.config';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';

async function bootstrap() {
  // Get HTTPS options for production
  const httpsOptions = HttpsConfig.getHttpsOptions();
  
  // Create app with HTTPS in production
  const app = await NestFactory.create(AppModule, {
    ...(httpsOptions && { httpsOptions }),
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  // Apply compression middleware
  app.use(compression());
  
  // Apply cookie parser for CSRF
  app.use(cookieParser());
  
  // Apply session middleware
  const sessionConfig = await sessionMiddleware();
  app.use(sessionConfig);
  
  // Apply security middleware
  const securityMiddleware = new SecurityMiddleware();
  app.use((req, res, next) => securityMiddleware.use(req, res, next));
  
  // Apply CSRF middleware
  const csrfMiddleware = new CsrfMiddleware();
  app.use((req, res, next) => csrfMiddleware.use(req, res, next));
  
  // Enable validation globally with enhanced options
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    disableErrorMessages: process.env.NODE_ENV === 'production',
    validationError: {
      target: false,
      value: false, // Don't expose values in production
    },
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));
  
  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Photobooth API')
    .setDescription('API documentation for the Photobooth application')
    .setVersion('1.0')
    .addTag('capture', 'Photo and video capture endpoints')
    .addTag('gallery', 'Gallery management endpoints')
    .addTag('settings', 'Settings and configuration endpoints')
    .addTag('admin', 'Admin management endpoints')
    .addTag('auth', 'Authentication endpoints')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Photobooth API Docs',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showRequestHeaders: true,
    },
  });
  
  // Configure CORS based on environment
  const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
      ? (process.env.ALLOWED_ORIGINS?.split(',') || ['https://photobooth.local'])
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token'],
    maxAge: 86400, // 24 hours
  };
  app.enableCors(corsOptions);
  
  // Trust proxy in production (for correct client IP)
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
  
  // Graceful shutdown
  app.enableShutdownHooks();
  
  const port = process.env.PORT || 3000;
  const protocol = httpsOptions ? 'https' : 'http';
  
  await app.listen(port);
  
  Logger.log(
    `🚀 Application is running on: ${protocol}://localhost:${port}`,
  );
  Logger.log(
    `📚 API Documentation available at: ${protocol}://localhost:${port}/docs`,
  );
  
  if (httpsOptions) {
    Logger.log('🔒 HTTPS enabled - Server running in secure mode');
  }
  
  if (process.env.NODE_ENV === 'production') {
    Logger.log('🏭 Running in PRODUCTION mode with enhanced security');
  } else {
    Logger.warn('⚠️ Running in DEVELOPMENT mode - Some security features may be relaxed');
  }
}

bootstrap();
