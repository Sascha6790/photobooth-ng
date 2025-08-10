/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { sessionMiddleware } from './session/session.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Apply session middleware
  const sessionConfig = await sessionMiddleware();
  app.use(sessionConfig);
  
  // Enable validation globally
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true
  }));
  
  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Photobooth API')
    .setDescription('API documentation for the Photobooth application')
    .setVersion('1.0')
    .addTag('capture', 'Photo and video capture endpoints')
    .addTag('gallery', 'Gallery management endpoints')
    .addTag('settings', 'Settings and configuration endpoints')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  
  // Enable CORS for development
  app.enableCors({
    origin: true,
    credentials: true
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}`,
  );
  Logger.log(
    `📚 API Documentation available at: http://localhost:${port}/docs`,
  );
}

bootstrap();
