## Token Management System

Comprehensive token management with automatic refresh, expiration checking, and proactive maintenance for all social media platforms.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Token Refresh Functions](#token-refresh-functions)
5. [Pre-Publish Token Check](#pre-publish-token-check)
6. [Background Job](#background-job)
7. [API Endpoints](#api-endpoints)
8. [Usage Examples](#usage-examples)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Token Management System ensures social media access tokens remain valid by:

- **Automatic Refresh** - Refreshes tokens before expiration
- **Pre-Publish Checks** - Validates tokens before posting
- **Proactive Maintenance** - Daily cron job refreshes expiring tokens
- **Error Handling** - Marks profiles inactive on failure and notifies users

### Token Lifetimes

| Platform | Token Type | Lifetime | Refresh Method |
|----------|------------|----------|----------------|
| Facebook | Long-lived | 60 days | Exchange short for long |
| Instagram | Page token | 60 days | Same as Facebook |
| Twitter | OAuth 2.0 | Varies | Refresh token |
| TikTok | OAuth 2.0 | 1 year | Refresh token |

---

## Features

### ✅ Automatic Token Refresh

- Refresh tokens 24 hours before expiration
- Platform-specific refresh logic
- Database updates with new expiration dates

### ✅ Pre-Publish Validation

- Every post checks token validity before publishing
- Automatic refresh if expiring soon
- Fails gracefully if token invalid

### ✅ Proactive Maintenance

- Daily cron job at 2 AM (prod) / Hourly (dev)
- Checks all active profiles
- Refreshes tokens expiring within 24 hours

### ✅ Error Handling

- Marks profiles inactive on refresh failure
- Stores detailed error messages
- Prepares for user notifications
- Requires re-authentication

---

## Architecture

### Core Components

```
src/lib/social/token-manager.ts
├── refreshFacebookToken()      - Facebook/Instagram refresh
├── refreshTikTokToken()        - TikTok refresh
├── refreshTwitterToken()       - Twitter refresh  
├── refreshToken()              - Platform-agnostic refresh
├── ensureValidToken()          - Pre-publish check
├── refreshExpiringTokens()     - Batch refresh for cron
└── markProfileInactive()       - Handle failures

src/lib/cron/token-refresh-job.ts
├── runTokenRefreshJob()        - Execute refresh job
└── scheduleTokenRefreshJob()   - Schedule on startup

src/lib/init.ts
└── initializeApp()             - Setup cron on server start

src/lib/queue.ts
└── Pre-publish token check     - Integrated into worker
```

### Data Flow

```
┌─────────────┐
│   Server    │
│   Startup   │
└──────┬──────┘
       │
       ├─> Initialize App
       │   └─> Schedule Token Refresh Job
       │
       ├─> Daily at 2 AM (Production)
       │   └─> runTokenRefreshJob()
       │       ├─> Get profiles with expiring tokens
       │       ├─> Refresh each token
       │       ├─> Update database
       │       └─> Mark inactive on failure
       │
       └─> Queue Worker (per post)
           └─> ensureValidToken()
               ├─> Check if expired
               ├─> Check if expiring soon (< 24h)
               ├─> Refresh if needed
               └─> Return success/failure
```

---

## Token Refresh Functions

### refreshFacebookToken(profileId)

Refreshes Facebook/Instagram access tokens.

```typescript
const result = await refreshFacebookToken('profile-id');

if (result.success) {
  console.log('Token refreshed:', result.expiresAt);
} else {
  console.error('Refresh failed:', result.message);
}
```

**Process:**
1. Load profile from database
2. Exchange current token for long-lived token (60 days)
3. Update `accessToken` and `tokenExpiresAt` in database
4. Return new expiration date

**Error Handling:**
- Invalid credentials → Return error message
- API rate limit → Return error, will retry later
- Network error → Throw error, will retry

### refreshTikTokToken(profileId)

Refreshes TikTok access tokens using refresh token.

```typescript
const result = await refreshTikTokToken('profile-id');
```

**Process:**
1. Load profile and refresh token from database
2. Call TikTok refresh token API
3. Update `accessToken`, `refreshToken`, and `tokenExpiresAt`
4. TikTok provides new refresh token with each refresh

**Requirements:**
- Profile must have valid `refreshToken`
- Refresh token valid for 1 year

### refreshTwitterToken(profileId)

Refreshes Twitter/X OAuth 2.0 access tokens.

```typescript
const result = await refreshTwitterToken('profile-id');
```

**Process:**
1. Load profile and refresh token from database
2. Call Twitter OAuth 2.0 refresh endpoint
3. Update `accessToken` and optionally `refreshToken`
4. Set new `tokenExpiresAt`

**Twitter Specifics:**
- Uses OAuth 2.0 with PKCE
- Refresh tokens may or may not rotate
- Short-lived access tokens (typically 2 hours)

### refreshToken(profileId)

Platform-agnostic refresh function.

```typescript
const result = await refreshToken('any-profile-id');
```

Automatically detects platform and calls appropriate refresh function:
- `FACEBOOK` / `INSTAGRAM` → `refreshFacebookToken()`
- `TIKTOK` → `refreshTikTokToken()`
- `TWITTER` → `refreshTwitterToken()`

---

## Pre-Publish Token Check

### ensureValidToken(profileId)

Integrated into queue worker before every post.

```typescript
const isValid = await ensureValidToken('profile-id');

if (!isValid) {
  throw new Error('Token invalid, post cannot be published');
}
```

**Logic:**

```javascript
if (token is expired) {
  → Attempt refresh
  → If success: Continue
  → If failed: Mark profile inactive, return false
}

if (token expires within 24 hours) {
  → Proactively refresh
  → If success: Continue
  → If failed: Log warning, continue (token still valid)
}

return true; // Token is valid
```

**Integration in Queue:**

```typescript
// In src/lib/queue.ts
socialPostsQueue.process(async (job) => {
  // ... load post and profile ...
  
  // Check token validity
  const tokenValid = await ensureValidToken(profile.id);
  
  if (!tokenValid) {
    throw new Error('Token validation failed');
  }
  
  // Proceed with publishing
  await publishToSocialMedia(post, profile);
});
```

---

## Background Job

### Daily Cron Job

Runs automatically to refresh expiring tokens.

**Schedule:**
- **Production**: Daily at 2:00 AM
- **Development**: Hourly (for testing)

**Process:**

```typescript
async function runTokenRefreshJob() {
  // 1. Find all active profiles with tokens expiring within 24 hours
  const profiles = await getProfilesNeedingRefresh();
  
  // 2. Refresh each token
  for (const profile of profiles) {
    const result = await refreshToken(profile.id);
    
    if (result.success) {
      // ✓ Token refreshed successfully
      console.log(`Refreshed ${profile.username}`);
    } else {
      // ✗ Refresh failed
      console.error(`Failed to refresh ${profile.username}`);
      
      // Mark profile as inactive
      await markProfileInactive(profile.id, result.message);
      
      // TODO: Send notification to user
      await sendNotification(profile.userId);
    }
    
    // Rate limit: wait 1 second between refreshes
    await sleep(1000);
  }
}
```

**Output:**

```
[Cron] Starting daily token refresh job at 2024-12-16T02:00:00.000Z
[TokenManager] Found 5 profiles with expiring tokens
[TokenManager] Refreshing token for FACEBOOK profile mybusiness (expires in 20h)
[TokenManager] ✓ Successfully refreshed token for mybusiness
[TokenManager] Refreshing token for TWITTER profile myhandle (expires in 18h)
[TokenManager] ✓ Successfully refreshed token for myhandle
[Cron] Token refresh completed: 5 refreshed, 0 failed out of 5 total
```

### Setup on Server Startup

```typescript
// src/lib/init.ts
import { initializeApp } from '@/lib/init';

// Call once on server startup
initializeApp();
```

This schedules the cron job automatically.

---

## API Endpoints

### POST /api/admin/tokens/refresh

Manually trigger token refresh for all expiring tokens.

**Request:**
```bash
curl -X POST http://localhost:3001/api/admin/tokens/refresh \
  -H "Cookie: next-auth.session-token=..."
```

**Response:**
```json
{
  "success": true,
  "message": "Token refresh completed: 5 refreshed, 0 failed out of 5 total",
  "data": {
    "total": 5,
    "refreshed": 5,
    "failed": 0,
    "results": [
      {
        "profileId": "cmj7abc123",
        "platform": "FACEBOOK",
        "username": "mybusiness",
        "success": true,
        "message": "Token refreshed successfully. Expires in 60 days."
      }
    ]
  }
}
```

### GET /api/admin/tokens/refresh

Get list of profiles that need token refresh.

**Request:**
```bash
curl http://localhost:3001/api/admin/tokens/refresh \
  -H "Cookie: next-auth.session-token=..."
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "profiles": [
    {
      "id": "cmj7abc123",
      "platform": "FACEBOOK",
      "username": "mybusiness",
      "tokenExpiresAt": "2024-12-17T10:00:00.000Z",
      "hoursUntilExpiry": 20,
      "isExpired": false
    },
    {
      "id": "cmj7def456",
      "platform": "TWITTER",
      "username": "myhandle",
      "tokenExpiresAt": "2024-12-17T08:00:00.000Z",
      "hoursUntilExpiry": 18,
      "isExpired": false
    }
  ]
}
```

### POST /api/profiles/[id]/refresh-token

Manually refresh a specific profile's token.

**Request:**
```bash
curl -X POST http://localhost:3001/api/profiles/cmj7abc123/refresh-token \
  -H "Cookie: next-auth.session-token=..."
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Token refreshed successfully. Expires in 60 days.",
  "data": {
    "profileId": "cmj7abc123",
    "platform": "FACEBOOK",
    "username": "mybusiness",
    "expiresAt": "2025-02-15T10:00:00.000Z",
    "wasReactivated": false
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Token refresh failed",
  "message": "Invalid credentials. Please check your API settings.",
  "recommendation": "Please try reconnecting your account through the OAuth flow for a fresh token."
}
```

---

## Usage Examples

### Check Token Status

```typescript
import { isTokenExpiringSoon, getTimeUntilExpiry } from '@/lib/social/token-manager';

const profile = await getProfile('cmj7abc123');

if (isTokenExpiringSoon(profile.tokenExpiresAt)) {
  const hours = getTimeUntilExpiry(profile.tokenExpiresAt);
  console.log(`Token expires in ${hours} hours - should refresh!`);
}
```

### Manual Refresh

```typescript
import { refreshToken } from '@/lib/social/token-manager';

const result = await refreshToken('cmj7abc123');

if (result.success) {
  console.log('✓ Token refreshed successfully');
  console.log('New expiration:', result.expiresAt);
} else {
  console.error('✗ Refresh failed:', result.message);
}
```

### Batch Refresh

```typescript
import { refreshExpiringTokens } from '@/lib/social/token-manager';

const summary = await refreshExpiringTokens();

console.log(`Refreshed: ${summary.refreshed}/${summary.total}`);
console.log(`Failed: ${summary.failed}`);

// Check failures
summary.results
  .filter(r => !r.success)
  .forEach(r => {
    console.log(`${r.platform} @${r.username}: ${r.message}`);
  });
```

### Pre-Publish Check

```typescript
import { ensureValidToken } from '@/lib/social/token-manager';

// Before publishing
const isValid = await ensureValidToken('cmj7abc123');

if (isValid) {
  await publishPost(post);
} else {
  throw new Error('Token invalid - please reconnect account');
}
```

---

## Configuration

### Environment Variables

No additional environment variables required. Uses existing platform credentials:

```env
# Facebook
FACEBOOK_APP_ID="..."
FACEBOOK_APP_SECRET="..."

# Twitter
TWITTER_CLIENT_ID="..."
TWITTER_CLIENT_SECRET="..."

# TikTok
TIKTOK_CLIENT_KEY="..."
TIKTOK_CLIENT_SECRET="..."
```

### Token Refresh Threshold

Default: 24 hours before expiration

**Modify in `src/lib/social/token-manager.ts`:**

```typescript
// Change from 24 hours to 48 hours
const TOKEN_REFRESH_THRESHOLD_HOURS = 48;
```

### Cron Schedule

**Production**: Daily at 2 AM  
**Development**: Hourly

**Modify in `src/lib/cron/token-refresh-job.ts`:**

```typescript
// Change time
scheduledTime.setHours(3, 30, 0, 0); // 3:30 AM

// Change frequency (development)
setInterval(runJob, 2 * 60 * 60 * 1000); // Every 2 hours
```

---

## Troubleshooting

### Token Refresh Fails

**Symptoms:**
- Profile marked inactive
- Posts fail with "Token invalid"
- Error: "Failed to refresh token"

**Causes & Solutions:**

1. **Expired Refresh Token**
   - **Cause**: Refresh token itself has expired
   - **Solution**: User must re-authenticate via OAuth
   - **How**: Disconnect and reconnect profile in UI

2. **Invalid API Credentials**
   - **Cause**: `FACEBOOK_APP_SECRET`, `TWITTER_CLIENT_SECRET`, etc. incorrect
   - **Solution**: Verify environment variables
   - **Check**: `.env` file matches developer portal

3. **Rate Limit**
   - **Cause**: Too many refresh requests
   - **Solution**: Wait 15 minutes, try again
   - **Prevention**: Cron job has 1-second delay between requests

4. **Revoked Access**
   - **Cause**: User revoked app permissions on platform
   - **Solution**: Re-authenticate via OAuth
   - **Check**: Platform's app settings

### Profile Marked Inactive

**Why?**
- Token expired and refresh failed
- Indicates user action required

**How to Fix:**

1. **UI Method:**
   - Go to Profiles page
   - Click "Reconnect" button
   - Complete OAuth flow

2. **API Method:**
   ```bash
   # Try manual refresh
   curl -X POST /api/profiles/PROFILE_ID/refresh-token
   
   # If fails, user must reconnect
   ```

3. **Automatic Reactivation:**
   - Profile automatically reactivates on successful token refresh
   - Check `wasReactivated` in API response

### Cron Job Not Running

**Check:**

1. **Server Running?**
   ```bash
   # Check process
   ps aux | grep node
   ```

2. **Initialization Called?**
   ```bash
   # Check logs for:
   [Init] Initializing application...
   [Cron] Scheduling token refresh job
   ```

3. **Next Run Time:**
   ```bash
   # Check logs for:
   [Cron] Next token refresh scheduled for 2024-12-17T02:00:00.000Z
   ```

4. **Manual Trigger:**
   ```bash
   # Force run now
   curl -X POST http://localhost:3001/api/admin/tokens/refresh
   ```

### High Failure Rate

**Alert:**
```
[Cron] WARNING: High token refresh failure rate: 3/5 (60%)
```

**Actions:**

1. **Check API Credentials:**
   - Verify all platform credentials in `.env`
   - Test OAuth flows manually

2. **Check Platform Status:**
   - Facebook: https://developers.facebook.com/status
   - Twitter: https://api.twitterstat.us
   - TikTok: https://developers.tiktok.com

3. **Review Failed Profiles:**
   ```bash
   GET /api/admin/tokens/refresh
   # Check error messages for each profile
   ```

4. **Notify Users:**
   - Send email/notification for reconnection
   - Add banner in UI for affected users

---

## Best Practices

### 1. Monitor Token Health

```typescript
// Regular health check
setInterval(async () => {
  const profiles = await getProfilesNeedingRefresh();
  
  if (profiles.length > 10) {
    alert('Many tokens expiring soon!');
  }
  
  const expired = profiles.filter(p => (p.hoursUntilExpiry || 0) <= 0);
  if (expired.length > 0) {
    alert(`${expired.length} tokens already expired!`);
  }
}, 60 * 60 * 1000); // Every hour
```

### 2. User Notifications

Implement notifications for token issues:

```typescript
// In token-manager.ts
export async function sendTokenRefreshFailureNotification(
  userId: string,
  profile: Profile
) {
  // Send email
  await sendEmail(userId, {
    subject: `Reconnect your ${profile.platform} account`,
    body: `Your token has expired. Please reconnect.`
  });
  
  // Create in-app notification
  await createNotification(userId, {
    type: 'TOKEN_EXPIRED',
    profileId: profile.id,
    message: `Please reconnect your ${profile.platform} account`
  });
}
```

### 3. Graceful Degradation

Don't fail posts immediately on token issues:

```typescript
// Allow temporary token issues
if (attemptNumber < maxAttempts) {
  // Token might refresh before next attempt
  console.log('Token issue, will retry');
} else {
  // Final attempt failed
  throw new Error('Token invalid after retries');
}
```

### 4. Logging

Comprehensive logging helps debugging:

```typescript
console.log(`[TokenManager] Checking token for ${profile.username}`);
console.log(`[TokenManager] Expires: ${profile.tokenExpiresAt}`);
console.log(`[TokenManager] Hours until expiry: ${hoursUntilExpiry}`);
console.log(`[TokenManager] Action: ${action}`);
```

---

## Related Documentation

- [Queue Management](./QUEUE_MANAGEMENT.md) - Queue system with token checks
- [Admin API](./ADMIN_API.md) - Admin endpoints for management
- [Facebook Integration](./FACEBOOK_INTEGRATION.md) - Facebook-specific tokens
- [Twitter Integration](./TWITTER_INTEGRATION.md) - Twitter OAuth 2.0

---

**Last Updated**: December 16, 2024  
**Version**: 1.0.0







