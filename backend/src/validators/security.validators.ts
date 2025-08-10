import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import * as DOMPurify from 'isomorphic-dompurify';

// Custom validator for safe string input (prevents XSS)
@ValidatorConstraint({ name: 'isSafeString', async: false })
export class IsSafeStringConstraint implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments) {
    if (!text || typeof text !== 'string') {
      return false;
    }
    
    // Check for common XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
      /<iframe\b/gi,
      /<embed\b/gi,
      /<object\b/gi,
      /eval\(/gi,
      /expression\(/gi,
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(text)) {
        return false;
      }
    }
    
    // Additional sanitization
    const clean = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
    return clean === text;
  }
  
  defaultMessage(args: ValidationArguments) {
    return 'Text contains potentially unsafe content';
  }
}

export function IsSafeString(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeStringConstraint,
    });
  };
}

// Validator for file paths (prevents directory traversal)
@ValidatorConstraint({ name: 'isSafeFilePath', async: false })
export class IsSafeFilePathConstraint implements ValidatorConstraintInterface {
  validate(path: string, args: ValidationArguments) {
    if (!path || typeof path !== 'string') {
      return false;
    }
    
    // Check for directory traversal patterns
    const traversalPatterns = [
      /\.\./g, // Parent directory
      /\.\.%2[fF]/g, // URL encoded parent directory
      /\.\.\\/g, // Windows style
      /~\//g, // Home directory
      /%00/g, // Null byte
      /^\//g, // Absolute path
      /^[A-Za-z]:/g, // Windows absolute path
    ];
    
    for (const pattern of traversalPatterns) {
      if (pattern.test(path)) {
        return false;
      }
    }
    
    // Check for valid filename characters
    const validPathPattern = /^[a-zA-Z0-9\-_\/\. ]+$/;
    return validPathPattern.test(path);
  }
  
  defaultMessage(args: ValidationArguments) {
    return 'File path contains invalid or unsafe characters';
  }
}

export function IsSafeFilePath(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeFilePathConstraint,
    });
  };
}

// Validator for SQL injection prevention
@ValidatorConstraint({ name: 'isNoSqlInjection', async: false })
export class IsNoSqlInjectionConstraint implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments) {
    if (!text || typeof text !== 'string') {
      return true; // Allow empty/null
    }
    
    // Check for common SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|FROM|WHERE|ORDER BY|GROUP BY|HAVING)\b)/gi,
      /--/g, // SQL comments
      /\/\*/g, // Multi-line comments
      /\*/g,
      /;/g, // Statement terminator
      /'/g, // Single quotes
      /"/g, // Double quotes
      /\|\|/g, // String concatenation
      /\bOR\b.*=/gi, // OR conditions
      /\bAND\b.*=/gi, // AND conditions
    ];
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(text)) {
        return false;
      }
    }
    
    return true;
  }
  
  defaultMessage(args: ValidationArguments) {
    return 'Text contains potentially dangerous SQL-like patterns';
  }
}

export function IsNoSqlInjection(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNoSqlInjectionConstraint,
    });
  };
}

// Validator for safe URLs
@ValidatorConstraint({ name: 'isSafeUrl', async: false })
export class IsSafeUrlConstraint implements ValidatorConstraintInterface {
  validate(url: string, args: ValidationArguments) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      
      // Only allow http(s) and specific protocols
      const allowedProtocols = ['http:', 'https:', 'ftp:', 'ftps:'];
      if (!allowedProtocols.includes(urlObj.protocol)) {
        return false;
      }
      
      // Check for localhost/private IPs in production
      if (process.env.NODE_ENV === 'production') {
        const privatePatterns = [
          /^localhost$/i,
          /^127\./,
          /^10\./,
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
          /^192\.168\./,
          /^169\.254\./,
          /^::1$/,
          /^fc00:/i,
          /^fe80:/i,
        ];
        
        for (const pattern of privatePatterns) {
          if (pattern.test(urlObj.hostname)) {
            return false;
          }
        }
      }
      
      return true;
    } catch (e) {
      return false;
    }
  }
  
  defaultMessage(args: ValidationArguments) {
    return 'URL is invalid or contains unsafe protocol/host';
  }
}

export function IsSafeUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeUrlConstraint,
    });
  };
}

// Validator for safe email addresses
@ValidatorConstraint({ name: 'isSafeEmail', async: false })
export class IsSafeEmailConstraint implements ValidatorConstraintInterface {
  validate(email: string, args: ValidationArguments) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return false;
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/gi,
      /javascript:/gi,
      /on\w+=/gi,
      /[<>]/g,
      /\.\./g,
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(email)) {
        return false;
      }
    }
    
    // Length check
    if (email.length > 254) { // RFC 5321
      return false;
    }
    
    return true;
  }
  
  defaultMessage(args: ValidationArguments) {
    return 'Email address is invalid or contains unsafe characters';
  }
}

export function IsSafeEmail(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeEmailConstraint,
    });
  };
}

// Rate limit validator for numeric inputs
@ValidatorConstraint({ name: 'isWithinRateLimit', async: false })
export class IsWithinRateLimitConstraint implements ValidatorConstraintInterface {
  validate(value: number, args: ValidationArguments) {
    const [min, max] = args.constraints;
    
    if (typeof value !== 'number') {
      return false;
    }
    
    if (isNaN(value) || !isFinite(value)) {
      return false;
    }
    
    return value >= min && value <= max;
  }
  
  defaultMessage(args: ValidationArguments) {
    const [min, max] = args.constraints;
    return `Value must be between ${min} and ${max}`;
  }
}

export function IsWithinRateLimit(min: number, max: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [min, max],
      validator: IsWithinRateLimitConstraint,
    });
  };
}

// File upload validator
export interface FileUploadOptions {
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

@ValidatorConstraint({ name: 'isValidFileUpload', async: false })
export class IsValidFileUploadConstraint implements ValidatorConstraintInterface {
  validate(file: any, args: ValidationArguments) {
    const options: FileUploadOptions = args.constraints[0] || {};
    
    if (!file) {
      return false;
    }
    
    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      return false;
    }
    
    // Check MIME type
    if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.mimetype)) {
      return false;
    }
    
    // Check file extension
    if (options.allowedExtensions) {
      const ext = file.originalname?.split('.').pop()?.toLowerCase();
      if (!ext || !options.allowedExtensions.includes(ext)) {
        return false;
      }
    }
    
    // Check for double extensions (e.g., file.jpg.exe)
    const doubleExtPattern = /\.[^.]+\.[^.]+$/;
    if (doubleExtPattern.test(file.originalname)) {
      // Allow only specific safe double extensions
      const safeDoubleExts = ['.tar.gz', '.tar.bz2', '.min.js', '.min.css'];
      const hasSafeDouble = safeDoubleExts.some(ext => 
        file.originalname.toLowerCase().endsWith(ext)
      );
      if (!hasSafeDouble) {
        return false;
      }
    }
    
    return true;
  }
  
  defaultMessage(args: ValidationArguments) {
    return 'File upload validation failed';
  }
}

export function IsValidFileUpload(options?: FileUploadOptions, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsValidFileUploadConstraint,
    });
  };
}