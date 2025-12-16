# Schedy - Social Media Scheduler

A modern, full-featured social media scheduling application built with Next.js 15, supporting Facebook, Instagram, Twitter, and TikTok.

## ✨ Features

### 🎯 Core Functionality
- **Multi-Platform Support** - Schedule posts for Facebook, Instagram, Twitter, and TikTok
- **Smart Scheduling** - Schedule posts for specific dates and times
- **Queue Management** - Background job processing with Bull Queue
- **Media Upload** - Support for images and videos
- **Post Preview** - Real-time preview of posts before publishing
- **Calendar View** - Visual calendar to manage scheduled posts

### 🎨 User Interface
- **Modern Design** - Clean, professional interface with Tailwind CSS
- **Dark/Light Mode** - Toggle between themes with persistent settings
- **Responsive Layout** - Works seamlessly on desktop, tablet, and mobile
- **Grid Card Layout** - Organized profile and post management

### 🔐 Authentication & Security
- **NextAuth.js Integration** - Secure authentication system
- **OAuth Integration** - Connect social media accounts securely
- **Protected Routes** - Role-based access control

### 📊 Management Features
- **Profile Management** - Connect and manage multiple social media accounts
- **Post Management** - Create, edit, delete, and retry failed posts
- **Status Tracking** - Track post status (Draft, Scheduled, Publishing, Published, Failed)
- **Queue Monitoring** - Real-time queue statistics and monitoring

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js v5
- **Queue System**: Bull with Redis
- **UI Components**: Radix UI + Custom Components
- **Form Handling**: React Hook Form + Zod
- **HTTP Client**: Axios

## 📦 Installation

### Prerequisites
- Node.js 18+
- **Redis** (required for queue management - [Setup Guide](./REDIS_SETUP.md))

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/bachasia/schedy.git
cd schedy
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DATABASE_URL="file:./dev.db"

# Auth
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3001"

# Facebook App
FACEBOOK_APP_ID="your-facebook-app-id"
FACEBOOK_APP_SECRET="your-facebook-app-secret"
FACEBOOK_REDIRECT_URI="http://localhost:3001/api/social/facebook/callback"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
```

4. **Initialize database**
```bash
npx prisma generate
npx prisma migrate dev
```

5. **Start development server with Redis**

Choose one of these options:

**Option 1: Auto-start with Docker (Recommended - Easiest)**
```bash
npm run dev:docker
```
This will automatically start Redis in Docker and Next.js dev server together!

**Option 2: Auto-start with Native Redis**
```bash
npm run dev:redis
```
This will check/start your system Redis and Next.js dev server together.

**Option 3: Manual Redis + Dev Server**
```bash
# Start Redis first (see REDIS_SETUP.md for detailed instructions)
# Windows (WSL2): wsl sudo service redis-server start
# macOS: brew services start redis
# Linux: sudo systemctl start redis-server
# Docker: docker run -d -p 6379:6379 --name schedy-redis redis:latest

# Then start dev server
npm run dev
```

**Verify setup:**
```bash
# Check Redis
redis-cli ping
# Should return: PONG

# Check app
# Visit http://localhost:3001
```

> 💡 **First time?** Use `npm run dev:docker` - it's the easiest!

## 🎮 Available Scripts

```bash
# Development (choose one)
npm run dev              # Next.js only (Redis must be running separately)
npm run dev:docker       # Auto-start Redis (Docker) + Next.js ⭐ Recommended
npm run dev:redis        # Auto-start Redis (native) + Next.js

# Redis management
npm run redis:docker     # Start Redis in Docker
npm run redis:check      # Check/start native Redis
npm run redis:stop       # Stop Redis Docker container

# Production
npm run build           # Build for production
npm run start           # Start production server

# Code quality
npm run lint            # Check code with ESLint
npm run lint:fix        # Fix ESLint errors
npm run format          # Format code with Prettier
```

See [scripts/README.md](./scripts/README.md) for detailed script documentation.

## 📖 Documentation

Detailed documentation is available in the repository:

- [Environment Variables](./ENVIRONMENT_VARIABLES.md)
- [Facebook Integration](./FACEBOOK_INTEGRATION.md)
- [Queue Management](./QUEUE_MANAGEMENT.md)
- [Scheduling Functionality](./SCHEDULING_FUNCTIONALITY.md)
- [Calendar View](./CALENDAR_VIEW.md)
- [Redis Setup Guide](./REDIS_SETUP.md) ⚠️ **Important**
- [Troubleshooting](./TROUBLESHOOTING.md)

## 🎯 Quick Start Guides

- [Facebook Quick Start](./FACEBOOK_QUICK_START.md)
- [Queue Quick Start](./QUEUE_QUICK_START.md)
- [Scheduling Quick Start](./SCHEDULING_QUICK_START.md)
- [Calendar Quick Start](./CALENDAR_QUICK_START.md)

## 🏗️ Project Structure

```
schedy/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── post/              # Post-related components
│   │   ├── profile/           # Profile management components
│   │   └── ui/                # Reusable UI components
│   └── lib/                   # Utility functions and configurations
│       ├── auth.ts            # NextAuth configuration
│       ├── prisma.ts          # Prisma client
│       ├── queue.ts           # Bull queue configuration
│       └── social/            # Social media API integrations
├── prisma/
│   └── schema.prisma          # Database schema
└── public/                    # Static assets
```

## 🎨 Features Showcase

### Profile Management
- Grid card layout for easy visualization
- Support for multiple accounts per platform
- Edit profile names and settings
- Active/Inactive status tracking

### Post Creation
- Rich text editor with character limits per platform
- Media upload with preview
- Multi-step form (Content → Media → Schedule)
- Real-time validation

### Scheduling
- Calendar view for visual planning
- Date/time picker for precise scheduling
- Bulk scheduling support
- Automatic queue management

### Theme Support
- Light mode (default)
- Dark mode
- Persistent theme selection
- Smooth transitions

## 🔧 API Routes

### Authentication
- `POST /api/auth/register` - User registration
- `GET/POST /api/auth/[...nextauth]` - NextAuth handlers

### Profiles
- `GET /api/profiles` - List all profiles
- `POST /api/profiles` - Create profile
- `PATCH /api/profiles/[id]` - Update profile
- `DELETE /api/profiles/[id]` - Delete profile

### Posts
- `GET /api/posts` - List all posts
- `POST /api/posts` - Create post
- `GET /api/posts/[id]` - Get post details
- `PATCH /api/posts/[id]` - Update post
- `DELETE /api/posts/[id]` - Delete post
- `POST /api/posts/[id]/retry` - Retry failed post

### Social Media
- `GET /api/social/facebook/connect` - Initiate Facebook OAuth
- `GET /api/social/facebook/callback` - Facebook OAuth callback
- Similar routes for Instagram, Twitter, TikTok

### Queue Management
- `GET /api/admin/queue-stats` - Get queue statistics
- `GET /api/admin/queues/[[...path]]` - Bull Board interface

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 👤 Author

**Bachasia**
- GitHub: [@bachasia](https://github.com/bachasia)
- Repository: [schedy](https://github.com/bachasia/schedy)

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- Prisma for the excellent ORM
- All open-source contributors

---

Made with ❤️ by Bachasia
