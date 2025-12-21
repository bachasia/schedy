#!/bin/bash
# Fast Docker build script with BuildKit optimizations
# Usage: ./build-fast.sh [tag]

set -e

TAG=${1:-schedy:latest}

echo "🚀 Building Docker image with BuildKit optimizations..."
echo "Tag: $TAG"
echo ""

# Enable BuildKit for faster builds and better caching
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

# Build with cache mounts and parallel builds
docker build \
  --tag "$TAG" \
  --cache-from "$TAG" \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --progress=plain \
  .

echo ""
echo "✅ Build complete: $TAG"
echo ""
echo "To run the container:"
echo "  docker run -p 3100:3100 $TAG"




