import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CameraService } from '../services/camera.service';
import { GpioService, GpioEvent } from '../services/gpio.service';

export interface ButtonPressedEvent {
  name: string;
  pin: number;
}

@Injectable()
export class ButtonEventListener {
  private readonly logger = new Logger(ButtonEventListener.name);
  private readonly buttonActions: Map<string, () => Promise<void>> = new Map();
  private readonly buttonStates: Map<string, boolean> = new Map();
  private readonly longPressTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly longPressDuration = 2000;

  constructor(
    private readonly cameraService: CameraService,
    private readonly gpioService: GpioService,
  ) {
    this.registerDefaultActions();
  }

  private registerDefaultActions(): void {
    this.buttonActions.set('capture', async () => {
      await this.handleCaptureButton();
    });

    this.buttonActions.set('print', async () => {
      await this.handlePrintButton();
    });

    this.buttonActions.set('gallery', async () => {
      await this.handleGalleryButton();
    });

    this.buttonActions.set('delete', async () => {
      await this.handleDeleteButton();
    });

    this.buttonActions.set('mode', async () => {
      await this.handleModeButton();
    });
  }

  @OnEvent(GpioEvent.BUTTON_PRESSED)
  async handleButtonPressed(event: ButtonPressedEvent): Promise<void> {
    const { name, pin } = event;
    
    this.logger.log(`Button "${name}" pressed on pin ${pin}`);
    
    this.buttonStates.set(name, true);
    
    const longPressTimer = setTimeout(async () => {
      if (this.buttonStates.get(name)) {
        await this.handleLongPress(name);
      }
    }, this.longPressDuration);
    
    this.longPressTimers.set(name, longPressTimer);
    
    await this.gpioService.setLed('status', 1).catch(() => {});
  }

  @OnEvent(GpioEvent.BUTTON_RELEASED)
  async handleButtonReleased(event: ButtonPressedEvent): Promise<void> {
    const { name, pin } = event;
    
    this.logger.log(`Button "${name}" released on pin ${pin}`);
    
    const wasPressed = this.buttonStates.get(name);
    this.buttonStates.set(name, false);
    
    const longPressTimer = this.longPressTimers.get(name);
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      this.longPressTimers.delete(name);
      
      if (wasPressed) {
        await this.handleShortPress(name);
      }
    }
    
    await this.gpioService.setLed('status', 0).catch(() => {});
  }

  private async handleShortPress(buttonName: string): Promise<void> {
    this.logger.debug(`Handling short press for button "${buttonName}"`);
    
    const action = this.buttonActions.get(buttonName);
    if (action) {
      try {
        await action();
      } catch (error) {
        this.logger.error(`Error handling button "${buttonName}":`, error);
        
        await this.gpioService.blinkLed('error', 3000, 200).catch(() => {});
      }
    } else {
      this.logger.warn(`No action registered for button "${buttonName}"`);
    }
  }

  private async handleLongPress(buttonName: string): Promise<void> {
    this.logger.debug(`Handling long press for button "${buttonName}"`);
    
    switch (buttonName) {
      case 'capture':
        await this.handleCaptureVideo();
        break;
      
      case 'mode':
        await this.handleSettingsReset();
        break;
      
      case 'delete':
        await this.handleDeleteAll();
        break;
      
      default:
        this.logger.debug(`No long press action for button "${buttonName}"`);
    }
  }

  private async handleCaptureButton(): Promise<void> {
    this.logger.log('Capture button pressed - taking photo');
    
    try {
      await this.gpioService.blinkLed('flash', 100, 50).catch(() => {});
      
      const result = await this.cameraService.capture({
        countdown: 3,
        sound: true,
        flash: true,
        saveToGallery: true,
      });
      
      this.logger.log(`Photo captured: ${result.fileName}`);
      
      await this.gpioService.blinkLed('success', 1000, 200).catch(() => {});
    } catch (error) {
      this.logger.error('Failed to capture photo:', error);
      throw error;
    }
  }

  private async handlePrintButton(): Promise<void> {
    this.logger.log('Print button pressed');
    
    await this.gpioService.blinkLed('print', 2000, 500).catch(() => {});
  }

  private async handleGalleryButton(): Promise<void> {
    this.logger.log('Gallery button pressed');
    
    await this.gpioService.blinkLed('status', 500, 100).catch(() => {});
  }

  private async handleDeleteButton(): Promise<void> {
    this.logger.log('Delete button pressed');
    
    await this.gpioService.blinkLed('error', 500, 100).catch(() => {});
  }

  private async handleModeButton(): Promise<void> {
    this.logger.log('Mode button pressed - switching camera mode');
    
    const currentStrategy = this.cameraService.getCurrentStrategy();
    let nextStrategy: 'mock' | 'webcam' | 'gphoto2';
    
    switch (currentStrategy) {
      case 'MockCamera':
        nextStrategy = 'webcam';
        break;
      case 'WebcamCamera':
        nextStrategy = 'gphoto2';
        break;
      default:
        nextStrategy = 'mock';
        break;
    }
    
    try {
      await this.cameraService.switchStrategy(nextStrategy);
      this.logger.log(`Switched to ${nextStrategy} mode`);
      
      await this.gpioService.blinkLed('success', 1000, 200).catch(() => {});
    } catch (error) {
      this.logger.error('Failed to switch camera mode:', error);
      
      await this.gpioService.blinkLed('error', 1000, 200).catch(() => {});
    }
  }

  private async handleCaptureVideo(): Promise<void> {
    this.logger.log('Long press on capture - starting video recording');
    
    try {
      await this.cameraService.startVideo();
      
      await this.gpioService.setLed('recording', 1).catch(() => {});
      
      const maxDuration = 30000;
      const timeout = setTimeout(async () => {
        await this.stopVideoRecording();
      }, maxDuration);
      
      this.buttonActions.set('capture', async () => {
        clearTimeout(timeout);
        await this.stopVideoRecording();
      });
    } catch (error) {
      this.logger.error('Failed to start video recording:', error);
      
      await this.gpioService.blinkLed('error', 1000, 200).catch(() => {});
    }
  }

  private async stopVideoRecording(): Promise<void> {
    try {
      const result = await this.cameraService.stopVideo();
      this.logger.log(`Video saved: ${result.fileName}`);
      
      await this.gpioService.setLed('recording', 0).catch(() => {});
      
      await this.gpioService.blinkLed('success', 1000, 200).catch(() => {});
      
      this.buttonActions.set('capture', async () => {
        await this.handleCaptureButton();
      });
    } catch (error) {
      this.logger.error('Failed to stop video recording:', error);
      
      await this.gpioService.blinkLed('error', 1000, 200).catch(() => {});
    }
  }

  private async handleSettingsReset(): Promise<void> {
    this.logger.log('Long press on mode - resetting settings');
    
    await this.cameraService.updateSettings({
      iso: 200,
      aperture: 'f/5.6',
      shutterSpeed: '1/125',
      whiteBalance: 'auto',
      focusMode: 'auto',
    });
    
    await this.gpioService.blinkLed('success', 2000, 100).catch(() => {});
  }

  private async handleDeleteAll(): Promise<void> {
    this.logger.log('Long press on delete - clearing gallery');
    
    await this.gpioService.blinkLed('error', 3000, 100).catch(() => {});
  }

  registerButtonAction(buttonName: string, action: () => Promise<void>): void {
    this.logger.log(`Registering custom action for button "${buttonName}"`);
    this.buttonActions.set(buttonName, action);
  }

  unregisterButtonAction(buttonName: string): void {
    this.logger.log(`Unregistering action for button "${buttonName}"`);
    this.buttonActions.delete(buttonName);
  }
}