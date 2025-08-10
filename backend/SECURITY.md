# Security Configuration Guide

## Overview
This document outlines the security features implemented in the Photobooth backend application.

## Security Features

### 1. HTTPS/TLS Configuration
- **Location**: `src/config/https.config.ts`
- **Features**:
  - Automatic HTTPS in production
  - Support for Let's Encrypt certificates
  - Self-signed certificate generation for development
  - Configurable SSL paths and passphrases

### 2. Security Headers (Helmet.js)
- **Location**: `src/middleware/security.middleware.ts`
- **Headers Applied**:
  - Content Security Policy (CSP)
  - Strict Transport Security (HSTS)
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection
  - Referrer-Policy: strict-origin-when-cross-origin
  - X-DNS-Prefetch-Control: off

### 3. Rate Limiting
- **Location**: `src/guards/rate-limit.guard.ts`, `src/decorators/rate-limit.decorator.ts`
- **Configured Limits**:
  - Authentication: 5 requests/minute (5 min block)
  - API Endpoints: 100 requests/minute
  - Photo Capture: 10 captures/minute
  - File Upload: 5 uploads/minute
  - Gallery: 30 requests/minute
  - Print Jobs: 3 prints/minute (2 min block)
  - Settings: 10 updates/minute
  - WebSocket: 5 connections/minute (5 min block)

### 4. CSRF Protection
- **Location**: `src/middleware/csrf.middleware.ts`
- **Features**:
  - Token generation for sessions
  - Token validation for state-changing operations
  - Multiple token sources (header, body, cookie)
  - Constant-time comparison to prevent timing attacks
  - Automatic token regeneration

### 5. Input Validation
- **Location**: `src/validators/security.validators.ts`
- **Custom Validators**:
  - `@IsSafeString()` - XSS prevention
  - `@IsSafeFilePath()` - Directory traversal prevention
  - `@IsNoSqlInjection()` - SQL injection prevention
  - `@IsSafeUrl()` - URL validation with protocol checks
  - `@IsSafeEmail()` - Email validation with security checks
  - `@IsWithinRateLimit()` - Numeric range validation
  - `@IsValidFileUpload()` - File upload validation

### 6. Authentication & Authorization
- **JWT-based authentication**
- **Role-based access control (RBAC)**
- **Session management with Redis**
- **Secure password hashing with bcrypt**

### 7. CORS Configuration
- **Development**: Allow all origins
- **Production**: Whitelist specific origins
- **Credentials**: Always enabled
- **Exposed Headers**: X-CSRF-Token

## Environment Configuration

### Required Production Variables
```env
NODE_ENV=production
REQUIRE_HTTPS=true
ALLOWED_ORIGINS=https://your-domain.com
SESSION_SECRET=<long-random-string>
JWT_SECRET=<long-random-string>
```

### SSL/TLS Setup

#### Option 1: Let's Encrypt (Recommended)
```env
USE_LETSENCRYPT=true
DOMAIN=your-domain.com
```

#### Option 2: Custom Certificates
```env
SSL_PATH=/etc/ssl/photobooth
SSL_KEY_PATH=/etc/ssl/photobooth/server.key
SSL_CERT_PATH=/etc/ssl/photobooth/server.crt
SSL_CA_PATH=/etc/ssl/photobooth/ca.crt
```

## Security Best Practices

### 1. Keep Dependencies Updated
```bash
npm audit
npm audit fix
npm update
```

### 2. Use Strong Secrets
- Generate secure random strings for secrets:
```bash
openssl rand -base64 32
```

### 3. Database Security
- Use SSL/TLS connections
- Enable query logging only in development
- Use parameterized queries (TypeORM handles this)
- Regular backups

### 4. File Upload Security
- Validate file types and extensions
- Limit file sizes
- Scan for malware (optional)
- Store outside web root
- Generate unique filenames

### 5. Monitoring & Logging
- Enable error tracking (Sentry)
- Monitor rate limit violations
- Log authentication failures
- Set up alerts for suspicious activity

## Testing Security

### 1. Test Rate Limiting
```bash
# Test rate limiting
for i in {1..20}; do
  curl -X POST http://localhost:3000/api/capture
done
```

### 2. Test CSRF Protection
```bash
# Get CSRF token
curl -c cookies.txt http://localhost:3000/api/settings

# Use token in request
curl -b cookies.txt -H "X-CSRF-Token: <token>" \
  -X POST http://localhost:3000/api/settings
```

### 3. Test Input Validation
```bash
# Test XSS prevention
curl -X POST http://localhost:3000/api/capture \
  -H "Content-Type: application/json" \
  -d '{"mode":"photo","text":"<script>alert(1)</script>"}'
```

## Security Checklist

- [ ] HTTPS enabled in production
- [ ] All secrets are strong and unique
- [ ] Rate limiting configured
- [ ] CSRF protection enabled
- [ ] Input validation on all endpoints
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Database using SSL
- [ ] File uploads validated
- [ ] Error messages don't leak sensitive info
- [ ] Logging configured without sensitive data
- [ ] Regular security updates applied
- [ ] Penetration testing performed
- [ ] Security monitoring in place

## Incident Response

1. **Detection**: Monitor logs and alerts
2. **Containment**: Isolate affected systems
3. **Investigation**: Analyze logs and traces
4. **Remediation**: Apply fixes and patches
5. **Recovery**: Restore normal operations
6. **Post-Incident**: Document and improve

## Contact

For security issues, please contact: security@photobooth.local

**Do not** create public GitHub issues for security vulnerabilities.