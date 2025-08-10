#!/bin/bash

# Docker Production Helper Script
# Usage: ./scripts/docker-prod.sh [command]

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.prod.yml"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  deploy    - Deploy production containers"
    echo "  update    - Pull latest images and redeploy"
    echo "  stop      - Stop production containers"
    echo "  start     - Start production containers"
    echo "  restart   - Restart production containers"
    echo "  status    - Show container status"
    echo "  logs      - Show logs (last 100 lines)"
    echo "  logs-f    - Follow logs"
    echo "  backup    - Create database backup"
    echo "  restore   - Restore database from backup"
    echo "  health    - Check health status of all services"
    echo "  scale     - Scale backend service"
    echo "  rollback  - Rollback to previous version"
    echo ""
}

check_env() {
    if [ ! -f ".env" ]; then
        echo -e "${RED}Error: .env file not found!${NC}"
        echo "Please create .env file with production configuration"
        exit 1
    fi
}

case "$1" in
    deploy)
        check_env
        echo -e "${GREEN}Deploying production environment...${NC}"
        
        # Load environment variables
        source .env
        
        # Pull latest images
        docker compose -f $COMPOSE_FILE pull
        
        # Deploy with rolling update
        docker compose -f $COMPOSE_FILE up -d --remove-orphans
        
        echo -e "${GREEN}Production deployment complete!${NC}"
        echo ""
        echo "Services deployed:"
        docker compose -f $COMPOSE_FILE ps
        ;;
    
    update)
        check_env
        echo -e "${BLUE}Updating production environment...${NC}"
        
        # Backup before update
        $0 backup
        
        # Pull latest images
        docker compose -f $COMPOSE_FILE pull
        
        # Rolling update
        docker compose -f $COMPOSE_FILE up -d --no-deps --build backend
        sleep 10
        docker compose -f $COMPOSE_FILE up -d --no-deps --build frontend
        
        echo -e "${GREEN}Update complete!${NC}"
        ;;
    
    stop)
        echo -e "${YELLOW}Stopping production environment...${NC}"
        docker compose -f $COMPOSE_FILE stop
        echo -e "${GREEN}Production environment stopped!${NC}"
        ;;
    
    start)
        check_env
        echo -e "${GREEN}Starting production environment...${NC}"
        docker compose -f $COMPOSE_FILE start
        echo -e "${GREEN}Production environment started!${NC}"
        ;;
    
    restart)
        echo -e "${YELLOW}Restarting production environment...${NC}"
        docker compose -f $COMPOSE_FILE restart
        echo -e "${GREEN}Production environment restarted!${NC}"
        ;;
    
    status)
        docker compose -f $COMPOSE_FILE ps
        ;;
    
    logs)
        docker compose -f $COMPOSE_FILE logs --tail=100
        ;;
    
    logs-f)
        docker compose -f $COMPOSE_FILE logs -f --tail=50
        ;;
    
    backup)
        echo -e "${BLUE}Creating database backup...${NC}"
        
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="backup_${TIMESTAMP}.sql"
        
        # Create backup directory if it doesn't exist
        mkdir -p backups/postgres
        
        # Create backup
        docker compose -f $COMPOSE_FILE exec -T postgres pg_dump -U ${DB_USER:-photobooth} ${DB_NAME:-photobooth} > backups/postgres/$BACKUP_FILE
        
        # Compress backup
        gzip backups/postgres/$BACKUP_FILE
        
        echo -e "${GREEN}Backup created: backups/postgres/${BACKUP_FILE}.gz${NC}"
        
        # Clean old backups (keep last 7 days)
        find backups/postgres -name "backup_*.sql.gz" -mtime +7 -delete
        ;;
    
    restore)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Please specify backup file${NC}"
            echo "Usage: $0 restore <backup_file>"
            echo ""
            echo "Available backups:"
            ls -la backups/postgres/backup_*.sql.gz
            exit 1
        fi
        
        BACKUP_FILE=$2
        
        if [ ! -f "backups/postgres/$BACKUP_FILE" ]; then
            echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}Warning: This will restore database from $BACKUP_FILE${NC}"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Restoring database...${NC}"
            
            # Decompress if needed
            if [[ $BACKUP_FILE == *.gz ]]; then
                gunzip -c backups/postgres/$BACKUP_FILE | docker compose -f $COMPOSE_FILE exec -T postgres psql -U ${DB_USER:-photobooth} ${DB_NAME:-photobooth}
            else
                docker compose -f $COMPOSE_FILE exec -T postgres psql -U ${DB_USER:-photobooth} ${DB_NAME:-photobooth} < backups/postgres/$BACKUP_FILE
            fi
            
            echo -e "${GREEN}Database restored!${NC}"
        fi
        ;;
    
    health)
        echo -e "${BLUE}Checking health status...${NC}"
        echo ""
        
        # Check each service
        for service in postgres redis backend frontend; do
            STATUS=$(docker compose -f $COMPOSE_FILE ps $service | grep $service | awk '{print $4}')
            if [[ $STATUS == *"healthy"* ]] || [[ $STATUS == *"Up"* ]]; then
                echo -e "  $service: ${GREEN}✓ Healthy${NC}"
            else
                echo -e "  $service: ${RED}✗ Unhealthy${NC}"
            fi
        done
        
        echo ""
        echo "Detailed status:"
        docker compose -f $COMPOSE_FILE ps
        ;;
    
    scale)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Please specify number of instances${NC}"
            echo "Usage: $0 scale <number>"
            exit 1
        fi
        
        echo -e "${BLUE}Scaling backend to $2 instances...${NC}"
        docker compose -f $COMPOSE_FILE up -d --scale backend=$2 --no-recreate
        echo -e "${GREEN}Scaling complete!${NC}"
        ;;
    
    rollback)
        echo -e "${YELLOW}Rolling back to previous version...${NC}"
        
        # This assumes you tag your images with versions
        # You would need to implement proper versioning strategy
        
        echo -e "${RED}Rollback not implemented yet${NC}"
        echo "To rollback manually:"
        echo "  1. Update image tags in docker-compose.prod.yml"
        echo "  2. Run: $0 deploy"
        ;;
    
    *)
        print_help
        ;;
esac