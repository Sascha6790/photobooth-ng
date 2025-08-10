export interface GpioPin {
  id: number;
  direction: 'in' | 'out';
  edge?: 'none' | 'rising' | 'falling' | 'both';
  value?: 0 | 1;
  name?: string;
}

export interface IGpioService {
  setup(pin: number, direction: 'in' | 'out', edge?: 'none' | 'rising' | 'falling' | 'both'): Promise<void>;
  read(pin: number): Promise<0 | 1>;
  write(pin: number, value: 0 | 1): Promise<void>;
  watch(pin: number, callback: (value: 0 | 1) => void): void;
  unwatch(pin: number): void;
  cleanup(): Promise<void>;
  isAvailable(): boolean;
}

export interface ButtonConfig {
  pin: number;
  name: string;
  debounceTime?: number;
  pullUp?: boolean;
}

export interface LedConfig {
  pin: number;
  name: string;
  defaultState?: 0 | 1;
}