#!/bin/bash
# Optimized VPS build script for Schedy
# Usage: ./build-vps.sh [options]
# Options: --no-cache, --pull, --tag <tag>
# 
# WARNING: This script may cause OOM on low-memory VPS (< 2GB RAM)
# For VPS with < 2GB RAM, use build-vps-safe.sh instead

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
USE_CACHE=true
PULL_LATEST=false
TAG="schedy:latest"
BUILDKIT_ENABLED=true

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-cache)
            USE_CACHE=false
            shift
            ;;
        --pull)
            PULL_LATEST=true
            shift
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --help)
            echo "Usage: ./build-vps.sh [options]"
            echo ""
            echo "Options:"
            echo "  --no-cache    Build without using cache"
            echo "  --pull        Pull latest base images before building"
            echo "  --tag <tag>   Specify image tag (default: schedy:latest)"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🚀 Building Schedy for VPS...${NC}"
echo -e "${YELLOW}Tag: $TAG${NC}"
echo -e "${YELLOW}Cache: $USE_CACHE${NC}"
echo ""

# Enable BuildKit
if [ "$BUILDKIT_ENABLED" = "true" ]; then
    export DOCKER_BUILDKIT=1
    export BUILDKIT_PROGRESS=plain
    echo -e "${GREEN}✓ BuildKit enabled${NC}"
fi

# Pull latest base images if requested
if [ "$PULL_LATEST" = "true" ]; then
    echo -e "${BLUE}Pulling latest base images...${NC}"
    docker pull node:20-alpine || true
    docker pull redis:7-alpine || true
    docker pull nginx:alpine || true
fi

# Clean up old build cache if needed
if [ "$USE_CACHE" = "false" ]; then
    echo -e "${YELLOW}Cleaning build cache...${NC}"
    docker builder prune -f || true
fi

# Build arguments
# Set NODE_OPTIONS to 384MB for VPS with 2GB RAM to prevent hanging
BUILD_ARGS=(
    --tag "$TAG"
    --build-arg BUILDKIT_INLINE_CACHE=1
    --build-arg NODE_OPTIONS="--max-old-space-size=384"
    --progress=plain
)

if [ "$USE_CACHE" = "true" ]; then
    BUILD_ARGS+=(--cache-from "$TAG")
fi

# Build the image
echo -e "${BLUE}Building Docker image...${NC}"
if docker build "${BUILD_ARGS[@]}" .; then
    echo ""
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Image: $TAG${NC}"
    echo -e "${BLUE}Size: $(docker images $TAG --format '{{.Size}}')${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Test the image: docker run -p 3100:3100 $TAG"
    echo "  2. Deploy with: ./deploy.sh up"
    echo "  3. Or use docker-compose: docker-compose up -d"
else
    echo ""
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi


