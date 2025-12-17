# Docker Build Space Issue - Solutions

## Problem
Docker build fails with: `ENOSPC: no space left on device, write`

## Quick Fixes

### 1. Clean Up Docker Resources (Recommended First Step)

**Manually run these commands:**
```bash
# Check current disk usage
docker system df

# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes (be careful - this removes data!)
docker volume prune -f

# Remove build cache
docker builder prune -a -f

# Nuclear option - removes EVERYTHING unused (including volumes with data!)
docker system prune -a --volumes -f
```

**WSL/Linux:**
```bash
docker system prune -a --volumes -f
```

### 2. Increase Docker Disk Space (Docker Desktop)

1. Open **Docker Desktop**
2. Go to **Settings** → **Resources** → **Advanced**
3. Increase **Disk image size** (default is often 64GB)
4. Click **Apply & Restart**

### 3. Move Docker Data Location (Windows)

If your C: drive is full, move Docker data to another drive:

1. Open **Docker Desktop**
2. Go to **Settings** → **Resources** → **Advanced**
3. Change **Disk image location** to a drive with more space (e.g., `D:\Docker`)
4. Click **Apply & Restart**

### 4. Use Optimized Dockerfile

The Dockerfile has been optimized to:
- Clean npm cache after each step
- Remove temporary files
- Use `--no-audit` and `--prefer-offline` flags

Rebuild with:
```bash
docker build --no-cache -t schedy .
```

### 5. Build Without Cache

If you're rebuilding, skip cache to avoid accumulating layers:
```bash
docker build --no-cache -t schedy .
```

### 6. Build Locally Instead (Alternative)

If Docker continues to have issues, you can run the app locally:

```bash
# Install dependencies
npm install

# Setup environment
cp env.example .env
# Edit .env with your settings

# Setup database
npx prisma generate
npx prisma migrate dev

# Start Redis (required)
# Option 1: Docker
npm run redis:docker

# Option 2: Native Redis
npm run redis:check

# Start dev server
npm run dev
```

## Prevention

1. **Regular Cleanup**: Run `docker system prune` commands regularly
2. **Monitor Space**: Check `docker system df` regularly
3. **Remove Old Images**: Don't keep old image versions
4. **Use .dockerignore**: Already configured to exclude unnecessary files

## Check Current Space

```bash
docker system df
```

This shows:
- **Images**: Docker images
- **Containers**: Running/stopped containers
- **Local Volumes**: Data volumes
- **Build Cache**: Build cache (often the biggest culprit!)

## Still Having Issues?

1. **Check System Disk Space**:
   - Windows: Check C: drive space
   - WSL: `df -h` in WSL terminal

2. **Check Docker Desktop Settings**:
   - Ensure Docker has enough allocated disk space
   - Check if disk image location has space

3. **Use BuildKit** (faster, more efficient):
   ```bash
   $env:DOCKER_BUILDKIT=1
   docker build -t schedy .
   ```

4. **Build in Stages** (if full build fails):
   ```bash
   # Build dependencies only
   docker build --target deps -t schedy-deps .
   
   # Then build full image
   docker build -t schedy .
   ```

