import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PhotoboothConfig } from '../../config/configuration.service';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'App configuration' })
  @IsOptional()
  @IsObject()
  app?: Partial<PhotoboothConfig['app']>;
  
  @ApiPropertyOptional({ description: 'Paths configuration' })
  @IsOptional()
  @IsObject()
  paths?: Partial<PhotoboothConfig['paths']>;
  
  @ApiPropertyOptional({ description: 'Camera configuration' })
  @IsOptional()
  @IsObject()
  camera?: Partial<PhotoboothConfig['camera']>;
  
  @ApiPropertyOptional({ description: 'Collage configuration' })
  @IsOptional()
  @IsObject()
  collage?: Partial<PhotoboothConfig['collage']>;
  
  @ApiPropertyOptional({ description: 'Print configuration' })
  @IsOptional()
  @IsObject()
  print?: Partial<PhotoboothConfig['print']>;
  
  @ApiPropertyOptional({ description: 'Mail configuration' })
  @IsOptional()
  @IsObject()
  mail?: Partial<PhotoboothConfig['mail']>;
  
  @ApiPropertyOptional({ description: 'Gallery configuration' })
  @IsOptional()
  @IsObject()
  gallery?: Partial<PhotoboothConfig['gallery']>;
  
  @ApiPropertyOptional({ description: 'Keying configuration' })
  @IsOptional()
  @IsObject()
  keying?: Partial<PhotoboothConfig['keying']>;
  
  @ApiPropertyOptional({ description: 'UI configuration' })
  @IsOptional()
  @IsObject()
  ui?: Partial<PhotoboothConfig['ui']>;
  
  @ApiPropertyOptional({ description: 'Sound configuration' })
  @IsOptional()
  @IsObject()
  sound?: Partial<PhotoboothConfig['sound']>;
  
  @ApiPropertyOptional({ description: 'QR configuration' })
  @IsOptional()
  @IsObject()
  qr?: Partial<PhotoboothConfig['qr']>;
  
  @ApiPropertyOptional({ description: 'Remote storage configuration' })
  @IsOptional()
  @IsObject()
  remoteStorage?: Partial<PhotoboothConfig['remoteStorage']>;
  
  @ApiPropertyOptional({ description: 'GPIO configuration' })
  @IsOptional()
  @IsObject()
  gpio?: Partial<PhotoboothConfig['gpio']>;
  
  @ApiPropertyOptional({ description: 'Admin configuration' })
  @IsOptional()
  @IsObject()
  admin?: Partial<PhotoboothConfig['admin']>;
  
  @ApiPropertyOptional({ description: 'Language configuration' })
  @IsOptional()
  @IsObject()
  language?: Partial<PhotoboothConfig['language']>;
}

export class SettingsResponseDto {
  @ApiProperty({ description: 'Complete configuration object' })
  config: PhotoboothConfig;
  
  @ApiProperty({ description: 'Configuration version' })
  version: string;
  
  @ApiProperty({ description: 'Last modified timestamp' })
  lastModified: Date;
}