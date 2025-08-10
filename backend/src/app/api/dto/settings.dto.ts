import { IsOptional, IsBoolean, IsString, IsNumber, IsEnum, IsObject, ValidateNested, IsEmail, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PreviewMode {
  DEVICE_CAM = 'device_cam',
  URL = 'url',
  NONE = 'none'
}

export enum MailSecurityType {
  NONE = 'none',
  SSL = 'ssl',
  TLS = 'tls',
  STARTTLS = 'starttls'
}

class GeneralSettingsDto {
  @ApiProperty({ description: 'UI language code' })
  @IsString()
  language: string;
  
  @ApiProperty({ description: 'Photo countdown in seconds' })
  @IsNumber()
  @Min(0)
  @Max(30)
  photoCountdown: number;
  
  @ApiProperty({ description: 'Collage countdown in seconds' })
  @IsNumber()
  @Min(0)
  @Max(30)
  collageCountdown: number;
  
  @ApiProperty({ description: 'Show camera preview' })
  @IsBoolean()
  previewFromCam: boolean;
  
  @ApiProperty({ description: 'Flip camera preview horizontally' })
  @IsBoolean()
  previewCamFlip: boolean;
  
  @ApiProperty({ description: 'Camera preview rotation in degrees' })
  @IsNumber()
  previewCamRotation: number;
  
  @ApiProperty({ enum: PreviewMode, description: 'Preview mode' })
  @IsEnum(PreviewMode)
  previewMode: PreviewMode;
}

class UISettingsDto {
  @ApiProperty({ description: 'Show gallery button' })
  @IsBoolean()
  showGallery: boolean;
  
  @ApiProperty({ description: 'Show print button' })
  @IsBoolean()
  showPrintButton: boolean;
  
  @ApiProperty({ description: 'Show QR code' })
  @IsBoolean()
  showQrCode: boolean;
  
  @ApiProperty({ description: 'Background color' })
  @IsString()
  backgroundColor: string;
  
  @ApiProperty({ description: 'Primary color' })
  @IsString()
  primaryColor: string;
  
  @ApiPropertyOptional({ description: 'Show fullscreen button' })
  @IsOptional()
  @IsBoolean()
  showFullscreenButton?: boolean;
  
  @ApiPropertyOptional({ description: 'Show filter selection' })
  @IsOptional()
  @IsBoolean()
  showFilterSelection?: boolean;
  
  @ApiPropertyOptional({ description: 'Show frame selection' })
  @IsOptional()
  @IsBoolean()
  showFrameSelection?: boolean;
  
  @ApiPropertyOptional({ description: 'UI theme name' })
  @IsOptional()
  @IsString()
  theme?: string;
}

class PrintSettingsDto {
  @ApiProperty({ description: 'Enable printing' })
  @IsBoolean()
  enabled: boolean;
  
  @ApiProperty({ description: 'Auto print after capture' })
  @IsBoolean()
  autoPrint: boolean;
  
  @ApiProperty({ description: 'Print QR code on photo' })
  @IsBoolean()
  printQrCode: boolean;
  
  @ApiProperty({ description: 'Print frame on photo' })
  @IsBoolean()
  printFrame: boolean;
  
  @ApiProperty({ description: 'Printer name' })
  @IsString()
  printerName: string;
  
  @ApiPropertyOptional({ description: 'Maximum prints per image' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxPrints?: number;
  
  @ApiPropertyOptional({ description: 'Print delay in seconds' })
  @IsOptional()
  @IsNumber()
  printDelay?: number;
}

class MailSettingsDto {
  @ApiProperty({ description: 'Enable mail functionality' })
  @IsBoolean()
  enabled: boolean;
  
  @ApiProperty({ description: 'SMTP host' })
  @IsString()
  host: string;
  
  @ApiProperty({ description: 'SMTP port' })
  @IsNumber()
  port: number;
  
  @ApiProperty({ enum: MailSecurityType, description: 'Mail security type' })
  @IsEnum(MailSecurityType)
  security: MailSecurityType;
  
  @ApiProperty({ description: 'SMTP username' })
  @IsString()
  username: string;
  
  @ApiProperty({ description: 'From email address' })
  @IsEmail()
  fromAddress: string;
  
  @ApiProperty({ description: 'From name' })
  @IsString()
  fromName: string;
  
  @ApiPropertyOptional({ description: 'Subject line template' })
  @IsOptional()
  @IsString()
  subject?: string;
  
  @ApiPropertyOptional({ description: 'Email body template' })
  @IsOptional()
  @IsString()
  body?: string;
}

class StorageSettingsDto {
  @ApiProperty({ description: 'Base data path' })
  @IsString()
  dataPath: string;
  
  @ApiProperty({ description: 'Temporary files path' })
  @IsString()
  tmpPath: string;
  
  @ApiProperty({ description: 'Images storage path' })
  @IsString()
  imagesPath: string;
  
  @ApiProperty({ description: 'Thumbnails path' })
  @IsString()
  thumbsPath: string;
  
  @ApiProperty({ description: 'Keep images after session' })
  @IsBoolean()
  keepImages: boolean;
  
  @ApiPropertyOptional({ description: 'Enable remote storage' })
  @IsOptional()
  @IsBoolean()
  remoteStorageEnabled?: boolean;
  
  @ApiPropertyOptional({ description: 'Remote storage type' })
  @IsOptional()
  @IsString()
  remoteStorageType?: string;
  
  @ApiPropertyOptional({ description: 'Remote storage configuration' })
  @IsOptional()
  @IsObject()
  remoteStorageConfig?: Record<string, any>;
}

export class SettingsDto {
  @ApiProperty({ type: GeneralSettingsDto, description: 'General settings' })
  @ValidateNested()
  @Type(() => GeneralSettingsDto)
  general: GeneralSettingsDto;
  
  @ApiProperty({ type: UISettingsDto, description: 'UI settings' })
  @ValidateNested()
  @Type(() => UISettingsDto)
  ui: UISettingsDto;
  
  @ApiProperty({ type: PrintSettingsDto, description: 'Print settings' })
  @ValidateNested()
  @Type(() => PrintSettingsDto)
  print: PrintSettingsDto;
  
  @ApiProperty({ type: MailSettingsDto, description: 'Mail settings' })
  @ValidateNested()
  @Type(() => MailSettingsDto)
  mail: MailSettingsDto;
  
  @ApiProperty({ type: StorageSettingsDto, description: 'Storage settings' })
  @ValidateNested()
  @Type(() => StorageSettingsDto)
  storage: StorageSettingsDto;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ type: GeneralSettingsDto, description: 'General settings to update' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeneralSettingsDto)
  general?: Partial<GeneralSettingsDto>;
  
  @ApiPropertyOptional({ type: UISettingsDto, description: 'UI settings to update' })
  @IsOptional()
  @ValidateNested()
  @Type(() => UISettingsDto)
  ui?: Partial<UISettingsDto>;
  
  @ApiPropertyOptional({ type: PrintSettingsDto, description: 'Print settings to update' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PrintSettingsDto)
  print?: Partial<PrintSettingsDto>;
  
  @ApiPropertyOptional({ type: MailSettingsDto, description: 'Mail settings to update' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MailSettingsDto)
  mail?: Partial<MailSettingsDto>;
  
  @ApiPropertyOptional({ type: StorageSettingsDto, description: 'Storage settings to update' })
  @IsOptional()
  @ValidateNested()
  @Type(() => StorageSettingsDto)
  storage?: Partial<StorageSettingsDto>;
}