# Queue Management System - Complete Guide

## 🎯 Overview

The queue management system handles scheduled post publishing using **Bull** (a Redis-based job queue) and provides monitoring capabilities through **Bull Board**. Posts are automatically processed at their scheduled time and published to the appropriate social media platforms.

---

## ✅ Components Created

### 1. **Queue Configuration** (`src/lib/queue.ts`)

The core queue system with job processing logic.

#### Features:
- ✅ Bull queue named `"social-posts"`
- ✅ Redis connection configuration from environment variables
- ✅ Automatic retry logic (3 attempts with exponential backoff)
- ✅ Job processor for publishing posts
- ✅ Platform-specific API integration (placeholders)
- ✅ Status management (SCHEDULED → PUBLISHING → PUBLISHED/FAILED)
- ✅ Helper functions for queue management
- ✅ Event listeners for monitoring

#### Key Functions:

**`addPostToQueue(postId, userId, scheduledAt?)`**
- Adds a post to the publishing queue
- Optional delay for scheduled posts
- Returns job ID

**`removePostFromQueue(postId)`**
- Removes a scheduled post from the queue
- Returns true if removed, false if not found

**`retryFailedPost(postId)`**
- Resets a failed post to SCHEDULED
- Re-adds to queue for retry
- Returns new job ID

**`getQueueStats()`**
- Returns queue statistics (waiting, active, completed, failed, delayed)

**`cleanOldJobs()`**
- Removes completed/failed jobs older than 24 hours

---

### 2. **Bull Board Setup** (`src/lib/queue-board.ts`)

Web UI for monitoring the queue (Note: Limited support in Next.js App Router).

---

### 3. **API Endpoints**

#### **Queue Stats API** (`/api/admin/queue-stats`)

GET endpoint for monitoring queue health and job status.

**Response:**
```json
{
  "stats": {
    "waiting": 5,
    "active": 2,
    "completed": 120,
    "failed": 3,
    "delayed": 10,
    "total": 140
  },
  "jobs": {
    "waiting": [...],
    "active": [...],
    "completed": [...],
    "failed": [...],
    "delayed": [...]
  },
  "timestamp": "2025-12-15T10:30:00.000Z"
}
```

#### **Retry Failed Post** (`/api/posts/[id]/retry`)

POST endpoint to retry a failed post.

**Request:**
```
POST /api/posts/[postId]/retry
```

**Response:**
```json
{
  "success": true,
  "message": "Post queued for retry",
  "jobId": "post-abc123"
}
```

---

### 4. **Updated API Endpoints**

#### **POST `/api/posts`** (Create Post)

**Now automatically adds posts to queue when:**
- `status: "SCHEDULED"` → Adds with delay until `scheduledAt`
- `status: "PUBLISHED"` → Adds for immediate processing

#### **PATCH `/api/posts/[id]`** (Update Post)

**Now handles queue management:**
- Removes old queue job
- Re-adds if status/schedule changed
- Supports rescheduling

#### **DELETE `/api/posts/[id]`** (Delete Post)

**Now removes from queue before deleting:**
- Prevents orphaned jobs
- Clean deletion workflow

---

## 🔄 How It Works

### Post Publishing Flow

```
User schedules post
  ↓
POST /api/posts
  - status: SCHEDULED
  - scheduledAt: 2025-12-15T15:00:00Z
  ↓
addPostToQueue(postId, userId, scheduledAt)
  - Calculate delay: scheduledAt - now
  - Add job to Bull queue with delay
  ↓
Bull queue waits until scheduledAt
  ↓
Job processor executes:
  1. Load post from database
  2. Verify status is SCHEDULED
  3. Update status to PUBLISHING
  4. Get profile credentials (accessToken)
  5. Call platform API (Facebook/Instagram/Twitter/TikTok)
  6. Update post:
     - status: PUBLISHED
     - publishedAt: now
     - platformPostId: (from API response)
  ↓
Post is live on social media! ✅
```

### Failure Handling Flow

```
Job fails (network error, invalid token, etc.)
  ↓
Job processor catches error
  ↓
Update post in database:
  - status: FAILED
  - failedAt: now
  - errorMessage: error details
  ↓
Bull retries job (up to 3 times total)
  - Retry 1: Wait 2 seconds
  - Retry 2: Wait 4 seconds
  - Retry 3: Wait 8 seconds
  ↓
If all retries fail:
  - Job marked as failed in queue
  - Post remains with status FAILED
  - User can manually retry via UI
```

### Manual Retry Flow

```
User clicks "Retry" on failed post
  ↓
POST /api/posts/[id]/retry
  ↓
retryFailedPost(postId):
  1. Verify post status is FAILED
  2. Reset status to SCHEDULED
  3. Clear failedAt and errorMessage
  4. Add back to queue
  ↓
Job processes again (same flow as scheduled post)
```

---

## 🛠️ Job Processor Details

### Job Data Structure

```typescript
interface PostJobData {
  postId: string;  // Post ID to publish
  userId: string;  // User ID (for verification)
}
```

### Processing Steps

1. **Load Post**
   - Fetch from database with profile and user info
   - Verify ownership

2. **Validate Status**
   - Check if post is still SCHEDULED
   - Skip if already published or canceled

3. **Update to PUBLISHING**
   - Prevents duplicate processing
   - Indicates active publishing

4. **Get Credentials**
   - Access token from profile
   - Refresh token if needed

5. **Call Platform API**
   - Facebook Graph API
   - Instagram Graph API  
   - Twitter API v2
   - TikTok API

6. **Handle Success**
   - Update status to PUBLISHED
   - Save platformPostId
   - Set publishedAt timestamp
   - Save response metadata

7. **Handle Failure**
   - Update status to FAILED
   - Save error message
   - Set failedAt timestamp
   - Re-throw for Bull retry

---

## 📊 Platform API Integration

### Current Status: **Placeholders**

Each platform function is a placeholder that simulates the API call. Real implementations coming in Phase 4.

#### Facebook (`publishToFacebook`)

**TODO: Implement Facebook Graph API**
```typescript
POST https://graph.facebook.com/v18.0/me/feed
{
  "message": content,
  "access_token": accessToken,
  // Add media URLs if present
}
```

#### Instagram (`publishToInstagram`)

**TODO: Implement Instagram Graph API**
```typescript
// Two-step process:
// 1. Create media container
POST https://graph.facebook.com/v18.0/{ig-user-id}/media
{
  "image_url": mediaUrl,
  "caption": content,
  "access_token": accessToken
}

// 2. Publish container
POST https://graph.facebook.com/v18.0/{ig-user-id}/media_publish
{
  "creation_id": containerId,
  "access_token": accessToken
}
```

#### Twitter (`publishToTwitter`)

**TODO: Implement Twitter API v2**
```typescript
POST https://api.twitter.com/2/tweets
{
  "text": content,
  // Add media if present
}
Headers: { "Authorization": "Bearer {accessToken}" }
```

#### TikTok (`publishToTikTok`)

**TODO: Implement TikTok API**
```typescript
POST https://open-api.tiktok.com/share/video/upload/
{
  "video": videoFile,
  "caption": content,
  "access_token": accessToken
}
```

---

## 🔧 Redis Configuration

### Required Environment Variables

```env
# Redis connection (local development)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""  # Optional
REDIS_DB="0"

# Alternative: Redis URL (production)
REDIS_URL="redis://username:password@host:port/db"
```

### Redis Setup

#### **Local Development (Windows)**

1. **Download Redis for Windows:**
   - Download from: https://github.com/tporadowski/redis/releases
   - Or use Docker: `docker run -p 6379:6379 redis`

2. **Install and Start:**
   ```bash
   # Extract and run
   redis-server.exe
   ```

3. **Verify:**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

#### **Production (Cloud Redis)**

Use a managed Redis service:
- **Redis Labs** (free tier available)
- **AWS ElastiCache**
- **Azure Cache for Redis**
- **Google Cloud Memorystore**
- **Upstash** (serverless Redis)

**Example with Upstash:**
```env
REDIS_URL="redis://default:password@host.upstash.io:6379"
```

---

## 📈 Queue Configuration

### Default Settings

```typescript
{
  attempts: 3,  // Retry failed jobs up to 3 times
  backoff: {
    type: "exponential",
    delay: 2000,  // Start with 2s, then 4s, 8s
  },
  removeOnComplete: false,  // Keep completed jobs for monitoring
  removeOnFail: false,      // Keep failed jobs for debugging
}
```

### Customization

Edit `src/lib/queue.ts`:

```typescript
export const socialPostsQueue = new Queue("social-posts", {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 5,  // More retries
    backoff: {
      type: "fixed",  // Or 'exponential'
      delay: 5000,
    },
    removeOnComplete: true,  // Auto-clean completed
    removeOnFail: false,
  },
});
```

---

## 🎮 Usage Examples

### Schedule a Post

```typescript
// User creates a post for tomorrow at 2 PM
POST /api/posts
{
  "content": "Hello world!",
  "profileIds": ["profile-1"],
  "status": "SCHEDULED",
  "scheduledAt": "2025-12-16T14:00:00.000Z"
}

// Automatically added to queue:
// - jobId: "post-abc123"
// - delay: ~24 hours
// - Will process at scheduled time
```

### Post Immediately

```typescript
// User posts immediately
POST /api/posts
{
  "content": "Breaking news!",
  "profileIds": ["profile-1"],
  "status": "PUBLISHED"
}

// Automatically added to queue:
// - jobId: "post-abc123"
// - delay: 0ms
// - Processes immediately
```

### Reschedule a Post

```typescript
// User reschedules to tomorrow at 3 PM
PATCH /api/posts/abc123
{
  "status": "SCHEDULED",
  "scheduledAt": "2025-12-16T15:00:00.000Z"
}

// Queue management:
// 1. Removes old job (if exists)
// 2. Adds new job with new delay
```

### Cancel a Scheduled Post

```typescript
// User changes mind, saves as draft
PATCH /api/posts/abc123
{
  "status": "DRAFT"
}

// Queue management:
// 1. Removes job from queue
// 2. Post stays in database as DRAFT
```

### Delete a Post

```typescript
DELETE /api/posts/abc123

// Queue management:
// 1. Removes job from queue (if scheduled)
// 2. Deletes post from database
```

### Retry a Failed Post

```typescript
POST /api/posts/abc123/retry

// Response:
{
  "success": true,
  "message": "Post queued for retry",
  "jobId": "post-abc123"
}

// Queue management:
// 1. Resets status to SCHEDULED
// 2. Clears error info
// 3. Re-adds to queue
```

---

## 📊 Monitoring

### Get Queue Statistics

```typescript
GET /api/admin/queue-stats

// Response:
{
  "stats": {
    "waiting": 5,      // Jobs waiting to process
    "active": 2,       // Jobs currently processing
    "completed": 120,  // Successfully completed jobs
    "failed": 3,       // Failed jobs
    "delayed": 10,     // Scheduled for future
    "total": 140
  },
  "jobs": {
    "waiting": [
      {
        "id": "post-abc123",
        "data": { "postId": "abc123", "userId": "user-1" },
        "timestamp": 1702650000000
      },
      ...
    ],
    "failed": [
      {
        "id": "post-def456",
        "data": { "postId": "def456", "userId": "user-2" },
        "failedReason": "Invalid access token",
        "stacktrace": [...],
        "attemptsMade": 3
      },
      ...
    ],
    ...
  },
  "timestamp": "2025-12-15T10:30:00.000Z"
}
```

### Event Logging

The queue logs events to console:

```
[Queue] Added post abc123 to queue (job ID: post-abc123, delay: 86400000ms)
[Queue] Processing post abc123 for user user-1
[Facebook] Publishing: "Hello world!..." with token: eyJhbGci...
[Queue] Successfully published post abc123 (platform ID: fb_1702650000_abc123)
[Queue] Job post-abc123 completed: { success: true, platformPostId: "fb_1702650000_abc123" }
```

---

## 🚀 Production Deployment

### Checklist

- [ ] **Set up Redis** (managed service recommended)
- [ ] **Configure environment variables** (Redis URL, secrets)
- [ ] **Implement real platform APIs** (replace placeholders)
- [ ] **Add OAuth token refresh logic** (for expired tokens)
- [ ] **Set up monitoring** (queue stats dashboard)
- [ ] **Configure error alerts** (email/Slack on failures)
- [ ] **Test retry logic** (simulate failures)
- [ ] **Set up job cleanup** (cron for old jobs)
- [ ] **Scale workers** (multiple instances if needed)

### Environment Variables (Production)

```env
# Redis (managed service)
REDIS_URL="redis://username:password@production-redis.com:6379/0"

# NextAuth
NEXTAUTH_SECRET="your-production-secret-from-openssl"
NEXTAUTH_URL="https://yourdomain.com"

# Social Media APIs
FACEBOOK_APP_ID="your-facebook-app-id"
FACEBOOK_APP_SECRET="your-facebook-app-secret"
# ... (other platforms)

# Database
DATABASE_URL="postgresql://user:password@host:5432/database"
```

### Worker Scaling

For high volume, run dedicated worker processes:

```typescript
// worker.ts
import { socialPostsQueue } from "./lib/queue";

console.log("Worker started");

// Queue automatically processes jobs
// Keep process alive
process.on("SIGINT", async () => {
  await socialPostsQueue.close();
  process.exit(0);
});
```

Run multiple workers:
```bash
pm2 start worker.ts -i 4  # 4 worker instances
```

---

## 🧪 Testing

### Test Scenarios

#### 1. **Schedule Post for Near Future**
```typescript
// Schedule for 1 minute from now
const scheduledAt = new Date(Date.now() + 60000);

POST /api/posts
{
  "content": "Test post",
  "profileIds": ["profile-1"],
  "status": "SCHEDULED",
  "scheduledAt": scheduledAt.toISOString()
}

// Expected:
// - Job added to queue with ~60s delay
// - Post publishes after 1 minute
// - Status updates: SCHEDULED → PUBLISHING → PUBLISHED
```

#### 2. **Immediate Post**
```typescript
POST /api/posts
{
  "content": "Test immediate",
  "profileIds": ["profile-1"],
  "status": "PUBLISHED"
}

// Expected:
// - Job added with 0 delay
// - Processes immediately
// - Status updates: PUBLISHED (with publishedAt)
```

#### 3. **Simulate Failure**
```typescript
// Modify platform function to throw error
async function publishToFacebook(...) {
  throw new Error("Simulated failure");
}

// Expected:
// - Status updates to FAILED
// - errorMessage saved
// - Job retries 3 times
// - Finally marked as failed
```

#### 4. **Retry Failed Post**
```typescript
// After post fails
POST /api/posts/[failedPostId]/retry

// Expected:
// - Status resets to SCHEDULED
// - Error cleared
// - Re-added to queue
// - Processes again
```

#### 5. **Reschedule Post**
```typescript
PATCH /api/posts/[scheduledPostId]
{
  "scheduledAt": "2025-12-17T10:00:00.000Z"
}

// Expected:
// - Old job removed from queue
// - New job added with new delay
// - Post publishes at new time
```

---

## 📝 Code Examples

### Manually Add Job to Queue

```typescript
import { addPostToQueue } from "@/lib/queue";

// Schedule for specific time
const scheduledAt = new Date("2025-12-20T14:00:00Z");
const jobId = await addPostToQueue("post-123", "user-456", scheduledAt);
console.log(`Job added: ${jobId}`);

// Immediate processing
const immediateJobId = await addPostToQueue("post-789", "user-456");
```

### Manually Remove Job

```typescript
import { removePostFromQueue } from "@/lib/queue";

const removed = await removePostFromQueue("post-123");
if (removed) {
  console.log("Job removed successfully");
} else {
  console.log("Job not found in queue");
}
```

### Get Queue Stats

```typescript
import { getQueueStats } from "@/lib/queue";

const stats = await getQueueStats();
console.log(`Queue has ${stats.delayed} scheduled posts`);
console.log(`${stats.failed} posts failed`);
```

### Clean Old Jobs

```typescript
import { cleanOldJobs } from "@/lib/queue";

// Remove completed/failed jobs older than 24 hours
await cleanOldJobs();
```

---

## ⚠️ Known Limitations

1. **Bull Board Not Fully Supported**: Next.js App Router doesn't work well with Express-based Bull Board. Use `/api/admin/queue-stats` instead.

2. **Platform APIs are Placeholders**: Real implementations needed for production.

3. **No Token Refresh**: Expired access tokens will cause failures. Implement refresh logic.

4. **Single Redis Instance**: For high availability, use Redis Cluster.

5. **No Rate Limiting**: Platforms have API rate limits. Implement rate limiting logic.

6. **No Webhook Support**: Can't receive platform callbacks yet.

---

## 🔜 Future Enhancements

- [ ] Real platform API implementations
- [ ] OAuth token refresh automation
- [ ] Rate limiting per platform
- [ ] Webhook handlers for platform events
- [ ] Advanced monitoring dashboard
- [ ] Email/Slack alerts for failures
- [ ] Bulk job operations
- [ ] Job priority system
- [ ] Scheduled maintenance windows
- [ ] Queue metrics (avg processing time, success rate)

---

## 📚 Dependencies

- **bull** (^4.16.5) - Redis-based job queue
- **@bull-board/api** - Bull Board core
- **@bull-board/express** - Express adapter for Bull Board
- **redis** - Redis client (installed with Bull)

---

## ✨ Summary

The queue management system is **fully implemented** and ready for testing with Redis. Here's what you can do now:

✅ Schedule posts for future publication  
✅ Post immediately via queue  
✅ Automatic retry on failure  
✅ Manual retry for failed posts  
✅ Reschedule existing posts  
✅ Remove posts from queue  
✅ Monitor queue statistics  
✅ View job details (waiting, active, completed, failed)  
✅ Event logging for debugging  

**Next Step:** Set up Redis locally and implement real platform API integrations!









