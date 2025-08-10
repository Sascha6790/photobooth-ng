import { Injectable, Logger } from '@nestjs/common';
import { IGpioService } from '../interfaces/gpio.interface';

interface Gpio {
  read(callback?: (err: Error | null, value: 0 | 1) => void): void;
  readSync(): 0 | 1;
  write(value: 0 | 1, callback?: (err: Error | null) => void): void;
  writeSync(value: 0 | 1): void;
  watch(callback: (err: Error | null, value: 0 | 1) => void): void;
  unwatch(callback?: (err: Error | null, value: 0 | 1) => void): void;
  unwatchAll(): void;
  unexport(): void;
}

@Injectable()
export class GpioRealService implements IGpioService {
  private readonly logger = new Logger(GpioRealService.name);
  private readonly pins: Map<number, any> = new Map();
  private Gpio: any;
  private available: boolean = false;

  constructor() {
    try {
      this.Gpio = require('onoff').Gpio;
      this.available = this.Gpio.accessible;
      
      if (this.available) {
        this.logger.log('GPIO Real Service initialized (Production mode on Raspberry Pi)');
      } else {
        this.logger.warn('GPIO not accessible on this platform');
      }
    } catch (error) {
      this.logger.error('Failed to load onoff library:', error);
      this.available = false;
    }
  }

  async setup(pin: number, direction: 'in' | 'out', edge: 'none' | 'rising' | 'falling' | 'both' = 'none'): Promise<void> {
    if (!this.available) {
      throw new Error('GPIO not available on this platform');
    }

    this.logger.debug(`Setting up GPIO pin ${pin} as ${direction} with edge ${edge}`);
    
    try {
      const gpio = new this.Gpio(pin, direction, edge);
      this.pins.set(pin, gpio);
    } catch (error) {
      this.logger.error(`Failed to setup pin ${pin}:`, error);
      throw error;
    }
  }

  async read(pin: number): Promise<0 | 1> {
    if (!this.available) {
      throw new Error('GPIO not available on this platform');
    }

    const gpio = this.pins.get(pin);
    
    if (!gpio) {
      throw new Error(`Pin ${pin} not configured`);
    }

    return new Promise((resolve, reject) => {
      gpio.read((err: Error | null, value: 0 | 1) => {
        if (err) {
          this.logger.error(`Failed to read pin ${pin}:`, err);
          reject(err);
        } else {
          this.logger.debug(`Read pin ${pin}: ${value}`);
          resolve(value);
        }
      });
    });
  }

  async write(pin: number, value: 0 | 1): Promise<void> {
    if (!this.available) {
      throw new Error('GPIO not available on this platform');
    }

    const gpio = this.pins.get(pin);
    
    if (!gpio) {
      throw new Error(`Pin ${pin} not configured`);
    }

    return new Promise((resolve, reject) => {
      gpio.write(value, (err: Error | null) => {
        if (err) {
          this.logger.error(`Failed to write pin ${pin}:`, err);
          reject(err);
        } else {
          this.logger.debug(`Write pin ${pin}: ${value}`);
          resolve();
        }
      });
    });
  }

  watch(pin: number, callback: (value: 0 | 1) => void): void {
    if (!this.available) {
      throw new Error('GPIO not available on this platform');
    }

    const gpio = this.pins.get(pin);
    
    if (!gpio) {
      throw new Error(`Pin ${pin} not configured`);
    }

    this.logger.debug(`Setting up watcher for pin ${pin}`);
    
    gpio.watch((err: Error | null, value: 0 | 1) => {
      if (err) {
        this.logger.error(`Error watching pin ${pin}:`, err);
      } else {
        this.logger.debug(`Pin ${pin} changed to ${value}`);
        callback(value);
      }
    });
  }

  unwatch(pin: number): void {
    if (!this.available) {
      return;
    }

    const gpio = this.pins.get(pin);
    
    if (gpio) {
      this.logger.debug(`Removing watcher for pin ${pin}`);
      gpio.unwatchAll();
    }
  }

  async cleanup(): Promise<void> {
    this.logger.debug('Cleaning up GPIO resources');
    
    for (const [pin, gpio] of this.pins.entries()) {
      try {
        gpio.unexport();
        this.logger.debug(`Unexported pin ${pin}`);
      } catch (error) {
        this.logger.error(`Failed to unexport pin ${pin}:`, error);
      }
    }
    
    this.pins.clear();
  }

  isAvailable(): boolean {
    return this.available;
  }
}