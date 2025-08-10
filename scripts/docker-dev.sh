#!/bin/bash

# Docker Development Helper Script
# Usage: ./scripts/docker-dev.sh [command]

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.dev.yml"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  up        - Start all development containers"
    echo "  down      - Stop all containers"
    echo "  restart   - Restart all containers"
    echo "  build     - Build all images"
    echo "  logs      - Show logs from all containers"
    echo "  logs-f    - Follow logs from all containers"
    echo "  ps        - Show container status"
    echo "  shell     - Open shell in backend container"
    echo "  db        - Open PostgreSQL shell"
    echo "  redis     - Open Redis CLI"
    echo "  clean     - Stop containers and remove volumes"
    echo "  reset     - Complete reset (clean + rebuild)"
    echo "  test      - Run tests in containers"
    echo "  migrate   - Run database migrations"
    echo "  seed      - Seed database with test data"
    echo ""
}

case "$1" in
    up)
        echo -e "${GREEN}Starting development environment...${NC}"
        docker compose -f $COMPOSE_FILE up -d
        echo -e "${GREEN}Development environment started!${NC}"
        echo ""
        echo "Services available at:"
        echo "  - Frontend:        http://localhost:4200"
        echo "  - Backend API:     http://localhost:3000"
        echo "  - Adminer:         http://localhost:8080"
        echo "  - MailHog:         http://localhost:8025"
        echo "  - Redis Commander: http://localhost:8081"
        ;;
    
    down)
        echo -e "${YELLOW}Stopping development environment...${NC}"
        docker compose -f $COMPOSE_FILE down
        echo -e "${GREEN}Development environment stopped!${NC}"
        ;;
    
    restart)
        echo -e "${YELLOW}Restarting development environment...${NC}"
        docker compose -f $COMPOSE_FILE restart
        echo -e "${GREEN}Development environment restarted!${NC}"
        ;;
    
    build)
        echo -e "${GREEN}Building development images...${NC}"
        docker compose -f $COMPOSE_FILE build --no-cache
        echo -e "${GREEN}Build complete!${NC}"
        ;;
    
    logs)
        docker compose -f $COMPOSE_FILE logs
        ;;
    
    logs-f)
        docker compose -f $COMPOSE_FILE logs -f
        ;;
    
    ps)
        docker compose -f $COMPOSE_FILE ps
        ;;
    
    shell)
        echo -e "${GREEN}Opening shell in backend container...${NC}"
        docker compose -f $COMPOSE_FILE exec backend /bin/sh
        ;;
    
    db)
        echo -e "${GREEN}Opening PostgreSQL shell...${NC}"
        docker compose -f $COMPOSE_FILE exec postgres psql -U developer photobooth_dev
        ;;
    
    redis)
        echo -e "${GREEN}Opening Redis CLI...${NC}"
        docker compose -f $COMPOSE_FILE exec redis redis-cli
        ;;
    
    clean)
        echo -e "${RED}Cleaning development environment...${NC}"
        docker compose -f $COMPOSE_FILE down -v
        echo -e "${GREEN}Clean complete!${NC}"
        ;;
    
    reset)
        echo -e "${RED}Resetting development environment...${NC}"
        docker compose -f $COMPOSE_FILE down -v
        docker compose -f $COMPOSE_FILE build --no-cache
        docker compose -f $COMPOSE_FILE up -d
        echo -e "${GREEN}Reset complete!${NC}"
        ;;
    
    test)
        echo -e "${GREEN}Running tests...${NC}"
        docker compose -f $COMPOSE_FILE exec backend npm run test:backend
        docker compose -f $COMPOSE_FILE exec frontend npm run test:frontend
        echo -e "${GREEN}Tests complete!${NC}"
        ;;
    
    migrate)
        echo -e "${GREEN}Running database migrations...${NC}"
        docker compose -f $COMPOSE_FILE exec backend npm run migration:run
        echo -e "${GREEN}Migrations complete!${NC}"
        ;;
    
    seed)
        echo -e "${GREEN}Seeding database...${NC}"
        docker compose -f $COMPOSE_FILE exec backend npm run seed
        echo -e "${GREEN}Database seeded!${NC}"
        ;;
    
    *)
        print_help
        ;;
esac