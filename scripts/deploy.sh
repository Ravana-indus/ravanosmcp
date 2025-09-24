#!/bin/bash

# ERPNext MCP Server Deployment Script
# This script automates the deployment process for production environments

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root"
fi

# Configuration
ENVIRONMENT="${1:-production}"
CONFIG_FILE=".env.${ENVIRONMENT}"
PROJECT_ROOT=$(pwd)
BUILD_DIR="$PROJECT_ROOT/dist"
LOG_DIR="$PROJECT_ROOT/logs"
BACKUP_DIR="$PROJECT_ROOT/backups"

log "Starting ERPNext MCP Server deployment for environment: $ENVIRONMENT"

# Pre-deployment checks
log "Running pre-deployment checks..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    error "Node.js is not installed"
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [[ $NODE_VERSION -lt 18 ]]; then
    error "Node.js version 18 or higher is required. Current version: $(node -v)"
fi

log "Node.js version check passed: $(node -v)"

# Check npm version
if ! command -v npm &> /dev/null; then
    error "npm is not installed"
fi

log "npm version check passed: $(npm -v)"

# Check environment argument
if [ "$ENVIRONMENT" != "development" ] && [ "$ENVIRONMENT" != "production" ]; then
    error "Environment must be 'development' or 'production'"
fi

# Check if configuration file exists
if [ ! -f "$CONFIG_FILE" ]; then
    warn "Configuration file '$CONFIG_FILE' not found"
    if [ -f ".env.production.example" ]; then
        cp ".env.production.example" "$CONFIG_FILE"
        warn "Created $CONFIG_FILE from template. Please review and update."
    else
        error "Please create $CONFIG_FILE based on .env.production.example"
    fi
fi

# Validate required environment variables
log "Validating configuration..."
source "$CONFIG_FILE"

required_vars="ERPNEXT_URL ERPNEXT_API_KEY ERPNEXT_API_SECRET"
for var in $required_vars; do
    if [ -z "${!var}" ]; then
        error "Required environment variable $var is not set in $CONFIG_FILE"
    fi
done

log "✅ Configuration validated"

# Create necessary directories
log "Creating necessary directories..."
mkdir -p "$LOG_DIR"
mkdir -p "$BACKUP_DIR"
mkdir -p "$BUILD_DIR"

# Stop existing services
log "Stopping existing services..."
if command -v pm2 &> /dev/null; then
    pm2 stop erpnext-mcp-server || true
    pm2 delete erpnext-mcp-server || true
fi

if command -v docker-compose &> /dev/null; then
    docker-compose down --remove-orphans || true
fi

# Stop any running node processes
pkill -f "node.*dist/index.js" || true

# Install dependencies
log "Installing dependencies..."
npm ci --only=production

# Run tests
log "Running tests..."
npm test

if [[ $? -ne 0 ]]; then
    error "Tests failed. Aborting deployment."
fi

# Build the application
log "Building application..."
npm run build:prod

if [[ $? -ne 0 ]]; then
    error "Build failed. Aborting deployment."
fi

# Run linting
log "Running code linting..."
npm run lint

if [[ $? -ne 0 ]]; then
    warn "Linting issues found. Consider fixing them before production deployment."
fi

# Create backup if this is not the first deployment
if [[ -d "$BUILD_DIR" ]] && [[ $(ls -A "$BUILD_DIR") ]]; then
    log "Creating backup..."
    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_NAME="backup_$BACKUP_TIMESTAMP.tar.gz"
    tar -czf "$BACKUP_DIR/$BACKUP_NAME" -C "$PROJECT_ROOT" dist
    log "Backup created: $BACKUP_DIR/$BACKUP_NAME"
fi

# For production, use Docker deployment
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Starting Docker deployment..."

    # Copy environment file
    cp "$CONFIG_FILE" .env

    # Start services with Docker Compose
    docker-compose up -d

    # Wait for services to be ready
    echo "Waiting for services to be ready..."
    sleep 10

    # Health check
    for i in {1..30}; do
        if curl -f -s http://localhost:3000/health > /dev/null; then
            echo "✅ Services are healthy and ready"
            break
        fi

        if [ $i -eq 30 ]; then
            echo "❌ Health check failed after 30 attempts"
            echo "Checking logs:"
            docker-compose logs erpnext-mcp-server | tail -20
            exit 1
        fi

        echo "Waiting for health check... (attempt $i/30)"
        sleep 2
    done

    # Show service status
    echo "Service status:"
    docker-compose ps

else
    # Development deployment
    echo "Starting development server..."

    # Copy environment file
    cp "$CONFIG_FILE" .env

    # Start with PM2 or directly
    if command -v pm2 &> /dev/null; then
        pm2 stop erpnext-mcp-server || true
        pm2 start dist/index.js --name erpnext-mcp-server
        pm2 save
        echo "✅ Development server started with PM2"
    else
        echo "Starting server directly (for production, consider using PM2 or Docker)"
        nohup node dist/index.js > server.log 2>&1 &
        echo $! > server.pid
        echo "✅ Development server started (PID: $(cat server.pid))"
    fi

    # Simple health check
    sleep 5
    if curl -f -s http://localhost:3000/health > /dev/null; then
        echo "✅ Server is healthy and ready"
    else
        echo "⚠️ Health check failed - check logs"
    fi
fi

echo ""
echo "=== Deployment Complete ==="
echo "Environment: $ENVIRONMENT"
echo "Health Check: http://localhost:3000/health"
echo "Logs: docker-compose logs -f (Docker) or tail -f server.log (Direct)"
echo ""

if [ "$ENVIRONMENT" = "production" ]; then
    echo "Production deployment completed successfully! 🚀"
    echo ""
    echo "Next steps:"
    echo "1. Configure monitoring and alerting"
    echo "2. Set up log rotation"
    echo "3. Configure backup procedures"
    echo "4. Review security checklist"
else
    echo "Development deployment completed successfully! 🚀"
    echo ""
    echo "Next steps:"
    echo "1. Test MCP integration with your client"
    echo "2. Review logs for any issues"
    echo "3. Configure your IDE for debugging"
fi