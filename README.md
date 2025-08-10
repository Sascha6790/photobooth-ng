# Photobooth - Modern Event Photography Platform

[![Build Status](https://github.com/Sascha6790/photobooth-ng/workflows/build/badge.svg)](https://github.com/Sascha6790/photobooth-ng/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A professional, feature-rich photobooth application built with modern web technologies. Perfect for events, weddings, parties, and exhibitions.

## 🎯 Features

- **📸 Multiple Camera Support**: DSLR (gphoto2), Webcam, Raspberry Pi Camera
- **🎨 Real-time Filters & Effects**: Apply filters, frames, and chromakey backgrounds
- **🖼️ Gallery Mode**: Beautiful gallery with tagging, ratings, and slideshow
- **🖨️ Print Queue Management**: Direct printing with queue management
- **📱 Multi-Device Support**: Responsive design for tablets and smartphones
- **🌐 Multi-Language**: German and English support
- **⚡ Real-time Updates**: WebSocket-based live updates
- **🎮 Hardware Integration**: GPIO support for physical buttons and buzzers
- **🔒 Admin Dashboard**: Comprehensive settings management
- **🐳 Docker Support**: Easy deployment with Docker containers

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Optional: Docker & Docker Compose

### Installation

```bash
# Clone the repository
git clone https://github.com/Sascha6790/photobooth-ng.git
cd photobooth-ng

# Install dependencies
npm install

# Start development servers
npm run dev
```

### Using Management Scripts

For better control and monitoring, use our management scripts:

```bash
# Backend (Port 3000)
./scripts/backend-start.sh    # Start backend
./scripts/backend-stop.sh     # Stop backend
./scripts/backend-monitor.sh  # Monitor backend

# Frontend (Port 4200)
./scripts/frontend-start.sh   # Start frontend
./scripts/frontend-stop.sh    # Stop frontend

# API Testing
./scripts/api-test.sh         # Test all API endpoints
```

### Docker Deployment

```bash
# Development
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## 📁 Project Structure

```
photobooth-ng/
├── apps/
│   ├── backend/         # NestJS backend application
│   └── frontend/        # Angular frontend application
├── libs/                # Shared libraries
├── scripts/             # Management and deployment scripts
├── docs/                # Documentation
└── docker/              # Docker configurations
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DB_TYPE=sqlite
DB_DATABASE=./data/photobooth.db

# Camera
CAMERA_MODE=webcam  # Options: webcam, gphoto2, raspistill, mock

# Server
PORT=3000
FRONTEND_PORT=4200
```

### Camera Configuration

The application supports multiple camera types:

- **Webcam**: USB webcams (automatic detection)
- **DSLR**: Canon/Nikon via gphoto2
- **Raspberry Pi Camera**: Using raspistill
- **Mock**: Development mode with test images

## 🎨 Features in Detail

### Photo Modes
- Single photo capture
- Photo series (2x2, 3x3 grid)
- Collage mode with templates
- Video recording
- GIF animation

### Image Processing
- Real-time filters (B&W, Sepia, Vintage, etc.)
- Custom frames and overlays
- Green screen (chromakey) support
- Text and sticker overlays
- QR code generation for sharing

### Gallery Features
- Thumbnail generation
- Tag system
- Rating system
- Slideshow mode
- Export options

## 🔨 Development

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run e2e

# Test coverage
npm run test:cov
```

### Building for Production

```bash
# Build all applications
npm run build

# Build specific app
npx nx build backend
npx nx build frontend
```

## 📦 Deployment

### Raspberry Pi

For Raspberry Pi deployment, see [Hardware Setup Guide](docs/HARDWARE_SETUP.md).

```bash
# Quick setup
./scripts/install-raspberry-pi.sh

# Deploy updates
./scripts/deploy-raspberry-pi.sh
```

### HTTPS Setup

```bash
# Configure Let's Encrypt
./scripts/setup-https.sh
```

## 📚 Documentation

- [User Manual](docs/USER_MANUAL.md)
- [Admin Guide](docs/ADMIN_GUIDE.md)
- [API Documentation](docs/api/)
- [Hardware Setup](docs/HARDWARE_SETUP.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/) and [Angular](https://angular.io/)
- Powered by [Nx](https://nx.dev/) workspace
- Camera integration via [gphoto2](http://gphoto.org/)
- Image processing with [Sharp](https://sharp.pixelplumbing.com/)

## 📧 Contact

Project Link: [https://github.com/Sascha6790/photobooth-ng](https://github.com/Sascha6790/photobooth-ng)

---

Made with ❤️ for events and celebrations