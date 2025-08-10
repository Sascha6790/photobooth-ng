# Changelog

All notable changes to the Photobooth-NG project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### ✨ Features
- Complete migration from PHP to NestJS + Angular
- WebSocket support for real-time updates
- Multiple camera strategy implementations (Webcam, DSLR, Raspberry Pi Camera, Mock)
- Advanced image processing with filters and effects
- Multi-language support (DE/EN)
- Docker containerization with multi-stage builds
- Hardware integration (GPIO, Buzzer)
- Print queue management
- Gallery with tagging and ratings
- Admin dashboard with comprehensive settings

### 🐛 Bug Fixes
- Camera permission handling improved
- Touch gesture support for mobile devices
- Admin panel routing issues resolved
- WebSocket error handling enhanced

### 🔒 Security
- HTTPS setup with Let's Encrypt
- Rate limiting implementation
- Security headers with Helmet.js
- CORS configuration
- Input validation and sanitization

### 👷 CI/CD
- GitHub Actions workflows for build and test
- E2E test pipeline with Playwright
- Docker build and push automation
- Deployment scripts for Raspberry Pi

### 📚 Documentation
- Comprehensive README
- API documentation
- Hardware setup guide
- Docker deployment guide
- CLAUDE.md for AI assistance

### 🧪 Tests
- Unit tests with Jest
- E2E tests with Playwright (95% pass rate)
- Mock strategies for development
- Multi-browser testing support

## [1.0.0] - TBD
- Initial release of the migrated Photobooth application
- Full feature parity with PHP version
- Production-ready for Raspberry Pi deployment

[Unreleased]: https://github.com/Sascha6790/photobooth-ng/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Sascha6790/photobooth-ng/releases/tag/v1.0.0