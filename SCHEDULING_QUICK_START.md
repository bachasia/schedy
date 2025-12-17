# 📅 Scheduling Feature - Quick Start

## ✅ What's Implemented

### **ScheduleForm Component** (`src/components/post/ScheduleForm.tsx`)

A complete scheduling interface with:

#### 🎯 Two Posting Options
- **Post Immediately** - Publish right away
- **Schedule for Later** - Choose specific date/time

#### 📆 Date & Time Picker
- Native HTML inputs (best UX)
- Minimum date: Today
- Minimum time: Current time + 5 minutes
- Real-time validation

#### 🌍 Timezone Selector
- Auto-detects user's timezone
- 9 common timezone options
- Clear labels (ET, CT, PT, GMT, etc.)

#### ✅ Smart Validation
- Must be at least 5 minutes in the future
- Red error message if invalid
- Green success message when valid
- Button disabled until valid

#### 📋 Review Section
Shows before submission:
- Selected profiles (count + names)
- Content preview (2 lines)
- Media count (images/videos)
- Scheduled date/time (formatted)

#### 🔔 Confirmation Modal
- Double-check before posting
- Shows all post details
- Cancel/Confirm buttons
- Loading state

---

## 🔄 How It Works

### Creating a New Post with Scheduling

```
1. Go to /posts/new
2. Fill Content tab (text + select profiles)
3. Upload Media (optional)
4. Click "Continue to Schedule"
5. Choose option:
   a) Post Immediately → Post now
   b) Schedule for Later → Pick date/time
6. Click "Post Now" or "Schedule Post"
7. Confirm in modal
8. Done! ✅
```

### Status Logic

| Action | Status in Database | scheduledAt |
|--------|-------------------|-------------|
| Save as Draft | `DRAFT` | null |
| Post Immediately | `PUBLISHED` | null |
| Schedule for Later | `SCHEDULED` | ISO date |

---

## 🎨 UI Features

### Visual Design
- Radio-style selection buttons
- Calendar/Clock/Globe icons
- Color-coded validation messages
- Responsive grid layout
- Dark mode support

### Validation Feedback

**❌ Invalid (Red):**
```
⚠️ Scheduled time must be at least 5 minutes in the future.
```

**✅ Valid (Green):**
```
✓ Scheduled for December 15, 2025 at 3:30 PM
```

---

## 📱 Responsive

- **Desktop**: Two-column date/time picker
- **Tablet**: Maintained layout
- **Mobile**: Single column, stacked inputs

---

## 🧪 Test It Out

### Test Case 1: Schedule for Tomorrow
1. Select "Schedule for Later"
2. Pick tomorrow's date
3. Pick 2:00 PM
4. Click "Schedule Post"
5. ✅ Should show success and schedule

### Test Case 2: Invalid Time (Past)
1. Select "Schedule for Later"
2. Pick today
3. Pick time < current time + 5 min
4. ❌ Should show error and disable button

### Test Case 3: Post Immediately
1. Select "Post Immediately"
2. Click "Post Now"
3. ✅ Should post with status "PUBLISHED"

---

## 🔧 API Integration

### New Post
```typescript
POST /api/posts
{
  "content": "Hello world!",
  "profileIds": ["profile-1"],
  "status": "SCHEDULED",
  "scheduledAt": "2025-12-16T19:00:00.000Z"
}
```

### Update Post
```typescript
PATCH /api/posts/[id]
{
  "status": "SCHEDULED",
  "scheduledAt": "2025-12-16T19:00:00.000Z"
}
```

---

## 📊 Posts List Display

Scheduled posts now show:
- 🔵 **Blue "Scheduled" badge**
- 📅 **"Scheduled for [date/time]"** in meta info
- ✏️ **Edit button** to reschedule
- 🗑️ **Delete button** to cancel

---

## 🚀 Next Steps (Phase 3)

To make posts auto-publish at scheduled time:

1. **Create Background Job Processor** (using Bull)
2. **Cron Job** that runs every minute
3. **Find posts** where `status = SCHEDULED` and `scheduledAt <= now`
4. **Update status** to `PUBLISHING`
5. **Call platform APIs** (Facebook/Instagram/etc.)
6. **Update status** to `PUBLISHED` or `FAILED`
7. **Set publishedAt** timestamp

---

## 🎯 What You Can Do Now

✅ Schedule posts for any future date/time  
✅ Post immediately without scheduling  
✅ View scheduled posts in the list  
✅ Reschedule existing posts  
✅ See validation feedback in real-time  
✅ Review all details before submission  
✅ Confirm before final posting  

**Note:** Posts won't auto-publish yet (needs backend scheduler), but all UI/API is ready!

---

## 📚 Full Documentation

See `SCHEDULING_FUNCTIONALITY.md` for complete technical details.

---

**Ready to schedule your first post!** 🎉







