import { PartialType } from '@nestjs/swagger';
import { CreateSessionDto } from './create-session.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { SessionStatus } from '../entities/session.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSessionDto extends PartialType(CreateSessionDto) {
  @ApiPropertyOptional({ enum: SessionStatus })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;
}