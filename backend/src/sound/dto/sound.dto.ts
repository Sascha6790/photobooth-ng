import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoundType } from '../sound.service';

export class PlaySoundDto {
  @ApiProperty({ enum: SoundType, description: 'Type of sound to play' })
  @IsEnum(SoundType)
  soundType: SoundType;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  volume?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  loop?: boolean;
}

export class PlayCountdownDto {
  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  seconds: number;
}

export class SetVolumeDto {
  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  volume: number;
}

export class SetEnabledDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}

export class UpdateSoundConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: ['man', 'woman', 'custom'] })
  @IsOptional()
  @IsEnum(['man', 'woman', 'custom'])
  voice?: 'man' | 'woman' | 'custom';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fallbackEnabled?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  volume?: number;

  @ApiPropertyOptional({ enum: ['auto', 'afplay', 'aplay', 'paplay', 'mpg123', 'vlc', 'mplayer'] })
  @IsOptional()
  @IsEnum(['auto', 'afplay', 'aplay', 'paplay', 'mpg123', 'vlc', 'mplayer'])
  player?: 'auto' | 'afplay' | 'aplay' | 'paplay' | 'mpg123' | 'vlc' | 'mplayer';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customSoundsPath?: string;
}

export class UploadSoundDto {
  @ApiProperty()
  @IsString()
  soundType: string;
}

export class SoundFileResponseDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  path: string | null;

  @ApiPropertyOptional()
  duration?: number;

  @ApiProperty()
  exists: boolean;
}

export class SoundConfigResponseDto {
  @ApiProperty()
  enabled: boolean;

  @ApiProperty({ enum: ['man', 'woman', 'custom'] })
  voice: 'man' | 'woman' | 'custom';

  @ApiProperty()
  locale: string;

  @ApiProperty()
  fallbackEnabled: boolean;

  @ApiProperty()
  volume: number;

  @ApiProperty({ enum: ['auto', 'afplay', 'aplay', 'paplay', 'mpg123', 'vlc', 'mplayer'] })
  player: string;

  @ApiPropertyOptional()
  customSoundsPath?: string;
}

export class TestSoundResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  player?: string;
}