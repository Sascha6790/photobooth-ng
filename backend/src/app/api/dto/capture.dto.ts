import { IsOptional, IsBoolean, IsString, IsNumber, IsEnum, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum CaptureMode {
  PHOTO = 'photo',
  COLLAGE = 'collage',
  VIDEO = 'video',
  SELFIE = 'selfie'
}

export enum CollageLayout {
  LAYOUT_2X2 = '2x2',
  LAYOUT_2X4 = '2x4',
  LAYOUT_1PLUS2 = '1+2',
  LAYOUT_1PLUS3 = '1+3'
}

class CollageOptionsDto {
  @ApiProperty({ enum: CollageLayout, description: 'Layout for the collage' })
  @IsEnum(CollageLayout)
  layout: CollageLayout;
  
  @ApiPropertyOptional({ description: 'Number of photos for collage' })
  @IsOptional()
  @IsNumber()
  photoCount?: number;
  
  @ApiPropertyOptional({ description: 'Delay between photos in seconds' })
  @IsOptional()
  @IsNumber()
  photoDelay?: number;
}

export class CaptureDto {
  @ApiProperty({ enum: CaptureMode, description: 'Capture mode' })
  @IsEnum(CaptureMode)
  mode: CaptureMode;
  
  @ApiPropertyOptional({ description: 'Use countdown before capture' })
  @IsOptional()
  @IsBoolean()
  useCountdown?: boolean;
  
  @ApiPropertyOptional({ description: 'Countdown duration in seconds' })
  @IsOptional()
  @IsNumber()
  countdownTime?: number;
  
  @ApiPropertyOptional({ description: 'Apply filter to the captured image' })
  @IsOptional()
  @IsString()
  filter?: string;
  
  @ApiPropertyOptional({ description: 'Apply frame to the captured image' })
  @IsOptional()
  @IsString()
  frame?: string;
  
  @ApiPropertyOptional({ description: 'Use chroma key (green screen)' })
  @IsOptional()
  @IsBoolean()
  useChromaKey?: boolean;
  
  @ApiPropertyOptional({ description: 'Background image for chroma key' })
  @IsOptional()
  @IsString()
  chromaBackground?: string;
  
  @ApiPropertyOptional({ type: CollageOptionsDto, description: 'Options for collage mode' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CollageOptionsDto)
  collageOptions?: CollageOptionsDto;
  
  @ApiPropertyOptional({ description: 'Video duration in seconds (for video mode)' })
  @IsOptional()
  @IsNumber()
  videoDuration?: number;
  
  @ApiPropertyOptional({ description: 'Base64 encoded image data (for selfie mode)' })
  @IsOptional()
  @IsString()
  imageData?: string;
}

export class CaptureResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;
  
  @ApiProperty({ description: 'Filename of the captured image/video' })
  filename: string;
  
  @ApiProperty({ description: 'Full path to the captured file' })
  path: string;
  
  @ApiProperty({ description: 'Capture timestamp' })
  timestamp: string;
  
  @ApiPropertyOptional({ description: 'Response message' })
  message?: string;
  
  @ApiPropertyOptional({ description: 'Thumbnail path for the captured image' })
  thumbnail?: string;
  
  @ApiPropertyOptional({ description: 'Array of filenames for collage photos' })
  collagePhotos?: string[];
  
  @ApiPropertyOptional({ description: 'QR code data for sharing' })
  qrCode?: string;
}