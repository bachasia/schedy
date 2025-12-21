# Calendar View - Complete Guide

## 🎯 Overview

The calendar view provides a visual interface for managing scheduled posts across all social media platforms. Built with **react-big-calendar** and **date-fns**, it offers multiple view modes, color-coding by platform, and powerful filtering capabilities.

---

## ✅ Features Implemented

### 1. **Multiple View Modes**

- ✅ **Month View** - Traditional calendar grid showing all posts
- ✅ **Week View** - Detailed week timeline with time slots
- ✅ **Day View** - Single day timeline with hourly breakdown
- ✅ **Agenda View** - List view of upcoming posts

### 2. **Color-Coded by Platform**

Posts are visually distinguished by platform:
- 🔵 **Facebook** - Blue
- 🎀 **Instagram** - Pink
- 🐦 **Twitter** - Sky Blue
- 🎵 **TikTok** - Emerald Green

### 3. **Advanced Filtering**

**Filter by:**
- ✅ **Status** - SCHEDULED, PUBLISHED, FAILED
- ✅ **Platform** - Facebook, Instagram, Twitter, TikTok
- ✅ **Profile** - Specific social media profiles

**Filter Controls:**
- Toggle filters on/off
- Multiple selections allowed
- Clear all filters button
- Active filters count

### 4. **Interactive Features**

- ✅ **Click to Edit** - Click any post to open edit page
- ✅ **Today Button** - Jump to current date
- ✅ **Navigation** - Previous/Next month/week/day
- ✅ **Refresh** - Reload posts from API
- ✅ **New Post** - Quick access to create post
- ✅ **Empty State** - Helpful message when no posts

### 5. **Responsive Design**

- ✅ Desktop: Full calendar with all features
- ✅ Tablet: Responsive layout with wrapped controls
- ✅ Mobile: Optimized view with smaller fonts

### 6. **Dark Mode Support**

- ✅ Fully styled for dark mode
- ✅ Proper contrast and readability
- ✅ Smooth transitions

---

## 🎨 User Interface

### Header Section

```
┌─────────────────────────────────────────────────────┐
│ Schedule Calendar                  [Filters] [↻] [+]│
│ View and manage your scheduled posts                │
└─────────────────────────────────────────────────────┘
```

### Filters Panel (Collapsible)

```
┌─────────────────────────────────────────────────────┐
│ Filters                               [Clear All]   │
│                                                     │
│ Status:    [SCHEDULED] [PUBLISHED] [FAILED]        │
│ Platform:  [FACEBOOK] [INSTAGRAM] [TWITTER] [TIKTOK]│
│ Profile:   [My Page] [My Profile] [My Account]     │
│                                                     │
│ Showing 5 of 10 posts                              │
└─────────────────────────────────────────────────────┘
```

### Legend

```
┌─────────────────────────────────────────────────────┐
│ Legend: 🔵 FACEBOOK  🎀 INSTAGRAM  🐦 TWITTER  🎵 TIKTOK│
└─────────────────────────────────────────────────────┘
```

### Calendar

```
┌─────────────────────────────────────────────────────┐
│ [Today] [<] [>]  December 2025     [Month▼] [Week] │
│                                     [Day] [Agenda]  │
├─────────────────────────────────────────────────────┤
│ Sun   Mon   Tue   Wed   Thu   Fri   Sat           │
├─────┬─────┬─────┬─────┬─────┬─────┬─────┤
│  1  │  2  │  3  │  4  │  5  │  6  │  7  │
│     │     │ FB  │     │     │     │     │
│     │     │ Post│     │     │     │     │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│  8  │  9  │ 10  │ 11  │ 12  │ 13  │ 14  │
│     │ IG  │     │     │     │     │     │
│     │ Post│     │     │     │     │     │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

---

## 📊 View Modes

### Month View

**Best for:** Overview of all scheduled posts

**Features:**
- Shows entire month at a glance
- Multiple posts per day
- "Show more" link if many posts
- Click any date cell to view all posts for that day

**Use Case:**
```
Perfect for planning long-term content calendar
See distribution of posts across the month
Identify gaps in posting schedule
```

### Week View

**Best for:** Detailed weekly planning

**Features:**
- Time slots from 12 AM to 11 PM
- Hourly breakdown
- Posts shown at exact scheduled time
- Current time indicator (red line)

**Use Case:**
```
Plan posts for specific times
Avoid posting multiple posts at same time
See posting patterns throughout the day
```

### Day View

**Best for:** Detailed daily schedule

**Features:**
- Single day with hourly slots
- Detailed timeline
- Exact time visibility
- Easy to spot conflicts

**Use Case:**
```
Manage high-volume posting days
Coordinate multi-platform posts
Fine-tune posting times
```

### Agenda View

**Best for:** List of upcoming posts

**Features:**
- List format sorted by date/time
- Shows date, time, and post content
- No calendar grid
- Easy to scan

**Use Case:**
```
Quick review of upcoming posts
Print-friendly format
Simple chronological list
```

---

## 🎯 How to Use

### Basic Navigation

**Access the Calendar:**
```
Navigate to: /schedule
Or click "Schedule" in the sidebar
```

**Change View:**
```
Click: [Month] [Week] [Day] [Agenda]
```

**Navigate Dates:**
```
Today: Jump to current date
< >: Previous/Next month/week/day
```

### Filtering Posts

**Open Filters Panel:**
```
Click "Filters" button in header
```

**Select Filters:**
```
1. Click status buttons (SCHEDULED, PUBLISHED, FAILED)
2. Click platform buttons (FACEBOOK, INSTAGRAM, etc.)
3. Click profile buttons (specific profiles)
4. Multiple selections allowed
```

**Clear Filters:**
```
Click "Clear All" button in filters panel
```

### Viewing/Editing Posts

**Click on any post in the calendar:**
```
Redirects to: /posts/[id]/edit
Can view details, edit content, reschedule, etc.
```

### Creating New Posts

**From Calendar:**
```
1. Click "New Post" button in header
2. Redirects to: /posts/new
3. Create and schedule your post
4. Returns to calendar to see it displayed
```

---

## 🎨 Color System

### Platform Colors

```typescript
FACEBOOK: {
  bg: "bg-blue-50 dark:bg-blue-950/20",
  text: "text-blue-700 dark:text-blue-300",
  border: "border-blue-200 dark:border-blue-800"
}

INSTAGRAM: {
  bg: "bg-pink-50 dark:bg-pink-950/20",
  text: "text-pink-700 dark:text-pink-300",
  border: "border-pink-200 dark:border-pink-800"
}

TWITTER: {
  bg: "bg-sky-50 dark:bg-sky-950/20",
  text: "text-sky-700 dark:text-sky-300",
  border: "border-sky-200 dark:border-sky-800"
}

TIKTOK: {
  bg: "bg-emerald-50 dark:bg-emerald-950/20",
  text: "text-emerald-700 dark:text-emerald-300",
  border: "border-emerald-200 dark:border-emerald-800"
}
```

### Visual Examples

**Month View:**
```
┌─────────────┐
│ [FB] Post 1 │ ← Blue background
├─────────────┤
│ [IG] Post 2 │ ← Pink background
├─────────────┤
│ [TW] Post 3 │ ← Sky blue background
└─────────────┘
```

**Week View:**
```
10:00 AM │ [FB] Hello World!  │ ← Blue
11:00 AM │ [IG] New Product!  │ ← Pink
02:00 PM │ [TW] Breaking News!│ ← Sky blue
```

---

## 🔧 Technical Implementation

### Data Flow

```
Component mounts
  ↓
Fetch posts from GET /api/posts
  ↓
Filter posts by status/platform/profile
  ↓
Transform to calendar events:
  - id: post.id
  - title: post.content (truncated)
  - start: post.scheduledAt or publishedAt
  - end: start + 30 minutes
  - resource: full post object
  ↓
Render in calendar with color coding
  ↓
User clicks event
  ↓
Navigate to /posts/[id]/edit
```

### Event Structure

```typescript
interface CalendarEvent {
  id: string;                 // Post ID
  title: string;              // Post content (first 50 chars)
  start: Date;                // Scheduled/published date
  end: Date;                  // Start + 30 minutes
  resource: Post;             // Full post object
}
```

### Filter Logic

```typescript
// Filter by status
if (selectedStatuses.length > 0 && !selectedStatuses.includes(post.status)) {
  return false;
}

// Filter by platform
if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(post.platform)) {
  return false;
}

// Filter by profile
if (selectedProfiles.length > 0 && !selectedProfiles.includes(post.profile.id)) {
  return false;
}

// Only show posts with dates
return post.scheduledAt || post.publishedAt;
```

---

## 📱 Responsive Design

### Desktop (≥1024px)

- Full calendar layout
- All controls visible
- Side-by-side filters and calendar
- Maximum information density

### Tablet (640px - 1023px)

- Calendar fills width
- Controls wrap to multiple rows
- Filters panel expands full width
- Readable font sizes

### Mobile (<640px)

- Calendar optimized for touch
- Smaller fonts (0.75rem)
- Stacked layout
- Collapsed filters by default
- Easy navigation buttons

**CSS Media Query:**
```css
@media (max-width: 640px) {
  .rbc-header {
    padding: 0.5rem 0.25rem;
    font-size: 0.75rem;
  }
  
  .rbc-event {
    font-size: 0.625rem;
    padding: 1px 3px;
  }
}
```

---

## 🎭 Dark Mode

### Styling Strategy

All calendar elements support dark mode:

**Backgrounds:**
- Light: white, zinc-50
- Dark: zinc-950, zinc-900

**Borders:**
- Light: zinc-200
- Dark: zinc-800, zinc-700

**Text:**
- Light: zinc-900, zinc-700
- Dark: zinc-50, zinc-300

**Today Highlight:**
- Light: yellow-50
- Dark: dark yellow (zinc-900 + yellow tint)

**Example:**
```css
.rbc-header {
  background-color: rgb(250 250 250);
  color: rgb(63 63 70);
}

.dark .rbc-header {
  background-color: rgb(24 24 27);
  color: rgb(228 228 231);
}
```

---

## 🧪 Testing Scenarios

### 1. View Scheduled Posts

```
1. Create several posts with different dates
2. Navigate to /schedule
3. Verify all posts appear in calendar
4. Check color coding is correct
5. Try different view modes (month/week/day/agenda)
```

### 2. Filter Posts

```
1. Open filters panel
2. Select "SCHEDULED" status
3. Verify only scheduled posts shown
4. Select "FACEBOOK" platform
5. Verify only Facebook posts shown
6. Select specific profile
7. Verify only that profile's posts shown
8. Click "Clear All"
9. Verify all posts visible again
```

### 3. Navigate Calendar

```
1. Click "Today" button
2. Verify current date is shown
3. Click "Next" button several times
4. Navigate to future months
5. Click "Previous" to go back
6. Verify navigation works in all view modes
```

### 4. Click to Edit

```
1. Click on any post in calendar
2. Verify redirects to /posts/[id]/edit
3. Edit the post
4. Return to calendar
5. Verify changes reflected
```

### 5. Empty State

```
1. Clear all filters
2. Delete all posts (or filter so none match)
3. Verify empty state displays
4. Check "Create Post" button works
5. Check "Clear Filters" button works
```

### 6. Dark Mode

```
1. Toggle dark mode
2. Verify calendar colors update
3. Check all views in dark mode
4. Verify readability and contrast
```

---

## 🚀 Future Enhancements

### Drag-and-Drop Rescheduling

```typescript
// Enable drag-and-drop
<Calendar
  draggableAccessor={() => true}
  onEventDrop={handleEventDrop}
  resizable
  onEventResize={handleEventResize}
/>

// Handle drop
const handleEventDrop = async ({ event, start, end }) => {
  await axios.patch(`/api/posts/${event.id}`, {
    scheduledAt: start.toISOString(),
  });
  await fetchPosts(); // Refresh
};
```

### Recurring Posts

- Daily recurrence
- Weekly recurrence
- Monthly recurrence
- Custom patterns

### Bulk Operations

- Select multiple posts
- Bulk reschedule
- Bulk delete
- Bulk duplicate

### Calendar Export

- Export to Google Calendar
- Export to iCal format
- Export to CSV

### Team Collaboration

- Multiple users
- Assign posts to team members
- Post approval workflow
- Comments on posts

### Analytics Integration

- Show post performance on calendar
- Highlight high-performing times
- Suggest optimal posting times

---

## 📊 Performance Optimization

### Current Implementation

**Posts Loading:**
- Fetch all posts on mount
- Filter client-side
- Transform to events

**Optimization Opportunities:**

1. **Server-Side Filtering:**
```typescript
// Add query params to API
GET /api/posts?status=SCHEDULED&platform=FACEBOOK&startDate=2025-12-01&endDate=2025-12-31
```

2. **Pagination:**
```typescript
// Load only visible date range
const visibleRange = getVisibleRange(date, view);
fetchPostsInRange(visibleRange.start, visibleRange.end);
```

3. **Memoization:**
```typescript
// Already implemented with useMemo
const events = useMemo(() => {
  return posts.filter(...).map(...);
}, [posts, filters]);
```

4. **Debounced Filters:**
```typescript
// Debounce filter changes
const debouncedFilters = useDebouncedValue(filters, 300);
```

---

## 🔗 Integration Points

### With Post Management

**Create Post:**
```
/schedule → [New Post] → /posts/new → Create → Return to /schedule
```

**Edit Post:**
```
/schedule → Click event → /posts/[id]/edit → Save → Return to /schedule
```

### With Queue System

**Scheduled Posts:**
```
Post in calendar → Queue system processes → Status updates
Calendar auto-refreshes → Shows updated status
```

### With Profiles

**Filter by Profile:**
```
Profiles from /api/posts → Extract unique → Show in filter
```

---

## 📚 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react-big-calendar | Latest | Calendar component |
| date-fns | ^4.1.0 | Date utilities |
| lucide-react | ^0.474.0 | Icons |

---

## 📝 Code Structure

```
src/app/(dashboard)/schedule/
├── page.tsx           # Main calendar component
├── calendar.css       # Custom calendar styles
└── (future)
    ├── components/    # Reusable calendar components
    └── utils/         # Calendar utilities
```

---

## ✨ Summary

The calendar view is **fully implemented** with:

✅ **4 view modes** (month, week, day, agenda)  
✅ **Color-coded** by platform  
✅ **Advanced filtering** (status, platform, profile)  
✅ **Click to edit** posts  
✅ **Responsive design** (mobile, tablet, desktop)  
✅ **Dark mode support**  
✅ **Custom styling** matching design system  
✅ **Empty states** with helpful messages  
✅ **Real-time navigation** (today, prev, next)  
✅ **Legend** for platform colors  

**Next Steps:**
- Test with real posts
- Add drag-and-drop rescheduling (optional)
- Implement recurring posts (future)
- Add export functionality (future)

---

**🎉 Your calendar view is ready to help visualize and manage your content schedule!** 📅









