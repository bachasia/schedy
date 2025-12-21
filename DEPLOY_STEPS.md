# 🚀 Các Bước Sau Khi Build Thành Công

## ✅ Build đã hoàn thành!

Sau khi build Docker image thành công, làm theo các bước sau:

## 📋 Bước 1: Chuẩn Bị Environment Variables

```bash
# Copy file template
cp env.production.example .env.production

# Edit với nano hoặc vi
nano .env.production
```

### Điền các thông tin quan trọng:

```env
# Database (giữ nguyên)
DATABASE_URL="file:./prisma/dev.db"

# NextAuth - QUAN TRỌNG!
NEXTAUTH_SECRET="generate-a-secure-random-string-min-32-chars"
NEXTAUTH_URL="https://schedy.zido.me"  # Domain thực của bạn

# Redis (giữ nguyên cho Docker)
REDIS_HOST="redis"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"

# Facebook App (Production credentials)
FACEBOOK_APP_ID="your-production-app-id"
FACEBOOK_APP_SECRET="your-production-app-secret"
FACEBOOK_REDIRECT_URI="https://schedy.zido.me/api/social/facebook/callback"

# Twitter App (Production credentials)
TWITTER_CLIENT_ID="your-production-client-id"
TWITTER_CLIENT_SECRET="your-production-client-secret"
TWITTER_REDIRECT_URI="https://schedy.zido.me/api/social/twitter/callback"

# TikTok App (Production credentials)
TIKTOK_CLIENT_KEY="your-production-client-key"
TIKTOK_CLIENT_SECRET="your-production-client-secret"
TIKTOK_REDIRECT_URI="https://schedy.zido.me/api/social/tiktok/callback"

# Trust hosts (đã có trong code)
AUTH_TRUST_HOST=true
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

## 🚀 Bước 2: Deploy Services

```bash
# Start tất cả services (Redis + App + Nginx)
./deploy.sh up
```

Script này sẽ:
- ✅ Kiểm tra `.env.production` tồn tại
- ✅ Start Redis container
- ✅ Start App container (chạy trực tiếp trên port 8080 và 3100)
- ✅ Chạy database migrations tự động
- ✅ Hiển thị URL để truy cập

## 🔍 Bước 3: Kiểm Tra Services

```bash
# Kiểm tra health của tất cả services
./deploy.sh health
```

**Output mong đợi:**
```
[INFO] Checking service health...

Docker containers:
NAME            STATUS    PORTS
schedy-app      Up        0.0.0.0:8080->3100/tcp, 0.0.0.0:3100->3100/tcp
schedy-redis    Up        0.0.0.0:6379->6379/tcp

Redis: PONG
Application: {"status":"healthy",...}
```

## 🌐 Bước 4: Truy Cập Ứng Dụng

```bash
# Kiểm tra URL từ .env.production
echo $NEXTAUTH_URL

# Hoặc truy cập trực tiếp
curl http://localhost:3100/api/health
```

Mở browser và truy cập:
- **HTTP**: `http://your-vps-ip:8080` hoặc `http://schedy.zido.me:8080` (port 8080)
- **Direct**: `http://your-vps-ip:3100` (port 3100)
- **HTTPS**: Cần setup reverse proxy (Cloudflare, Caddy, hoặc Traefik) nếu muốn HTTPS

## 📊 Các Lệnh Hữu Ích

### Xem Logs

```bash
# Logs của app
./deploy.sh logs app

# Logs của Redis
./deploy.sh logs redis

# Tất cả logs
docker-compose logs -f
```

### Quản Lý Services

```bash
# Restart services
./deploy.sh restart

# Stop services
./deploy.sh down

# Start lại
./deploy.sh up
```

### Database

```bash
# Chạy migrations thủ công
./deploy.sh migrate

# Backup database
./deploy.sh backup

# Restore database
./deploy.sh restore ./backups/schedy_backup_20241216_100000.db
```

### Update Code

```bash
# Pull code mới
git pull origin master

# Rebuild image
./build-vps-safe.sh

# Restart services
./deploy.sh restart

# Hoặc all-in-one
git pull && ./build-vps-safe.sh && ./deploy.sh restart
```

## 🔒 Bước 5: Setup SSL (Tùy chọn)

Nếu không dùng Nginx, bạn có thể:
- **Cloudflare**: Dùng Cloudflare Proxy (miễn phí) để có HTTPS
- **Caddy**: Reverse proxy tự động SSL
- **Traefik**: Container-based reverse proxy

Hoặc setup SSL trực tiếp với certbot và reverse proxy khác.

## 🐛 Troubleshooting

### Container không start?

```bash
# Check logs
./deploy.sh logs app

# Check environment
cat .env.production

# Check ports
netstat -tuln | grep 3100
```

### Redis không kết nối?

```bash
# Check Redis container
docker ps | grep redis

# Test Redis connection
docker exec schedy-redis redis-cli ping
```

### Database migration failed?

```bash
# Check migration status
docker exec schedy-app npx prisma migrate status

# Run migration manually
./deploy.sh migrate
```

### App không accessible?

```bash
# Check app logs
./deploy.sh logs app

# Check port 8080
netstat -tuln | grep 8080

# Test app directly
curl http://localhost:3100/api/health

# Restart app
docker-compose restart app
```

## 📝 Checklist Sau Khi Deploy

- [ ] `.env.production` đã được cấu hình đúng
- [ ] Tất cả services đang chạy (`./deploy.sh health`)
- [ ] Database migrations đã chạy thành công
- [ ] Có thể truy cập app qua browser
- [ ] SSL đã được setup (nếu cần)
- [ ] Social media apps đã được tạo và cấu hình
- [ ] Callback URLs đã được update trong social apps
- [ ] Đã test đăng nhập/đăng ký
- [ ] Đã test kết nối social media profiles

## 🎯 Quick Reference

```bash
# Deploy lần đầu
cp env.production.example .env.production
nano .env.production  # Điền thông tin
./deploy.sh up

# Update code
git pull && ./build-vps-safe.sh && ./deploy.sh restart

# Xem logs
./deploy.sh logs app

# Backup
./deploy.sh backup

# Health check
./deploy.sh health
```

---

**Chúc mừng! App của bạn đã sẵn sàng! 🎉**


