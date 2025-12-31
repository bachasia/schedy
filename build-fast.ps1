# Fast Docker build script with BuildKit optimizations for Windows PowerShell
# Usage: .\build-fast.ps1 [tag]

param(
    [string]$Tag = "schedy:latest"
)

Write-Host "🚀 Building Docker image with BuildKit optimizations..." -ForegroundColor Cyan
Write-Host "Tag: $Tag" -ForegroundColor Yellow
Write-Host ""

# Enable BuildKit for faster builds and better caching
$env:DOCKER_BUILDKIT = "1"
$env:BUILDKIT_PROGRESS = "plain"

# Build with cache mounts and parallel builds
# Set NODE_OPTIONS to 512MB for VPS with 4GB RAM (can be reduced if needed)
docker build `
  --tag $Tag `
  --cache-from $Tag `
  --build-arg BUILDKIT_INLINE_CACHE=1 `
  --build-arg NODE_OPTIONS="--max-old-space-size=512" `
  --progress=plain `
  .

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build complete: $Tag" -ForegroundColor Green
    Write-Host ""
    Write-Host "To run the container:" -ForegroundColor Cyan
    Write-Host "  docker run -p 3100:3100 $Tag" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}






