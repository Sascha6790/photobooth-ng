import { Module } from '@nestjs/common';
import { SoundService } from './sound.service';
import { SoundController } from './sound.controller';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [SoundController],
  providers: [SoundService],
  exports: [SoundService],
})
export class SoundModule {}