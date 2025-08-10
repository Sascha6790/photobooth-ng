# Photobooth Docker Setup

Complete Docker infrastructure for the Photobooth application with development, testing, and production environments.

## 📋 Overview

This Docker setup provides:
- **Multi-stage builds** for optimized images
- **Development environment** with hot-reload
- **Production environment** with security hardening
- **CI/CD pipeline** with GitHub Actions
- **Automated backups** and health checks
- **PostgreSQL database** with persistent storage
- **Redis caching** for performance
- **Nginx** for frontend serving and API proxy

## 🚀 Quick Start

### Development Environment

1. **Clone and setup:**
```bash
git clone <repository>
cd photobooth-ng
cp .env.example .env
```

2. **Start development environment:**
```bash
./scripts/docker-dev.sh up
```

3. **Access services:**
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000
- Adminer: http://localhost:8080
- MailHog: http://localhost:8025
- Redis Commander: http://localhost:8081

### Production Environment

1. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with production values
```

2. **Deploy production:**
```bash
./scripts/docker-prod.sh deploy
```

3. **Access application:**
- Frontend: http://localhost (or configured domain)
- Backend API: http://localhost:3000/api

## 📁 Project Structure

```
photobooth-ng/
├── docker-compose.yml           # Base configuration
├── docker-compose.dev.yml       # Development overrides
├── docker-compose.prod.yml      # Production configuration
├── docker-compose.test.yml      # Testing environment
├── backend.Dockerfile           # Backend multi-stage build
├── backend.dev.Dockerfile       # Backend development image
├── frontend.Dockerfile          # Frontend production build
├── frontend.dev.Dockerfile      # Frontend development image
├── .dockerignore               # Docker build exclusions
├── .env.example                # Environment template
├── scripts/
│   ├── docker-dev.sh          # Development helper
│   ├── docker-prod.sh         # Production helper
│   └── backup.sh              # Backup script
└── .github/
    └── workflows/
        └── docker-build.yml    # CI/CD pipeline
```

## 🛠️ Available Commands

### Development Commands

```bash
# Start development environment
./scripts/docker-dev.sh up

# Stop environment
./scripts/docker-dev.sh down

# View logs
./scripts/docker-dev.sh logs-f

# Open backend shell
./scripts/docker-dev.sh shell

# Open database shell
./scripts/docker-dev.sh db

# Run tests
./scripts/docker-dev.sh test

# Reset environment
./scripts/docker-dev.sh reset
```

### Production Commands

```bash
# Deploy production
./scripts/docker-prod.sh deploy

# Update to latest version
./scripts/docker-prod.sh update

# Check health status
./scripts/docker-prod.sh health

# Create backup
./scripts/docker-prod.sh backup

# Restore from backup
./scripts/docker-prod.sh restore backup_20250808_120000.sql.gz

# Scale backend instances
./scripts/docker-prod.sh scale 3
```

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for full list):

```bash
# Database
DATABASE_NAME=photobooth
DATABASE_USER=photobooth
DATABASE_PASSWORD=secure_password

# Redis
REDIS_PASSWORD=redis_password

# JWT
JWT_SECRET=your_jwt_secret

# Hardware
HARDWARE_MOCK=false
GPIO_ENABLED=true
CAMERA_TYPE=gphoto2

# Backup
BACKUP_KEEP_DAYS=7
```

### Volume Mappings

**Development:**
- Source code mounted for hot-reload
- Database data persisted
- Images and configs preserved

**Production:**
- Only data directories mounted
- Logs persisted
- Backup directory mounted

## 🏗️ Build Process

### Backend (Multi-stage)

1. **Dependencies stage:** Install production dependencies
2. **Builder stage:** Compile TypeScript
3. **Production stage:** Minimal runtime image

### Frontend (Multi-stage)

1. **Builder stage:** Build Angular application
2. **Production stage:** Nginx with static files

## 🔒 Security Features

- Non-root user execution
- Security headers in Nginx
- Rate limiting
- CORS configuration
- Secret management
- Network isolation
- Health checks
- Resource limits

## 🚦 CI/CD Pipeline

GitHub Actions workflow:

1. **Build:** Multi-platform images (amd64/arm64)
2. **Test:** Run integration tests
3. **Push:** Upload to GitHub Container Registry
4. **Deploy:** Staging (develop) / Production (tags)

## 📊 Monitoring

### Health Checks

All services include health checks:
- Backend: `/health` endpoint
- Frontend: Nginx status
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`

### Logs

- JSON formatted logs in production
- Log rotation configured
- Centralized log directory

## 🔄 Backup & Restore

### Automatic Backups

Production setup includes automated daily backups:
- PostgreSQL database dumps
- Compressed with gzip
- Retention policy (7 days default)
- Stored in `./backups/postgres/`

### Manual Backup/Restore

```bash
# Create backup
./scripts/docker-prod.sh backup

# List backups
ls -la backups/postgres/

# Restore specific backup
./scripts/docker-prod.sh restore backup_20250808_120000.sql.gz
```

## 🐛 Troubleshooting

### Common Issues

**1. Port conflicts:**
```bash
# Check port usage
lsof -i :3000
lsof -i :4200
```

**2. Permission issues:**
```bash
# Fix permissions
sudo chown -R $USER:$USER data/ logs/
```

**3. Database connection:**
```bash
# Check database status
docker compose -f docker-compose.dev.yml exec postgres pg_isready
```

**4. Memory issues:**
```bash
# Increase Docker memory limit
# Docker Desktop: Preferences > Resources > Memory
```

### Debug Mode

Enable debug logging:
```bash
# In .env file
LOG_LEVEL=debug
DEBUG=true
```

## 🚀 Deployment

### Raspberry Pi Deployment

1. **Install Docker:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

2. **Clone repository:**
```bash
git clone <repository>
cd photobooth-ng
```

3. **Configure for ARM:**
```bash
# Images support ARM64
# Hardware access enabled in docker-compose.prod.yml
```

4. **Deploy:**
```bash
./scripts/docker-prod.sh deploy
```

### Cloud Deployment

For cloud deployment (AWS/Azure/GCP):
1. Use container orchestration (ECS/AKS/GKE)
2. Configure managed database (RDS/Azure DB)
3. Use object storage for images (S3/Blob)
4. Set up CDN for frontend

## 📝 Development Workflow

### Hot Reload Setup

Development environment includes:
- Backend: Nodemon with TypeScript watch
- Frontend: Angular CLI with HMR
- Database: Immediate schema sync

### Adding Dependencies

```bash
# Backend
docker compose -f docker-compose.dev.yml exec backend npm install <package>

# Frontend
docker compose -f docker-compose.dev.yml exec frontend npm install <package>

# Rebuild after adding dependencies
docker compose -f docker-compose.dev.yml build
```

### Database Migrations

```bash
# Generate migration
docker compose -f docker-compose.dev.yml exec backend npm run migration:generate

# Run migrations
docker compose -f docker-compose.dev.yml exec backend npm run migration:run

# Revert migration
docker compose -f docker-compose.dev.yml exec backend npm run migration:revert
```

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test in Docker environment
4. Submit pull request
5. CI/CD runs automatically

## 📄 License

See main project LICENSE file.

## 🆘 Support

For issues or questions:
- Check [Troubleshooting](#-troubleshooting) section
- Review logs: `./scripts/docker-dev.sh logs`
- Open issue on GitHub
- Contact maintainers

---

**Agent 5 (Docker & Infrastructure) - Completed 08.08.2025**