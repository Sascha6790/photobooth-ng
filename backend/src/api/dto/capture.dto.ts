import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export enum CaptureMode {
  PHOTO = 'photo',
  COLLAGE = 'collage',
  VIDEO = 'video',
  CHROMAKEY = 'chromakey',
}

export class CaptureRequestDto {
  @ApiProperty({ enum: CaptureMode, description: 'Capture mode' })
  @IsEnum(CaptureMode)
  mode: CaptureMode;
  
  @ApiPropertyOptional({ description: 'Apply filter to captured image' })
  @IsOptional()
  @IsString()
  filter?: string;
  
  @ApiPropertyOptional({ description: 'Frame to apply to image' })
  @IsOptional()
  @IsString()
  frame?: string;
  
  @ApiPropertyOptional({ description: 'Text to add to image' })
  @IsOptional()
  @IsString()
  text?: string;
  
  @ApiPropertyOptional({ description: 'Collage layout (for collage mode)' })
  @IsOptional()
  @IsString()
  collageLayout?: string;
  
  @ApiPropertyOptional({ description: 'Collage image index (for collage mode)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(8)
  collageIndex?: number;
  
  @ApiPropertyOptional({ description: 'Chromakey background (for chromakey mode)' })
  @IsOptional()
  @IsString()
  chromakeyBackground?: string;
  
  @ApiPropertyOptional({ description: 'Auto print after capture' })
  @IsOptional()
  @IsBoolean()
  autoPrint?: boolean;
}

export class CaptureResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;
  
  @ApiProperty({ description: 'Captured image filename' })
  filename: string;
  
  @ApiProperty({ description: 'Full path to captured image' })
  path: string;
  
  @ApiProperty({ description: 'Thumbnail path' })
  thumbnail: string;
  
  @ApiPropertyOptional({ description: 'QR code path if generated' })
  qrcode?: string;
  
  @ApiPropertyOptional({ description: 'Print job ID if auto-printed' })
  printJobId?: string;
  
  @ApiProperty({ description: 'Capture timestamp' })
  timestamp: Date;
  
  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}

export class PreviewRequestDto {
  @ApiPropertyOptional({ description: 'Preview resolution width' })
  @IsOptional()
  @IsNumber()
  @Min(320)
  @Max(1920)
  width?: number;
  
  @ApiPropertyOptional({ description: 'Preview resolution height' })
  @IsOptional()
  @IsNumber()
  @Min(240)
  @Max(1080)
  height?: number;
  
  @ApiPropertyOptional({ description: 'Stream format (jpeg, mjpeg)' })
  @IsOptional()
  @IsString()
  format?: string;
}