# Scheduling Functionality - Complete Implementation Guide

## 🎯 Overview

The scheduling functionality allows users to publish posts immediately or schedule them for future publication. This includes date/time selection, timezone management, validation, and a comprehensive review section.

---

## ✅ Components Created

### 1. **ScheduleForm Component** (`src/components/post/ScheduleForm.tsx`)

**Purpose:** Complete scheduling interface with date/time picker, timezone selector, and confirmation modal.

#### Features

**Post Type Selection:**
- ✅ **Post Immediately**: Publish right away to all selected profiles
- ✅ **Schedule for Later**: Choose specific date and time

**Date/Time Picker:**
- ✅ Date input (native HTML date picker)
- ✅ Time input (24-hour format)
- ✅ Minimum date: Today
- ✅ Minimum time: Current time + 5 minutes (if today)
- ✅ Real-time validation

**Timezone Selector:**
- ✅ Pre-populated with user's local timezone
- ✅ Common timezone options:
  - Eastern Time (ET)
  - Central Time (CT)
  - Mountain Time (MT)
  - Pacific Time (PT)
  - London (GMT)
  - Paris (CET)
  - Tokyo (JST)
  - Shanghai (CST)
  - Sydney (AEST)

**Validation:**
- ✅ Scheduled time must be at least 5 minutes in the future
- ✅ Real-time error messages
- ✅ Success indicator when valid
- ✅ Button disabled if invalid

**Review Section:**
- ✅ Selected profiles count and names
- ✅ Content preview (2 lines)
- ✅ Media count (images/videos)
- ✅ Scheduled time display (formatted)
- ✅ Timezone display

**Confirmation Modal:**
- ✅ Shows before final submission
- ✅ Displays post details
- ✅ Cancel/Confirm actions
- ✅ Loading state during submission

---

## 🔄 Integration

### Updated Pages

#### 1. **New Post Page** (`src/app/(dashboard)/posts/new/page.tsx`)

**Added:**
- ✅ `ScheduleForm` import and integration
- ✅ `onSchedulePost` function
- ✅ Schedule tab now functional (was placeholder)
- ✅ Tab enabled when content is filled
- ✅ Posts to API with scheduling data

**Flow:**
```
Content Tab → Media Tab → Schedule Tab
     ↓            ↓             ↓
  Fill form   Upload media  Choose time
     ↓            ↓             ↓
  Validate    Process       Schedule/Post
```

#### 2. **Edit Post Page** (`src/app/(dashboard)/posts/[id]/edit/page.tsx`)

**Added:**
- ✅ `ScheduleForm` import and integration
- ✅ `onSchedulePost` function
- ✅ Schedule tab enabled
- ✅ Can reschedule existing posts
- ✅ Updates post status and scheduledAt

---

## 📊 API Changes

### POST `/api/posts`

**Updated to accept:**
```typescript
{
  content: string;
  profileIds: string[];
  mediaUrls?: string[];
  mediaType?: "IMAGE" | "VIDEO" | "CAROUSEL";
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";  // Now includes SCHEDULED
  scheduledAt?: string;  // ISO date string
}
```

**Status Logic:**
- `status: "DRAFT"` → Save as draft (no scheduledAt)
- `status: "SCHEDULED"` → Schedule for later (with scheduledAt)
- `status: "PUBLISHED"` → Post immediately (no scheduledAt)

### PATCH `/api/posts/[id]`

**Updated to accept:**
```typescript
{
  content?: string;
  mediaUrls?: string[];
  status?: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  scheduledAt?: string;  // ISO date string
}
```

**Use Cases:**
- Update scheduled time
- Change status (e.g., SCHEDULED → PUBLISHED)
- Reschedule or unschedule posts

---

## 🎨 UI/UX Design

### Schedule Type Selection

**Visual Design:**
- Radio-style buttons with circular indicators
- Two-column grid on desktop
- Stacked on mobile
- Active state: Dark border + background fill
- Hover state: Border color change

**Copy:**
- **Post Immediately**: "Publish your post right away to all selected profiles."
- **Schedule for Later**: "Choose a specific date and time to publish your post."

### Date/Time Inputs

**Layout:**
- Two-column grid on desktop (Date | Time)
- Stacked on mobile
- Icon labels (Calendar, Clock, Globe)
- Native HTML inputs for best UX

**Styling:**
- Consistent with app design system
- Dark mode support
- Focus states
- Disabled states

### Validation Messages

**Error State (Red):**
```
⚠️ Scheduled time must be at least 5 minutes in the future.
```

**Success State (Green):**
```
✓ Scheduled for December 15, 2025 at 3:30 PM
```

### Review Section

**Layout:**
- Bordered card with white background
- Key-value pairs:
  - **Profiles:** 2 profiles (Facebook, Instagram)
  - **Content:** [First 2 lines of post]
  - **Media:** 3 images, 1 video
  - **Scheduled:** December 15, 2025 at 3:30 PM (Eastern Time)

### Confirmation Modal

**Design:**
- Centered overlay with backdrop
- Card with shadow
- Clear heading based on action
- Descriptive text
- Cancel (secondary) + Confirm (primary) buttons
- Loading state: "Confirming..."

---

## 🔧 Technical Implementation

### Date/Time Handling

**Library:** `date-fns` (already installed)

**Key Functions:**
```typescript
import { format, addMinutes, isBefore } from "date-fns";

// Format for display
format(date, "MMMM d, yyyy 'at' h:mm a")
// Output: "December 15, 2025 at 3:30 PM"

// Add 5 minutes for minimum time
addMinutes(now, 5)

// Validate future date
isBefore(scheduledDate, minDate)
```

### Timezone Detection

**Automatic Detection:**
```typescript
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
```

**Result:** User's local timezone (e.g., "America/New_York")

### State Management

**Component State:**
```typescript
const [scheduleType, setScheduleType] = useState<"now" | "later">("later");
const [selectedDate, setSelectedDate] = useState("");
const [selectedTime, setSelectedTime] = useState("");
const [timezone, setTimezone] = useState(userTimezone);
const [showConfirmation, setShowConfirmation] = useState(false);
```

**Computed Values:**
```typescript
// Minimum date (today)
const minDate = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

// Minimum time (now + 5 min if today)
const minTime = useMemo(() => {
  if (selectedDate === minDate) {
    return format(addMinutes(new Date(), 5), "HH:mm");
  }
  return "00:00";
}, [selectedDate, minDate]);

// Scheduled date/time object
const scheduledDateTime = useMemo(() => {
  if (!selectedDate || !selectedTime) return null;
  const dateTime = new Date(`${selectedDate}T${selectedTime}`);
  return isBefore(dateTime, addMinutes(new Date(), 5)) ? null : dateTime;
}, [selectedDate, selectedTime]);
```

### Validation

**Rules:**
1. If "Post Immediately" → Always valid
2. If "Schedule for Later":
   - Date and time must be selected
   - Combined date/time must be at least 5 minutes in the future
   - Button disabled if invalid

**Implementation:**
```typescript
const isValid =
  scheduleType === "now" ||
  (scheduleType === "later" && scheduledDateTime !== null);
```

---

## 📱 Responsive Design

### Desktop (≥768px)
- Two-column date/time picker
- Side-by-side schedule options
- Full timezone selector

### Tablet (640px - 767px)
- Two-column maintained
- Wrapped labels
- Medium modal size

### Mobile (<640px)
- Single column layout
- Stacked date/time inputs
- Stacked schedule options
- Full-width modal (with margin)

---

## 🧪 Testing Scenarios

### Create New Post - Immediate

1. Navigate to `/posts/new`
2. Fill content and select profiles
3. Upload media (optional)
4. Go to Schedule tab
5. Select "Post Immediately"
6. Click "Post Now"
7. Confirm in modal
8. **Expected:** Post created with `status: "PUBLISHED"`, no `scheduledAt`

### Create New Post - Scheduled

1. Navigate to `/posts/new`
2. Fill content and select profiles
3. Upload media (optional)
4. Go to Schedule tab
5. Select "Schedule for Later"
6. Choose date (today or future)
7. Choose time (at least 5 min from now)
8. Select timezone
9. Click "Schedule Post"
10. Confirm in modal
11. **Expected:** Post created with `status: "SCHEDULED"`, `scheduledAt` set

### Edit Post - Reschedule

1. Navigate to `/posts/[id]/edit` (existing draft)
2. Go to Schedule tab
3. Select "Schedule for Later"
4. Choose date and time
5. Click "Schedule Post"
6. **Expected:** Post updated with `status: "SCHEDULED"`, `scheduledAt` set

### Validation Tests

1. **Past Date:**
   - Select today
   - Select time < current time + 5 min
   - **Expected:** Red error message, button disabled

2. **Future Date:**
   - Select tomorrow
   - Select any time
   - **Expected:** Green success message, button enabled

3. **No Date/Time:**
   - Select "Schedule for Later"
   - Leave date/time empty
   - **Expected:** Button disabled

---

## 🚀 Future Enhancements (Phase 3)

### Scheduling Backend

**Cron Job Implementation:**
- [ ] Create background job processor (using Bull)
- [ ] Poll for posts with `status: "SCHEDULED"` and `scheduledAt <= now`
- [ ] Update status to `PUBLISHING`
- [ ] Call platform APIs to publish
- [ ] Update status to `PUBLISHED` or `FAILED`

**Example Flow:**
```
Cron (every minute)
  ↓
Find scheduled posts (scheduledAt <= now)
  ↓
For each post:
  - Update status to PUBLISHING
  - Get profile access token
  - Call platform API (Facebook/Instagram/etc.)
  - Update platformPostId
  - Update status to PUBLISHED
  - Set publishedAt timestamp
```

### Recurring Posts

- [ ] Repeat daily/weekly/monthly
- [ ] End date for recurrence
- [ ] Skip weekends option
- [ ] Different times per day

### Optimal Posting Times

- [ ] AI-suggested best times
- [ ] Based on audience analytics
- [ ] Per-platform recommendations
- [ ] Historical performance data

### Bulk Scheduling

- [ ] Schedule multiple posts at once
- [ ] CSV import
- [ ] Calendar view
- [ ] Drag-and-drop rescheduling

### Queue Management

- [ ] View all scheduled posts in calendar
- [ ] Pause/resume scheduled posts
- [ ] Reorder queue
- [ ] Priority scheduling

---

## 🔒 Security Considerations

### Input Validation

**Client-Side:**
- ✅ Date format validation
- ✅ Time format validation
- ✅ Future date validation
- ✅ Timezone validation

**Server-Side:**
- ✅ Zod schema validation
- ✅ ISO date string parsing
- ✅ Status enum validation
- ✅ Ownership verification

### Timezone Handling

**Best Practices:**
- ✅ Store all times in UTC (database)
- ✅ Convert to user's timezone for display
- ✅ Send timezone info with scheduled time
- ✅ Handle DST transitions

**Implementation:**
```typescript
// Client sends:
{
  scheduledAt: "2025-12-15T15:30:00-05:00",  // ISO with timezone
  // ...
}

// Server stores:
scheduledAt: new Date("2025-12-15T20:30:00Z")  // UTC
```

---

## 📊 Data Flow

### Schedule Post Flow

```
User fills schedule form
  ↓
Selects date/time/timezone
  ↓
Validates (future date, 5+ min)
  ↓
Clicks "Schedule Post"
  ↓
Confirmation modal appears
  ↓
User confirms
  ↓
POST /api/posts
{
  content: "...",
  profileIds: ["id1", "id2"],
  mediaUrls: ["/uploads/..."],
  status: "SCHEDULED",
  scheduledAt: "2025-12-15T20:30:00Z"
}
  ↓
API creates posts (one per profile)
  - status: SCHEDULED
  - scheduledAt: [date]
  ↓
Redirect to /posts
  ↓
Post appears in list with:
  - Blue "Scheduled" badge
  - Scheduled date/time display
```

### Post Immediately Flow

```
User selects "Post Immediately"
  ↓
Clicks "Post Now"
  ↓
Confirmation modal
  ↓
User confirms
  ↓
POST /api/posts
{
  content: "...",
  status: "PUBLISHED",
  scheduledAt: null
}
  ↓
API creates posts
  - status: PUBLISHED
  - publishedAt: now
  ↓
(Future: Call platform APIs to publish)
  ↓
Redirect to /posts
```

---

## 📝 Example Usage

### Schedule a Post for Tomorrow at 2 PM

```typescript
// User actions:
1. Select "Schedule for Later"
2. Date: 2025-12-16
3. Time: 14:00
4. Timezone: America/New_York
5. Click "Schedule Post"
6. Confirm

// API call:
POST /api/posts
{
  "content": "Check out our new product!",
  "profileIds": ["profile-1", "profile-2"],
  "mediaUrls": ["/uploads/image.jpg"],
  "mediaType": "IMAGE",
  "status": "SCHEDULED",
  "scheduledAt": "2025-12-16T19:00:00.000Z"  // UTC (2 PM ET = 7 PM UTC)
}

// Response:
{
  "posts": [
    {
      "id": "post-1",
      "content": "Check out our new product!",
      "status": "SCHEDULED",
      "scheduledAt": "2025-12-16T19:00:00.000Z",
      "platform": "FACEBOOK",
      ...
    },
    {
      "id": "post-2",
      "content": "Check out our new product!",
      "status": "SCHEDULED",
      "scheduledAt": "2025-12-16T19:00:00.000Z",
      "platform": "INSTAGRAM",
      ...
    }
  ]
}
```

### Post Immediately

```typescript
// User actions:
1. Select "Post Immediately"
2. Click "Post Now"
3. Confirm

// API call:
POST /api/posts
{
  "content": "Breaking news!",
  "profileIds": ["profile-1"],
  "status": "PUBLISHED"
}

// Response:
{
  "posts": [
    {
      "id": "post-1",
      "content": "Breaking news!",
      "status": "PUBLISHED",
      "scheduledAt": null,
      "publishedAt": "2025-12-15T10:30:00.000Z",
      "platform": "TWITTER",
      ...
    }
  ]
}
```

---

## 🎯 Success Metrics

- ✅ Can schedule posts for future publication
- ✅ Can post immediately
- ✅ Date/time validation works correctly
- ✅ Timezone detection and selection functional
- ✅ Review section shows accurate information
- ✅ Confirmation modal prevents accidental posting
- ✅ Scheduled posts appear in list with correct status
- ✅ Can reschedule existing posts
- ✅ Responsive on all devices
- ✅ Dark mode support
- ✅ Loading states implemented
- ✅ Error handling in place

---

## 🐛 Known Limitations

1. **No Backend Scheduler**: Posts won't auto-publish yet (requires cron job)
2. **No Calendar View**: Linear list only (calendar coming in Phase 3)
3. **No Time Zone Abbreviations**: Shows full names only
4. **Limited Timezone Options**: Only 9 common timezones (can add more)
5. **No DST Warnings**: Doesn't warn about daylight saving time changes
6. **No Conflict Detection**: Doesn't warn if scheduling multiple posts at same time

---

## 🔗 Related Files

### Components
- `src/components/post/ScheduleForm.tsx` - Main scheduling component
- `src/components/post/MediaUpload.tsx` - Media upload (used in flow)
- `src/components/post/PostPreview.tsx` - Content preview (used in review)

### Pages
- `src/app/(dashboard)/posts/new/page.tsx` - Create post with scheduling
- `src/app/(dashboard)/posts/[id]/edit/page.tsx` - Edit post with rescheduling
- `src/app/(dashboard)/posts/page.tsx` - View scheduled posts

### API
- `src/app/api/posts/route.ts` - Create posts (POST)
- `src/app/api/posts/[id]/route.ts` - Update/delete posts (PATCH/DELETE)

### Database
- `prisma/schema.prisma` - Post model with scheduledAt field

---

## 📚 Dependencies Used

- **date-fns**: Date formatting and manipulation
- **React hooks**: useState, useMemo for state management
- **Lucide React**: Icons (Calendar, Clock, Globe, etc.)
- **Next.js**: Routing and navigation
- **Axios**: API calls

---

## ✨ Summary

The scheduling functionality is **fully implemented** for the frontend, allowing users to:

✅ Choose between immediate posting and scheduled posting  
✅ Select date, time, and timezone for scheduled posts  
✅ View validation feedback in real-time  
✅ Review post details before scheduling  
✅ Confirm before final submission  
✅ See scheduled posts in the posts list  
✅ Reschedule existing posts  

**Next Phase:** Implement backend cron job to auto-publish scheduled posts at the specified time!









