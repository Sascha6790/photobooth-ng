import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, IsObject, IsDate, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SessionType } from '../entities/session.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SessionSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  allowRemoteCapture?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  allowVoting?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  allowSharing?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  slideshowEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  collaborationMode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  privateGallery?: boolean;
}

class SessionMetadataDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  customFields?: Record<string, any>;
}

export class CreateSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: SessionType })
  @IsEnum(SessionType)
  type: SessionType;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxUsers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostUserId?: string;

  @ApiPropertyOptional({ type: SessionSettingsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SessionSettingsDto)
  settings?: SessionSettingsDto;

  @ApiPropertyOptional({ type: SessionMetadataDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SessionMetadataDto)
  metadata?: SessionMetadataDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;
}