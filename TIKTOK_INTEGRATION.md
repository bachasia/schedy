# TikTok Integration Guide

Complete guide for integrating TikTok video posting functionality with Schedy.

## Overview

Schedy supports publishing videos to TikTok using the TikTok Content Posting API and Login Kit. This integration allows users to:

- Connect their TikTok account via OAuth
- Post videos with captions
- Schedule TikTok videos for future posting
- Manage multiple TikTok accounts

## Prerequisites

### 1. TikTok Developer Account

1. Go to https://developers.tiktok.com/
2. Sign in with your TikTok account
3. Complete the developer registration process
4. Verify your email and phone number

### 2. Create a TikTok App

1. Go to **TikTok for Developers** dashboard
2. Click **Manage apps** → **Create an app**
3. Fill in app details:
   - **App name**: Schedy (or your app name)
   - **Company**: Your company name
   - **Redirect URL**: `http://localhost:3001/api/social/tiktok/callback`
   - **Privacy Policy URL**: Your privacy policy URL

4. Select **Products**:
   - ✅ Login Kit
   - ✅ Content Posting API

5. Submit for review (some features require approval)

### 3. Get App Credentials

1. In your app dashboard, go to **Basic Information**
2. Copy your **Client Key**
3. Copy your **Client Secret**
4. Save these securely

## Setup

### 1. Environment Variables

Add these to your `.env` file:

```env
# TikTok App Credentials
TIKTOK_CLIENT_KEY="your_client_key_here"
TIKTOK_CLIENT_SECRET="your_client_secret_here"
TIKTOK_REDIRECT_URI="http://localhost:3001/api/social/tiktok/callback"
```

### 2. Configure Redirect URL

In TikTok Developer Portal:
1. Go to your app → **Settings**
2. Add redirect URI: `http://localhost:3001/api/social/tiktok/callback`
3. For production, add: `https://yourdomain.com/api/social/tiktok/callback`

### 3. Request Scopes

The integration requests these scopes:
- `user.info.basic` - Get user profile information
- `video.upload` - Upload video files
- `video.publish` - Publish videos to TikTok

## Usage

### Connecting a TikTok Account

1. Go to **Profiles** page in Schedy
2. Click **Add Profile**
3. Select **TikTok**
4. Click **Connect TikTok via OAuth**
5. Authorize Schedy on TikTok
6. Account will be automatically added

### Publishing Videos to TikTok

1. Create a **New Post**
2. Select TikTok profile
3. Add video file (required)
4. Add caption (optional)
5. Click **Publish** or **Schedule**

**Important Notes:**
- TikTok only supports **video posts** (no images)
- One video per post
- Videos are published to user's feed

## Video Requirements

### Supported Formats
- MP4
- MOV
- WebM

### Size Limits
- **Maximum**: 4GB
- **Recommended**: < 500MB for faster upload

### Duration Limits
- **Minimum**: 3 seconds
- **Maximum**: 10 minutes
- **Recommended**: 15-60 seconds (better engagement)

### Technical Specs (Recommended)
- **Resolution**: 720x1280 (9:16 vertical) or higher
- **Frame rate**: 30 fps
- **Bitrate**: 5-10 Mbps
- **Audio**: AAC, 128-256 kbps

## API Endpoints

### Connect TikTok Account
```
GET /api/social/tiktok/connect
```

Redirects user to TikTok authorization page.

### OAuth Callback
```
GET /api/social/tiktok/callback?code=xxx&state=xxx
```

Handles OAuth callback, exchanges code for tokens, and saves profile.

### Check Token Status
```
GET /api/profiles/{profileId}/check-token
```

Verifies if TikTok access token is still valid.

## Token Management

### Access Tokens
- **Type**: Bearer token
- **Expires**: Varies (usually 24 hours)
- **Refresh**: Automatic with refresh token

### Refresh Tokens
- **Expires**: Varies (usually 365 days)
- **Usage**: Automatically refreshed by queue worker

### Token Expiration Handling

The system automatically:
1. Checks token validity before posting
2. Refreshes expired tokens
3. Marks profile inactive if refresh fails
4. Notifies user to reconnect

## Privacy Settings

Videos published via Schedy can have these privacy levels:

```typescript
privacy_level: "SELF_ONLY" | "MUTUAL_FOLLOW_FRIENDS" | "PUBLIC_TO_EVERYONE"
```

Currently set to: `PUBLIC_TO_EVERYONE` (configurable)

### Other Post Settings

- **Allow Duet**: true/false
- **Allow Comments**: true/false
- **Allow Stitch**: true/false
- **Video Cover**: Timestamp (milliseconds)

## Limitations

### API Rate Limits

TikTok enforces rate limits:
- **Video uploads**: 5 per hour per user
- **API calls**: 100 per hour per app

If exceeded, you'll see error: `rate_limit_exceeded`

**Solution**: Wait before retrying or request higher limits from TikTok.

### Content Restrictions

Videos must comply with:
- TikTok Community Guidelines
- Copyright laws
- No banned content (violence, explicit content, etc.)

**Note**: TikTok may review videos before publishing.

### Account Requirements

- Account must be **in good standing**
- Not restricted or shadowbanned
- Email verified
- No pending violations

## Troubleshooting

### "access_token_invalid"

**Cause**: Token expired or revoked

**Solution**:
1. Go to Profiles page
2. Click "Check Token" on TikTok profile
3. If expired, disconnect and reconnect account

### "scope_not_authorized"

**Cause**: Missing required permissions

**Solution**:
1. Ensure app has `video.upload` and `video.publish` scopes
2. Reconnect TikTok account
3. Verify all permissions are granted during OAuth

### "video_upload_failed"

**Causes**:
- Video format not supported
- File size too large
- Network error

**Solutions**:
1. Check video format (must be mp4, mov, or webm)
2. Compress video if > 500MB
3. Retry upload

### "spam_risk_too_many_posts"

**Cause**: Posting too frequently

**Solution**:
- Wait at least 5-10 minutes between posts
- Don't post more than 5 videos per hour
- Spread posts throughout the day

### "video_under_review"

**Cause**: TikTok is reviewing video content

**Solution**:
- Wait 1-24 hours for review
- Video will appear once approved
- Ensure content follows Community Guidelines

## Development vs Production

### Development Mode

- Use localhost redirect URI
- Test with personal TikTok account
- Limited to 100 API calls per hour

### Production Mode

1. **Submit app for review**:
   - Go to app dashboard → **Submit for review**
   - Provide app description and use case
   - Wait 1-2 weeks for approval

2. **Update redirect URI**:
   ```env
   TIKTOK_REDIRECT_URI="https://yourdomain.com/api/social/tiktok/callback"
   ```

3. **Configure webhook** (optional):
   - Receive notifications for video status
   - Handle content violations
   - Monitor upload progress

## Testing

### Test Video Upload

1. Create a test video:
   - Format: MP4
   - Duration: 10-30 seconds
   - Resolution: 720x1280
   - Size: < 50MB

2. Connect TikTok account in dev mode

3. Publish test post

4. Check:
   - Video uploads successfully
   - Caption appears correctly
   - Video visibility is correct
   - Link to video works

### Test Scenarios

- ✅ Upload video < 50MB
- ✅ Upload video > 500MB
- ✅ Invalid format (jpg)
- ✅ Token expiration
- ✅ Rate limit handling
- ✅ Network error recovery

## Best Practices

### Video Optimization

1. **Use vertical format** (9:16) for better TikTok experience
2. **Keep videos short** (15-60 seconds) for higher engagement
3. **Add captions** - TikTok's algorithm favors descriptive captions
4. **Use hashtags** - Include relevant hashtags in caption
5. **Post during peak hours** - Schedule for when audience is active

### Caption Tips

```typescript
// Good caption
const caption = "Check out this amazing recipe! 🍕 #cooking #recipe #foodie #tiktokcooks";

// Bad caption
const caption = "Video"; // Too short, no hashtags
```

### Scheduling Strategy

- **Best times**: 6-10 AM, 12-2 PM, 7-11 PM (user's timezone)
- **Frequency**: 1-3 videos per day
- **Consistency**: Post at same times daily

### Error Handling

Always handle these errors gracefully:

```typescript
try {
  await publishToTikTok(profileId, postId, caption, videoUrl);
} catch (error) {
  if (error.code === "rate_limit_exceeded") {
    // Schedule retry in 1 hour
  } else if (error.code === "access_token_invalid") {
    // Mark profile as inactive, notify user
  } else {
    // Log error, mark post as failed
  }
}
```

## Resources

- [TikTok for Developers](https://developers.tiktok.com/)
- [Login Kit Documentation](https://developers.tiktok.com/doc/login-kit-web)
- [Content Posting API](https://developers.tiktok.com/doc/content-posting-api-get-started)
- [TikTok Community Guidelines](https://www.tiktok.com/community-guidelines)

## Support

For issues with:
- **TikTok API**: Contact TikTok Developer Support
- **Schedy Integration**: Create GitHub issue
- **App Review**: Check TikTok Developer Portal

## Security Notes

### Credentials Storage

- **Never commit** credentials to git
- Use environment variables
- Rotate secrets regularly
- Use different credentials for dev/prod

### Token Security

- Access tokens stored encrypted in database
- Tokens never exposed to frontend
- Refresh tokens used securely
- Expired tokens cleaned up automatically

### HTTPS Required

- Production redirect URI **must use HTTPS**
- TikTok will reject HTTP in production
- Use valid SSL certificate

---

**Last Updated**: December 2025
**TikTok API Version**: v2
**Schedy Version**: 0.1.0





