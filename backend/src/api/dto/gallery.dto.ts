import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsBoolean, IsString, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SortBy {
  DATE = 'date',
  NAME = 'name',
  SIZE = 'size',
}

export class GalleryQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;
  
  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
  
  @ApiPropertyOptional({ enum: SortBy, description: 'Sort by field', default: SortBy.DATE })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.DATE;
  
  @ApiPropertyOptional({ enum: SortOrder, description: 'Sort order', default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
  
  @ApiPropertyOptional({ description: 'Filter by date (ISO string)' })
  @IsOptional()
  @IsString()
  fromDate?: string;
  
  @ApiPropertyOptional({ description: 'Filter by date (ISO string)' })
  @IsOptional()
  @IsString()
  toDate?: string;
  
  @ApiPropertyOptional({ description: 'Include thumbnails' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeThumbnails?: boolean = true;
}

export class ImageDto {
  @ApiProperty({ description: 'Image ID' })
  id: string;
  
  @ApiProperty({ description: 'Image filename' })
  filename: string;
  
  @ApiProperty({ description: 'Image path' })
  path: string;
  
  @ApiPropertyOptional({ description: 'Thumbnail path' })
  thumbnail?: string;
  
  @ApiProperty({ description: 'Image size in bytes' })
  size: number;
  
  @ApiProperty({ description: 'Image width' })
  width: number;
  
  @ApiProperty({ description: 'Image height' })
  height: number;
  
  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;
  
  @ApiPropertyOptional({ description: 'QR code path' })
  qrcode?: string;
  
  @ApiPropertyOptional({ description: 'Print count' })
  printCount?: number;
  
  @ApiPropertyOptional({ description: 'Image metadata' })
  metadata?: Record<string, any>;
}

export class GalleryResponseDto {
  @ApiProperty({ type: [ImageDto], description: 'Array of images' })
  images: ImageDto[];
  
  @ApiProperty({ description: 'Total number of images' })
  total: number;
  
  @ApiProperty({ description: 'Current page' })
  page: number;
  
  @ApiProperty({ description: 'Items per page' })
  limit: number;
  
  @ApiProperty({ description: 'Total pages' })
  totalPages: number;
  
  @ApiProperty({ description: 'Has next page' })
  hasNext: boolean;
  
  @ApiProperty({ description: 'Has previous page' })
  hasPrev: boolean;
}

export class DeleteImageDto {
  @ApiProperty({ description: 'Image ID to delete' })
  @IsString()
  id: string;
  
  @ApiPropertyOptional({ description: 'Also delete from remote storage' })
  @IsOptional()
  @IsBoolean()
  deleteFromRemote?: boolean = false;
}

export class BulkDeleteDto {
  @ApiProperty({ type: [String], description: 'Array of image IDs to delete' })
  ids: string[];
  
  @ApiPropertyOptional({ description: 'Also delete from remote storage' })
  @IsOptional()
  @IsBoolean()
  deleteFromRemote?: boolean = false;
}