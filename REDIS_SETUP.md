# Redis Setup Guide

Redis is required for the queue management system in Schedy. Follow this guide to install and run Redis on your system.

## Why Redis?

Schedy uses **Bull Queue** which requires Redis to:
- Schedule posts for future publishing
- Process background jobs
- Retry failed posts
- Manage queue statistics

## Installation

### Windows

#### Option 1: Using WSL2 (Recommended)

1. Install WSL2 if not already installed:
```powershell
wsl --install
```

2. Install Redis in WSL2:
```bash
sudo apt update
sudo apt install redis-server
```

3. Start Redis:
```bash
sudo service redis-server start
```

4. Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

#### Option 2: Using Docker

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)

2. Run Redis container:
```powershell
docker run -d -p 6379:6379 --name schedy-redis redis:latest
```

3. Verify Redis is running:
```powershell
docker exec -it schedy-redis redis-cli ping
# Should return: PONG
```

### macOS

#### Using Homebrew

1. Install Redis:
```bash
brew install redis
```

2. Start Redis:
```bash
brew services start redis
```

3. Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### Linux

#### Ubuntu/Debian

1. Install Redis:
```bash
sudo apt update
sudo apt install redis-server
```

2. Start Redis:
```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

3. Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

## Configuration

### Environment Variables

Update your `.env` file with Redis configuration:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Custom Redis Configuration

If you're using a remote Redis instance or custom port:

```env
# Example: Redis Cloud or hosted Redis
REDIS_HOST=redis-12345.cloud.provider.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_DB=0
```

## Troubleshooting

### Error: "Queue operation timed out"

**Symptom:** When creating or scheduling posts, you see:
- "Confirming..." message stuck
- Error: "Queue operation timed out. Please ensure Redis is running"

**Solution:**

1. Check if Redis is running:
```bash
# Windows (WSL2)
sudo service redis-server status

# macOS
brew services info redis

# Linux
sudo systemctl status redis-server

# Docker
docker ps | grep redis
```

2. If Redis is not running, start it:
```bash
# Windows (WSL2)
sudo service redis-server start

# macOS
brew services start redis

# Linux
sudo systemctl start redis-server

# Docker
docker start schedy-redis
```

3. Test connection:
```bash
redis-cli ping
```

4. Check firewall settings:
- Ensure port 6379 is not blocked
- If using WSL2, check Windows Firewall

### Posts Created but Not Queued

**Symptom:** Posts are saved as "DRAFT" with error message about queue.

**What Happened:**
- Your posts were successfully saved to the database
- Queue system couldn't connect to Redis
- Posts were automatically set to DRAFT status

**Solution:**

1. Start Redis (see above)

2. Go to the Posts page

3. Click "Edit" on the draft post

4. Click "Publish" or "Schedule" again

The post will now be properly queued for publishing!

### Check Redis Connection from Node.js

Create a test script `test-redis.js`:

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
});

redis.ping()
  .then(() => {
    console.log('✅ Redis connected successfully!');
    redis.disconnect();
  })
  .catch((err) => {
    console.error('❌ Redis connection failed:', err.message);
    process.exit(1);
  });
```

Run it:
```bash
node test-redis.js
```

## Redis GUI Tools

For easier Redis management, consider using:

### RedisInsight (Recommended)
- Free official tool from Redis
- Download: https://redis.io/insight/
- Features: Visual browser, CLI, profiler

### Redis Commander
```bash
npm install -g redis-commander
redis-commander
```
Open http://localhost:8081

## Production Deployment

For production, consider using managed Redis services:

### Redis Cloud
- Free tier available
- Automatic backups
- https://redis.io/cloud/

### AWS ElastiCache
- Fully managed
- High availability
- https://aws.amazon.com/elasticache/

### DigitalOcean Managed Redis
- Easy setup
- Automatic updates
- https://www.digitalocean.com/products/managed-databases-redis

### Update Environment Variables

```env
REDIS_HOST=your-production-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_DB=0
```

## Queue Monitoring

### Check Queue Stats

Visit: `http://localhost:3001/api/admin/queue-stats`

Response example:
```json
{
  "stats": {
    "waiting": 0,
    "active": 0,
    "completed": 5,
    "failed": 0,
    "delayed": 2,
    "total": 7
  }
}
```

### Redis CLI Commands

```bash
# Connect to Redis
redis-cli

# List all keys
KEYS *

# Check queue jobs
KEYS bull:social-posts:*

# Monitor real-time commands
MONITOR

# Get info
INFO
```

## Performance Tuning

For high-volume posting, optimize Redis:

```redis
# In redis.conf or via CLI
maxmemory 256mb
maxmemory-policy allkeys-lru
```

## Backup and Restore

### Backup
```bash
redis-cli SAVE
# Creates dump.rdb file
```

### Restore
```bash
# Copy dump.rdb to Redis data directory
sudo systemctl restart redis-server
```

## Security

### Enable Password Protection

1. Edit Redis configuration:
```bash
# Ubuntu/Debian
sudo nano /etc/redis/redis.conf

# macOS (Homebrew)
nano /opt/homebrew/etc/redis.conf
```

2. Uncomment and set password:
```
requirepass your_secure_password_here
```

3. Restart Redis

4. Update `.env`:
```env
REDIS_PASSWORD=your_secure_password_here
```

## Need Help?

If you're still having issues:

1. Check Redis logs:
```bash
# Ubuntu/Debian
sudo tail -f /var/log/redis/redis-server.log

# macOS
tail -f /opt/homebrew/var/log/redis.log

# Docker
docker logs schedy-redis
```

2. Check application logs for queue errors

3. Verify network connectivity:
```bash
telnet localhost 6379
```

4. Create an issue on GitHub with:
   - Error messages
   - Redis version: `redis-cli --version`
   - OS version
   - Environment configuration (without sensitive data)

---

**Remember:** Always keep Redis running when using Schedy for scheduling and publishing posts!

