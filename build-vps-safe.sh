#!/bin/bash
# Safe VPS build script - Prevents VPS shutdown due to OOM/disk full
# Usage: ./build-vps-safe.sh [options]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Default values
USE_CACHE=true
TAG="schedy:latest"
BUILD_MODE="safe"  # safe, fast, minimal

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-cache)
            USE_CACHE=false
            shift
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --mode)
            BUILD_MODE="$2"
            shift 2
            ;;
        --help)
            echo "Usage: ./build-vps-safe.sh [options]"
            echo ""
            echo "Options:"
            echo "  --no-cache    Build without using cache"
            echo "  --tag <tag>   Specify image tag (default: schedy:latest)"
            echo "  --mode <mode> Build mode: safe (default), fast, minimal"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🛡️  Safe VPS Build Script${NC}"
echo -e "${YELLOW}Mode: $BUILD_MODE${NC}"
echo ""

# Function to check available resources
check_resources() {
    echo -e "${BLUE}Checking system resources...${NC}"
    
    # Check disk space (need at least 5GB free)
    DISK_AVAIL=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$DISK_AVAIL" -lt 5 ]; then
        echo -e "${RED}❌ Insufficient disk space! Need at least 5GB free.${NC}"
        echo -e "${YELLOW}Current: ${DISK_AVAIL}GB${NC}"
        echo -e "${YELLOW}Cleaning up unused Docker resources (keeping running containers)...${NC}"
        # Only clean unused resources, not running containers or volumes
        docker container prune -f || true
        docker image prune -a -f || true
        docker builder prune -a -f || true
        DISK_AVAIL=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
        if [ "$DISK_AVAIL" -lt 5 ]; then
            echo -e "${RED}Still insufficient space. Please free up disk space manually.${NC}"
            echo -e "${YELLOW}Note: Script will NOT stop your running containers.${NC}"
            exit 1
        fi
    fi
    echo -e "${GREEN}✓ Disk space: ${DISK_AVAIL}GB available${NC}"
    
    # Check memory (need at least 1GB free)
    MEM_AVAIL=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [ "$MEM_AVAIL" -lt 1024 ]; then
        echo -e "${YELLOW}⚠ Low memory: ${MEM_AVAIL}MB available${NC}"
        echo -e "${YELLOW}Using minimal build mode...${NC}"
        BUILD_MODE="minimal"
    else
        echo -e "${GREEN}✓ Memory: ${MEM_AVAIL}MB available${NC}"
    fi
}

# Function to cleanup before build
cleanup_before_build() {
    echo -e "${BLUE}Cleaning up before build...${NC}"
    
    # Only stop schedy-related containers (if any are running)
    echo -e "${YELLOW}Stopping schedy containers only...${NC}"
    docker ps --filter "name=schedy" --format "{{.ID}}" | xargs -r docker stop || true
    
    # Remove stopped schedy containers
    docker ps -a --filter "name=schedy" --format "{{.ID}}" | xargs -r docker rm || true
    
    # Remove old schedy images (keep latest)
    echo -e "${YELLOW}Cleaning up old schedy images...${NC}"
    docker images --filter "reference=schedy*" --format "{{.ID}}" | tail -n +2 | xargs -r docker rmi || true
    
    # Remove stopped containers (only stopped, not running)
    echo -e "${YELLOW}Removing stopped containers...${NC}"
    docker container prune -f || true
    
    # Clean build cache (keep recent)
    echo -e "${YELLOW}Cleaning build cache...${NC}"
    docker builder prune -f --filter "until=24h" || true
    
    echo -e "${GREEN}✓ Cleanup completed (only schedy resources)${NC}"
}

# Function to set memory limits
set_memory_limits() {
    echo -e "${BLUE}Setting memory limits for build...${NC}"
    
    # Get available memory
    TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
    
    # Set build memory limit (use 50% of available, max 2GB)
    if [ "$TOTAL_MEM" -lt 2048 ]; then
        BUILD_MEM_LIMIT="512m"
        echo -e "${YELLOW}Low memory VPS detected. Using 512MB limit${NC}"
    elif [ "$TOTAL_MEM" -lt 4096 ]; then
        BUILD_MEM_LIMIT="1g"
        echo -e "${YELLOW}Medium memory VPS. Using 1GB limit${NC}"
    else
        BUILD_MEM_LIMIT="2g"
        echo -e "${GREEN}High memory VPS. Using 2GB limit${NC}"
    fi
    
    export DOCKER_BUILDKIT_MEMORY_LIMIT=$BUILD_MEM_LIMIT
    echo -e "${GREEN}✓ Memory limit set to ${BUILD_MEM_LIMIT}${NC}"
}

# Function to build in stages (safer for low memory)
build_staged() {
    echo -e "${BLUE}Building in stages (safer for low memory)...${NC}"
    
    export DOCKER_BUILDKIT=1
    export BUILDKIT_PROGRESS=plain
    
    # Stage 1: Dependencies
    echo -e "${YELLOW}Stage 1/4: Building dependencies...${NC}"
    docker build \
        --target deps \
        --tag schedy-deps:latest \
        . || {
        echo -e "${RED}❌ Stage 1 failed!${NC}"
        exit 1
    }
    
    # Stage 2: Prisma
    echo -e "${YELLOW}Stage 2/4: Generating Prisma client...${NC}"
    docker build \
        --target prisma-gen \
        --tag schedy-prisma:latest \
        . || {
        echo -e "${RED}❌ Stage 2 failed!${NC}"
        exit 1
    }
    
    # Stage 3: Builder (most memory intensive)
    echo -e "${YELLOW}Stage 3/4: Building application (this may take a while)...${NC}"
    # Set Node.js memory limit via environment
    export NODE_OPTIONS="--max-old-space-size=1024"
    docker build \
        --target builder \
        --tag schedy-builder:latest \
        --build-arg NODE_OPTIONS="--max-old-space-size=1024" \
        . || {
        echo -e "${RED}❌ Stage 3 failed!${NC}"
        exit 1
    }
    
    # Stage 4: Final image
    echo -e "${YELLOW}Stage 4/4: Creating final image...${NC}"
    docker build \
        --target runner \
        --tag "$TAG" \
        . || {
        echo -e "${RED}❌ Stage 4 failed!${NC}"
        exit 1
    }
    
    # Cleanup intermediate images
    docker rmi schedy-deps:latest schedy-prisma:latest schedy-builder:latest || true
}

# Function to build normally (faster but uses more memory)
build_normal() {
    echo -e "${BLUE}Building normally...${NC}"
    
    export DOCKER_BUILDKIT=1
    export BUILDKIT_PROGRESS=plain
    
    # Set Node.js memory limit
    export NODE_OPTIONS="--max-old-space-size=1024"
    
    BUILD_ARGS=(
        --tag "$TAG"
        --build-arg BUILDKIT_INLINE_CACHE=1
        --build-arg NODE_OPTIONS="--max-old-space-size=1024"
        --progress=plain
    )
    
    if [ "$USE_CACHE" = "true" ]; then
        BUILD_ARGS+=(--cache-from "$TAG")
    fi
    
    docker build "${BUILD_ARGS[@]}" . || {
        echo -e "${RED}❌ Build failed!${NC}"
        echo -e "${YELLOW}Trying staged build instead...${NC}"
        build_staged
    }
}

# Main build process
main() {
    # Check resources first
    check_resources
    
    # Cleanup before build
    cleanup_before_build
    
    # Set memory limits
    set_memory_limits
    
    # Build based on mode
    case "$BUILD_MODE" in
        minimal|safe)
            echo -e "${BLUE}Using safe staged build...${NC}"
            build_staged
            ;;
        fast)
            echo -e "${BLUE}Using fast build (requires more memory)...${NC}"
            build_normal
            ;;
        *)
            build_staged
            ;;
    esac
    
    # Final cleanup (only remove unused resources, not running containers)
    echo -e "${BLUE}Final cleanup (unused resources only)...${NC}"
    docker container prune -f || true  # Only stopped containers
    docker image prune -f || true     # Only dangling images
    
    echo ""
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Image: $TAG${NC}"
    echo -e "${BLUE}Size: $(docker images $TAG --format '{{.Size}}')${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Test: docker run -p 3100:3100 $TAG"
    echo "  2. Deploy: ./deploy.sh up"
}

# Run main function
main


