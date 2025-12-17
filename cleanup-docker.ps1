# Docker Cleanup Script for Windows PowerShell
# This script helps free up Docker disk space

Write-Host "=== Docker Disk Space Cleanup ===" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is available
try {
    $dockerVersion = docker --version
    Write-Host "Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "Docker not found in PATH. Make sure Docker Desktop is running." -ForegroundColor Yellow
    Write-Host "You can also run these commands manually in Docker Desktop or WSL." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Current Docker disk usage:" -ForegroundColor Cyan
docker system df

Write-Host ""
Write-Host "Cleaning up unused Docker resources..." -ForegroundColor Cyan

# Remove stopped containers
Write-Host "Removing stopped containers..." -ForegroundColor Yellow
docker container prune -f

# Remove unused images
Write-Host "Removing unused images..." -ForegroundColor Yellow
docker image prune -a -f

# Remove unused volumes
Write-Host "Removing unused volumes..." -ForegroundColor Yellow
docker volume prune -f

# Remove build cache
Write-Host "Removing build cache..." -ForegroundColor Yellow
docker builder prune -a -f

Write-Host ""
Write-Host "=== Cleanup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Updated Docker disk usage:" -ForegroundColor Cyan
docker system df

Write-Host ""
Write-Host "If you still have space issues, try:" -ForegroundColor Yellow
Write-Host "  docker system prune -a --volumes -f" -ForegroundColor White
Write-Host "  (WARNING: This removes ALL unused resources including volumes with data!)" -ForegroundColor Red

