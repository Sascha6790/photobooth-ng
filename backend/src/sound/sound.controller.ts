import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { SoundService, SoundType } from './sound.service';
import {
  PlaySoundDto,
  PlayCountdownDto,
  SetVolumeDto,
  SetEnabledDto,
  UpdateSoundConfigDto,
  UploadSoundDto,
  SoundFileResponseDto,
  SoundConfigResponseDto,
  TestSoundResponseDto,
} from './dto/sound.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Sound')
@Controller('api/sound')
export class SoundController {
  constructor(private readonly soundService: SoundService) {}

  @Post('play')
  @ApiOperation({ summary: 'Play a sound' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sound played successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid sound type' })
  async playSound(@Body() playSoundDto: PlaySoundDto): Promise<{ message: string }> {
    await this.soundService.play(playSoundDto.soundType, {
      volume: playSoundDto.volume,
      loop: playSoundDto.loop,
    });
    return { message: `Playing sound: ${playSoundDto.soundType}` };
  }

  @Post('play/:soundType')
  @ApiOperation({ summary: 'Play a specific sound by type' })
  @ApiParam({ name: 'soundType', enum: SoundType })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sound played successfully' })
  async playSoundByType(@Param('soundType') soundType: SoundType): Promise<{ message: string }> {
    await this.soundService.play(soundType);
    return { message: `Playing sound: ${soundType}` };
  }

  @Post('countdown')
  @ApiOperation({ summary: 'Play countdown sequence' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Countdown started' })
  async playCountdown(@Body() countdownDto: PlayCountdownDto): Promise<{ message: string }> {
    this.soundService.playCountdown(countdownDto.seconds); // Don't await, let it run async
    return { message: `Starting countdown: ${countdownDto.seconds} seconds` };
  }

  @Post('cheese')
  @ApiOperation({ summary: 'Play cheese sound' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cheese sound played' })
  async playCheese(): Promise<{ message: string }> {
    await this.soundService.playCheese();
    return { message: 'Playing cheese sound' };
  }

  @Post('shutter')
  @ApiOperation({ summary: 'Play shutter sound' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Shutter sound played' })
  async playShutter(): Promise<{ message: string }> {
    await this.soundService.playShutter();
    return { message: 'Playing shutter sound' };
  }

  @Post('success')
  @ApiOperation({ summary: 'Play success sound' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Success sound played' })
  async playSuccess(): Promise<{ message: string }> {
    await this.soundService.playSuccess();
    return { message: 'Playing success sound' };
  }

  @Post('error')
  @ApiOperation({ summary: 'Play error sound' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Error sound played' })
  async playError(): Promise<{ message: string }> {
    await this.soundService.playError();
    return { message: 'Playing error sound' };
  }

  @Post('print')
  @ApiOperation({ summary: 'Play print sound' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Print sound played' })
  async playPrint(): Promise<{ message: string }> {
    await this.soundService.playPrint();
    return { message: 'Playing print sound' };
  }

  @Post('stop')
  @ApiOperation({ summary: 'Stop current playing sound' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sound stopped' })
  async stopSound(): Promise<{ message: string }> {
    await this.soundService.stop();
    return { message: 'Sound stopped' };
  }

  @Get('list')
  @ApiOperation({ summary: 'Get all available sounds' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of available sounds',
    type: [SoundFileResponseDto],
  })
  getAllSounds(): SoundFileResponseDto[] {
    return this.soundService.getAllSounds();
  }

  @Get('info/:soundType')
  @ApiOperation({ summary: 'Get information about a specific sound' })
  @ApiParam({ name: 'soundType', description: 'Sound type to get info for' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sound information',
    type: SoundFileResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Sound not found' })
  getSoundInfo(@Param('soundType') soundType: string): SoundFileResponseDto {
    const soundInfo = this.soundService.getSoundInfo(soundType);
    if (!soundInfo) {
      throw new BadRequestException(`Sound not found: ${soundType}`);
    }
    return soundInfo;
  }

  @Get('config')
  @ApiOperation({ summary: 'Get current sound configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current sound configuration',
    type: SoundConfigResponseDto,
  })
  getConfig(): SoundConfigResponseDto {
    return {
      enabled: this.soundService.isEnabled(),
      volume: this.soundService.getVolume(),
      voice: 'man', // These would need to be exposed from service
      locale: 'en',
      fallbackEnabled: true,
      player: 'auto',
    };
  }

  @Put('config')
  @ApiOperation({ summary: 'Update sound configuration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Configuration updated' })
  async updateConfig(
    @Body() updateConfigDto: UpdateSoundConfigDto
  ): Promise<{ message: string }> {
    await this.soundService.updateConfig(updateConfigDto);
    return { message: 'Sound configuration updated' };
  }

  @Put('volume')
  @ApiOperation({ summary: 'Set sound volume' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Volume updated' })
  setVolume(@Body() setVolumeDto: SetVolumeDto): { volume: number } {
    this.soundService.setVolume(setVolumeDto.volume);
    return { volume: setVolumeDto.volume };
  }

  @Get('volume')
  @ApiOperation({ summary: 'Get current volume' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Current volume' })
  getVolume(): { volume: number } {
    return { volume: this.soundService.getVolume() };
  }

  @Put('enabled')
  @ApiOperation({ summary: 'Enable or disable sound' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sound enabled/disabled' })
  setEnabled(@Body() setEnabledDto: SetEnabledDto): { enabled: boolean } {
    this.soundService.setEnabled(setEnabledDto.enabled);
    return { enabled: setEnabledDto.enabled };
  }

  @Get('enabled')
  @ApiOperation({ summary: 'Check if sound is enabled' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sound enabled status' })
  isEnabled(): { enabled: boolean } {
    return { enabled: this.soundService.isEnabled() };
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a custom sound file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        soundType: { type: 'string' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './temp',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only audio files are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
    })
  )
  async uploadSound(
    @Body() uploadDto: UploadSoundDto,
    @UploadedFile() file: Express.Multer.File
  ): Promise<{ message: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    await this.soundService.uploadCustomSound(uploadDto.soundType, file.path);
    
    // Clean up temp file
    const fs = require('fs').promises;
    await fs.unlink(file.path);
    
    return { message: `Custom sound uploaded for: ${uploadDto.soundType}` };
  }

  @Delete('custom/:soundType')
  @ApiOperation({ summary: 'Delete a custom sound file' })
  @ApiParam({ name: 'soundType', description: 'Sound type to delete' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Custom sound deleted' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot delete non-custom sound' })
  async deleteCustomSound(@Param('soundType') soundType: string): Promise<{ message: string }> {
    await this.soundService.deleteCustomSound(soundType);
    return { message: `Custom sound deleted: ${soundType}` };
  }

  @Post('test')
  @ApiOperation({ summary: 'Test sound system' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sound test result',
    type: TestSoundResponseDto,
  })
  async testSound(): Promise<TestSoundResponseDto> {
    const success = await this.soundService.test();
    return {
      success,
      message: success ? 'Sound system is working' : 'Sound system test failed',
    };
  }
}