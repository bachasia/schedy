# Environment Variables Configuration

## Required Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# ================================
# DATABASE
# ================================
# Using SQLite for local development
DATABASE_URL="file:./dev.db"

# For production, use PostgreSQL:
# DATABASE_URL="postgresql://username:password@host:5432/database"


# ================================
# NEXTAUTH.JS
# ================================
# Generate a secret with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
NEXTAUTH_URL="http://localhost:3001"

# For production:
# NEXTAUTH_URL="https://yourdomain.com"


# ================================
# REDIS (Bull Queue)
# ================================
# Local development defaults
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"

# For production, use a Redis URL instead:
# REDIS_URL="redis://username:password@host:port/db"

# Cloud Redis examples:
# Upstash: REDIS_URL="redis://default:password@host.upstash.io:6379"
# Redis Labs: REDIS_URL="redis://user:password@redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com:12345"


# ================================
# SOCIAL MEDIA API CREDENTIALS
# ================================
# These will be implemented in Phase 4

# Facebook Graph API
FACEBOOK_APP_ID=""
FACEBOOK_APP_SECRET=""
FACEBOOK_REDIRECT_URI="http://localhost:3001/api/social/facebook/callback"

# Instagram (uses Facebook Graph API)
INSTAGRAM_APP_ID=""
INSTAGRAM_APP_SECRET=""
INSTAGRAM_REDIRECT_URI="http://localhost:3001/api/social/instagram/callback"

# Twitter API v2
TWITTER_API_KEY=""
TWITTER_API_SECRET=""
TWITTER_BEARER_TOKEN=""
TWITTER_REDIRECT_URI="http://localhost:3001/api/social/twitter/callback"

# TikTok API
TIKTOK_CLIENT_KEY=""
TIKTOK_CLIENT_SECRET=""
TIKTOK_REDIRECT_URI="http://localhost:3001/api/social/tiktok/callback"


# ================================
# APPLICATION SETTINGS
# ================================
NODE_ENV="development"
NEXT_PUBLIC_APP_NAME="Schedy"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

---

## Variable Details

### Database

**`DATABASE_URL`**
- SQLite (local): `file:./dev.db`
- PostgreSQL (production): `postgresql://username:password@host:5432/database`

### NextAuth

**`NEXTAUTH_SECRET`** (Required)
- Generate with: `openssl rand -base64 32`
- Must be different in production
- Keep secret and never commit to Git

**`NEXTAUTH_URL`** (Required)
- Local: `http://localhost:3001`
- Production: Your domain URL

### Redis

**Option 1: Individual Settings (Local)**
- `REDIS_HOST`: Redis server hostname (default: localhost)
- `REDIS_PORT`: Redis server port (default: 6379)
- `REDIS_PASSWORD`: Password if Redis requires authentication
- `REDIS_DB`: Database number (default: 0)

**Option 2: Connection URL (Production)**
- `REDIS_URL`: Full Redis connection string
- Format: `redis://[username]:[password]@[host]:[port]/[db]`
- Example: `redis://default:mypassword@localhost:6379/0`

### Social Media APIs

These are placeholders for Phase 4 implementation. You'll need to:
1. Create developer accounts on each platform
2. Register your application
3. Get API credentials
4. Add them to your `.env` file

**Facebook:**
- Create app at: https://developers.facebook.com/
- Get App ID and App Secret
- Set up redirect URI

**Instagram:**
- Uses Facebook Graph API
- Same credentials as Facebook
- Requires Facebook app review

**Twitter:**
- Create app at: https://developer.twitter.com/
- Get API Key, API Secret, and Bearer Token
- Enable OAuth 2.0

**TikTok:**
- Create app at: https://developers.tiktok.com/
- Get Client Key and Client Secret
- Set up redirect URI

---

## Security Best Practices

### ✅ DO:
- Use strong, random secrets
- Keep `.env` file in `.gitignore`
- Use different values for development and production
- Rotate secrets periodically
- Use environment variable management tools (e.g., Vercel, Railway, AWS Secrets Manager)

### ❌ DON'T:
- Commit `.env` file to Git
- Share secrets in chat/email
- Use the same secrets across environments
- Use default/example values in production
- Expose secrets in client-side code

---

## Production Deployment

### Vercel

Add environment variables in:
1. Project Settings → Environment Variables
2. Add each variable individually
3. Set scope (Production, Preview, Development)

### Railway

```bash
railway env set NEXTAUTH_SECRET="your-secret"
railway env set REDIS_URL="redis://..."
# ... add all variables
```

### Docker

Create `docker-compose.yml`:
```yaml
services:
  app:
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - REDIS_HOST=${REDIS_HOST}
      # ... other variables
```

Or use `.env` file:
```yaml
services:
  app:
    env_file:
      - .env
```

---

## Local Development Setup

1. **Copy the example above** to a new `.env` file in your project root

2. **Generate NEXTAUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

3. **Install and start Redis:**
   
   **Windows (with Docker):**
   ```bash
   docker run -d -p 6379:6379 --name redis redis:latest
   ```

   **Windows (native):**
   - Download from: https://github.com/tporadowski/redis/releases
   - Extract and run `redis-server.exe`

   **macOS:**
   ```bash
   brew install redis
   brew services start redis
   ```

   **Linux:**
   ```bash
   sudo apt-get install redis-server
   sudo systemctl start redis
   ```

4. **Verify Redis is running:**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

5. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

---

## Troubleshooting

### Redis Connection Errors

**Error:** `Error: Redis connection to localhost:6379 failed`

**Solution:**
1. Check if Redis is running: `redis-cli ping`
2. Verify `REDIS_HOST` and `REDIS_PORT` in `.env`
3. Check firewall settings

### Database Errors

**Error:** `@prisma/client did not initialize yet`

**Solution:**
```bash
npx prisma generate
```

### NextAuth Errors

**Error:** `[auth][error] MissingSecret`

**Solution:**
Add `NEXTAUTH_SECRET` to your `.env` file

---

## Environment Variable Priority

Next.js loads environment variables in this order (highest priority first):

1. `.env.local` (local overrides, not committed)
2. `.env.development` or `.env.production` (environment-specific)
3. `.env` (defaults)

**Recommendation:**
- Use `.env` for defaults and examples
- Use `.env.local` for your actual secrets (add to `.gitignore`)
- Use `.env.production` for production-only config

---

## Checking Loaded Variables

Create a test API route:

```typescript
// src/app/api/test-env/route.ts
export async function GET() {
  return Response.json({
    nodeEnv: process.env.NODE_ENV,
    hasRedis: !!process.env.REDIS_HOST,
    hasNextAuth: !!process.env.NEXTAUTH_SECRET,
    hasDatabase: !!process.env.DATABASE_URL,
  });
}
```

Visit: `http://localhost:3001/api/test-env`

**Never expose actual secret values!**

---

## Quick Reference

| Variable | Required | Default | Example |
|----------|----------|---------|---------|
| `DATABASE_URL` | ✅ | - | `file:./dev.db` |
| `NEXTAUTH_SECRET` | ✅ | - | `abc123...` |
| `NEXTAUTH_URL` | ✅ | - | `http://localhost:3001` |
| `REDIS_HOST` | ✅ | `localhost` | `localhost` |
| `REDIS_PORT` | ❌ | `6379` | `6379` |
| `REDIS_PASSWORD` | ❌ | - | `mypassword` |
| `REDIS_DB` | ❌ | `0` | `0` |
| `FACEBOOK_APP_ID` | Phase 4 | - | `123456789` |
| `TWITTER_API_KEY` | Phase 4 | - | `abc123...` |

---

**Ready to go!** Copy the variables, fill in the values, and start developing! 🚀



