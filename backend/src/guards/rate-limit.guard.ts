import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  points: number; // Number of requests
  duration: number; // Per duration in seconds
  blockDuration?: number; // Block duration in seconds
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private limiters = new Map<string, RateLimiterMemory>();

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Get rate limit options from decorator
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      return true; // No rate limit configured
    }

    const key = `${context.getClass().name}-${context.getHandler().name}`;
    
    // Get or create rate limiter for this endpoint
    let limiter = this.limiters.get(key);
    if (!limiter) {
      limiter = new RateLimiterMemory({
        points: rateLimitOptions.points,
        duration: rateLimitOptions.duration,
        blockDuration: rateLimitOptions.blockDuration || 60,
      });
      this.limiters.set(key, limiter);
    }

    // Get client identifier (IP address or user ID)
    const clientId = this.getClientId(request);

    try {
      await limiter.consume(clientId);
      return true;
    } catch (rejRes) {
      if (rejRes instanceof RateLimiterRes) {
        const retryAfter = Math.round(rejRes.msBeforeNext / 1000) || 1;
        
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Please retry after ${retryAfter} seconds`,
            retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw rejRes;
    }
  }

  private getClientId(request: Request): string {
    // Try to get user ID from JWT token
    const user = request['user'] as any;
    if (user?.id) {
      return `user-${user.id}`;
    }

    // Fallback to IP address
    const ip = request.ip || 
                request.headers['x-forwarded-for'] || 
                request.headers['x-real-ip'] ||
                request.connection.remoteAddress ||
                'unknown';
    
    return `ip-${ip}`;
  }
}