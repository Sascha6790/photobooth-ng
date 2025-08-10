import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

interface CsrfRequest extends Request {
  session?: {
    csrfToken?: string;
    [key: string]: any;
  };
  csrfToken?: () => string;
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly tokenLength = 32;
  private readonly cookieName = '_csrf';
  private readonly headerName = 'x-csrf-token';
  private readonly paramName = '_csrf';
  
  // Methods that require CSRF protection
  private readonly protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  
  // Paths to exclude from CSRF protection
  private readonly excludedPaths = [
    '/api/webhooks', // External webhooks
    '/api/auth/login', // Login endpoint needs special handling
    '/api/auth/register', // Registration endpoint
    '/health', // Health checks
    '/metrics', // Metrics endpoint
  ];

  use(req: CsrfRequest, res: Response, next: NextFunction) {
    // Skip CSRF for excluded paths
    if (this.isExcludedPath(req.path)) {
      return next();
    }

    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (!this.protectedMethods.includes(req.method)) {
      // Generate and attach token for GET requests
      this.ensureToken(req, res);
      return next();
    }

    // Verify CSRF token for protected methods
    if (!this.verifyToken(req)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          error: 'Forbidden',
          message: 'Invalid CSRF token',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // Regenerate token after successful verification
    this.ensureToken(req, res);
    next();
  }

  private isExcludedPath(path: string): boolean {
    return this.excludedPaths.some(excludedPath => 
      path.startsWith(excludedPath)
    );
  }

  private ensureToken(req: CsrfRequest, res: Response): void {
    if (!req.session) {
      // Session not initialized
      return;
    }

    // Generate new token if not exists
    if (!req.session.csrfToken) {
      req.session.csrfToken = this.generateToken();
    }

    // Attach token getter to request
    req.csrfToken = () => req.session.csrfToken;

    // Set token in response header for client to use
    res.setHeader('X-CSRF-Token', req.session.csrfToken);
    
    // Also set as secure, httpOnly cookie
    if (process.env.NODE_ENV === 'production') {
      res.cookie(this.cookieName, req.session.csrfToken, {
        httpOnly: false, // Must be false so JS can read it
        secure: true, // Only over HTTPS
        sameSite: 'strict',
        maxAge: 3600000, // 1 hour
      });
    }
  }

  private verifyToken(req: CsrfRequest): boolean {
    if (!req.session?.csrfToken) {
      return false;
    }

    const sessionToken = req.session.csrfToken;
    
    // Check token from multiple sources
    const providedToken = 
      req.headers[this.headerName] as string ||
      req.body?.[this.paramName] ||
      req.query?.[this.paramName] ||
      req.cookies?.[this.cookieName];

    if (!providedToken) {
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    return this.safeCompare(sessionToken, providedToken);
  }

  private generateToken(): string {
    return crypto.randomBytes(this.tokenLength).toString('hex');
  }

  private safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
}

// CSRF decorator for controller methods
export function RequireCsrf(): MethodDecorator {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const [req] = args;
      
      // Additional CSRF check at controller level
      if (!req.csrfToken || !req.session?.csrfToken) {
        throw new HttpException(
          'CSRF token required',
          HttpStatus.FORBIDDEN,
        );
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}