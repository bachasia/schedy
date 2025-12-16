# Facebook Integration - Quick Start Guide

## 🚀 Get Publishing in 5 Steps

### Step 1: Create Facebook App (5 minutes)

1. Go to https://developers.facebook.com/apps
2. Click **"Create App"**
3. Choose **"Business"** or **"Consumer"**
4. Fill in app details and create

### Step 2: Add Required Products

**For Facebook:**
1. Click **"Add Product"**
2. Add **"Facebook Login"**
3. Configure settings:
   - Add redirect URI: `http://localhost:3001/api/social/facebook/callback`

**For Instagram (optional):**
1. Add **"Instagram Graph API"**
2. Link your Instagram Business Account to a Facebook Page

### Step 3: Configure Environment Variables

Add to your `.env` file:

```env
FACEBOOK_APP_ID="your-app-id-here"
FACEBOOK_APP_SECRET="your-app-secret-here"
FACEBOOK_REDIRECT_URI="http://localhost:3001/api/social/facebook/callback"
```

**Get credentials:**
- Go to **Settings** → **Basic**
- Copy **App ID** and **App Secret**

### Step 4: Connect Your Facebook Page

1. Start your app: `npm run dev`
2. Navigate to `/profiles`
3. Click **"Add New Profile"**
4. Select **"Facebook"** or **"Instagram"**
5. Click **"Connect via OAuth"**
6. Authorize the app
7. Your Pages/accounts will be imported automatically!

### Step 5: Test Publishing

1. Go to `/posts/new`
2. Write your post content
3. Select your connected Facebook profile
4. Upload an image (optional)
5. Schedule for **1 minute from now**
6. Click **"Schedule Post"**
7. Go to `/admin/queue` to watch it publish
8. Check your Facebook Page!

---

## ✅ What You Can Do Now

**Connect Profiles:**
- ✅ Connect Facebook Pages via OAuth
- ✅ Connect Instagram Business Accounts via OAuth
- ✅ Automatic token management

**Publish Content:**
- ✅ Text-only posts
- ✅ Single photo posts
- ✅ Single video posts
- ✅ Multiple photos (carousel/album)

**Schedule Posts:**
- ✅ Schedule for any future date/time
- ✅ Post immediately
- ✅ Automatic publishing via queue

---

## 📋 Quick Checklist

Before publishing:

- [ ] Facebook App created
- [ ] App ID and Secret in `.env`
- [ ] Redirect URI configured in Facebook app
- [ ] At least one Facebook Page connected
- [ ] Test post scheduled and published successfully

---

## 🐛 Quick Troubleshooting

### OAuth Not Working?

**Check:**
1. Redirect URI matches exactly (including http/https)
2. App ID and Secret are correct in `.env`
3. Restart dev server after adding env vars

### Posts Not Publishing?

**Check:**
1. Profile is connected (check `/profiles`)
2. Access token is valid (reconnect if needed)
3. Queue is running (check `/admin/queue`)
4. Check console logs for errors

### "Invalid OAuth Redirect URI" Error?

**Fix:**
1. Go to Facebook App Settings
2. Click Facebook Login → Settings
3. Add `http://localhost:3001/api/social/facebook/callback`
4. Save and try again

---

## 🎯 Supported Post Types

### Facebook

| Type | Supported | Notes |
|------|-----------|-------|
| Text only | ✅ | Plain text posts |
| Single photo | ✅ | JPG, PNG, GIF, WebP |
| Single video | ✅ | MP4, MOV (max 10GB) |
| Multiple photos | ✅ | Up to 10 photos |
| Link preview | 🔜 | Coming soon |

### Instagram

| Type | Supported | Notes |
|------|-----------|-------|
| Single photo | ✅ | JPG, PNG (1:1 or 4:5 ratio) |
| Single video | ✅ | MP4 (max 60 seconds) |
| Carousel | ✅ | 2-10 photos |
| Stories | 🔜 | Coming soon |
| Reels | 🔜 | Coming soon |

---

## 💡 Pro Tips

### Tip 1: Use OAuth (Recommended)
✅ Easier setup - no manual tokens  
✅ Auto-imports all Pages  
✅ Tokens managed automatically  
✅ More secure

### Tip 2: Test with Scheduled Posts
Schedule posts 1-2 minutes in the future to:
- Test the queue system
- Verify API integration
- Check error handling

### Tip 3: Monitor the Queue
Go to `/admin/queue` to:
- See pending posts
- Watch posts publish in real-time
- Retry failed posts
- Check error messages

### Tip 4: Keep Tokens Fresh
- Tokens last 60 days
- Reconnect before expiry
- Auto-refresh coming in Phase 2

---

## 📊 Permissions Explained

### Facebook Permissions

**`pages_manage_posts`** (Required)
- Allows publishing posts to your Pages
- Required for scheduling and posting

**`pages_read_engagement`** (Required)
- Allows reading Page data
- Required for token exchange

**`pages_show_list`** (Required)
- Allows listing your Pages
- Required for OAuth flow

### Instagram Permissions

**`instagram_basic`** (Required)
- Basic Instagram account access
- Profile information

**`instagram_content_publish`** (Required)
- Publish content to Instagram
- Required for posting

**`pages_read_engagement`** (Required)
- Read linked Facebook Page data
- Instagram uses Page tokens

---

## 🔄 OAuth Flow Explained

```
1. User clicks "Connect via OAuth"
   ↓
2. Redirects to Facebook Login
   ↓
3. User authorizes app
   ↓
4. Facebook redirects back with code
   ↓
5. Exchange code for tokens
   ↓
6. Get long-lived tokens (60 days)
   ↓
7. Fetch user's Pages
   ↓
8. Save profiles to database
   ↓
9. Redirect to /profiles with success
```

**Total time:** ~30 seconds

---

## 🚀 Production Deployment

### Required Changes

1. **Update Redirect URI:**
   ```env
   FACEBOOK_REDIRECT_URI="https://yourdomain.com/api/social/facebook/callback"
   ```

2. **Add to Facebook App:**
   - Go to Facebook App Settings
   - Add production redirect URI
   - Save changes

3. **Submit for Review (if needed):**
   - Some permissions require review
   - Provide use case and demo
   - Usually approved in 1-2 days

4. **Use HTTPS:**
   - Facebook requires HTTPS in production
   - Get SSL certificate
   - Configure on your hosting

---

## 📝 Testing Checklist

### OAuth Connection
- [ ] Facebook connect works
- [ ] Instagram connect works
- [ ] Pages imported correctly
- [ ] Tokens saved to database

### Publishing
- [ ] Text post publishes
- [ ] Photo post publishes
- [ ] Video post publishes (if applicable)
- [ ] Carousel post publishes (if applicable)

### Error Handling
- [ ] Invalid token shows error
- [ ] Failed posts can be retried
- [ ] Queue shows failures
- [ ] Error messages are clear

---

## 🆘 Need Help?

### Documentation
- Full guide: `FACEBOOK_INTEGRATION.md`
- Queue system: `QUEUE_MANAGEMENT.md`
- Environment vars: `ENVIRONMENT_VARIABLES.md`

### Common Issues
1. **"App not set up" error** → Check env variables
2. **"Invalid redirect URI"** → Update in Facebook app settings
3. **"Token expired"** → Reconnect profile
4. **Posts not publishing** → Check queue logs

---

## ✨ What's Next?

Once basic publishing works:

**Immediate:**
- Test with multiple profiles
- Try different post types
- Monitor success rates

**Soon:**
- Implement token auto-refresh
- Add webhook handling
- Get post analytics
- Support Stories/Reels

---

**Ready to publish? Follow the 5 steps above and you'll be posting in minutes!** 🎉



