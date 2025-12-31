#!/bin/bash
# Ultra-safe VPS build script with timeout and retry logic
# For VPS with 2GB RAM that keeps hanging during build
# Usage: ./build-vps-ultra-safe.sh [options]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Default values
TAG="schedy:latest"
MAX_RETRIES=3
STAGE_TIMEOUT=1800  # 30 minutes per stage

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --tag)
            TAG="$2"
            shift 2
            ;;
        --retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        --timeout)
            STAGE_TIMEOUT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: ./build-vps-ultra-safe.sh [options]"
            echo ""
            echo "Options:"
            echo "  --tag <tag>     Specify image tag (default: schedy:latest)"
            echo "  --retries <n>   Max retries per stage (default: 3)"
            echo "  --timeout <s>   Timeout per stage in seconds (default: 1800)"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🛡️  Ultra-Safe VPS Build Script${NC}"
echo -e "${YELLOW}Tag: $TAG${NC}"
echo -e "${YELLOW}Max Retries: $MAX_RETRIES${NC}"
echo -e "${YELLOW}Stage Timeout: ${STAGE_TIMEOUT}s${NC}"
echo ""

# Function to check swap
check_swap() {
    echo -e "${BLUE}Checking swap space...${NC}"
    SWAP_TOTAL=$(free -m | awk '/^Swap:/ {print $2}')
    if [ "$SWAP_TOTAL" -lt 1024 ]; then
        echo -e "${RED}❌ Warning: Swap space is less than 1GB!${NC}"
        echo -e "${YELLOW}Recommendation: Create at least 2GB swap${NC}"
        echo -e "${YELLOW}Run: sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile${NC}"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo -e "${GREEN}✓ Swap: ${SWAP_TOTAL}MB${NC}"
    fi
}

# Function to cleanup aggressively
aggressive_cleanup() {
    echo -e "${YELLOW}Performing aggressive cleanup...${NC}"
    docker system prune -a -f --volumes || true
    docker builder prune -a -f || true
    sync  # Flush filesystem buffers
    echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true  # Clear page cache
    echo -e "${GREEN}✓ Cleanup completed${NC}"
}

# Function to build with timeout
build_with_timeout() {
    local stage_name=$1
    local target=$2
    local tag=$3
    local build_args=("${@:4}")
    
    local attempt=1
    while [ $attempt -le $MAX_RETRIES ]; do
        echo -e "${YELLOW}Attempt $attempt/$MAX_RETRIES: $stage_name${NC}"
        
        # Cleanup before each attempt
        if [ $attempt -gt 1 ]; then
            echo -e "${YELLOW}Cleaning up before retry...${NC}"
            docker system prune -f || true
            sleep 5
        fi
        
        # Build with timeout
        if timeout $STAGE_TIMEOUT docker build \
            --target "$target" \
            --tag "$tag" \
            --build-arg NODE_OPTIONS="--max-old-space-size=256" \
            --progress=plain \
            "${build_args[@]}" \
            . 2>&1 | tee /tmp/build-${stage_name}-${attempt}.log; then
            echo -e "${GREEN}✓ $stage_name completed${NC}"
            return 0
        else
            local exit_code=${PIPESTATUS[0]}
            if [ $exit_code -eq 124 ]; then
                echo -e "${RED}❌ $stage_name timed out after ${STAGE_TIMEOUT}s${NC}"
            else
                echo -e "${RED}❌ $stage_name failed with exit code $exit_code${NC}"
            fi
            
            if [ $attempt -lt $MAX_RETRIES ]; then
                echo -e "${YELLOW}Retrying in 10 seconds...${NC}"
                sleep 10
            fi
            attempt=$((attempt + 1))
        fi
    done
    
    echo -e "${RED}❌ $stage_name failed after $MAX_RETRIES attempts${NC}"
    return 1
}

# Main build process
main() {
    # Check swap first
    check_swap
    
    # Aggressive cleanup before build
    aggressive_cleanup
    
    export DOCKER_BUILDKIT=1
    export BUILDKIT_PROGRESS=plain
    export NODE_OPTIONS="--max-old-space-size=256"
    
    # Stage 1: Dependencies
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}Stage 1/4: Building dependencies${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    if ! build_with_timeout "deps" "deps" "schedy-deps:latest"; then
        exit 1
    fi
    
    # Cleanup after deps
    docker system prune -f || true
    
    # Stage 2: Prisma
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}Stage 2/4: Generating Prisma client${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    if ! build_with_timeout "prisma" "prisma-gen" "schedy-prisma:latest"; then
        exit 1
    fi
    
    # Aggressive cleanup before builder (most memory intensive)
    echo ""
    echo -e "${YELLOW}⚠️  Preparing for builder stage (most memory intensive)...${NC}"
    aggressive_cleanup
    sleep 5
    
    # Stage 3: Builder
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}Stage 3/4: Building application${NC}"
    echo -e "${YELLOW}⚠️  This stage uses the most memory and may take 20-30 minutes${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    if ! build_with_timeout "builder" "builder" "schedy-builder:latest"; then
        echo -e "${RED}❌ Builder stage failed!${NC}"
        echo -e "${YELLOW}This usually means out of memory. Try:${NC}"
        echo -e "${YELLOW}  1. Increase swap to 4GB${NC}"
        echo -e "${YELLOW}  2. Free more memory: docker system prune -a -f${NC}"
        echo -e "${YELLOW}  3. Build on a machine with more RAM${NC}"
        exit 1
    fi
    
    # Aggressive cleanup after builder
    aggressive_cleanup
    sleep 5
    
    # Stage 4: Final image
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}Stage 4/4: Creating final image${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    if ! build_with_timeout "runner" "runner" "$TAG"; then
        exit 1
    fi
    
    # Cleanup intermediate images
    echo ""
    echo -e "${BLUE}Cleaning up intermediate images...${NC}"
    docker rmi schedy-deps:latest schedy-prisma:latest schedy-builder:latest 2>/dev/null || true
    
    # Final cleanup
    docker system prune -f || true
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
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

