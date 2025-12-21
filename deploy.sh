#!/bin/bash

# Deployment script for Schedy on VPS
# Usage: ./deploy.sh [command]
# Commands: build, up, down, restart, logs, migrate, backup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env.production exists
check_env() {
    if [ ! -f .env.production ]; then
        log_error ".env.production not found!"
        log_info "Copy env.production.example to .env.production and fill in your values"
        exit 1
    fi
}

# Build Docker images with BuildKit optimization
build() {
    USE_CACHE=${1:-true}
    SAFE_MODE=${2:-false}
    
    # Check available memory for safe mode
    if [ "$SAFE_MODE" = "auto" ]; then
        MEM_AVAIL=$(free -m | awk 'NR==2{printf "%.0f", $7}' 2>/dev/null || echo "2048")
        if [ "$MEM_AVAIL" -lt 1024 ]; then
            SAFE_MODE="true"
            log_warn "Low memory detected (${MEM_AVAIL}MB). Using safe build mode..."
        fi
    fi
    
    if [ "$SAFE_MODE" = "true" ]; then
        log_info "Using safe build mode (prevents OOM)..."
        if [ -f "./build-vps-safe.sh" ]; then
            chmod +x ./build-vps-safe.sh
            ./build-vps-safe.sh --mode safe
        else
            log_warn "build-vps-safe.sh not found. Using standard build..."
            build_standard "$USE_CACHE"
        fi
    else
        build_standard "$USE_CACHE"
    fi
    
    log_info "Build completed!"
}

# Standard build function
build_standard() {
    USE_CACHE=$1
    
    log_info "Building Docker images with BuildKit..."
    
    # Enable BuildKit for faster builds
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
    
    if [ "$USE_CACHE" = "false" ]; then
        log_warn "Building without cache..."
        docker-compose --env-file .env.production build --no-cache
    else
        log_info "Building with cache (faster rebuilds)..."
        docker-compose --env-file .env.production build
    fi
}

# Start services
up() {
    log_info "Starting services..."
    check_env
    
    # Load environment variables from .env.production for docker-compose
    # Docker Compose will also use env_file in docker-compose.yml
    export $(cat .env.production | grep -v '^#' | grep -v '^$' | xargs)
    
    # Use --env-file to explicitly load .env.production
    docker-compose --env-file .env.production up -d
    log_info "Services started!"
    log_info "Waiting for services to be healthy..."
    sleep 10
    
    # Run database migrations
    migrate
    
    log_info "Deployment complete!"
    log_info "Access your app at: $NEXTAUTH_URL"
}

# Stop services
down() {
    log_info "Stopping services..."
    docker-compose --env-file .env.production down
    log_info "Services stopped!"
}

# Restart services
restart() {
    log_info "Restarting services..."
    down
    up
}

# View logs
logs() {
    SERVICE=${1:-app}
    log_info "Showing logs for $SERVICE..."
    docker-compose --env-file .env.production logs -f $SERVICE
}

# Run database migrations
migrate() {
    log_info "Running database migrations..."
    # Fix permissions first, then run migrations as root to ensure write access
    # Use Prisma CLI directly (installed globally in Dockerfile as 6.3.1)
    docker-compose --env-file .env.production exec -u root app sh -c "chown -R nextjs:nodejs /app/prisma && chmod -R 755 /app/prisma" || true
    docker-compose --env-file .env.production exec app prisma migrate deploy
    log_info "Migrations completed!"
}

# Backup database
backup() {
    BACKUP_DIR="./backups"
    mkdir -p $BACKUP_DIR
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/schedy_backup_$TIMESTAMP.db"
    
    log_info "Creating database backup..."
    docker cp schedy-app:/app/prisma/dev.db $BACKUP_FILE
    
    log_info "Backup created: $BACKUP_FILE"
}

# Restore database
restore() {
    if [ -z "$1" ]; then
        log_error "Usage: ./deploy.sh restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$1" ]; then
        log_error "Backup file not found: $1"
        exit 1
    fi
    
    log_warn "This will replace the current database!"
    read -p "Are you sure? (yes/no) " -n 3 -r
    echo
    
    if [[ $REPLY =~ ^yes$ ]]; then
        log_info "Restoring database from $1..."
        docker cp $1 schedy-app:/app/prisma/dev.db
        log_info "Database restored!"
        restart
    else
        log_info "Restore cancelled"
    fi
}

# Health check
health() {
    log_info "Checking service health..."
    
    echo ""
    log_info "Docker containers:"
    docker-compose --env-file .env.production ps
    
    echo ""
    log_info "Redis:"
    docker-compose --env-file .env.production exec redis redis-cli ping || log_error "Redis not responding"
    
    echo ""
    log_info "Application:"
    curl -f http://localhost:3100/api/health || log_error "App not responding"
    
    echo ""
    log_info "Health check complete!"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    DOMAIN=$1
    EMAIL=$2
    
    if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
        log_error "Usage: ./deploy.sh setup-ssl <domain> <email>"
        exit 1
    fi
    
    log_info "Setting up SSL for $DOMAIN..."
    
    # Install certbot if not exists
    if ! command -v certbot &> /dev/null; then
        log_info "Installing certbot..."
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Obtain certificate
    certbot certonly --webroot \
        -w ./certbot/www \
        -d $DOMAIN \
        -d www.$DOMAIN \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email
    
    log_info "SSL certificate obtained!"
    log_info "Note: SSL setup complete. Configure your reverse proxy or load balancer to use the certificate."
}

# Main script
case "$1" in
    build)
        build ${2:-true} ${3:-auto}
        ;;
    build-no-cache)
        build false auto
        ;;
    build-safe)
        build true true
        ;;
    up)
        up
        ;;
    down)
        down
        ;;
    restart)
        restart
        ;;
    logs)
        logs $2
        ;;
    migrate)
        migrate
        ;;
    backup)
        backup
        ;;
    restore)
        restore $2
        ;;
    health)
        health
        ;;
    setup-ssl)
        setup_ssl $2 $3
        ;;
    *)
        echo "Schedy Deployment Script"
        echo ""
        echo "Usage: ./deploy.sh [command]"
        echo ""
        echo "Commands:"
        echo "  build [cache] [safe]  Build Docker images (with cache by default)"
        echo "  build-no-cache         Build Docker images without cache"
        echo "  build-safe             Build using safe mode (prevents OOM on low-memory VPS)"
        echo "  up                     Start all services"
        echo "  down               Stop all services"
        echo "  restart            Restart all services"
        echo "  logs [service]     View logs (default: app)"
        echo "  migrate            Run database migrations"
        echo "  backup             Backup database"
        echo "  restore <file>     Restore database from backup"
        echo "  health             Check service health"
        echo "  setup-ssl <domain> <email>  Setup SSL certificate"
        echo ""
        echo "Examples:"
        echo "  ./deploy.sh build"
        echo "  ./deploy.sh up"
        echo "  ./deploy.sh logs redis"
        echo "  ./deploy.sh backup"
        echo "  ./deploy.sh setup-ssl example.com admin@example.com"
        ;;
esac







