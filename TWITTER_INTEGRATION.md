# Twitter/X API Integration Guide

Complete setup guide for integrating Twitter/X OAuth 2.0 and posting capabilities into Schedy.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Twitter Developer Setup](#twitter-developer-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Migration](#database-migration)
6. [How It Works](#how-it-works)
7. [Usage Guide](#usage-guide)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

---

## Overview

This integration enables:

- **OAuth 2.0 with PKCE** - Secure authorization flow
- **Tweet Posting** - Publish tweets with text and media
- **Thread Support** - Automatically split long content into tweet threads
- **Media Upload** - Support for up to 4 images or 1 video per tweet
- **Token Management** - Automatic token refresh and expiration tracking

### Key Features

- ✅ Twitter OAuth 2.0 with PKCE (most secure)
- ✅ Tweet creation with Twitter API v2
- ✅ Automatic thread creation for content > 280 characters
- ✅ Media upload support (images and videos)
- ✅ Rate limit handling
- ✅ Error handling with user-friendly messages
- ✅ Token refresh mechanism

---

## Prerequisites

Before starting, ensure you have:

- [x] A Twitter/X account
- [x] Access to [Twitter Developer Portal](https://developer.twitter.com/)
- [x] Node.js 18+ and npm installed
- [x] Redis server running (for queue management)
- [x] Prisma database migrations applied

---

## Twitter Developer Setup

### Step 1: Create a Twitter Developer Account

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Sign in with your Twitter account
3. Apply for a developer account (usually instant approval for basic access)

### Step 2: Create a Twitter App

1. In the Developer Portal, click **"+ Create Project"**
2. Enter project details:
   - **Project Name**: "Schedy Social Scheduler" (or your preference)
   - **Use Case**: "Making a bot" or "Exploring the API"
   - **Project Description**: Brief description of your scheduling tool

3. Create an **App** within the project:
   - **App Name**: "Schedy" (must be unique across Twitter)
   - **App Description**: "Social media scheduling and posting tool"

### Step 3: Configure App Settings

1. Go to your App's **Settings** tab

2. **User authentication settings** → Click **"Set up"**

3. Configure OAuth 2.0:
   - **App permissions**: Read and Write
   - **Type of App**: Web App
   - **App info**:
     - **Callback URI / Redirect URL**: `http://localhost:3001/api/social/twitter/callback`
       - For production, use your production URL: `https://yourdomain.com/api/social/twitter/callback`
     - **Website URL**: `http://localhost:3001` (or your production URL)
   
4. **Save** the configuration

### Step 4: Get Your API Credentials

1. Go to the **Keys and tokens** tab

2. Copy the **OAuth 2.0 Client ID and Client Secret**:
   - **Client ID**: Starts with something like `VGhpc0lzQW...`
   - **Client Secret**: A long random string

3. **IMPORTANT**: Save the Client Secret immediately - you won't be able to see it again!

---

## Environment Configuration

### Step 1: Update `.env` File

Add the following variables to your `.env` file:

```env
# Twitter/X App Credentials
TWITTER_CLIENT_ID="your-twitter-oauth2-client-id"
TWITTER_CLIENT_SECRET="your-twitter-oauth2-client-secret"
TWITTER_REDIRECT_URI="http://localhost:3001/api/social/twitter/callback"
```

**For Production:**

```env
TWITTER_CLIENT_ID="your-production-client-id"
TWITTER_CLIENT_SECRET="your-production-client-secret"
TWITTER_REDIRECT_URI="https://yourdomain.com/api/social/twitter/callback"
```

### Step 2: Verify Configuration

The system will validate credentials on startup. Check your terminal for:

```
[Twitter] Configuration loaded successfully
```

---

## Database Migration

The OAuthState table is required for PKCE flow.

### Apply Migration

```bash
npx prisma migrate dev
```

This creates the `OAuthState` table to store:
- OAuth state parameters
- PKCE code verifiers
- Expiration timestamps

### Verify Schema

Check `prisma/schema.prisma`:

```prisma
model OAuthState {
  id           String    @id @default(cuid())
  userId       String
  state        String    @unique
  codeVerifier String
  platform     Platform
  expiresAt    DateTime
  createdAt    DateTime  @default(now())

  @@index([userId, platform])
  @@index([state])
  @@index([expiresAt])
}
```

---

## How It Works

### OAuth 2.0 Flow with PKCE

```
┌─────────┐                               ┌─────────┐                               ┌─────────────┐
│  User   │                               │  Schedy │                               │   Twitter   │
└────┬────┘                               └────┬────┘                               └──────┬──────┘
     │                                         │                                            │
     │  1. Click "Connect Twitter"             │                                            │
     ├────────────────────────────────────────>│                                            │
     │                                         │                                            │
     │                                         │  2. Generate state & PKCE verifier         │
     │                                         │     Store in OAuthState table              │
     │                                         │────────┐                                   │
     │                                         │        │                                   │
     │                                         │<───────┘                                   │
     │                                         │                                            │
     │                                         │  3. Redirect to Twitter OAuth              │
     │                                         ├───────────────────────────────────────────>│
     │                                         │     with code_challenge                    │
     │                                         │                                            │
     │  4. User authorizes app                 │                                            │
     │<────────────────────────────────────────┼────────────────────────────────────────────│
     │                                         │                                            │
     │  5. Twitter redirects back              │                                            │
     │     with authorization code             │                                            │
     ├────────────────────────────────────────>│                                            │
     │                                         │                                            │
     │                                         │  6. Exchange code for access token         │
     │                                         │     (using code_verifier from DB)          │
     │                                         ├───────────────────────────────────────────>│
     │                                         │                                            │
     │                                         │  7. Return access token & user info        │
     │                                         │<───────────────────────────────────────────┤
     │                                         │                                            │
     │                                         │  8. Store profile in database              │
     │                                         │────────┐                                   │
     │                                         │        │                                   │
     │                                         │<───────┘                                   │
     │                                         │                                            │
     │  9. Redirect to profiles page           │                                            │
     │<────────────────────────────────────────┤                                            │
     │                                         │                                            │
```

### Publishing Flow

```
┌─────────┐                    ┌────────────┐                    ┌─────────────┐
│  Queue  │                    │   Worker   │                    │   Twitter   │
└────┬────┘                    └─────┬──────┘                    └──────┬──────┘
     │                               │                                   │
     │  1. Job: Publish post         │                                   │
     ├──────────────────────────────>│                                   │
     │                               │                                   │
     │                               │  2. Load post & profile from DB   │
     │                               │────────┐                          │
     │                               │        │                          │
     │                               │<───────┘                          │
     │                               │                                   │
     │                               │  3. Split content into tweets     │
     │                               │     (if > 280 chars)              │
     │                               │────────┐                          │
     │                               │        │                          │
     │                               │<───────┘                          │
     │                               │                                   │
     │                               │  4. Upload media (if any)         │
     │                               ├──────────────────────────────────>│
     │                               │                                   │
     │                               │  5. Return media IDs              │
     │                               │<──────────────────────────────────┤
     │                               │                                   │
     │                               │  6. Post first tweet              │
     │                               │     (with media)                  │
     │                               ├──────────────────────────────────>│
     │                               │                                   │
     │                               │  7. Return tweet ID               │
     │                               │<──────────────────────────────────┤
     │                               │                                   │
     │                               │  8. Post reply tweets             │
     │                               │     (for threads)                 │
     │                               ├──────────────────────────────────>│
     │                               │                                   │
     │                               │  9. Update post status in DB      │
     │                               │────────┐                          │
     │                               │        │                          │
     │                               │<───────┘                          │
     │                               │                                   │
     │  10. Job complete             │                                   │
     │<──────────────────────────────┤                                   │
     │                               │                                   │
```

---

## Usage Guide

### Connecting a Twitter Account

1. **Navigate to Profiles**:
   - Click on **Profiles** in the sidebar

2. **Connect Twitter**:
   - Click **"+ Connect Profile"**
   - Select **Twitter**
   - Click **"Connect Twitter via OAuth"**

3. **Authorize on Twitter**:
   - You'll be redirected to Twitter
   - Review the permissions requested
   - Click **"Authorize app"**

4. **Success**:
   - You'll be redirected back to Schedy
   - Your Twitter account is now connected!

### Creating a Tweet

1. **Navigate to Posts**:
   - Click **"New Post"** or go to `/posts/new`

2. **Compose Tweet**:
   - Enter your content (280 chars or more for threads)
   - Upload media (optional):
     - Up to 4 images, OR
     - 1 video
   - Select your Twitter profile

3. **Choose Publishing Option**:
   - **Post Now**: Publish immediately
   - **Schedule**: Set a future date/time

4. **Publish**:
   - Click **"Post Now"** or **"Schedule Post"**
   - Monitor status in the Posts list

### Tweet Features

#### Text Content

- **Regular Tweet**: Up to 280 characters
- **Thread**: Automatically created for longer content
  - Each tweet numbered: `1/3`, `2/3`, `3/3`
  - Split intelligently at sentence boundaries

#### Media Support

- **Images**: Up to 4 images (JPEG, PNG, GIF)
  - Max size: 5MB each
  - Optimal: 1200x675px (16:9)

- **Videos**: 1 video per tweet
  - Max size: 512MB
  - Max duration: 2 minutes 20 seconds
  - Formats: MP4, MOV

#### Hashtags & Mentions

- Use `#hashtag` anywhere in your content
- Mention users with `@username`
- Both count toward 280-character limit

---

## Testing

### Test OAuth Flow

```bash
# 1. Start the development server
npm run dev:docker

# 2. Open browser
http://localhost:3001/profiles

# 3. Click "Connect Profile" → "Twitter" → "Connect Twitter via OAuth"

# 4. Verify:
#    - Redirected to Twitter
#    - Returns to profiles page
#    - New Twitter profile appears in list
```

### Test Tweet Posting

```bash
# 1. Create a test post via UI:
#    - Go to /posts/new
#    - Enter: "Hello from Schedy! This is a test tweet. #testing"
#    - Select Twitter profile
#    - Click "Post Now"

# 2. Check terminal logs:
[Queue] Processing post cmj... for user cmj...
[Twitter] Publishing post cmj... to profile cmj...
[Twitter] Content split into 1 tweet(s)
[Twitter] Posting tweet 1/1...
[Twitter] Successfully published. Tweet ID: 1234567890
[Queue] Successfully published post cmj...

# 3. Verify on Twitter:
#    - Check your Twitter feed
#    - Tweet should appear with correct content
```

### Test Thread Creation

```bash
# 1. Create a long post (>280 chars):
#    Content: "This is a very long tweet that will be split into a thread.
#              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
#              Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
#              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
#              nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
#              reprehenderit in voluptate velit esse cillum dolore eu fugiat."

# 2. Check terminal:
[Twitter] Content split into 3 tweet(s)
[Twitter] Posting tweet 1/3...
[Twitter] Posting tweet 2/3...
[Twitter] Posting tweet 3/3...

# 3. Verify thread on Twitter:
#    - First tweet should have "1/3" prefix
#    - Subsequent tweets reply to previous
#    - All tweets linked as a thread
```

---

## Troubleshooting

### Common Issues

#### 1. "Invalid Twitter API credentials"

**Cause**: Missing or incorrect `TWITTER_CLIENT_ID` or `TWITTER_CLIENT_SECRET`

**Solution**:
```bash
# Check .env file
cat .env | grep TWITTER

# Verify values match your Twitter Developer Portal
# Keys and tokens → OAuth 2.0 Client ID and Client Secret

# Restart server after updating .env
npm run dev:docker
```

#### 2. "Invalid or expired Twitter authorization state"

**Cause**: OAuth state expired (10-minute TTL) or database issue

**Solution**:
```bash
# Try connecting again - generate new state
# If persists, check database:

npx prisma studio
# Verify OAuthState table exists and is accessible

# Clean expired states:
npx prisma db execute --stdin < cleanup.sql
# cleanup.sql: DELETE FROM OAuthState WHERE expiresAt < datetime('now');
```

#### 3. "This tweet has already been posted recently"

**Cause**: Twitter doesn't allow duplicate tweets within a short time

**Solution**:
- Modify your content slightly
- Add a timestamp or emoji
- Wait 5-10 minutes before reposting

#### 4. "Twitter API rate limit exceeded"

**Cause**: Too many requests in 15-minute window

**Limits**:
- Tweet creation: 50 tweets per 24 hours (user context)
- Media upload: 25 requests per 15 minutes

**Solution**:
- Wait 15 minutes
- Check rate limit status:
  ```bash
  curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
       "https://api.twitter.com/2/tweets"
  # Check X-Rate-Limit-Remaining header
  ```

#### 5. "Failed to upload media"

**Cause**: Media file too large or invalid format

**Solution**:
- **Images**: Max 5MB, use JPEG/PNG
- **Videos**: Max 512MB, use MP4
- Compress media before uploading
- Check file isn't corrupted

#### 6. "Token has expired"

**Cause**: Access token lifetime exceeded

**Solution**:
- Reconnect your Twitter account
- System will automatically use refresh token if available
- Check token expiration in profiles page

---

## API Reference

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `TWITTER_CLIENT_ID` | Yes | OAuth 2.0 Client ID from Twitter Developer Portal | - |
| `TWITTER_CLIENT_SECRET` | Yes | OAuth 2.0 Client Secret | - |
| `TWITTER_REDIRECT_URI` | No | OAuth callback URL | `http://localhost:3001/api/social/twitter/callback` |

### API Endpoints

#### POST `/api/social/twitter/connect`

Initiates Twitter OAuth 2.0 flow with PKCE.

**Response**:
```json
{
  "url": "https://twitter.com/i/oauth2/authorize?..."
}
```

#### GET `/api/social/twitter/callback`

Handles OAuth callback and stores credentials.

**Query Parameters**:
- `code`: Authorization code from Twitter
- `state`: CSRF protection state parameter

**Response**: Redirects to `/profiles` with success/error message

### Core Functions

#### `src/lib/social/twitter.ts`

```typescript
// Generate OAuth URL
generateTwitterAuthUrl(state: string, codeChallenge: string): string

// Exchange code for token
exchangeTwitterCode(code: string, codeVerifier: string): Promise<TwitterTokenResponse>

// Get user info
getTwitterUserInfo(accessToken: string): Promise<TwitterUserData>

// Publish tweet
publishToTwitter(
  profileId: string,
  postId: string,
  content: string,
  mediaUrls: string
): Promise<{ platformPostId: string; metadata?: any }>

// Split long content
splitIntoTweets(content: string, maxLength?: number): string[]

// Refresh token
refreshTwitterToken(refreshToken: string): Promise<TwitterTokenResponse>

// Error handling
handleTwitterError(error: any): string
```

### Twitter API v2 Endpoints Used

- `POST /2/oauth2/token` - Token exchange
- `GET /2/users/me` - User information
- `POST /2/tweets` - Create tweet
- `POST /1.1/media/upload` - Upload media

---

## Best Practices

### Security

1. **Never commit credentials**:
   ```bash
   # Ensure .env is in .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use environment variables**: Never hardcode credentials

3. **Rotate secrets regularly**: Update Client Secret every 3-6 months

4. **Use HTTPS in production**: Update `TWITTER_REDIRECT_URI` to HTTPS

### Content Guidelines

1. **Respect Twitter's Rules**:
   - No spam or automated excessive posting
   - Follow Twitter's Automation Rules
   - Respect rate limits

2. **Optimize for Engagement**:
   - Keep tweets concise
   - Use relevant hashtags (1-2 per tweet)
   - Add media for higher engagement
   - Post during peak hours

3. **Thread Best Practices**:
   - First tweet should be self-contained
   - Use thread for storytelling or detailed info
   - Add a summary in the last tweet

### Performance

1. **Rate Limiting**:
   - Implement backoff strategy
   - Monitor rate limit headers
   - Queue posts during high-traffic periods

2. **Media Optimization**:
   - Compress images before upload
   - Use appropriate formats (JPEG for photos, PNG for graphics)
   - Transcode videos to MP4

---

## Additional Resources

- [Twitter API v2 Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [OAuth 2.0 with PKCE](https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code)
- [Tweet Creation Guide](https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/introduction)
- [Media Upload Guide](https://developer.twitter.com/en/docs/twitter-api/v1/media/upload-media/overview)
- [Rate Limits](https://developer.twitter.com/en/docs/twitter-api/rate-limits)
- [Twitter Developer Forum](https://twittercommunity.com/)

---

## Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review terminal logs for error messages
3. Verify your Twitter Developer Portal settings
4. Check Twitter API status: https://api.twitterstat.us/

---

**Last Updated**: December 16, 2024  
**API Version**: Twitter API v2  
**OAuth Version**: OAuth 2.0 with PKCE







