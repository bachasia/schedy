# Facebook Graph API Integration - Complete Guide

## 🎯 Overview

Complete Facebook and Instagram publishing integration using the Facebook Graph API. This implementation includes OAuth authentication flow, token management, and publishing functions for both Facebook Pages and Instagram Business Accounts.

---

## ✅ Features Implemented

### 1. **Facebook Integration Module** (`src/lib/social/facebook.ts`)

#### OAuth Flow Functions:
- ✅ `generateFacebookAuthUrl()` - Generate OAuth authorization URL
- ✅ `exchangeCodeForToken()` - Exchange authorization code for access token
- ✅ `getLongLivedToken()` - Get 60-day long-lived token
- ✅ `getUserPages()` - Fetch user's Facebook Pages
- ✅ `getInstagramAccount()` - Get Instagram Business Account linked to Page

#### Publishing Functions:
- ✅ `publishToFacebook()` - Publish posts to Facebook Pages
  - Text-only posts
  - Single photo posts
  - Single video posts
  - Multiple photos (carousel/album)
- ✅ `publishToInstagram()` - Publish posts to Instagram
  - Single photo posts
  - Single video posts  
  - Carousel posts (up to 10 items)

#### Error Handling:
- ✅ `handleFacebookError()` - Parse and handle Facebook API errors
- ✅ `verifyAccessToken()` - Verify token validity

### 2. **API Routes**

**Connect Route** (`/api/social/facebook/connect`)
- ✅ Initiates OAuth flow
- ✅ Generates secure state parameter
- ✅ Redirects to Facebook Login Dialog
- ✅ Supports both Facebook and Instagram

**Callback Route** (`/api/social/facebook/callback`)
- ✅ Handles OAuth callback
- ✅ Exchanges code for tokens
- ✅ Gets long-lived tokens (60 days)
- ✅ Fetches user's Pages
- ✅ Fetches Instagram accounts
- ✅ Saves profiles to database
- ✅ Redirects with success/error message

### 3. **Queue Integration**

Updated `src/lib/queue.ts`:
- ✅ Imports real Facebook functions
- ✅ Replaces placeholder implementations
- ✅ Parses media URLs from SQLite string format
- ✅ Handles Facebook API errors
- ✅ Updates post status based on results

### 4. **UI Updates**

**ConnectProfileModal** (`src/components/profile/ConnectProfileModal.tsx`):
- ✅ OAuth connect buttons for Facebook/Instagram
- ✅ "Connect via OAuth" button
- ✅ Fallback to manual entry
- ✅ Visual separator between methods

---

## 🔧 Setup Guide

### Step 1: Create Facebook App

1. **Go to Facebook Developers:**
   - Visit: https://developers.facebook.com/apps
   - Click "Create App"

2. **Choose App Type:**
   - Select "Business" or "Consumer"
   - Fill in app details

3. **Add Products:**
   - Add "Facebook Login"
   - Add "Instagram Graph API" (for Instagram)

4. **Configure OAuth Settings:**
   - Go to Facebook Login → Settings
   - Add Valid OAuth Redirect URIs:
     ```
     http://localhost:3001/api/social/facebook/callback
     https://yourdomain.com/api/social/facebook/callback
     ```

5. **Get App Credentials:**
   - Go to Settings → Basic
   - Copy App ID and App Secret

### Step 2: Set Environment Variables

Add to `.env`:

```env
# Facebook Graph API
FACEBOOK_APP_ID="your-app-id-here"
FACEBOOK_APP_SECRET="your-app-secret-here"
FACEBOOK_REDIRECT_URI="http://localhost:3001/api/social/facebook/callback"

# For production:
# FACEBOOK_REDIRECT_URI="https://yourdomain.com/api/social/facebook/callback"
```

### Step 3: Configure Permissions

**Required Permissions for Facebook:**
- `pages_manage_posts` - Publish posts to Pages
- `pages_read_engagement` - Read Page data
- `pages_show_list` - List user's Pages

**Required Permissions for Instagram:**
- `instagram_basic` - Basic Instagram access
- `instagram_content_publish` - Publish content
- `pages_read_engagement` - Read Page data (Instagram linked to Page)
- `pages_show_list` - List user's Pages

### Step 4: Test the Integration

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Navigate to Profiles:**
   - Go to `/profiles`
   - Click "Add New Profile"

3. **Connect Facebook/Instagram:**
   - Select Facebook or Instagram
   - Click "Connect via OAuth"
   - Authorize the app
   - Select Pages/accounts to connect

---

## 📊 OAuth Flow Diagram

```
User clicks "Connect Facebook"
  ↓
GET /api/social/facebook/connect?type=facebook
  ↓
Generate state parameter (CSRF protection)
  - userId
  - type (facebook/instagram)
  - timestamp
  ↓
Redirect to Facebook Login Dialog
  - Client ID
  - Redirect URI
  - Permissions
  - State
  ↓
User authorizes app
  ↓
Facebook redirects to callback
GET /api/social/facebook/callback?code=...&state=...
  ↓
Verify state parameter
  ↓
Exchange code for short-lived token
  ↓
Exchange for long-lived token (60 days)
  ↓
Get user's Facebook Pages
  ↓
For each Page:
  - If Facebook: Save Page as profile
  - If Instagram: Get IG account, save as profile
  ↓
Redirect to /profiles?success=...
  ↓
Show success message
```

---

## 🚀 Publishing Flow

### Facebook Post Publishing

```
Queue processor calls publishToFacebook()
  ↓
Load profile from database
  - platformUserId = Page ID
  - accessToken = Page Access Token
  ↓
Determine post type:
  ↓
TEXT ONLY:
  POST /pageId/feed
  {
    message: content,
    access_token: token
  }
  ↓
SINGLE PHOTO:
  POST /pageId/photos
  {
    url: photoUrl,
    message: content,
    access_token: token
  }
  ↓
SINGLE VIDEO:
  POST /pageId/videos
  {
    file_url: videoUrl,
    description: content,
    access_token: token
  }
  ↓
MULTIPLE PHOTOS:
  1. Upload photos (published=false)
  2. POST /pageId/feed
     {
       message: content,
       attached_media: [{media_fbid: id1}, ...],
       access_token: token
     }
  ↓
Return post ID
  ↓
Update database:
  - status: PUBLISHED
  - platformPostId: result.id
  - publishedAt: now
```

### Instagram Post Publishing

```
Queue processor calls publishToInstagram()
  ↓
Load profile from database
  - platformUserId = Instagram Business Account ID
  - accessToken = Page Access Token (linked Page)
  ↓
Validate media (required for Instagram)
  ↓
SINGLE PHOTO/VIDEO:
  Step 1: Create container
    POST /igAccountId/media
    {
      image_url: url (or video_url),
      caption: content,
      access_token: token
    }
  ↓
  Step 2: Publish container
    POST /igAccountId/media_publish
    {
      creation_id: containerId,
      access_token: token
    }
  ↓
CAROUSEL (multiple photos):
  Step 1: Create item containers
    For each photo:
      POST /igAccountId/media
      {
        image_url: url,
        is_carousel_item: true,
        access_token: token
      }
  ↓
  Step 2: Create carousel container
    POST /igAccountId/media
    {
      media_type: CAROUSEL,
      caption: content,
      children: "id1,id2,id3",
      access_token: token
    }
  ↓
  Step 3: Publish carousel
    POST /igAccountId/media_publish
    {
      creation_id: carouselId,
      access_token: token
    }
  ↓
Return post ID
  ↓
Update database
```

---

## 🔑 Token Management

### Token Types

**1. Short-Lived User Access Token**
- Expires in: 1-2 hours
- Obtained from OAuth flow
- Used to get long-lived token

**2. Long-Lived User Access Token**
- Expires in: 60 days
- Obtained by exchanging short-lived token
- Stored as `refreshToken` in database
- Can be refreshed before expiry

**3. Page Access Token**
- Never expires (if long-lived user token used)
- Obtained from `/me/accounts` endpoint
- Stored as `accessToken` in database
- Used for publishing to Facebook Pages
- Used for Instagram (via linked Page)

### Token Storage

```typescript
Profile model:
{
  accessToken: string,      // Page access token (never expires)
  refreshToken: string,      // User access token (60 days)
  tokenExpiresAt: DateTime,  // User token expiry
}
```

### Token Refresh Strategy

```typescript
// Check if token needs refresh (before expiry)
if (tokenExpiresAt < now + 7 days) {
  // Refresh user access token
  const newToken = await refreshAccessToken(refreshToken);
  
  // Get new page access tokens
  const pages = await getUserPages(newToken);
  
  // Update profiles
  for (page of pages) {
    update(profile, {
      accessToken: page.access_token,
      refreshToken: newToken,
      tokenExpiresAt: now + 60 days
    });
  }
}
```

---

## ⚠️ Error Handling

### Common Facebook API Errors

**1. Token Expired (Code 190)**
```javascript
{
  error: {
    message: "Error validating access token",
    type: "OAuthException",
    code: 190
  }
}

Handling: Show "Please reconnect your account"
```

**2. Rate Limit (Code 32, 4)**
```javascript
{
  error: {
    message: "Application request limit reached",
    code: 32
  }
}

Handling: Retry after delay, show "Rate limit exceeded"
```

**3. Invalid Media (Code 1)**
```javascript
{
  error: {
    message: "Invalid image format",
    code: 1
  }
}

Handling: Show "Invalid media format. Please check file."
```

**4. Permission Error (Code 200)**
```javascript
{
  error: {
    message: "Insufficient permissions",
    code: 200
  }
}

Handling: Show "Reconnect with required permissions"
```

### Error Handling in Code

```typescript
try {
  await publishToFacebook(profileId, content, mediaUrls);
} catch (error) {
  const errorMessage = handleFacebookError(error);
  // errorMessage = user-friendly error string
  
  await prisma.post.update({
    where: { id: postId },
    data: {
      status: "FAILED",
      errorMessage,
      failedAt: new Date()
    }
  });
}
```

---

## 📝 API Reference

### `generateFacebookAuthUrl(state, type)`

**Parameters:**
- `state: string` - Base64 encoded state for CSRF protection
- `type: "facebook" | "instagram"` - Platform type

**Returns:** `string` - OAuth authorization URL

**Example:**
```typescript
const state = Buffer.from(JSON.stringify({
  userId: "user123",
  type: "facebook",
  timestamp: Date.now()
})).toString("base64");

const authUrl = generateFacebookAuthUrl(state, "facebook");
// Returns: https://www.facebook.com/v18.0/dialog/oauth?client_id=...
```

### `exchangeCodeForToken(code)`

**Parameters:**
- `code: string` - Authorization code from OAuth callback

**Returns:** `Promise<FacebookTokenResponse>`

**Example:**
```typescript
const tokenData = await exchangeCodeForToken(code);
// { access_token: "...", token_type: "bearer", expires_in: 7200 }
```

### `getLongLivedToken(shortLivedToken)`

**Parameters:**
- `shortLivedToken: string` - Short-lived access token

**Returns:** `Promise<FacebookTokenResponse>`

**Example:**
```typescript
const longLived = await getLongLivedToken(shortToken);
// { access_token: "...", expires_in: 5184000 } // 60 days
```

### `getUserPages(userAccessToken)`

**Parameters:**
- `userAccessToken: string` - User access token

**Returns:** `Promise<FacebookPageResponse[]>`

**Example:**
```typescript
const pages = await getUserPages(token);
// [
//   {
//     id: "123456",
//     name: "My Page",
//     access_token: "page_token...",
//     category: "Business"
//   }
// ]
```

### `getInstagramAccount(pageId, pageAccessToken)`

**Parameters:**
- `pageId: string` - Facebook Page ID
- `pageAccessToken: string` - Page access token

**Returns:** `Promise<InstagramAccountResponse>`

**Example:**
```typescript
const igData = await getInstagramAccount(pageId, pageToken);
// {
//   instagram_business_account: {
//     id: "17841...",
//     username: "myaccount"
//   }
// }
```

### `publishToFacebook(profileId, content, mediaUrls?)`

**Parameters:**
- `profileId: string` - Profile ID from database
- `content: string` - Post content/message
- `mediaUrls?: string[]` - Array of media URLs

**Returns:** `Promise<FacebookPostResponse>`

**Example:**
```typescript
const result = await publishToFacebook(
  "profile123",
  "Hello world!",
  ["https://example.com/photo.jpg"]
);
// { id: "123456_789012" }
```

### `publishToInstagram(profileId, content, mediaUrls?)`

**Parameters:**
- `profileId: string` - Profile ID from database
- `content: string` - Post caption
- `mediaUrls?: string[]` - Array of media URLs (required)

**Returns:** `Promise<InstagramPublishResponse>`

**Example:**
```typescript
const result = await publishToInstagram(
  "profile123",
  "Check this out! #instagram",
  ["https://example.com/photo.jpg"]
);
// { id: "17895..." }
```

---

## 🧪 Testing

### Test OAuth Flow

1. **Start app in dev mode:**
   ```bash
   npm run dev
   ```

2. **Connect Facebook:**
   - Go to `/profiles`
   - Click "Add New Profile"
   - Select "Facebook"
   - Click "Connect via OAuth"
   - Authorize with Facebook
   - Should redirect back with success

3. **Verify in database:**
   ```bash
   npx prisma studio
   ```
   - Check Profile table
   - Verify accessToken saved
   - Verify platformUserId = Page ID

### Test Publishing

1. **Create a scheduled post:**
   - Go to `/posts/new`
   - Select connected Facebook profile
   - Add content and image
   - Schedule for 1 minute from now

2. **Monitor queue:**
   - Go to `/admin/queue`
   - Watch for post to process
   - Check logs in console

3. **Verify on Facebook:**
   - Go to your Facebook Page
   - Check if post appears
   - Verify content and image

### Test Error Handling

**1. Test Expired Token:**
```typescript
// Manually set tokenExpiresAt to past date
await prisma.profile.update({
  where: { id: profileId },
  data: { tokenExpiresAt: new Date("2020-01-01") }
});

// Try to publish
// Should fail with "Token expired" error
```

**2. Test Invalid Media:**
```typescript
// Try to publish with invalid URL
await publishToFacebook(
  profileId,
  "Test post",
  ["https://invalid-url.com/image.jpg"]
);
// Should fail with "Invalid media" error
```

---

## 🔒 Security Best Practices

### 1. **State Parameter**
- ✅ Includes userId, type, timestamp
- ✅ Base64 encoded
- ✅ Verified on callback
- ✅ Expires after 10 minutes

### 2. **Token Storage**
- ✅ Access tokens stored in database (encrypted column recommended)
- ✅ Never expose tokens in client-side code
- ✅ Use environment variables for app credentials

### 3. **API Route Protection**
- ✅ All routes require authentication
- ✅ Verify user ownership of profiles
- ✅ Validate all input parameters

### 4. **HTTPS Required**
- ⚠️ Facebook requires HTTPS in production
- ✅ Use proper SSL certificates
- ✅ Update redirect URIs to https://

---

## 📈 Production Checklist

Before going live:

- [ ] **Set environment variables:**
  - `FACEBOOK_APP_ID`
  - `FACEBOOK_APP_SECRET`
  - `FACEBOOK_REDIRECT_URI` (with https://)

- [ ] **Submit app for review:**
  - Request `pages_manage_posts` permission
  - Request `instagram_content_publish` permission
  - Provide use case and demo video

- [ ] **Configure production URLs:**
  - Update OAuth redirect URIs
  - Add production domain to app settings

- [ ] **Implement token refresh:**
  - Cron job to refresh tokens before expiry
  - Update profile tokens automatically

- [ ] **Monitor rate limits:**
  - Track API usage
  - Implement retry logic
  - Queue management for high volume

- [ ] **Error monitoring:**
  - Log all API errors
  - Set up alerts for failures
  - Monitor token expirations

- [ ] **Test thoroughly:**
  - Test with multiple accounts
  - Test all post types (text, image, video, carousel)
  - Test error scenarios

---

## 🚀 Next Steps

### Phase 1 (Current) ✅
- [x] OAuth flow
- [x] Token management
- [x] Facebook publishing
- [x] Instagram publishing
- [x] Error handling

### Phase 2 (Future)
- [ ] Token auto-refresh
- [ ] Webhook handling
- [ ] Post insights/analytics
- [ ] Comment management
- [ ] Story publishing (Instagram)
- [ ] Reels publishing (Instagram)

---

## 📚 Resources

- [Facebook Graph API Docs](https://developers.facebook.com/docs/graph-api)
- [Facebook Login](https://developers.facebook.com/docs/facebook-login)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Publishing to Facebook Pages](https://developers.facebook.com/docs/pages/publishing)
- [Publishing to Instagram](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)

---

**🎉 Facebook integration is complete and ready to publish posts!** 🚀







