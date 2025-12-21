# Twitter Integration - Quick Start Guide

Get Twitter posting up and running in 5 minutes!

## Prerequisites

- [x] Twitter/X account
- [x] Node.js 18+ installed
- [x] Redis running (`npm run dev:docker` starts it automatically)

---

## Step 1: Twitter Developer Setup (5 minutes)

### 1.1 Create Developer Account

1. Visit [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Sign in with your Twitter account
3. Apply for developer access (usually instant)

### 1.2 Create an App

1. Click **"+ Create Project"**
2. Enter project name: `"Schedy"`
3. Select use case: `"Exploring the API"`
4. Create app with name: `"Schedy Social Scheduler"`

### 1.3 Configure OAuth 2.0

1. Go to app **Settings** → **User authentication settings**
2. Click **"Set up"**
3. Configure:
   - **App permissions**: Read and Write ✅
   - **Type of App**: Web App ✅
   - **Callback URI**: `http://localhost:3001/api/social/twitter/callback`
   - **Website URL**: `http://localhost:3001`
4. Click **"Save"**

### 1.4 Get Credentials

1. Go to **Keys and tokens** tab
2. Copy **OAuth 2.0 Client ID** (starts with `VGhpc...`)
3. Copy **Client Secret** (long random string)
   - ⚠️ **Save it now** - you can't see it again!

---

## Step 2: Configure Schedy

### 2.1 Update `.env`

Add to your `.env` file:

```env
TWITTER_CLIENT_ID="your-client-id-here"
TWITTER_CLIENT_SECRET="your-client-secret-here"
TWITTER_REDIRECT_URI="http://localhost:3001/api/social/twitter/callback"
```

### 2.2 Apply Database Migration

```bash
npx prisma migrate dev
```

---

## Step 3: Start & Test

### 3.1 Start Server

```bash
npm run dev:docker
```

Wait for:
```
✓ Ready on http://localhost:3001
[redis] ✓ Redis is ready
```

### 3.2 Connect Twitter Account

1. Open browser: `http://localhost:3001`
2. Login to Schedy
3. Go to **Profiles** → Click **"+ Connect Profile"**
4. Select **Twitter**
5. Click **"Connect Twitter via OAuth"**
6. Authorize app on Twitter
7. You'll be redirected back → See your Twitter profile! ✅

### 3.3 Post Your First Tweet

1. Go to **Posts** → **"New Post"**
2. Enter content:
   ```
   Hello from Schedy! 🚀 This is my first automated tweet. #Schedy #Automation
   ```
3. Select your Twitter profile
4. Click **"Post Now"**
5. Check your Twitter feed → Tweet should be live! 🎉

---

## Step 4: Advanced Features

### Post with Images

1. Create new post
2. Click **"Upload Media"**
3. Select 1-4 images (max 5MB each)
4. Add caption
5. Post!

### Create a Thread (>280 chars)

1. Create new post
2. Enter long content (e.g., 600 characters)
3. Schedy automatically splits into a thread
4. Post → Check Twitter for numbered thread!

### Schedule Tweets

1. Create new post
2. Enter content
3. Click **"Schedule"** instead of "Post Now"
4. Select date & time
5. Click **"Schedule Post"**
6. Post will publish automatically at scheduled time ⏰

---

## Troubleshooting

### "Invalid Twitter API credentials"

**Fix**:
```bash
# Check .env has correct values
cat .env | grep TWITTER

# Restart server
npm run dev:docker
```

### "Twitter authorization failed"

**Fix**:
1. Go to Twitter Developer Portal
2. Check callback URI: `http://localhost:3001/api/social/twitter/callback`
3. Ensure app has "Read and Write" permissions
4. Try connecting again

### "Post stuck in queue"

**Fix**:
```bash
# Check Redis is running
docker ps | grep redis

# Check queue stats
curl http://localhost:3001/api/admin/queue-stats

# Restart Redis if needed
npm run dev:docker
```

---

## Rate Limits

Twitter API v2 limits (Free tier):

- **Tweets**: 50 per 24 hours
- **Media uploads**: 25 per 15 minutes

Schedy automatically handles rate limit errors!

---

## Next Steps

- [Read Full Documentation](./TWITTER_INTEGRATION.md)
- [Learn About Queue Management](./QUEUE_MANAGEMENT.md)
- [Explore Scheduling Features](./SCHEDULING_FUNCTIONALITY.md)

---

## Support

Issues? Check:

1. Terminal logs: `npm run dev:docker`
2. Browser console: `F12` → Console tab
3. Twitter API status: https://api.twitterstat.us/

---

**Need Help?** Open an issue or check [full documentation](./TWITTER_INTEGRATION.md).

**Happy Tweeting!** 🐦







