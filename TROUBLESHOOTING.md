# Troubleshooting Guide

## Common Errors and Solutions

### ❌ Error: "Request failed with status code 500" when creating posts

**Symptoms:**
- Posts fail to create from `/posts/new`
- 500 error in browser console
- Error when scheduling or publishing posts

**Most Common Cause: Redis Not Running**

The queue system requires Redis to be running. If Redis is not available, the app will fail when trying to add posts to the queue.

#### Solution 1: Start Redis

**Windows (with Docker):**
```bash
docker run -d -p 6379:6379 --name schedy-redis redis:latest
```

**Windows (native):**
1. Download Redis from: https://github.com/tporadowski/redis/releases
2. Extract and run `redis-server.exe`

**macOS:**
```bash
brew services start redis
```

**Linux:**
```bash
sudo systemctl start redis
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

#### Solution 2: Check Environment Variables

Make sure your `.env` file has Redis configuration:

```env
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"
```

#### Solution 3: Restart the App

After starting Redis, restart your development server:

```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

---

### ❌ Error: "Nested <a> tags" in breadcrumbs

**Fixed!** This was caused by improper `asChild` prop handling in the breadcrumb component.

**Solution:** Already fixed in the latest code. If you still see this, make sure you have the latest version with `Slot` from `@radix-ui/react-slot`.

---

### ❌ Error: Database errors (Prisma)

**Symptoms:**
- "PrismaClient initialization error"
- "@prisma/client did not initialize yet"

**Solutions:**

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Run migrations:**
   ```bash
   npx prisma migrate dev
   ```

3. **Reset database (if needed):**
   ```bash
   npx prisma migrate reset
   ```

---

### ❌ Error: "Unauthorized" when accessing pages

**Symptoms:**
- Redirected to login page
- 401 errors in console

**Solutions:**

1. **Check if logged in:**
   - Make sure you're logged in at `/login`
   - Check session cookie exists

2. **Check NextAuth configuration:**
   - Verify `NEXTAUTH_SECRET` in `.env`
   - Verify `NEXTAUTH_URL` matches your dev server

---

### ❌ Error: Facebook OAuth not working

**Symptoms:**
- "Invalid OAuth Redirect URI"
- "App not set up"
- OAuth flow fails

**Solutions:**

1. **Check Facebook App Settings:**
   - Go to Facebook Developer Console
   - Settings → Basic
   - Verify App ID matches `FACEBOOK_APP_ID` in `.env`

2. **Check Redirect URI:**
   - Must match EXACTLY (including http/https)
   - Local: `http://localhost:3001/api/social/facebook/callback`
   - Production: `https://yourdomain.com/api/social/facebook/callback`

3. **Check Environment Variables:**
   ```env
   FACEBOOK_APP_ID="your-app-id"
   FACEBOOK_APP_SECRET="your-app-secret"
   FACEBOOK_REDIRECT_URI="http://localhost:3001/api/social/facebook/callback"
   ```

4. **Restart server after changing .env:**
   ```bash
   npm run dev
   ```

---

### ❌ Error: Posts not publishing to Facebook

**Symptoms:**
- Posts stuck in "PUBLISHING" status
- Posts fail with error message
- Nothing appears on Facebook

**Solutions:**

1. **Check Access Token:**
   - Token may have expired
   - Reconnect profile at `/profiles`
   - Click "Edit" → "Refresh Token" (or reconnect via OAuth)

2. **Check Permissions:**
   - Verify your Facebook app has required permissions:
     - `pages_manage_posts`
     - `pages_read_engagement`
     - `pages_show_list`

3. **Check Media URLs:**
   - Media must be publicly accessible
   - Check file format (JPG, PNG for images; MP4 for video)
   - Check file size limits

4. **Check Queue:**
   - Go to `/admin/queue`
   - Check for failed jobs
   - Look at error messages
   - Try retry button

---

### ❌ Error: Module not found

**Symptoms:**
- "Cannot find module X"
- Import errors

**Solutions:**

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Clear cache and rebuild:**
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **Check if package is installed:**
   ```bash
   npm list package-name
   ```

---

## Debugging Tips

### 1. Check Console Logs

**Browser Console:**
- Open DevTools (F12)
- Go to Console tab
- Look for red errors
- Check Network tab for failed requests

**Server Console:**
- Look at terminal where `npm run dev` is running
- Check for error messages
- Look for stack traces

### 2. Check Database

**Open Prisma Studio:**
```bash
npx prisma studio
```

- View all data
- Check if posts are created
- Verify profile tokens

### 3. Check Queue Status

**Go to Queue Admin:**
- Navigate to `/admin/queue`
- Check job counts
- Look at failed jobs
- Read error messages

**Or use API:**
```bash
curl http://localhost:3001/api/admin/queue-stats
```

### 4. Check Redis

**Verify Redis is running:**
```bash
redis-cli ping
```

**Check Redis data:**
```bash
redis-cli
> KEYS *
> GET bull:social-posts:*
```

---

## Quick Diagnostics Checklist

Run through this checklist when something isn't working:

- [ ] Is the dev server running? (`npm run dev`)
- [ ] Is Redis running? (`redis-cli ping`)
- [ ] Are environment variables set? (check `.env`)
- [ ] Is the database migrated? (`npx prisma migrate dev`)
- [ ] Is Prisma client generated? (`npx prisma generate`)
- [ ] Am I logged in? (check `/login`)
- [ ] Are there console errors? (F12)
- [ ] Are there server errors? (check terminal)
- [ ] Is the queue working? (check `/admin/queue`)

---

## Getting Help

If you're still stuck:

1. **Check Documentation:**
   - `README.md` - Project overview
   - `QUEUE_MANAGEMENT.md` - Queue system
   - `FACEBOOK_INTEGRATION.md` - Facebook setup
   - `ENVIRONMENT_VARIABLES.md` - Configuration

2. **Check Logs:**
   - Browser console (F12)
   - Server console (terminal)
   - Redis logs (if applicable)

3. **Try Clean Restart:**
   ```bash
   # Stop all processes
   # Stop Redis
   # Clear cache
   rm -rf .next
   rm -rf node_modules/.cache
   
   # Start Redis
   redis-server
   
   # Start app
   npm run dev
   ```

---

## Common Commands

**Development:**
```bash
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server
```

**Database:**
```bash
npx prisma studio       # Open database GUI
npx prisma migrate dev  # Run migrations
npx prisma generate     # Generate Prisma Client
npx prisma migrate reset # Reset database
```

**Redis:**
```bash
redis-cli ping          # Test connection
redis-cli               # Open Redis CLI
redis-cli flushall      # Clear all Redis data (CAUTION!)
```

**Queue:**
```bash
# View queue stats
curl http://localhost:3001/api/admin/queue-stats | jq
```

---

**Most issues are solved by ensuring Redis is running and restarting the dev server!** 🚀







