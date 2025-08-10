import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

// Import entities
import { Image } from './entities/image.entity';
import { Session } from './entities/session.entity';
import { PrintJob } from './entities/print-job.entity';
import { Settings } from './entities/settings.entity';

// Import repositories
import { ImageRepository } from './repositories/image.repository';
import { SessionRepository } from './repositories/session.repository';
import { PrintJobRepository } from './repositories/print-job.repository';
import { SettingsRepository } from './repositories/settings.repository';

// Import services
import { CacheService } from './services/cache.service';

export const getTypeOrmConfig = (configService: ConfigService): DataSourceOptions => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  
  // Default SQLite configuration for development
  let config: DataSourceOptions = {
    type: 'sqlite',
    database: configService.get<string>('DATABASE_PATH', './data/photobooth.db'),
    entities: [Image, Session, PrintJob, Settings],
    synchronize: isDevelopment, // Only in development
    logging: isDevelopment ? ['error', 'warn', 'migration'] : ['error'],
    migrations: ['dist/database/migrations/*.js'],
    migrationsTableName: 'photobooth_migrations',
  };

  // Use PostgreSQL in production if configured
  if (isProduction && configService.get<string>('DATABASE_TYPE') === 'postgres') {
    config = {
      type: 'postgres',
      host: configService.get<string>('DATABASE_HOST', 'localhost'),
      port: configService.get<number>('DATABASE_PORT', 5432),
      username: configService.get<string>('DATABASE_USER', 'photobooth'),
      password: configService.get<string>('DATABASE_PASSWORD', ''),
      database: configService.get<string>('DATABASE_NAME', 'photobooth'),
      entities: [Image, Session, PrintJob, Settings],
      synchronize: false, // Never in production
      logging: ['error'],
      migrations: ['dist/database/migrations/*.js'],
      migrationsTableName: 'photobooth_migrations',
      ssl: configService.get<boolean>('DATABASE_SSL', false) ? {
        rejectUnauthorized: false
      } : false,
      poolSize: configService.get<number>('DATABASE_POOL_SIZE', 10),
    };
  }

  return config;
};

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
      dataSourceFactory: async (options: DataSourceOptions) => {
        const dataSource = new DataSource(options);
        return dataSource.initialize();
      },
    }),
    TypeOrmModule.forFeature([
      Image,
      Session,
      PrintJob,
      Settings,
    ]),
  ],
  providers: [
    CacheService,
    ImageRepository,
    SessionRepository,
    PrintJobRepository,
    SettingsRepository,
  ],
  exports: [
    TypeOrmModule,
    CacheService,
    ImageRepository,
    SessionRepository,
    PrintJobRepository,
    SettingsRepository,
  ],
})
export class DatabaseModule {}