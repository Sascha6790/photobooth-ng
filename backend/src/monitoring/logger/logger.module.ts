import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './winston.config';
import { LoggerService } from './logger.service';

@Global()
@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
  ],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}