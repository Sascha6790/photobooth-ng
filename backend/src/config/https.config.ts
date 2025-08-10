import { readFileSync } from 'fs';
import { join } from 'path';
import { Logger } from '@nestjs/common';

export interface HttpsOptions {
  key?: Buffer;
  cert?: Buffer;
  ca?: Buffer;
  passphrase?: string;
}

export class HttpsConfig {
  private static logger = new Logger('HttpsConfig');

  static getHttpsOptions(): HttpsOptions | null {
    const environment = process.env.NODE_ENV || 'development';
    
    // Only enable HTTPS in production or if explicitly configured
    if (environment === 'development' && !process.env.FORCE_HTTPS) {
      return null;
    }

    try {
      const sslPath = process.env.SSL_PATH || '/etc/ssl/photobooth';
      
      // Check for Let's Encrypt certificates first
      const letsEncryptPath = '/etc/letsencrypt/live/' + (process.env.DOMAIN || 'photobooth.local');
      let keyPath: string;
      let certPath: string;
      let caPath: string | undefined;

      if (process.env.USE_LETSENCRYPT === 'true') {
        keyPath = join(letsEncryptPath, 'privkey.pem');
        certPath = join(letsEncryptPath, 'fullchain.pem');
      } else {
        // Use custom certificates
        keyPath = process.env.SSL_KEY_PATH || join(sslPath, 'server.key');
        certPath = process.env.SSL_CERT_PATH || join(sslPath, 'server.crt');
        caPath = process.env.SSL_CA_PATH || join(sslPath, 'ca.crt');
      }

      const httpsOptions: HttpsOptions = {
        key: readFileSync(keyPath),
        cert: readFileSync(certPath),
      };

      // Add CA certificate if available
      if (caPath) {
        try {
          httpsOptions.ca = readFileSync(caPath);
        } catch (e) {
          // CA certificate is optional
          this.logger.warn('CA certificate not found, continuing without it');
        }
      }

      // Add passphrase if configured
      if (process.env.SSL_PASSPHRASE) {
        httpsOptions.passphrase = process.env.SSL_PASSPHRASE;
      }

      this.logger.log('HTTPS configuration loaded successfully');
      return httpsOptions;
    } catch (error) {
      this.logger.error('Failed to load HTTPS certificates:', error.message);
      
      // In production, fail if HTTPS is required
      if (environment === 'production' && process.env.REQUIRE_HTTPS === 'true') {
        throw new Error('HTTPS is required in production but certificates could not be loaded');
      }
      
      return null;
    }
  }

  static generateSelfSignedCertificate(): void {
    // This would be called during development/testing
    // Requires openssl to be installed
    const { execSync } = require('child_process');
    const sslPath = process.env.SSL_PATH || './ssl';
    
    try {
      // Create SSL directory
      execSync(`mkdir -p ${sslPath}`);
      
      // Generate self-signed certificate
      execSync(`
        openssl req -x509 -newkey rsa:4096 -nodes \
          -keyout ${sslPath}/server.key \
          -out ${sslPath}/server.crt \
          -days 365 \
          -subj "/C=US/ST=State/L=City/O=Photobooth/CN=localhost"
      `);
      
      this.logger.log('Self-signed certificate generated successfully');
    } catch (error) {
      this.logger.error('Failed to generate self-signed certificate:', error.message);
    }
  }
}