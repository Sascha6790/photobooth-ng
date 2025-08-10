import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GalleryQueryDto {
  @ApiPropertyOptional({ description: 'Number of images to return', minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
  
  @ApiPropertyOptional({ description: 'Offset for pagination', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
  
  @ApiPropertyOptional({ description: 'Filter by date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  date?: string;
  
  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class GalleryImageDto {
  @ApiProperty({ description: 'Unique image ID' })
  id: string;
  
  @ApiProperty({ description: 'Image filename' })
  filename: string;
  
  @ApiProperty({ description: 'Full path to the image' })
  path: string;
  
  @ApiProperty({ description: 'Thumbnail path' })
  thumbnail: string;
  
  @ApiProperty({ description: 'Creation timestamp' })
  timestamp: string;
  
  @ApiProperty({ description: 'File size in bytes' })
  size: number;
  
  @ApiPropertyOptional({ description: 'Image width in pixels' })
  width?: number;
  
  @ApiPropertyOptional({ description: 'Image height in pixels' })
  height?: number;
  
  @ApiPropertyOptional({ description: 'MIME type' })
  mimeType?: string;
  
  @ApiPropertyOptional({ description: 'Whether image is marked as favorite' })
  isFavorite?: boolean;
  
  @ApiPropertyOptional({ description: 'Number of times printed' })
  printCount?: number;
  
  @ApiPropertyOptional({ description: 'Applied filter name' })
  filter?: string;
  
  @ApiPropertyOptional({ description: 'Applied frame name' })
  frame?: string;
  
  @ApiPropertyOptional({ description: 'Whether image was created as collage' })
  isCollage?: boolean;
  
  @ApiPropertyOptional({ description: 'QR code data for sharing' })
  qrCode?: string;
}

export class GalleryResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;
  
  @ApiProperty({ type: [GalleryImageDto], description: 'Array of gallery images' })
  images: GalleryImageDto[];
  
  @ApiProperty({ description: 'Total number of images in gallery' })
  total: number;
  
  @ApiProperty({ description: 'Number of images returned' })
  limit: number;
  
  @ApiProperty({ description: 'Pagination offset' })
  offset: number;
  
  @ApiPropertyOptional({ description: 'Whether there are more images' })
  hasMore?: boolean;
  
  @ApiPropertyOptional({ description: 'Next page offset' })
  nextOffset?: number;
}