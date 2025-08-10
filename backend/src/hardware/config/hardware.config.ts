import { registerAs } from '@nestjs/config';

export default registerAs('hardware', () => ({
  gpio: {
    mock: process.env.GPIO_MOCK === 'true' || process.env.NODE_ENV === 'development',
    buttons: [
      {
        pin: parseInt(process.env.GPIO_BUTTON_CAPTURE_PIN || '17', 10),
        name: 'capture',
        debounceTime: 50,
        pullUp: true,
      },
      {
        pin: parseInt(process.env.GPIO_BUTTON_PRINT_PIN || '22', 10),
        name: 'print',
        debounceTime: 50,
        pullUp: true,
      },
      {
        pin: parseInt(process.env.GPIO_BUTTON_GALLERY_PIN || '23', 10),
        name: 'gallery',
        debounceTime: 50,
        pullUp: true,
      },
      {
        pin: parseInt(process.env.GPIO_BUTTON_DELETE_PIN || '24', 10),
        name: 'delete',
        debounceTime: 50,
        pullUp: true,
      },
      {
        pin: parseInt(process.env.GPIO_BUTTON_MODE_PIN || '25', 10),
        name: 'mode',
        debounceTime: 50,
        pullUp: true,
      },
    ],
    leds: [
      {
        pin: parseInt(process.env.GPIO_LED_STATUS_PIN || '27', 10),
        name: 'status',
        defaultState: 0,
      },
      {
        pin: parseInt(process.env.GPIO_LED_FLASH_PIN || '4', 10),
        name: 'flash',
        defaultState: 0,
      },
      {
        pin: parseInt(process.env.GPIO_LED_SUCCESS_PIN || '5', 10),
        name: 'success',
        defaultState: 0,
      },
      {
        pin: parseInt(process.env.GPIO_LED_ERROR_PIN || '6', 10),
        name: 'error',
        defaultState: 0,
      },
      {
        pin: parseInt(process.env.GPIO_LED_PRINT_PIN || '12', 10),
        name: 'print',
        defaultState: 0,
      },
      {
        pin: parseInt(process.env.GPIO_LED_RECORDING_PIN || '13', 10),
        name: 'recording',
        defaultState: 0,
      },
    ],
  },
  camera: {
    strategy: process.env.CAMERA_STRATEGY || (process.env.NODE_ENV === 'development' ? 'mock' : 'gphoto2'),
    device: process.env.CAMERA_DEVICE,
    outputPath: process.env.CAMERA_OUTPUT_PATH || '/tmp/photobooth/captures',
    thumbnailPath: process.env.CAMERA_THUMBNAIL_PATH || '/tmp/photobooth/captures/thumbnails',
    autoConnect: process.env.CAMERA_AUTO_CONNECT !== 'false',
    reconnectAttempts: parseInt(process.env.CAMERA_RECONNECT_ATTEMPTS || '3', 10),
    reconnectDelay: parseInt(process.env.CAMERA_RECONNECT_DELAY || '5000', 10),
    settings: {
      iso: process.env.CAMERA_DEFAULT_ISO ? parseInt(process.env.CAMERA_DEFAULT_ISO, 10) : 200,
      aperture: process.env.CAMERA_DEFAULT_APERTURE || 'f/5.6',
      shutterSpeed: process.env.CAMERA_DEFAULT_SHUTTER || '1/125',
      whiteBalance: process.env.CAMERA_DEFAULT_WB || 'auto',
      focusMode: (process.env.CAMERA_DEFAULT_FOCUS || 'auto') as 'auto' | 'manual',
      imageFormat: (process.env.CAMERA_DEFAULT_FORMAT || 'jpeg') as 'jpeg' | 'raw' | 'raw+jpeg',
      imageQuality: (process.env.CAMERA_DEFAULT_QUALITY || 'fine') as 'low' | 'normal' | 'fine' | 'superfine',
    },
  },
}));