# Admin API Documentation

Administrative API endpoints for queue management, manual publishing, and system monitoring.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Manual Publishing](#manual-publishing)
4. [Queue Management](#queue-management)
5. [Usage Examples](#usage-examples)
6. [Error Handling](#error-handling)

---

## Overview

The Admin API provides endpoints for:

- **Manual post publishing** - Trigger publishing outside the normal queue flow
- **Publishing status** - Check detailed status of posts
- **Queue management** - Monitor and control the job queue
- **Testing & debugging** - Force publish for testing

All admin endpoints require authentication and verify post ownership.

---

## Authentication

All endpoints require a valid session token from NextAuth.js.

```typescript
// Automatic with cookies in browser
fetch('/api/admin/posts/123/publish', {
  method: 'POST',
  credentials: 'include',
})

// Or with session token
fetch('/api/admin/posts/123/publish', {
  method: 'POST',
  headers: {
    'Cookie': 'next-auth.session-token=...'
  }
})
```

**Responses:**
- `401 Unauthorized` - Not logged in
- `403 Forbidden` - Post doesn't belong to user

---

## Manual Publishing

### POST `/api/admin/posts/[id]/publish`

Manually trigger post publishing. Useful for:
- Testing post publishing
- Retrying failed posts
- Debugging social media integrations
- Force publishing without waiting for queue

#### Request

```bash
POST /api/admin/posts/cmj7abc123/publish
```

No request body required.

#### Response (Success)

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

#### Response (Already Published)

```json
{
  "error": "Post is already published",
  "post": {
    "id": "cmj7abc123",
    "status": "PUBLISHED",
    "publishedAt": "2024-12-16T08:00:00.000Z",
    "platformPostId": "1234567890"
  }
}
```

**Status:** `400 Bad Request`

#### Response (Currently Publishing)

```json
{
  "error": "Post is currently being published",
  "message": "Please wait for the current publishing attempt to complete"
}
```

**Status:** `409 Conflict`

#### Response (Profile Inactive)

```json
{
  "error": "Profile is not active",
  "message": "Please reconnect the social media profile"
}
```

**Status:** `400 Bad Request`

#### Behavior

1. **For FAILED posts:**
   - Resets status to `SCHEDULED`
   - Clears error message
   - Adds to queue for immediate processing

2. **For DRAFT/SCHEDULED posts:**
   - Adds to queue for immediate processing
   - Keeps existing status until processing starts

3. **For PUBLISHING posts:**
   - Returns conflict error
   - Prevents duplicate processing

4. **For PUBLISHED posts:**
   - Returns error with published details
   - No action taken

---

### GET `/api/admin/posts/[id]/publish`

Get detailed publishing status for a post.

#### Request

```bash
GET /api/admin/posts/cmj7abc123/publish
```

#### Response (Published Post)

```json
{
  "id": "cmj7abc123",
  "status": "PUBLISHED",
  "platform": "FACEBOOK",
  "profile": {
    "id": "cmj7xyz789",
    "name": "My Business Page",
    "platform": "FACEBOOK",
    "platformUsername": "mybusiness",
    "isActive": true
  },
  "publishedAt": "2024-12-16T08:00:00.000Z",
  "platformPostId": "123456789_987654321",
  "metadata": {
    "platform": "facebook",
    "publishedAt": "2024-12-16T08:00:00.000Z",
    "postId": "987654321"
  },
  "createdAt": "2024-12-15T20:00:00.000Z",
  "updatedAt": "2024-12-16T08:00:00.000Z"
}
```

#### Response (Failed Post)

```json
{
  "id": "cmj7abc123",
  "status": "FAILED",
  "platform": "TWITTER",
  "profile": {
    "id": "cmj7xyz789",
    "name": "My Twitter",
    "platform": "TWITTER",
    "platformUsername": "myhandle",
    "isActive": true
  },
  "failedAt": "2024-12-16T08:05:00.000Z",
  "errorMessage": "Twitter API rate limit exceeded (after 3 attempts)",
  "canRetry": true,
  "createdAt": "2024-12-16T08:00:00.000Z",
  "updatedAt": "2024-12-16T08:05:00.000Z"
}
```

#### Response (Publishing Post)

```json
{
  "id": "cmj7abc123",
  "status": "PUBLISHING",
  "platform": "INSTAGRAM",
  "profile": {
    "id": "cmj7xyz789",
    "name": "My Instagram",
    "platform": "INSTAGRAM",
    "platformUsername": "myinsta",
    "isActive": true
  },
  "message": "Post is currently being published",
  "createdAt": "2024-12-16T08:00:00.000Z",
  "updatedAt": "2024-12-16T08:01:00.000Z"
}
```

#### Response (Scheduled Post)

```json
{
  "id": "cmj7abc123",
  "status": "SCHEDULED",
  "platform": "TIKTOK",
  "profile": {
    "id": "cmj7xyz789",
    "name": "My TikTok",
    "platform": "TIKTOK",
    "platformUsername": "@mytiktok",
    "isActive": true
  },
  "scheduledAt": "2024-12-16T20:00:00.000Z",
  "createdAt": "2024-12-16T08:00:00.000Z",
  "updatedAt": "2024-12-16T08:00:00.000Z"
}
```

---

## Queue Management

### GET `/api/admin/queue-stats`

Get real-time queue statistics.

#### Request

```bash
GET /api/admin/queue-stats
```

#### Response

```json
{
  "success": true,
  "stats": {
    "waiting": 5,
    "active": 2,
    "completed": 142,
    "failed": 3,
    "delayed": 8
  },
  "isProcessing": true
}
```

**Fields:**
- `waiting` - Jobs waiting to be processed
- `active` - Jobs currently being processed
- `completed` - Successfully completed jobs
- `failed` - Failed jobs (after all retries)
- `delayed` - Scheduled jobs waiting for their time
- `isProcessing` - Whether the worker is processing jobs

---

## Usage Examples

### Retry a Failed Post

```typescript
// 1. Check post status
const status = await fetch('/api/admin/posts/cmj7abc123/publish')
  .then(r => r.json());

if (status.status === 'FAILED' && status.canRetry) {
  // 2. Trigger retry
  const result = await fetch('/api/admin/posts/cmj7abc123/publish', {
    method: 'POST'
  }).then(r => r.json());
  
  console.log('Retry queued:', result.data.jobId);
}
```

### Test Post Publishing

```typescript
// Manually trigger publishing for testing
async function testPublish(postId: string) {
  try {
    const response = await fetch(`/api/admin/posts/${postId}/publish`, {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Post queued:', result.data.jobId);
      
      // Poll for completion
      const checkStatus = setInterval(async () => {
        const status = await fetch(`/api/admin/posts/${postId}/publish`)
          .then(r => r.json());
        
        if (status.status === 'PUBLISHED') {
          console.log('Published!', status.platformPostId);
          clearInterval(checkStatus);
        } else if (status.status === 'FAILED') {
          console.error('Failed:', status.errorMessage);
          clearInterval(checkStatus);
        }
      }, 2000);
    } else {
      console.error('Failed to queue:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Monitor Queue Health

```typescript
// Check queue statistics
async function monitorQueue() {
  const stats = await fetch('/api/admin/queue-stats')
    .then(r => r.json());
  
  console.log('Queue Stats:', stats.stats);
  
  // Alert if too many failures
  if (stats.stats.failed > 10) {
    console.warn('High failure rate detected!');
  }
  
  // Alert if queue is stalled
  if (!stats.isProcessing && stats.stats.waiting > 0) {
    console.error('Queue worker may be down!');
  }
}

// Run every 30 seconds
setInterval(monitorQueue, 30000);
```

### Bulk Retry Failed Posts

```typescript
// Retry all failed posts
async function retryAllFailed() {
  // 1. Get all failed posts
  const posts = await fetch('/api/posts?status=FAILED')
    .then(r => r.json());
  
  // 2. Retry each one
  for (const post of posts.posts) {
    try {
      const result = await fetch(`/api/admin/posts/${post.id}/publish`, {
        method: 'POST'
      }).then(r => r.json());
      
      if (result.success) {
        console.log(`Retrying post ${post.id}`);
      }
      
      // Rate limit: 1 request per second
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to retry ${post.id}:`, error);
    }
  }
}
```

---

## Error Handling

### Common Error Responses

#### Post Not Found

```json
{
  "error": "Post not found"
}
```

**Status:** `404 Not Found`

#### Unauthorized

```json
{
  "error": "Unauthorized"
}
```

**Status:** `401 Unauthorized`

#### Forbidden (Not Owner)

```json
{
  "error": "Forbidden"
}
```

**Status:** `403 Forbidden`

#### Queue Error

```json
{
  "error": "Failed to queue post for publishing",
  "message": "Queue operation timed out. Please ensure Redis is running..."
}
```

**Status:** `500 Internal Server Error`

### Error Recovery

1. **Queue Timeout:**
   ```bash
   # Check Redis is running
   docker ps | grep redis
   
   # Restart if needed
   npm run redis:docker
   ```

2. **Profile Inactive:**
   - Reconnect the social media profile
   - Check token expiration
   - Verify API credentials

3. **Rate Limit:**
   - Wait for rate limit window to reset
   - Reduce publishing frequency
   - Upgrade API plan if needed

4. **Post Already Published:**
   - This is normal, post is already live
   - Check social media to verify
   - Use GET endpoint to see details

---

## Queue Retry Logic

Posts automatically retry on failure with exponential backoff:

### Retry Configuration

```typescript
{
  attempts: 3,           // Max retry attempts
  backoff: {
    type: "exponential", // Exponential backoff
    delay: 2000          // Start with 2s delay
  }
}
```

### Retry Schedule

| Attempt | Delay | Total Wait |
|---------|-------|------------|
| 1       | 0s    | 0s         |
| 2       | 2s    | 2s         |
| 3       | 4s    | 6s         |

### Retry Behavior

**During Retry:**
- Post status: `PUBLISHING`
- Error message: "Error (attempt 1/3, retrying...)"

**After All Retries Failed:**
- Post status: `FAILED`
- Error message: "Error (after 3 attempts)"
- Can be manually retried via admin endpoint

**On Success (any attempt):**
- Post status: `PUBLISHED`
- `publishedAt` timestamp set
- `platformPostId` stored

---

## Logging

All admin actions are logged with detailed information:

```
[Admin] Manually triggering publish for post cmj7abc123 by user cmj78sr7w
[Admin] Reset failed post cmj7abc123 to SCHEDULED status
[Queue] Added post cmj7abc123 to queue (job ID: post-cmj7abc123, delay: 0ms)
[Admin] Successfully queued post cmj7abc123 for publishing (job ID: post-cmj7abc123)
```

Queue processing logs include attempt numbers:

```
[Queue] Processing post cmj7abc123 for user cmj78sr7w (attempt 1/3)
[Queue] Publishing post cmj7abc123 to TWITTER...
[Twitter] Publishing post cmj7abc123 to profile cmj7xyz789
[Twitter] Content split into 1 tweet(s)
[Twitter] Posting tweet 1/1...
[Twitter] Successfully published to Twitter. Tweet ID: 1234567890
[Queue] Successfully published post cmj7abc123 (platform ID: 1234567890)
[Queue] Job post-cmj7abc123 completed: { success: true, platformPostId: '1234567890', ... }
```

Failed attempts are logged with retry information:

```
[Queue] Failed to publish post cmj7abc123 (attempt 1/3): Twitter API rate limit exceeded
[Queue] Will retry post cmj7abc123 in 2000ms (attempt 2/3)
[Queue] Job post-cmj7abc123 failed (attempt 1/3), will retry: Twitter API rate limit exceeded
```

Final failures are logged distinctly:

```
[Queue] Failed to publish post cmj7abc123 (attempt 3/3): Twitter API rate limit exceeded
[Queue] All retry attempts exhausted for post cmj7abc123
[Queue] Job post-cmj7abc123 failed after 3 attempts (final): Twitter API rate limit exceeded
```

---

## Best Practices

### 1. Always Check Status First

```typescript
// Check before triggering
const status = await getPostStatus(postId);
if (status.status === 'PUBLISHING') {
  console.log('Already publishing, wait...');
  return;
}
```

### 2. Use Appropriate Delays

```typescript
// Don't spam the API
for (const post of posts) {
  await publishPost(post.id);
  await sleep(1000); // 1 second between requests
}
```

### 3. Handle Errors Gracefully

```typescript
try {
  await publishPost(postId);
} catch (error) {
  if (error.status === 409) {
    // Already publishing, not a real error
    console.log('Post is already being published');
  } else if (error.status === 400) {
    // Profile issue, alert user
    alert('Please reconnect your social media account');
  } else {
    // Unexpected error
    console.error('Unexpected error:', error);
  }
}
```

### 4. Monitor Queue Health

```typescript
// Regular health checks
setInterval(async () => {
  const stats = await getQueueStats();
  
  // Alert on issues
  if (stats.stats.failed > 50) {
    alertAdmins('High failure rate!');
  }
  
  if (!stats.isProcessing) {
    alertAdmins('Queue worker may be down!');
  }
}, 60000); // Every minute
```

---

## Related Documentation

- [Queue Management](./QUEUE_MANAGEMENT.md) - Queue system overview
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues
- [Facebook Integration](./FACEBOOK_INTEGRATION.md) - Facebook API
- [Twitter Integration](./TWITTER_INTEGRATION.md) - Twitter API

---

**Last Updated**: December 16, 2024  
**API Version**: 1.0.0





