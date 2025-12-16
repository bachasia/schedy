# Queue Management - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install and Start Redis

**Using Docker (Recommended):**
```bash
docker run -d -p 6379:6379 --name schedy-redis redis:latest
```

**Windows (Native):**
1. Download: https://github.com/tporadowski/redis/releases
2. Extract and run `redis-server.exe`

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

**Verify:**
```bash
redis-cli ping
# Should return: PONG
```

---

### Step 2: Configure Environment Variables

Add to your `.env` file:

```env
# Redis (local development)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"
```

---

### Step 3: Test the Queue

**Schedule a post for 1 minute from now:**

```typescript
// Create a scheduled post
POST http://localhost:3001/api/posts
{
  "content": "Test post from queue!",
  "profileIds": ["your-profile-id"],
  "status": "SCHEDULED",
  "scheduledAt": "2025-12-15T10:31:00.000Z"  // 1 min from now
}
```

**Check the console:**
```
[Queue] Added post abc123 to queue (job ID: post-abc123, delay: 60000ms)
```

**Wait 1 minute...**

```
[Queue] Processing post abc123 for user user-1
[Facebook] Publishing: "Test post from queue!..." 
[Queue] Successfully published post abc123 (platform ID: fb_1702650000_abc123)
```

---

### Step 4: Monitor the Queue

**Get queue statistics:**

```bash
curl http://localhost:3001/api/admin/queue-stats
```

**Response:**
```json
{
  "stats": {
    "waiting": 0,
    "active": 0,
    "completed": 1,
    "failed": 0,
    "delayed": 0,
    "total": 1
  },
  "jobs": {
    "completed": [
      {
        "id": "post-abc123",
        "data": { "postId": "abc123", "userId": "user-1" },
        "finishedOn": 1702650060000
      }
    ]
  }
}
```

---

## 🎯 Common Workflows

### Schedule a Post

```typescript
POST /api/posts
{
  "content": "My scheduled post",
  "profileIds": ["profile-1", "profile-2"],
  "status": "SCHEDULED",
  "scheduledAt": "2025-12-20T14:00:00.000Z"
}

// Result: 2 jobs added (one per profile)
// Will publish on Dec 20 at 2 PM
```

### Post Immediately

```typescript
POST /api/posts
{
  "content": "Breaking news!",
  "profileIds": ["profile-1"],
  "status": "PUBLISHED"
}

// Result: Job added with 0 delay
// Processes immediately
```

### Reschedule a Post

```typescript
PATCH /api/posts/abc123
{
  "scheduledAt": "2025-12-21T10:00:00.000Z"
}

// Result: Old job removed, new job added
```

### Retry a Failed Post

```typescript
POST /api/posts/abc123/retry

// Result: Post reset to SCHEDULED and re-queued
```

### Cancel a Scheduled Post

```typescript
PATCH /api/posts/abc123
{
  "status": "DRAFT"
}

// Result: Job removed from queue, post saved as draft
```

---

## 📊 How It Works

```
User schedules post
  ↓
API adds job to Redis queue
  ↓
Bull waits until scheduled time
  ↓
Job processor runs:
  1. Update status to PUBLISHING
  2. Get profile credentials
  3. Call platform API
  4. Save result (PUBLISHED or FAILED)
  ↓
Done! ✅
```

---

## 🔍 Monitoring

### Console Logs

The queue logs all operations:

```
[Queue] Added post abc123 to queue (job ID: post-abc123, delay: 60000ms)
[Queue] Processing post abc123 for user user-1
[Facebook] Publishing: "Hello world!..." with token: eyJhbGci...
[Queue] Successfully published post abc123 (platform ID: fb_1702650000_abc123)
[Queue] Job post-abc123 completed: { success: true, ... }
```

### API Endpoint

```bash
# Get current queue status
curl http://localhost:3001/api/admin/queue-stats | jq

# Watch in real-time (every 2 seconds)
watch -n 2 'curl -s http://localhost:3001/api/admin/queue-stats | jq .stats'
```

---

## 🐛 Troubleshooting

### Redis Not Connected

**Error:** `Error: Redis connection to localhost:6379 failed`

**Fix:**
1. Check Redis is running: `redis-cli ping`
2. Verify `.env` has correct `REDIS_HOST` and `REDIS_PORT`
3. Check firewall settings

### Jobs Not Processing

**Check:**
1. Redis is running
2. Node.js process is running (queue processor starts automatically)
3. Console for error messages
4. Queue stats: `curl http://localhost:3001/api/admin/queue-stats`

### Job Stuck

**Solution:**
```typescript
// Check delayed jobs
GET /api/admin/queue-stats
// Look at jobs.delayed array

// If stuck, restart the queue:
// 1. Stop the Node.js process
// 2. Start it again: npm run dev
```

---

## ✨ Features

✅ **Automatic scheduling** - Posts publish at exact time  
✅ **Retry logic** - 3 attempts with exponential backoff  
✅ **Status tracking** - SCHEDULED → PUBLISHING → PUBLISHED  
✅ **Failure handling** - Saves error messages  
✅ **Manual retry** - Retry failed posts with one click  
✅ **Queue monitoring** - Real-time stats API  
✅ **Event logging** - Console logs for debugging  
✅ **Job cleanup** - Remove old jobs automatically  

---

## 🎯 Test Scenarios

### 1. Quick Test (1 minute delay)

```typescript
POST /api/posts
{
  "content": "Quick test!",
  "profileIds": ["profile-1"],
  "status": "SCHEDULED",
  "scheduledAt": new Date(Date.now() + 60000).toISOString()
}

// Wait 1 minute and check console
```

### 2. Immediate Post

```typescript
POST /api/posts
{
  "content": "Immediate!",
  "profileIds": ["profile-1"],
  "status": "PUBLISHED"
}

// Should process immediately (check console)
```

### 3. Multiple Profiles

```typescript
POST /api/posts
{
  "content": "Cross-post test",
  "profileIds": ["profile-1", "profile-2", "profile-3"],
  "status": "PUBLISHED"
}

// Creates 3 jobs, processes all
```

### 4. Reschedule Test

```typescript
// Create scheduled post
POST /api/posts
{
  "content": "Original time",
  "profileIds": ["profile-1"],
  "status": "SCHEDULED",
  "scheduledAt": "2025-12-20T14:00:00.000Z"
}

// Save the post ID from response

// Reschedule it
PATCH /api/posts/{postId}
{
  "scheduledAt": "2025-12-20T15:00:00.000Z"
}

// Old job removed, new job added with new time
```

---

## 📈 Production Checklist

Before going live:

- [ ] Use managed Redis service (Redis Labs, Upstash, AWS ElastiCache)
- [ ] Set `REDIS_URL` in production environment
- [ ] Implement real platform API calls (currently placeholders)
- [ ] Add OAuth token refresh logic
- [ ] Set up error monitoring (Sentry, LogRocket)
- [ ] Configure job cleanup schedule
- [ ] Test retry logic thoroughly
- [ ] Set up alerting for failed jobs
- [ ] Monitor queue performance
- [ ] Scale workers if needed

---

## 🔗 Related Documentation

- **Full Guide:** `QUEUE_MANAGEMENT.md`
- **Environment Variables:** `ENVIRONMENT_VARIABLES.md`
- **Scheduling Feature:** `SCHEDULING_FUNCTIONALITY.md`

---

**You're all set!** The queue is ready to handle scheduled posts. Just make sure Redis is running and start scheduling! 🎉



