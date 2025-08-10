import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IGpioService, ButtonConfig, LedConfig } from '../interfaces/gpio.interface';
import { GpioMockService } from './gpio-mock.service';
import { GpioRealService } from './gpio-real.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export enum GpioEvent {
  BUTTON_PRESSED = 'gpio.button.pressed',
  BUTTON_RELEASED = 'gpio.button.released',
  LED_STATE_CHANGED = 'gpio.led.changed',
}

@Injectable()
export class GpioService implements OnModuleDestroy {
  private readonly logger = new Logger(GpioService.name);
  private readonly gpioImplementation: IGpioService;
  private readonly buttons: Map<string, ButtonConfig> = new Map();
  private readonly leds: Map<string, LedConfig> = new Map();
  private readonly debounceTimers: Map<number, NodeJS.Timeout> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const useMock = this.configService.get<boolean>('hardware.gpio.mock', true);
    const platform = process.platform;
    
    if (useMock || platform !== 'linux') {
      this.logger.log('Using GPIO Mock Service');
      this.gpioImplementation = new GpioMockService();
    } else {
      this.logger.log('Using GPIO Real Service');
      this.gpioImplementation = new GpioRealService();
    }

    this.initializeHardware();
  }

  private async initializeHardware(): Promise<void> {
    const hardwareConfig = this.configService.get('hardware.gpio');
    
    if (hardwareConfig?.buttons) {
      await this.setupButtons(hardwareConfig.buttons);
    }
    
    if (hardwareConfig?.leds) {
      await this.setupLeds(hardwareConfig.leds);
    }
  }

  private async setupButtons(buttonsConfig: ButtonConfig[]): Promise<void> {
    for (const buttonConfig of buttonsConfig) {
      await this.registerButton(buttonConfig);
    }
  }

  private async setupLeds(ledsConfig: LedConfig[]): Promise<void> {
    for (const ledConfig of ledsConfig) {
      await this.registerLed(ledConfig);
    }
  }

  async registerButton(config: ButtonConfig): Promise<void> {
    const { pin, name, debounceTime = 50, pullUp = true } = config;
    
    this.logger.log(`Registering button "${name}" on pin ${pin}`);
    
    await this.gpioImplementation.setup(pin, 'in', 'both');
    
    this.buttons.set(name, config);
    
    this.gpioImplementation.watch(pin, (value: 0 | 1) => {
      this.handleButtonChange(name, pin, value, debounceTime);
    });
  }

  async registerLed(config: LedConfig): Promise<void> {
    const { pin, name, defaultState = 0 } = config;
    
    this.logger.log(`Registering LED "${name}" on pin ${pin}`);
    
    await this.gpioImplementation.setup(pin, 'out');
    await this.gpioImplementation.write(pin, defaultState);
    
    this.leds.set(name, config);
  }

  private handleButtonChange(name: string, pin: number, value: 0 | 1, debounceTime: number): void {
    const existingTimer = this.debounceTimers.get(pin);
    
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      if (value === 1) {
        this.logger.debug(`Button "${name}" pressed`);
        this.eventEmitter.emit(GpioEvent.BUTTON_PRESSED, { name, pin });
      } else {
        this.logger.debug(`Button "${name}" released`);
        this.eventEmitter.emit(GpioEvent.BUTTON_RELEASED, { name, pin });
      }
      
      this.debounceTimers.delete(pin);
    }, debounceTime);
    
    this.debounceTimers.set(pin, timer);
  }

  async setLed(name: string, state: 0 | 1): Promise<void> {
    const ledConfig = this.leds.get(name);
    
    if (!ledConfig) {
      throw new Error(`LED "${name}" not registered`);
    }
    
    await this.gpioImplementation.write(ledConfig.pin, state);
    
    this.eventEmitter.emit(GpioEvent.LED_STATE_CHANGED, { name, state });
    
    this.logger.debug(`LED "${name}" set to ${state}`);
  }

  async toggleLed(name: string): Promise<void> {
    const ledConfig = this.leds.get(name);
    
    if (!ledConfig) {
      throw new Error(`LED "${name}" not registered`);
    }
    
    const currentState = await this.gpioImplementation.read(ledConfig.pin);
    const newState = currentState === 0 ? 1 : 0;
    
    await this.setLed(name, newState as 0 | 1);
  }

  async blinkLed(name: string, duration: number = 1000, interval: number = 500): Promise<void> {
    const ledConfig = this.leds.get(name);
    
    if (!ledConfig) {
      throw new Error(`LED "${name}" not registered`);
    }
    
    const startTime = Date.now();
    let state: 0 | 1 = 1;
    
    const blinkInterval = setInterval(async () => {
      if (Date.now() - startTime >= duration) {
        clearInterval(blinkInterval);
        await this.setLed(name, 0);
        return;
      }
      
      await this.setLed(name, state);
      state = state === 0 ? 1 : 0;
    }, interval);
  }

  async readButton(name: string): Promise<0 | 1> {
    const buttonConfig = this.buttons.get(name);
    
    if (!buttonConfig) {
      throw new Error(`Button "${name}" not registered`);
    }
    
    return await this.gpioImplementation.read(buttonConfig.pin);
  }

  isAvailable(): boolean {
    return this.gpioImplementation.isAvailable();
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Cleaning up GPIO resources');
    
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    await this.gpioImplementation.cleanup();
  }
}