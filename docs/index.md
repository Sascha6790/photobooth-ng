---
layout: default
title: Photobooth Documentation
---

# Photobooth Documentation

Welcome to the Photobooth documentation! This modern photobooth application is built with **NestJS** (backend) and **Angular** (frontend), designed to run on various platforms including Raspberry Pi.

## Features

- 📸 **Multiple Camera Support**: DSLR, Webcam, Raspberry Pi Camera
- 🎨 **Real-time Effects**: Filters, Chromakeying, Collages
- 🖨️ **Print Management**: Queue system with multiple printer support
- 🌐 **Multi-user Sessions**: Collaborative photobooth experience
- 📱 **Responsive Design**: Works on tablets, phones, and desktop
- 🔌 **Hardware Integration**: GPIO support for buttons and buzzers
- 🚀 **Docker Support**: Easy deployment with containerization
- 📊 **Admin Dashboard**: Full configuration and monitoring

## Quick Links

### Getting Started
- [Installation Guide](guides/getting-started)
- [Quick Setup](guides/quick-setup)
- [First Run](guides/first-run)

### API Documentation
- [Backend API Reference](api/)
- [WebSocket Events](api/#websocket-events)
- [REST Endpoints](api/#rest-endpoints)

### Hardware Setup
- [Raspberry Pi Setup](hardware/raspberry-pi)
- [Camera Configuration](hardware/cameras)
- [Printer Setup](hardware/printers)
- [GPIO & Buttons](hardware/gpio)

### Configuration
- [Application Settings](setup/configuration)
- [Environment Variables](setup/environment)
- [Database Setup](setup/database)

### Deployment
- [Production Deployment](setup/deployment)
- [Docker Deployment](setup/docker)
- [Security Best Practices](setup/security)

## System Requirements

### Minimum Requirements
- Node.js 18.x or higher
- 2GB RAM
- 10GB disk space
- Linux, macOS, or Windows (with WSL)

### Recommended for Production
- Raspberry Pi 4 (4GB or 8GB RAM)
- Node.js 20.x
- PostgreSQL 14+
- Redis 6+
- 32GB+ SD card (Class 10 or better)

## Technology Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeORM** - Database ORM
- **Socket.IO** - Real-time communication
- **Sharp** - Image processing
- **Bull** - Queue management

### Frontend
- **Angular 18** - Frontend framework
- **Angular Material** - UI components
- **RxJS** - Reactive programming
- **NgRx** - State management
- **Socket.IO Client** - WebSocket client

### Infrastructure
- **Docker** - Containerization
- **PostgreSQL/SQLite** - Database
- **Redis** - Caching and queues
- **Nginx** - Reverse proxy
- **PM2** - Process management

## Support & Contributing

- **GitHub Repository**: [photobooth-ng](https://github.com/yourusername/photobooth-ng)
- **Issues**: [Report bugs or request features](https://github.com/yourusername/photobooth-ng/issues)
- **Discussions**: [Community forum](https://github.com/yourusername/photobooth-ng/discussions)

## License

This project is licensed under the MIT License.

---

*Last updated: {{ site.time | date: '%B %d, %Y' }}*