# Quick Deployment Guide

Deploy Schedy lên VPS trong 10 phút!

## 🚀 Prerequisites

- VPS với Ubuntu 20.04+ (2GB RAM, 2 CPU cores)
- Domain trỏ về VPS IP
- SSH access

---

## 📝 Step-by-Step

### 1. Cài Docker (2 phút)

```bash
# SSH vào VPS
ssh root@your-vps-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 2. Clone & Setup (2 phút)

```bash
# Clone repository
git clone https://github.com/bachasia/schedy.git
cd schedy

# Create production env
cp env.production.example .env.production

# Generate secret
openssl rand -base64 32

# Edit .env.production
nano .env.production
# - Set NEXTAUTH_SECRET (from above)
# - Set NEXTAUTH_URL=https://yourdomain.com
# - Set your social media app credentials
# - Update callback URLs to your domain
```

### 3. Configure Nginx (1 phút)

```bash
# Edit nginx config
nano nginx/conf.d/schedy.conf

# Replace ALL instances of:
# yourdomain.com → your-actual-domain.com
```

### 4. Deploy (5 phút)

```bash
# Make deploy script executable
chmod +x deploy.sh

# Build & start
./deploy.sh build
./deploy.sh up

# Check status
./deploy.sh health
```

**Output should show:**
```
✓ schedy-app     running
✓ schedy-redis   running  
✓ schedy-nginx   running
```

### 5. Setup SSL (Optional - 2 phút)

```bash
# Get SSL certificate
./deploy.sh setup-ssl yourdomain.com admin@yourdomain.com

# Or manually:
apt install -y certbot
certbot certonly --webroot -w ./certbot/www \
  -d yourdomain.com -d www.yourdomain.com \
  --email admin@yourdomain.com --agree-tos
```

---

## ✅ Verify

```bash
# Check health
curl https://yourdomain.com/api/health

# Expected:
{"status":"healthy",...}
```

Open browser: `https://yourdomain.com` ✨

---

## 🔧 Common Commands

```bash
./deploy.sh up          # Start
./deploy.sh down        # Stop
./deploy.sh restart     # Restart
./deploy.sh logs app    # View logs
./deploy.sh backup      # Backup DB
./deploy.sh health      # Check health
```

---

## 🐛 Quick Fixes

**App won't start?**
```bash
docker-compose logs app
# Check .env.production is correct
```

**Redis error?**
```bash
docker restart schedy-redis
```

**Port 3001 in use?**
```bash
netstat -tuln | grep 3001
# Kill process or change port in docker-compose.yml
```

---

## 📚 Full Documentation

[Complete Deployment Guide](./DEPLOYMENT.md)

---

**That's it! 🎉**  
Your app is now running at `https://yourdomain.com`

