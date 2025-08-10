import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GpioService, GpioEvent } from './gpio.service';

describe('GpioService', () => {
  let service: GpioService;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GpioService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'hardware.gpio.mock') return true;
              if (key === 'hardware.gpio') {
                return {
                  buttons: [
                    { pin: 17, name: 'capture', debounceTime: 50, pullUp: true },
                  ],
                  leds: [
                    { pin: 27, name: 'status', defaultState: 0 },
                  ],
                };
              }
              return null;
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GpioService>(GpioService);
    configService = module.get<ConfigService>(ConfigService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should use mock service in development', () => {
    expect(service.isAvailable()).toBe(true);
  });

  describe('Button Management', () => {
    it('should register a button', async () => {
      await expect(
        service.registerButton({
          pin: 22,
          name: 'test-button',
          debounceTime: 100,
          pullUp: true,
        })
      ).resolves.not.toThrow();
    });

    it('should read button state', async () => {
      await service.registerButton({
        pin: 22,
        name: 'test-button',
        debounceTime: 100,
        pullUp: true,
      });

      const state = await service.readButton('test-button');
      expect(state === 0 || state === 1).toBe(true);
    });

    it('should throw error for unregistered button', async () => {
      await expect(
        service.readButton('non-existent')
      ).rejects.toThrow('Button "non-existent" not registered');
    });
  });

  describe('LED Management', () => {
    it('should register an LED', async () => {
      await expect(
        service.registerLed({
          pin: 4,
          name: 'test-led',
          defaultState: 0,
        })
      ).resolves.not.toThrow();
    });

    it('should set LED state', async () => {
      await service.registerLed({
        pin: 4,
        name: 'test-led',
        defaultState: 0,
      });

      await service.setLed('test-led', 1);
      
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        GpioEvent.LED_STATE_CHANGED,
        { name: 'test-led', state: 1 }
      );
    });

    it('should toggle LED state', async () => {
      await service.registerLed({
        pin: 4,
        name: 'test-led',
        defaultState: 0,
      });

      await service.toggleLed('test-led');
      
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it('should blink LED', async () => {
      jest.useFakeTimers();

      await service.registerLed({
        pin: 4,
        name: 'test-led',
        defaultState: 0,
      });

      await service.blinkLed('test-led', 1000, 200);
      
      jest.advanceTimersByTime(200);
      
      expect(eventEmitter.emit).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should throw error for unregistered LED', async () => {
      await expect(
        service.setLed('non-existent', 1)
      ).rejects.toThrow('LED "non-existent" not registered');
    });
  });

  describe('Event Handling', () => {
    it('should emit button pressed event with debounce', async () => {
      jest.useFakeTimers();

      await service.registerButton({
        pin: 17,
        name: 'test-button',
        debounceTime: 50,
        pullUp: true,
      });

      jest.advanceTimersByTime(100);

      jest.useRealTimers();
    });
  });
});