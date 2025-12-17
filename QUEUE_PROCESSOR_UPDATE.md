# Queue Processor Update - Summary

Complete update of the queue processor with enhanced retry logic, detailed logging, and admin endpoints.

## 📋 Changes Made

### 1. Enhanced Queue Processor (`src/lib/queue.ts`)

#### Retry Attempt Logging
```typescript
// Before
console.log(`[Queue] Processing post ${postId} for user ${userId}`);

// After
console.log(
  `[Queue] Processing post ${postId} for user ${userId} (attempt ${attemptNumber}/${maxAttempts})`
);
```

**Benefits:**
- Track which attempt is currently running
- See progress through retry cycle
- Better debugging capabilities

#### Improved Error Handling

```typescript
// Enhanced failure handling
if (isLastAttempt) {
  // Final failure
  console.error(`[Queue] All retry attempts exhausted for post ${postId}`);
  await updateToFailed();
} else {
  // Will retry
  console.log(
    `[Queue] Will retry post ${postId} in ${nextDelay}ms (attempt ${nextAttempt}/${maxAttempts})`
  );
  await updateWithRetryMessage();
}
```

**Features:**
- Distinguishes between retry and final failure
- Updates error message with attempt count
- Logs next retry delay
- Only marks FAILED after all attempts exhausted

#### Enhanced Event Listeners

**Added/Enhanced Events:**
- `completed` - Logs success with attempt count
- `failed` - Distinguishes between retry and final failure
- `error` - Catches queue-level errors
- `waiting` - Logs when jobs enter queue
- `active` - Logs when processing starts
- `progress` - Logs job progress updates

**Example Output:**
```
[Queue] Job post-cmj7abc123 is waiting to be processed
[Queue] Job post-cmj7abc123 is now active and being processed
[Queue] Processing post cmj7abc123 for user cmj78sr7w (attempt 1/3)
[Queue] Job post-cmj7abc123 failed (attempt 1/3), will retry: Rate limit exceeded
[Queue] Will retry post cmj7abc123 in 2000ms (attempt 2/3)
```

#### New Export Functions

**1. `publishPostImmediately(postId: string)`**

Publish a post immediately, bypassing the queue.

```typescript
const result = await publishPostImmediately('cmj7abc123');

if (result.success) {
  console.log('Published:', result.platformPostId);
} else {
  console.error('Failed:', result.error);
}
```

**Use Cases:**
- Testing social media integrations
- Admin manual override
- Debugging publishing issues
- Development/testing environments

---

### 2. Admin Endpoint (`src/app/api/admin/posts/[id]/publish/route.ts`)

#### POST - Manual Publish Trigger

**Endpoint:** `POST /api/admin/posts/[id]/publish`

**Features:**
- ✅ Queues post for immediate publishing
- ✅ Resets failed posts to SCHEDULED
- ✅ Prevents duplicate publishing
- ✅ Validates profile is active
- ✅ Verifies post ownership
- ✅ Returns job ID for tracking

**Request:**
```bash
curl -X POST http://localhost:3001/api/admin/posts/cmj7abc123/publish \
  -H "Cookie: next-auth.session-token=..."
```

**Response:**
```json
{
  "success": true,
  "message": "Post has been queued for publishing",
  "data": {
    "postId": "cmj7abc123",
    "jobId": "post-cmj7abc123",
    "platform": "TWITTER",
    "profile": {
      "id": "cmj7xyz789",
      "username": "myaccount"
    },
    "queuedAt": "2024-12-16T08:30:00.000Z"
  }
}
```

#### GET - Publishing Status

**Endpoint:** `GET /api/admin/posts/[id]/publish`

**Features:**
- ✅ Detailed post status
- ✅ Profile information
- ✅ Publishing timestamps
- ✅ Error messages
- ✅ Retry capability indicator

**Request:**
```bash
curl http://localhost:3001/api/admin/posts/cmj7abc123/publish \
  -H "Cookie: next-auth.session-token=..."
```

**Response (Published):**
```json
{
  "id": "cmj7abc123",
  "status": "PUBLISHED",
  "platform": "TWITTER",
  "publishedAt": "2024-12-16T08:00:00.000Z",
  "platformPostId": "1234567890",
  "metadata": { ... },
  "profile": { ... }
}
```

**Response (Failed):**
```json
{
  "id": "cmj7abc123",
  "status": "FAILED",
  "platform": "TWITTER",
  "failedAt": "2024-12-16T08:05:00.000Z",
  "errorMessage": "Twitter API rate limit exceeded (after 3 attempts)",
  "canRetry": true,
  "profile": { ... }
}
```

---

## 🎯 Features Implemented

### Retry Logic ✅

| Feature | Status | Details |
|---------|--------|---------|
| Max attempts | ✅ | 3 attempts total |
| Backoff strategy | ✅ | Exponential (2s, 4s, 8s) |
| Attempt logging | ✅ | Logs each attempt with count |
| Retry notifications | ✅ | Logs next retry delay |
| Final failure handling | ✅ | Marks FAILED after all attempts |

### Error Handling ✅

| Feature | Status | Details |
|---------|--------|---------|
| Platform-specific errors | ✅ | Facebook, Instagram, Twitter, TikTok |
| Attempt count in message | ✅ | Shows "attempt 1/3" |
| Retry vs final failure | ✅ | Different messages |
| Error message storage | ✅ | Saved to database |

### Admin Endpoint ✅

| Feature | Status | Details |
|---------|--------|---------|
| Manual publish trigger | ✅ | POST endpoint |
| Status checking | ✅ | GET endpoint |
| Failed post reset | ✅ | Auto-reset to SCHEDULED |
| Duplicate prevention | ✅ | Checks current status |
| Ownership verification | ✅ | User must own post |
| Profile validation | ✅ | Must be active |

### Logging ✅

| Feature | Status | Details |
|---------|--------|---------|
| Attempt numbers | ✅ | All logs include attempt count |
| Queue events | ✅ | 7 events monitored |
| Retry notifications | ✅ | Logs retry delays |
| Final failure alerts | ✅ | Clear final failure messages |
| Admin actions | ✅ | All admin actions logged |

---

## 📊 Queue Event Flow

### Successful Publishing

```
1. [Queue] Job post-xyz is waiting to be processed
2. [Queue] Job post-xyz is now active and being processed
3. [Queue] Processing post xyz for user abc (attempt 1/3)
4. [Queue] Publishing post xyz to TWITTER...
5. [Twitter] Publishing post xyz to profile 123
6. [Twitter] Successfully published. Tweet ID: 456
7. [Queue] Successfully published post xyz (platform ID: 456)
8. [Queue] Job post-xyz completed: { success: true, ... }
```

### Failed with Retry

```
1. [Queue] Job post-xyz is waiting to be processed
2. [Queue] Job post-xyz is now active and being processed
3. [Queue] Processing post xyz for user abc (attempt 1/3)
4. [Queue] Publishing post xyz to TWITTER...
5. [Twitter] Error: Rate limit exceeded
6. [Queue] Failed to publish post xyz (attempt 1/3): Rate limit exceeded
7. [Queue] Will retry post xyz in 2000ms (attempt 2/3)
8. [Queue] Job post-xyz failed (attempt 1/3), will retry: Rate limit exceeded
   ... wait 2 seconds ...
9. [Queue] Processing post xyz for user abc (attempt 2/3)
   ... continues ...
```

### Final Failure

```
1. [Queue] Processing post xyz for user abc (attempt 3/3)
2. [Queue] Publishing post xyz to TWITTER...
3. [Twitter] Error: Invalid credentials
4. [Queue] Failed to publish post xyz (attempt 3/3): Invalid credentials
5. [Queue] All retry attempts exhausted for post xyz
6. [Queue] Job post-xyz failed after 3 attempts (final): Invalid credentials
```

---

## 🧪 Testing

### Test Retry Logic

```typescript
// 1. Create a post that will fail
const post = await createPost({
  content: 'Test post',
  platform: 'TWITTER',
  profileId: 'invalid-profile-id' // Will fail
});

// 2. Trigger publish
await fetch(`/api/admin/posts/${post.id}/publish`, { method: 'POST' });

// 3. Watch logs for retry attempts
// Expected: 3 attempts with exponential backoff
// [Queue] Processing post ... (attempt 1/3)
// [Queue] Failed to publish post ... (attempt 1/3)
// [Queue] Will retry post ... in 2000ms (attempt 2/3)
// ... repeat for attempt 2 and 3 ...
// [Queue] All retry attempts exhausted
```

### Test Admin Endpoint

```typescript
// 1. Get post status
const status = await fetch('/api/admin/posts/cmj7abc123/publish')
  .then(r => r.json());

console.log('Status:', status.status);

// 2. Trigger manual publish
const result = await fetch('/api/admin/posts/cmj7abc123/publish', {
  method: 'POST'
}).then(r => r.json());

console.log('Queued:', result.data.jobId);

// 3. Poll for completion
const pollStatus = async () => {
  const updated = await fetch('/api/admin/posts/cmj7abc123/publish')
    .then(r => r.json());
  
  if (updated.status === 'PUBLISHED') {
    console.log('Success!', updated.platformPostId);
  } else if (updated.status === 'FAILED') {
    console.error('Failed:', updated.errorMessage);
  }
};
```

### Test Immediate Publishing

```typescript
// Bypass queue for testing
import { publishPostImmediately } from '@/lib/queue';

const result = await publishPostImmediately('cmj7abc123');

if (result.success) {
  console.log('Published:', result.platformPostId);
} else {
  console.error('Failed:', result.error);
}
```

---

## 📚 Usage Examples

### Retry All Failed Posts

```typescript
async function retryAllFailed() {
  // Get all failed posts
  const response = await fetch('/api/posts?status=FAILED');
  const { posts } = await response.json();
  
  console.log(`Found ${posts.length} failed posts`);
  
  // Retry each one
  for (const post of posts) {
    console.log(`Retrying post ${post.id}...`);
    
    const result = await fetch(`/api/admin/posts/${post.id}/publish`, {
      method: 'POST'
    }).then(r => r.json());
    
    if (result.success) {
      console.log(`✓ Queued ${post.id}`);
    } else {
      console.error(`✗ Failed to queue ${post.id}:`, result.error);
    }
    
    // Rate limit: 1 request per second
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### Monitor Queue Health

```typescript
async function monitorQueue() {
  const stats = await fetch('/api/admin/queue-stats')
    .then(r => r.json());
  
  console.table({
    'Waiting': stats.stats.waiting,
    'Active': stats.stats.active,
    'Completed': stats.stats.completed,
    'Failed': stats.stats.failed,
    'Delayed': stats.stats.delayed,
  });
  
  // Alert on issues
  if (stats.stats.failed > 10) {
    console.warn('⚠️ High failure rate!');
  }
  
  if (!stats.isProcessing && stats.stats.waiting > 0) {
    console.error('❌ Queue worker may be down!');
  }
}

// Run every 30 seconds
setInterval(monitorQueue, 30000);
```

---

## 🔧 Configuration

### Queue Settings

```typescript
// In src/lib/queue.ts
defaultJobOptions: {
  attempts: 3,              // Max retry attempts
  backoff: {
    type: "exponential",    // Exponential backoff
    delay: 2000,            // Initial delay: 2s
  },
  removeOnComplete: false,  // Keep for monitoring
  removeOnFail: false,      // Keep for debugging
}
```

### Backoff Schedule

| Attempt | Delay  | Formula            |
|---------|--------|--------------------|
| 1       | 0ms    | Immediate          |
| 2       | 2000ms | 2^0 * 2000         |
| 3       | 4000ms | 2^1 * 2000         |
| 4       | 8000ms | 2^2 * 2000 (if any)|

---

## 📖 Documentation

Created comprehensive documentation:

1. **[ADMIN_API.md](./ADMIN_API.md)**
   - Complete API reference
   - Request/response examples
   - Error handling
   - Usage examples
   - Best practices

2. **[QUEUE_PROCESSOR_UPDATE.md](./QUEUE_PROCESSOR_UPDATE.md)** (this file)
   - Summary of changes
   - Feature list
   - Testing guide
   - Usage examples

---

## ✅ Completion Checklist

- [x] Import all social platform modules
- [x] Platform-based switch in processor
- [x] Update post status (PUBLISHED/FAILED)
- [x] Set timestamps (publishedAt/failedAt)
- [x] Store platformPostId on success
- [x] Store errorMessage on failure
- [x] Max 3 retries configured
- [x] Exponential backoff (2s, 4s, 8s)
- [x] Log all retry attempts
- [x] Created admin endpoint (POST)
- [x] Created status endpoint (GET)
- [x] Enhanced event logging
- [x] Added immediate publish function
- [x] Comprehensive documentation
- [x] No linting errors

---

## 🚀 Next Steps

1. **Test the queue processor:**
   ```bash
   npm run dev:docker
   ```

2. **Create a test post and trigger manually:**
   ```bash
   # Via UI or curl
   curl -X POST http://localhost:3001/api/admin/posts/YOUR_POST_ID/publish
   ```

3. **Monitor logs:**
   ```bash
   # Watch for retry attempts and backoff
   tail -f logs/queue.log
   ```

4. **Check queue stats:**
   ```bash
   curl http://localhost:3001/api/admin/queue-stats
   ```

---

**Status**: Complete ✅  
**Last Updated**: December 16, 2024  
**Version**: 2.0.0





