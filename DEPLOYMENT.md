# Deployment Guide - VPS với Docker

Hướng dẫn chi tiết deploy Schedy lên VPS sử dụng Docker container.

## 📋 Yêu Cầu

### VPS Specifications
- **OS**: Ubuntu 20.04/22.04 LTS
- **RAM**: Tối thiểu 2GB (khuyến nghị 4GB)
- **CPU**: 2 cores
- **Storage**: 20GB SSD
- **Network**: Public IP address

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Git
- curl/wget

---

## 🚀 Bước 1: Chuẩn Bị VPS

### 1.1 Kết Nối VPS

```bash
ssh root@your-vps-ip
```

### 1.2 Cập Nhật Hệ Thống

```bash
apt update && apt upgrade -y
```

### 1.3 Cài Đặt Docker

```bash
# Cài đặt dependencies
apt install -y apt-transport-https ca-certificates curl software-properties-common

# Thêm Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Thêm Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cài Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io

# Kiểm tra
docker --version
```

### 1.4 Cài Docker Compose

```bash
# Download Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Phân quyền
chmod +x /usr/local/bin/docker-compose

# Kiểm tra
docker-compose --version
```

### 1.5 Tạo User (Optional nhưng khuyến nghị)

```bash
# Tạo user mới
adduser schedy

# Thêm vào docker group
usermod -aG docker schedy

# Switch sang user mới
su - schedy
```

---

## 📦 Bước 2: Clone Repository

```bash
# Clone project
git clone https://github.com/bachasia/schedy.git
cd schedy

# Hoặc nếu đã có code local, dùng scp:
# scp -r /path/to/schedy root@your-vps-ip:/home/schedy/
```

---

## ⚙️ Bước 3: Cấu Hình Environment

### 3.1 Tạo File .env.production

```bash
# Copy template
cp env.production.example .env.production

# Edit với nano hoặc vi
nano .env.production
```

### 3.2 Điền Thông Tin Production

```env
# Database (giữ nguyên)
DATABASE_URL="file:./prisma/dev.db"

# NextAuth - QUAN TRỌNG!
NEXTAUTH_SECRET="generate-a-secure-random-string-min-32-chars"
NEXTAUTH_URL="https://yourdomain.com"

# Redis (giữ nguyên cho Docker)
REDIS_HOST="redis"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"

# Facebook App (Production credentials)
FACEBOOK_APP_ID="your-production-app-id"
FACEBOOK_APP_SECRET="your-production-app-secret"
FACEBOOK_REDIRECT_URI="https://yourdomain.com/api/social/facebook/callback"

# Twitter App (Production credentials)
TWITTER_CLIENT_ID="your-production-client-id"
TWITTER_CLIENT_SECRET="your-production-client-secret"
TWITTER_REDIRECT_URI="https://yourdomain.com/api/social/twitter/callback"

# TikTok App (Production credentials)
TIKTOK_CLIENT_KEY="your-production-client-key"
TIKTOK_CLIENT_SECRET="your-production-client-secret"
TIKTOK_REDIRECT_URI="https://yourdomain.com/api/social/tiktok/callback"

# Public URLs
NEXT_PUBLIC_API_BASE_URL="https://yourdomain.com/api"
NEXT_PUBLIC_APP_NAME="Schedy"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3.3 Cấu Hình Nginx

```bash
# Edit nginx config
nano nginx/conf.d/schedy.conf

# Thay đổi:
# - yourdomain.com → domain thực của bạn
# - Paths to SSL certificates (nếu có)
```

---

## 🏗️ Bước 4: Build và Deploy

### 4.1 Build Docker Images

```bash
# Phân quyền cho deploy script
chmod +x deploy.sh

# Build images
./deploy.sh build
```

**Output:**
```
[INFO] Building Docker images...
Building deps
Building builder  
Building runner
[INFO] Build completed!
```

### 4.2 Start Services

```bash
# Start tất cả services
./deploy.sh up
```

**Output:**
```
[INFO] Starting services...
[INFO] Services started!
[INFO] Running database migrations...
[INFO] Migrations completed!
[INFO] Deployment complete!
[INFO] Access your app at: https://yourdomain.com
```

### 4.3 Kiểm Tra Services

```bash
# Check containers
docker-compose ps

# Should see:
# schedy-app     running
# schedy-redis   running
# schedy-nginx   running
```

---

## 🔒 Bước 5: Cài Đặt SSL (Let's Encrypt)

### 5.1 Tắt HTTPS Tạm Thời

```bash
# Edit nginx config
nano nginx/conf.d/schedy.conf

# Comment out HTTPS server block (lines 20-60)
# Chỉ giữ HTTP server block
```

### 5.2 Restart Nginx

```bash
docker-compose restart nginx
```

### 5.3 Obtain SSL Certificate

```bash
# Run certbot
./deploy.sh setup-ssl yourdomain.com admin@yourdomain.com
```

**Hoặc thủ công:**

```bash
# Cài certbot
apt install -y certbot

# Tạo thư mục cho Let's Encrypt
mkdir -p certbot/www certbot/conf

# Obtain certificate
certbot certonly --webroot \
  -w ./certbot/www \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos \
  --no-eff-email

# Certificates sẽ được lưu tại:
# /etc/letsencrypt/live/yourdomain.com/
```

### 5.4 Enable HTTPS

```bash
# Uncomment HTTPS server block trong nginx config
nano nginx/conf.d/schedy.conf

# Restart nginx
docker-compose restart nginx
```

### 5.5 Auto-Renewal

```bash
# Add to crontab
crontab -e

# Add this line:
0 0 * * * certbot renew --quiet && docker-compose restart nginx
```

---

## 🧪 Bước 6: Kiểm Tra Deployment

### 6.1 Health Check

```bash
# Check service health
./deploy.sh health
```

**Output:**
```
[INFO] Checking service health...

Docker containers:
NAME            STATUS    PORTS
schedy-app      Up        0.0.0.0:3001->3001/tcp
schedy-redis    Up        0.0.0.0:6379->6379/tcp
schedy-nginx    Up        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp

Redis: PONG
Application: {"status":"healthy",...}
```

### 6.2 Test API

```bash
# Health endpoint
curl https://yourdomain.com/api/health

# Should return:
{
  "status": "healthy",
  "timestamp": "2024-12-16T10:00:00.000Z",
  "services": {
    "app": "ok",
    "redis": "ok",
    "queue": {
      "status": "ok",
      "stats": {...}
    }
  }
}
```

### 6.3 Test Web Interface

1. Mở browser: `https://yourdomain.com`
2. Đăng nhập/Đăng ký
3. Kết nối social media profiles
4. Tạo và publish test post

---

## 📊 Bước 7: Monitoring & Maintenance

### 7.1 View Logs

```bash
# App logs
./deploy.sh logs app

# Redis logs
./deploy.sh logs redis

# Nginx logs
./deploy.sh logs nginx

# All logs
docker-compose logs -f
```

### 7.2 Database Backup

```bash
# Tạo backup
./deploy.sh backup

# Backup sẽ được lưu tại:
# ./backups/schedy_backup_20241216_100000.db
```

### 7.3 Database Restore

```bash
# Restore từ backup
./deploy.sh restore ./backups/schedy_backup_20241216_100000.db
```

### 7.4 Update Code

```bash
# Pull latest code
git pull origin master

# Rebuild và restart
./deploy.sh build
./deploy.sh restart

# Hoặc all-in-one:
git pull && ./deploy.sh build && ./deploy.sh restart
```

---

## 🔧 Bước 8: Quản Lý Services

### Common Commands

```bash
# Start services
./deploy.sh up

# Stop services
./deploy.sh down

# Restart services
./deploy.sh restart

# View logs
./deploy.sh logs [service]

# Run migrations
./deploy.sh migrate

# Backup database
./deploy.sh backup

# Check health
./deploy.sh health
```

### Manual Docker Commands

```bash
# List containers
docker ps

# Execute command in container
docker exec -it schedy-app sh

# View container logs
docker logs schedy-app -f

# Restart specific container
docker restart schedy-app

# Remove all containers and volumes
docker-compose down -v
```

---

## 🐛 Troubleshooting

### Issue 1: Container Won't Start

**Check:**
```bash
docker-compose logs app
```

**Common causes:**
- Missing .env.production
- Invalid environment variables
- Port 3001 already in use

**Fix:**
```bash
# Check environment
cat .env.production

# Check ports
netstat -tuln | grep 3001

# Restart
./deploy.sh restart
```

### Issue 2: Redis Connection Failed

**Check:**
```bash
docker exec schedy-redis redis-cli ping
```

**Fix:**
```bash
# Restart Redis
docker restart schedy-redis

# Check logs
docker logs schedy-redis
```

### Issue 3: Database Migration Failed

**Check:**
```bash
docker exec schedy-app npx prisma migrate status
```

**Fix:**
```bash
# Reset migrations (CAREFUL: will lose data)
docker exec schedy-app npx prisma migrate reset

# Or manually run
./deploy.sh migrate
```

### Issue 4: SSL Certificate Issues

**Check:**
```bash
certbot certificates
```

**Fix:**
```bash
# Renew certificate
certbot renew --force-renewal

# Restart nginx
docker-compose restart nginx
```

### Issue 5: High Memory Usage

**Check:**
```bash
docker stats
```

**Fix:**
```bash
# Add memory limits to docker-compose.yml:
services:
  app:
    mem_limit: 1g
  redis:
    mem_limit: 512m
```

---

## 🔐 Security Best Practices

### 1. Firewall Configuration

```bash
# Install UFW
apt install -y ufw

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

### 2. Secure Environment Variables

```bash
# Set proper permissions
chmod 600 .env.production

# Never commit .env.production to git
echo ".env.production" >> .gitignore
```

### 3. Regular Updates

```bash
# Update Docker images
docker-compose pull

# Update system
apt update && apt upgrade -y

# Update application
git pull && ./deploy.sh build && ./deploy.sh restart
```

### 4. Monitoring

```bash
# Setup monitoring (optional)
# - Install Prometheus + Grafana
# - Setup alerts for down services
# - Monitor disk space, CPU, memory
```

---

## 📈 Performance Optimization

### 1. Redis Persistence

```bash
# Edit docker-compose.yml
# Redis already configured with appendonly yes
```

### 2. Nginx Caching

```bash
# Already configured in nginx/conf.d/schedy.conf
# - Static files cached for 60 minutes
# - Public files cached for 30 minutes
```

### 3. Database Optimization

```bash
# Backup regularly
./deploy.sh backup

# Consider PostgreSQL for production (optional)
# Modify DATABASE_URL and docker-compose.yml
```

---

## 🎯 Production Checklist

Trước khi deploy production:

- [ ] Domain đã point đến VPS IP
- [ ] SSL certificate đã được cài đặt
- [ ] .env.production đã được cấu hình đúng
- [ ] Database backup đã được thiết lập
- [ ] Firewall đã được cấu hình
- [ ] Monitoring đã được setup
- [ ] Social media apps đã được tạo (Production)
- [ ] Callback URLs đã được update
- [ ] Email notifications đã được cấu hình (optional)
- [ ] Auto-renewal SSL đã được setup

---

## 📞 Support

**Issues:** https://github.com/bachasia/schedy/issues  
**Email:** (your email)  
**Documentation:** [Full docs](./README.md)

---

**Last Updated**: December 16, 2024  
**Version**: 1.0.0







