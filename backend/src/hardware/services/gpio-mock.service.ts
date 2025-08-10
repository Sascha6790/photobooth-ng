import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { IGpioService, GpioPin } from '../interfaces/gpio.interface';

@Injectable()
export class GpioMockService implements IGpioService {
  private readonly logger = new Logger(GpioMockService.name);
  private readonly pins: Map<number, GpioPin> = new Map();
  private readonly watchers: Map<number, NodeJS.Timer> = new Map();
  private readonly eventEmitter = new EventEmitter();

  constructor() {
    this.logger.log('GPIO Mock Service initialized (Development mode)');
  }

  async setup(pin: number, direction: 'in' | 'out', edge: 'none' | 'rising' | 'falling' | 'both' = 'none'): Promise<void> {
    this.logger.debug(`Setting up mock pin ${pin} as ${direction} with edge ${edge}`);
    
    this.pins.set(pin, {
      id: pin,
      direction,
      edge,
      value: 0,
    });

    if (direction === 'in' && edge !== 'none') {
      this.simulateInputChanges(pin);
    }
  }

  async read(pin: number): Promise<0 | 1> {
    const pinConfig = this.pins.get(pin);
    
    if (!pinConfig) {
      throw new Error(`Pin ${pin} not configured`);
    }

    if (pinConfig.direction !== 'in') {
      throw new Error(`Pin ${pin} is not configured as input`);
    }

    const value = pinConfig.value || 0;
    this.logger.debug(`Mock read pin ${pin}: ${value}`);
    
    return value;
  }

  async write(pin: number, value: 0 | 1): Promise<void> {
    const pinConfig = this.pins.get(pin);
    
    if (!pinConfig) {
      throw new Error(`Pin ${pin} not configured`);
    }

    if (pinConfig.direction !== 'out') {
      throw new Error(`Pin ${pin} is not configured as output`);
    }

    pinConfig.value = value;
    this.logger.debug(`Mock write pin ${pin}: ${value}`);
    
    this.eventEmitter.emit(`pin-${pin}-changed`, value);
  }

  watch(pin: number, callback: (value: 0 | 1) => void): void {
    const pinConfig = this.pins.get(pin);
    
    if (!pinConfig) {
      throw new Error(`Pin ${pin} not configured`);
    }

    if (pinConfig.direction !== 'in') {
      throw new Error(`Pin ${pin} is not configured as input`);
    }

    this.logger.debug(`Setting up mock watcher for pin ${pin}`);
    
    this.eventEmitter.on(`pin-${pin}-value`, callback);
    
    const interval = setInterval(() => {
      const randomValue = Math.random() > 0.95 ? 1 : 0;
      if (randomValue === 1) {
        this.logger.debug(`Mock pin ${pin} triggered`);
        callback(randomValue as 0 | 1);
        
        setTimeout(() => {
          callback(0);
        }, 100);
      }
    }, 1000);
    
    this.watchers.set(pin, interval);
  }

  unwatch(pin: number): void {
    this.logger.debug(`Removing mock watcher for pin ${pin}`);
    
    const interval = this.watchers.get(pin);
    if (interval) {
      clearInterval(interval);
      this.watchers.delete(pin);
    }
    
    this.eventEmitter.removeAllListeners(`pin-${pin}-value`);
  }

  async cleanup(): Promise<void> {
    this.logger.debug('Cleaning up mock GPIO resources');
    
    this.watchers.forEach((interval, pin) => {
      clearInterval(interval);
    });
    
    this.watchers.clear();
    this.pins.clear();
    this.eventEmitter.removeAllListeners();
  }

  isAvailable(): boolean {
    return true;
  }

  private simulateInputChanges(pin: number): void {
    const simulateRandomButton = () => {
      const value = Math.random() > 0.98 ? 1 : 0;
      const pinConfig = this.pins.get(pin);
      
      if (pinConfig && value !== pinConfig.value) {
        const oldValue = pinConfig.value;
        pinConfig.value = value as 0 | 1;
        
        const edge = pinConfig.edge;
        if (
          edge === 'both' ||
          (edge === 'rising' && value === 1) ||
          (edge === 'falling' && value === 0)
        ) {
          this.eventEmitter.emit(`pin-${pin}-value`, value);
        }
      }
    };

    setInterval(simulateRandomButton, 2000);
  }
}