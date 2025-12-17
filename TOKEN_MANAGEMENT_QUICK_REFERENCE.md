# Token Management - Quick Reference

Fast reference for common token management tasks.

## 🚀 Quick Start

```bash
# 1. Server automatically initializes on startup
npm run dev:docker

# 2. Check initialization logs
# Look for:
[Init] Initializing application...
[Cron] Scheduling token refresh job
[Init] Application initialized successfully
```

## 📋 Common Tasks

### Check Profiles Needing Refresh

```bash
curl http://localhost:3001/api/admin/tokens/refresh
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
      "hoursUntilExpiry": 20,
      "isExpired": false
    }
  ]
}
```

### Manually Refresh All Expiring Tokens

```bash
curl -X POST http://localhost:3001/api/admin/tokens/refresh \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

### Refresh Specific Profile

```bash
curl -X POST http://localhost:3001/api/profiles/PROFILE_ID/refresh-token \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

### Check Token Status

```typescript
import { isTokenExpiringSoon, getTimeUntilExpiry } from '@/lib/social/token-manager';

if (isTokenExpiringSoon(profile.tokenExpiresAt)) {
  const hours = getTimeUntilExpiry(profile.tokenExpiresAt);
  console.log(`Token expires in ${hours} hours`);
}
```

## ⏰ Cron Schedule

| Environment | Schedule | Purpose |
|-------------|----------|---------|
| Production | Daily at 2:00 AM | Proactive token refresh |
| Development | Every hour | Testing |

**Next Run:**
- Check logs for: `[Cron] Next token refresh scheduled for...`

## 🔄 Token Lifetimes

| Platform | Lifetime | Refresh Method |
|----------|----------|----------------|
| Facebook | 60 days | Exchange for long-lived |
| Instagram | 60 days | Same as Facebook |
| Twitter | 2 hours | Refresh token |
| TikTok | 1 year | Refresh token |

## ⚠️ Troubleshooting

### Profile Marked Inactive

**Quick Fix:**
```bash
# Try manual refresh
curl -X POST /api/profiles/PROFILE_ID/refresh-token

# If fails, user must reconnect via OAuth
```

### Cron Not Running

**Check:**
```bash
# Look for initialization logs
grep "\[Cron\]" logs/app.log

# Should see scheduled time
[Cron] Next token refresh scheduled for 2024-12-17T02:00:00.000Z
```

**Fix:**
- Restart server
- Check `src/app/layout.tsx` has `initializeApp()`

### Posts Failing with Token Error

**Check:**
```bash
# View queue logs
grep "TokenManager" logs/app.log

# Should see pre-publish checks:
[TokenManager] Checking token validity...
[TokenManager] Token is valid (expires in 45h)
```

## 📊 Key Functions

```typescript
// Refresh token
import { refreshToken } from '@/lib/social/token-manager';
const result = await refreshToken(profileId);

// Check before publish
import { ensureValidToken } from '@/lib/social/token-manager';
const isValid = await ensureValidToken(profileId);

// Batch refresh
import { refreshExpiringTokens } from '@/lib/social/token-manager';
const summary = await refreshExpiringTokens();
```

## 🔧 Configuration

**Token Refresh Threshold:**
```typescript
// src/lib/social/token-manager.ts
const TOKEN_REFRESH_THRESHOLD_HOURS = 24; // Default
```

**Cron Time (Production):**
```typescript
// src/lib/cron/token-refresh-job.ts
scheduledTime.setHours(2, 0, 0, 0); // 2:00 AM
```

## 📖 Full Documentation

- **[TOKEN_MANAGEMENT.md](./TOKEN_MANAGEMENT.md)** - Complete guide
- **[TOKEN_MANAGEMENT_IMPLEMENTATION.md](./TOKEN_MANAGEMENT_IMPLEMENTATION.md)** - Implementation details

---

**Need Help?** See [Troubleshooting](./TOKEN_MANAGEMENT.md#troubleshooting) in full docs.





