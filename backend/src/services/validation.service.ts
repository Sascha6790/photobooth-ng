import { Injectable } from '@nestjs/common';
import * as Joi from 'joi';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  value?: any;
}

@Injectable()
export class ValidationService {
  /**
   * Validate data against a Joi schema
   */
  validate(data: any, schema: Joi.Schema): ValidationResult {
    const result = schema.validate(data, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });
    
    if (result.error) {
      return {
        isValid: false,
        errors: result.error.details.map(detail => detail.message),
      };
    }
    
    return {
      isValid: true,
      errors: [],
      value: result.value,
    };
  }
  
  /**
   * Validate with custom options
   */
  validateWithOptions(
    data: any,
    schema: Joi.Schema,
    options: Joi.ValidationOptions
  ): ValidationResult {
    const result = schema.validate(data, options);
    
    if (result.error) {
      return {
        isValid: false,
        errors: result.error.details.map(detail => detail.message),
      };
    }
    
    return {
      isValid: true,
      errors: [],
      value: result.value,
    };
  }
  
  /**
   * Validate async (for schemas with async rules)
   */
  async validateAsync(data: any, schema: Joi.Schema): Promise<ValidationResult> {
    try {
      const value = await schema.validateAsync(data, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
      });
      
      return {
        isValid: true,
        errors: [],
        value,
      };
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        return {
          isValid: false,
          errors: error.details.map(detail => detail.message),
        };
      }
      throw error;
    }
  }
  
  /**
   * Common validation schemas
   */
  get schemas() {
    return {
      email: Joi.string().email().required(),
      
      url: Joi.string().uri().required(),
      
      filename: Joi.string()
        .pattern(/^[a-zA-Z0-9._-]+$/)
        .max(255)
        .required(),
      
      imagePath: Joi.string()
        .pattern(/\.(jpg|jpeg|png|gif|webp)$/i)
        .required(),
      
      videoPath: Joi.string()
        .pattern(/\.(mp4|webm|avi|mov)$/i)
        .required(),
      
      hexColor: Joi.string()
        .pattern(/^#[0-9A-Fa-f]{6}$/)
        .required(),
      
      ipAddress: Joi.string()
        .ip({ version: ['ipv4', 'ipv6'] })
        .required(),
      
      port: Joi.number()
        .port()
        .required(),
      
      uuid: Joi.string()
        .uuid()
        .required(),
      
      dateTime: Joi.date()
        .iso()
        .required(),
      
      positiveInteger: Joi.number()
        .integer()
        .positive()
        .required(),
      
      percentage: Joi.number()
        .min(0)
        .max(100)
        .required(),
      
      language: Joi.string()
        .length(2)
        .lowercase()
        .required(),
      
      pin: Joi.string()
        .pattern(/^\d{4,6}$/)
        .required(),
      
      resolution: Joi.object({
        width: Joi.number().integer().positive().required(),
        height: Joi.number().integer().positive().required(),
      }),
      
      pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sort: Joi.string().valid('asc', 'desc').default('desc'),
        sortBy: Joi.string().default('created_at'),
      }),
    };
  }
  
  /**
   * Validate email address
   */
  isValidEmail(email: string): boolean {
    const result = this.schemas.email.validate(email);
    return !result.error;
  }
  
  /**
   * Validate URL
   */
  isValidUrl(url: string): boolean {
    const result = this.schemas.url.validate(url);
    return !result.error;
  }
  
  /**
   * Validate image file path
   */
  isValidImagePath(path: string): boolean {
    const result = this.schemas.imagePath.validate(path);
    return !result.error;
  }
  
  /**
   * Validate video file path
   */
  isValidVideoPath(path: string): boolean {
    const result = this.schemas.videoPath.validate(path);
    return !result.error;
  }
  
  /**
   * Validate hex color
   */
  isValidHexColor(color: string): boolean {
    const result = this.schemas.hexColor.validate(color);
    return !result.error;
  }
  
  /**
   * Sanitize filename
   */
  sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    filename = filename.replace(/\.\./g, '');
    filename = filename.replace(/[\/\\]/g, '');
    
    // Remove special characters except dots, dashes, and underscores
    filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Limit length
    if (filename.length > 255) {
      const ext = filename.split('.').pop();
      const name = filename.substring(0, 250 - (ext?.length || 0) - 1);
      filename = ext ? `${name}.${ext}` : name;
    }
    
    return filename;
  }
  
  /**
   * Validate and sanitize user input
   */
  sanitizeInput(input: string, maxLength: number = 1000): string {
    // Remove control characters
    input = input.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Trim whitespace
    input = input.trim();
    
    // Limit length
    if (input.length > maxLength) {
      input = input.substring(0, maxLength);
    }
    
    return input;
  }
  
  /**
   * Validate MIME type
   */
  isValidMimeType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType.toLowerCase());
  }
  
  /**
   * Create a custom validator function
   */
  createValidator<T>(schema: Joi.Schema): (data: any) => T {
    return (data: any): T => {
      const result = this.validate(data, schema);
      
      if (!result.isValid) {
        throw new Error(`Validation failed: ${result.errors.join(', ')}`);
      }
      
      return result.value as T;
    };
  }
}