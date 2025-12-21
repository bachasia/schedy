# Scripts

Utility scripts to help with development.

## Redis Management Scripts

### `start-redis.js`

Automatically detects your operating system and attempts to start Redis using the native package manager.

**Supported platforms:**
- Windows (WSL2)
- macOS (Homebrew)
- Linux (systemd/service)

**Usage:**
```bash
node scripts/start-redis.js
```

Or via npm:
```bash
npm run redis:check
```

### `start-redis-docker.js`

Starts Redis using Docker. This is the most reliable cross-platform method.

**Requirements:**
- Docker Desktop installed and running

**Features:**
- Creates a Redis container named `schedy-redis`
- Automatically restarts on system reboot
- Persists data between restarts
- Easy to remove: `docker rm -f schedy-redis`

**Usage:**
```bash
node scripts/start-redis-docker.js
```

Or via npm:
```bash
npm run redis:docker
```

## Development Scripts

These scripts are defined in `package.json`:

### `npm run dev`

Start Next.js development server only (port 3001).

**Note:** You need to start Redis separately.

### `npm run dev:redis`

Start Redis (native) and Next.js concurrently.

**What it does:**
1. Checks if Redis is running
2. Attempts to start Redis using native package manager
3. Starts Next.js dev server
4. Both run in parallel with colored output

**Recommended for:** macOS and Linux users with Redis installed via package manager

### `npm run dev:docker`

Start Redis (Docker) and Next.js concurrently.

**What it does:**
1. Starts or creates Redis Docker container
2. Waits for Redis to be ready
3. Starts Next.js dev server
4. Both run in parallel with colored output

**Recommended for:** All platforms, especially Windows users

### `npm run redis:stop`

Stop the Redis Docker container.

**Usage:**
```bash
npm run redis:stop
```

## Choosing the Right Command

### For First-Time Setup

**Option 1: Docker (Easiest - Recommended)**
```bash
npm run dev:docker
```

**Option 2: Native Redis**
```bash
# Install Redis first (see REDIS_SETUP.md)
npm run dev:redis
```

### For Regular Development

After initial setup, choose based on your preference:

```bash
# If you want auto-start
npm run dev:docker   # or npm run dev:redis

# If Redis is already running
npm run dev
```

## Troubleshooting

### "Docker is not installed"

Install Docker Desktop:
- Windows/Mac: https://www.docker.com/products/docker-desktop/
- Linux: https://docs.docker.com/engine/install/

### "Failed to start Redis via WSL2" (Windows)

Options:
1. Install Redis in WSL2: `wsl sudo apt install redis-server`
2. Use Docker instead: `npm run dev:docker`
3. See [REDIS_SETUP.md](../REDIS_SETUP.md)

### "Failed to start Redis via Homebrew" (macOS)

Options:
1. Install Redis: `brew install redis`
2. Use Docker instead: `npm run dev:docker`
3. See [REDIS_SETUP.md](../REDIS_SETUP.md)

### Scripts Permission Denied

Make scripts executable:
```bash
chmod +x scripts/*.js
```

### Redis Already Running

That's great! Just use:
```bash
npm run dev
```

## Manual Redis Management

If you prefer manual control:

### Start Redis
```bash
# Windows (WSL2)
wsl sudo service redis-server start

# macOS
brew services start redis

# Linux
sudo systemctl start redis-server

# Docker
docker start schedy-redis
# or create new:
docker run -d -p 6379:6379 --name schedy-redis redis:latest
```

### Stop Redis
```bash
# Windows (WSL2)
wsl sudo service redis-server stop

# macOS
brew services stop redis

# Linux
sudo systemctl stop redis-server

# Docker
docker stop schedy-redis
```

### Check Redis Status
```bash
redis-cli ping
# Should return: PONG
```

## Advanced

### Viewing Logs

**Next.js:**
Already visible in the terminal

**Redis (Docker):**
```bash
docker logs -f schedy-redis
```

**Redis (Native):**
```bash
# macOS
tail -f /opt/homebrew/var/log/redis.log

# Linux
sudo tail -f /var/log/redis/redis-server.log
```

### Custom Redis Configuration

Edit environment variables in `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password-here
REDIS_DB=0
```

## Need Help?

See [REDIS_SETUP.md](../REDIS_SETUP.md) for comprehensive Redis setup guide.







