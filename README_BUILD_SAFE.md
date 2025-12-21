# 🛡️ Build An Toàn Cho VPS - Quick Guide

## ⚠️ VPS Bị Shutdown Khi Build?

**Nguyên nhân**: Build Docker sử dụng quá nhiều RAM/CPU khiến VPS bị OOM (Out of Memory)

## ✅ Giải Pháp Nhanh

### Cách 1: Dùng Script Build An Toàn (Khuyến nghị)

```bash
# Script tự động kiểm tra và giới hạn memory
chmod +x build-vps-safe.sh
./build-vps-safe.sh
```

### Cách 2: Dùng Deploy Script với Safe Mode

```bash
# Build an toàn
./deploy.sh build-safe

# Hoặc build thường với auto-detect
./deploy.sh build true auto
```

## 🔧 Trước Khi Build

### 1. Tăng Swap (Quan trọng!)

```bash
# Kiểm tra swap
free -h

# Tạo swap 2GB (nếu chưa có)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Làm permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Cleanup Trước Khi Build

```bash
# Cleanup Docker
docker system prune -a -f --volumes

# Check disk space (cần ít nhất 5GB)
df -h
```

## 📊 So Sánh Methods

| Method | RAM Cần | An Toàn | Tốc Độ |
|--------|---------|---------|--------|
| `build-vps-safe.sh` | 1GB+ | ⭐⭐⭐⭐⭐ | Chậm hơn |
| `build-vps.sh` | 2GB+ | ⭐⭐⭐ | Nhanh |
| `docker-compose build` | 2GB+ | ⭐⭐ | Trung bình |

## 🚀 Workflow Khuyến Nghị

```bash
# 1. Tăng swap (nếu chưa có)
sudo swapon --show || sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile

# 2. Cleanup
docker system prune -a -f --volumes

# 3. Build an toàn
./build-vps-safe.sh

# 4. Deploy
./deploy.sh up
```

## 🐛 Vẫn Bị Lỗi?

1. **Check logs:**
   ```bash
   journalctl -k | grep -i oom
   dmesg | tail -20
   ```

2. **Tăng swap lên 4GB:**
   ```bash
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

3. **Build từng stage thủ công:**
   ```bash
   docker build --target deps -t schedy-deps . --memory=512m
   docker build --target prisma-gen -t schedy-prisma . --memory=512m
   docker build --target builder -t schedy-builder . --memory=1g
   docker build --target runner -t schedy:latest . --memory=512m
   ```

## 📖 Chi Tiết

Xem [VPS_BUILD_SAFE.md](./VPS_BUILD_SAFE.md) để biết chi tiết đầy đủ.


