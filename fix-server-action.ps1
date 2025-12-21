# Fix Server Action Error Script for Windows PowerShell
# Usage: .\fix-server-action.ps1

Write-Host "🔧 Fixing Server Action Error..." -ForegroundColor Cyan
Write-Host ""

# Stop containers
Write-Host "Stopping containers..." -ForegroundColor Yellow
docker-compose down

# Remove old build
Write-Host "Removing old build cache..." -ForegroundColor Yellow
docker rmi schedy:latest 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  (No existing image to remove)" -ForegroundColor Gray
}

# Rebuild without cache
Write-Host "Rebuilding without cache..." -ForegroundColor Yellow
$env:DOCKER_BUILDKIT = "1"
docker-compose build --no-cache

if ($LASTEXITCODE -eq 0) {
    # Start containers
    Write-Host "Starting containers..." -ForegroundColor Yellow
    docker-compose up -d
    
    Write-Host ""
    Write-Host "✅ Done! Check logs with:" -ForegroundColor Green
    Write-Host "  docker-compose logs -f app" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Build failed! Check errors above." -ForegroundColor Red
    exit 1
}



