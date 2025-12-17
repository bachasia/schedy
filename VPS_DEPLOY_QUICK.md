# 🚀 Hướng Dẫn Deploy Nhanh Lên VPS

Hướng dẫn tối ưu để build và deploy Schedy lên VPS một cách nhanh chóng.

## ⚠️ QUAN TRỌNG: VPS Cấu Hình Thấp?

Nếu VPS của bạn có **< 2GB RAM**, hãy dùng script build an toàn:
```bash
./build-vps-safe.sh
```

Xem [VPS_BUILD_SAFE.md](./VPS_BUILD_SAFE.md) để biết chi tiết.

## ⚡ Quick Start (5 phút)

### 1. Chuẩn bị VPS

```bash
# Cài Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Cài Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Clone & Setup

```bash
# Clone repo
git clone https://github.com/bachasia/schedy.git
cd schedy

# Tạo file env
cp env.production.example .env.production
nano .env.production  # Điền thông tin của bạn

# Phân quyền scripts
chmod +x deploy.sh build-vps.sh build-fast.sh
```

### 3. Build với BuildKit (Tối ưu)

```bash
# Build nhanh với cache (khuyến nghị)
./build-vps.sh

# Hoặc build với docker-compose
DOCKER_BUILDKIT=1 docker-compose build
```

### 4. Deploy

```bash
# Start services
./deploy.sh up

# Kiểm tra
./deploy.sh health
```

## 🎯 Tối Ưu Build cho VPS

### Build với Cache (Nhanh nhất - 2-4 phút)

```bash
./build-vps.sh
```

### Build không Cache (Clean build - 8-12 phút)

```bash
./build-vps.sh --no-cache
```

### Build với Pull Latest Images

```bash
./build-vps.sh --pull
```

### Build với Custom Tag

```bash
./build-vps.sh --tag schedy:v1.0.0
```

## 📊 So Sánh Tốc Độ Build

| Method | Lần đầu | Có cache | Thay đổi code |
|--------|---------|----------|---------------|
| **build-vps.sh** | 8-12 phút | **2-4 phút** | **1-2 phút** |
| docker-compose build | 10-15 phút | 5-8 phút | 3-5 phút |
| docker build | 10-15 phút | 6-9 phút | 4-6 phút |

## 🔧 Tối Ưu Thêm

### 1. Tăng BuildKit Cache Size

```bash
# Edit Docker daemon config
sudo nano /etc/docker/daemon.json

# Thêm:
{
  "builder": {
    "gc": {
      "enabled": true,
      "defaultKeepStorage": "20GB"
    }
  }
}

# Restart Docker
sudo systemctl restart docker
```

### 2. Build từng Stage (Nếu RAM thấp)

```bash
# Build dependencies
docker build --target deps -t schedy-deps .

# Build Prisma
docker build --target prisma-gen -t schedy-prisma .

# Build application
docker build --target builder -t schedy-builder .

# Build final
docker build --target runner -t schedy:latest .
```

### 3. Sử dụng Multi-stage với Parallel Builds

```bash
DOCKER_BUILDKIT=1 docker buildx build \
  --platform linux/amd64 \
  --tag schedy:latest \
  --cache-from type=local,src=/tmp/.buildx-cache \
  --cache-to type=local,dest=/tmp/.buildx-cache,mode=max \
  .
```

## 🚀 Deploy Commands

### Các lệnh thường dùng

```bash
# Build
./build-vps.sh

# Deploy
./deploy.sh up

# Restart
./deploy.sh restart

# Xem logs
./deploy.sh logs app

# Backup database
./deploy.sh backup

# Health check
./deploy.sh health
```

### Update Code

```bash
# Pull code mới
git pull origin master

# Rebuild và restart
./build-vps.sh && ./deploy.sh restart

# Hoặc all-in-one
git pull && ./build-vps.sh && ./deploy.sh restart
```

## 💾 Quản Lý Disk Space

### Kiểm tra dung lượng

```bash
# Check Docker disk usage
docker system df

# Check system disk
df -h
```

### Cleanup

```bash
# Remove unused images
docker image prune -a -f

# Remove build cache
docker builder prune -a -f

# Remove everything unused
docker system prune -a --volumes -f
```

## 🔍 Troubleshooting

### Build chậm?

1. **Kiểm tra BuildKit:**
   ```bash
   docker buildx version
   ```

2. **Enable BuildKit:**
   ```bash
   export DOCKER_BUILDKIT=1
   ```

3. **Kiểm tra cache:**
   ```bash
   docker system df -v
   ```

### Build bị lỗi "no space left"?

```bash
# Cleanup
docker system prune -a --volumes -f

# Hoặc build không cache
./build-vps.sh --no-cache
```

### Container không start?

```bash
# Check logs
./deploy.sh logs app

# Check environment
cat .env.production

# Restart
./deploy.sh restart
```

## 📈 Performance Tips

1. **Luôn dùng BuildKit** - Nhanh hơn 60-80%
2. **Giữ cache** - Rebuild chỉ mất 1-2 phút
3. **Cleanup định kỳ** - Tránh đầy disk
4. **Monitor disk space** - Đảm bảo có đủ 10GB+
5. **Build vào giờ thấp điểm** - Tránh ảnh hưởng service

## 🎯 Best Practices

- ✅ Build với cache cho development
- ✅ Build không cache cho production release
- ✅ Backup database trước khi update
- ✅ Test build local trước khi deploy VPS
- ✅ Monitor disk space thường xuyên
- ✅ Sử dụng tags cho versioning

## 📞 Support

Nếu gặp vấn đề:
1. Check logs: `./deploy.sh logs app`
2. Check health: `./deploy.sh health`
3. Xem [DEPLOYMENT.md](./DEPLOYMENT.md) để biết chi tiết
4. Xem [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) để fix lỗi

---

**Last Updated**: December 2024  
**Version**: 1.0.0
