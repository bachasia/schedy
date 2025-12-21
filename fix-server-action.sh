#!/bin/bash
# Fix Server Action Error Script
# Usage: ./fix-server-action.sh

echo "🔧 Fixing Server Action Error..."
echo ""

# Stop containers
echo "Stopping containers..."
docker-compose down

# Remove old build
echo "Removing old build cache..."
docker rmi schedy:latest 2>/dev/null || echo "  (No existing image to remove)"

# Rebuild without cache
echo "Rebuilding without cache..."
export DOCKER_BUILDKIT=1
docker-compose build --no-cache

if [ $? -eq 0 ]; then
    # Start containers
    echo "Starting containers..."
    docker-compose up -d
    
    echo ""
    echo "✅ Done! Check logs with:"
    echo "  docker-compose logs -f app"
else
    echo ""
    echo "❌ Build failed! Check errors above."
    exit 1
fi



