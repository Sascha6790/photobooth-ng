import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../guards/rate-limit.guard';

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

// Preset rate limit configurations
export const RateLimits = {
  // Strict limit for authentication endpoints
  AUTH: { points: 5, duration: 60, blockDuration: 300 }, // 5 requests per minute, block for 5 minutes
  
  // Standard API endpoints
  API: { points: 100, duration: 60 }, // 100 requests per minute
  
  // Photo capture endpoint
  CAPTURE: { points: 10, duration: 60 }, // 10 captures per minute
  
  // File upload endpoints
  UPLOAD: { points: 5, duration: 60 }, // 5 uploads per minute
  
  // Gallery viewing
  GALLERY: { points: 30, duration: 60 }, // 30 requests per minute
  
  // Print jobs
  PRINT: { points: 3, duration: 60, blockDuration: 120 }, // 3 prints per minute
  
  // Settings updates
  SETTINGS: { points: 10, duration: 60 }, // 10 updates per minute
  
  // WebSocket connections
  WEBSOCKET: { points: 5, duration: 60, blockDuration: 300 }, // 5 connections per minute
};