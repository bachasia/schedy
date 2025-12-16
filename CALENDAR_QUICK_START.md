# 📅 Calendar View - Quick Start

## 🚀 Access the Calendar

```
Navigate to: http://localhost:3001/schedule
Or click "Schedule" in the sidebar
```

---

## 🎯 Quick Actions

### Change View Mode

Click the view buttons in the top-right:
- **Month** - Overview of entire month
- **Week** - Weekly timeline with hours
- **Day** - Single day detailed view
- **Agenda** - List of upcoming posts

### Navigate Dates

- **Today** - Jump to current date
- **< >** - Previous/Next month/week/day
- Current date shown in header

### Filter Posts

1. Click **"Filters"** button
2. Toggle filters:
   - **Status**: SCHEDULED | PUBLISHED | FAILED
   - **Platform**: FACEBOOK | INSTAGRAM | TWITTER | TIKTOK
   - **Profile**: Your connected profiles
3. Click **"Clear All"** to reset

### View/Edit Post

- Click any post in the calendar
- Opens edit page
- Make changes and save
- Return to calendar

### Create New Post

- Click **"New Post"** button
- Redirects to post creation
- Schedule your post
- See it appear in calendar

### Refresh Data

- Click **"Refresh"** button
- Reloads all posts from server
- Updates calendar display

---

## 🎨 Color Legend

Posts are color-coded by platform:

- 🔵 **Blue** = Facebook
- 🎀 **Pink** = Instagram
- 🐦 **Sky Blue** = Twitter
- 🎵 **Green** = TikTok

---

## 📊 View Modes Explained

### Month View
**Best for:** Long-term planning

```
See all posts across a month
Multiple posts per day shown
"Show more" link if many posts
```

### Week View
**Best for:** Detailed weekly schedule

```
Time slots from 12 AM - 11 PM
Posts at exact scheduled time
Current time indicator (red line)
```

### Day View
**Best for:** Single day management

```
Hourly breakdown
Detailed timeline
Easy conflict spotting
```

### Agenda View
**Best for:** List of upcoming posts

```
Chronological list
Date, time, and content
No calendar grid
Print-friendly
```

---

## 🔍 Common Use Cases

### 1. Plan Content for Next Month

```
1. Switch to Month view
2. Click "Next" to navigate to next month
3. Click "New Post" to add posts
4. See gaps in your schedule
5. Fill in with more posts
```

### 2. Check Today's Schedule

```
1. Click "Today" button
2. Switch to Day view
3. See all posts for today
4. Verify posting times
```

### 3. Find All Facebook Posts

```
1. Click "Filters"
2. Click "FACEBOOK" platform
3. Optionally filter by status
4. See only Facebook posts highlighted
```

### 4. Review This Week's Posts

```
1. Switch to Week view
2. Navigate to desired week
3. See all posts with times
4. Check distribution throughout day
```

### 5. See What's Published

```
1. Click "Filters"
2. Select "PUBLISHED" status
3. Deselect "SCHEDULED"
4. View all published posts
5. Check which dates had posts
```

---

## 💡 Pro Tips

### Tip 1: Use Filters to Focus
```
Too many posts cluttering the view?
→ Filter by single platform
→ Or filter by specific profile
→ Calendar becomes cleaner and easier to read
```

### Tip 2: Week View for Time Management
```
Want to avoid posting at same time?
→ Use Week view
→ See exact posting times
→ Identify conflicts
→ Reschedule as needed
```

### Tip 3: Month View for Planning
```
Planning content in advance?
→ Use Month view
→ See distribution across month
→ Identify gaps
→ Ensure consistent posting
```

### Tip 4: Agenda for Quick Review
```
Need a simple list?
→ Use Agenda view
→ See upcoming posts chronologically
→ Easy to scan
→ Print-friendly format
```

### Tip 5: Color Coding at a Glance
```
Multiple platforms?
→ Rely on color coding
→ Blue = Facebook
→ Pink = Instagram
→ Instantly identify platform
```

---

## 🐛 Troubleshooting

### Posts Not Showing?

**Check filters:**
1. Click "Filters"
2. Make sure correct statuses selected
3. Clear all filters and try again

**Check dates:**
- Posts must have `scheduledAt` or `publishedAt`
- DRAFT posts without dates won't show

### Calendar Looks Empty?

**Possible causes:**
1. No scheduled posts yet → Create your first post
2. Filters too restrictive → Clear filters
3. Wrong date range → Click "Today" to reset

### Can't Click Posts?

**Make sure:**
- Post is fully loaded (not loading state)
- You're clicking on the colored post box
- Not clicking empty calendar space

### Colors Not Showing?

**Try:**
1. Refresh the page (Ctrl+R / Cmd+R)
2. Check browser console for errors
3. Verify posts have platform assigned

---

## 📱 Keyboard Shortcuts

While calendar is focused:

- **T** - Go to Today (if implemented)
- **Arrow Left** - Previous month/week/day
- **Arrow Right** - Next month/week/day
- **Escape** - Close popup/overlay

*Note: Some shortcuts depend on react-big-calendar configuration*

---

## 🎯 Workflow Examples

### Daily Content Creator

```
Morning routine:
1. Open /schedule
2. Switch to Day view
3. Check today's posts
4. Verify all scheduled correctly
5. Make any last-minute changes
```

### Weekly Planner

```
Monday planning session:
1. Switch to Week view
2. Review week ahead
3. Identify gaps
4. Create posts to fill gaps
5. Ensure even distribution
```

### Monthly Strategist

```
End of month review:
1. Switch to Month view
2. Navigate to current month
3. Review what was posted
4. Switch to next month
5. Plan upcoming content
6. Schedule posts in advance
```

---

## 🔗 Quick Links

| Action | URL |
|--------|-----|
| Calendar | `/schedule` |
| New Post | `/posts/new` |
| All Posts | `/posts` |
| Profiles | `/profiles` |
| Queue Admin | `/admin/queue` |

---

## 📊 Filter Combinations

### Popular Filters

**Upcoming Scheduled Posts:**
```
Status: ✓ SCHEDULED
Platform: (All)
Profile: (All)
```

**This Week's Facebook Posts:**
```
Status: ✓ SCHEDULED
Platform: ✓ FACEBOOK
Profile: (All)
+ Use Week view
```

**Published Instagram Content:**
```
Status: ✓ PUBLISHED
Platform: ✓ INSTAGRAM
Profile: (All)
+ Use Agenda view for list
```

**Failed Posts Needing Attention:**
```
Status: ✓ FAILED
Platform: (All)
Profile: (All)
+ Review and retry
```

---

## ✨ Features at a Glance

✅ **4 view modes** - Month, Week, Day, Agenda  
✅ **Color-coded** - Easy platform identification  
✅ **Smart filters** - Status, platform, profile  
✅ **Click to edit** - Quick post management  
✅ **Responsive** - Works on all devices  
✅ **Dark mode** - Comfortable viewing  
✅ **Real-time** - Instant updates  
✅ **Empty states** - Helpful guidance  

---

## 🎓 Learn More

For detailed documentation, see:
- **`CALENDAR_VIEW.md`** - Complete technical guide
- **`SCHEDULING_FUNCTIONALITY.md`** - Scheduling features
- **`QUEUE_MANAGEMENT.md`** - Queue system docs

---

**Ready to visualize your content calendar!** 🎉

Access it now at: `http://localhost:3001/schedule`



