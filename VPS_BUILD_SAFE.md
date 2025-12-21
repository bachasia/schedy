# 🛡️ Hướng Dẫn Build An Toàn Cho VPS Cấu Hình Thấp

## ⚠️ Vấn Đề

Build Docker có thể khiến VPS bị shutdown do:
- **OOM (Out of Memory)**: Build process sử dụng quá nhiều RAM
- **Disk đầy**: Build cache và layers tích lũy
- **CPU overload**: Build process quá nặng

## ✅ Giải Pháp

### 1. Sử dụng Script Build An Toàn

```bash
# Script tự động kiểm tra resources và giới hạn memory
./build-vps-safe.sh
```

Script này sẽ:
- ✅ Kiểm tra disk space trước khi build
- ✅ Kiểm tra memory và tự động chọn mode phù hợp
- ✅ Cleanup tự động trước và sau build
- ✅ Giới hạn memory usage để tránh OOM
- ✅ Build từng stage để giảm memory peak

### 2. Build Modes

#### Safe Mode (Mặc định - Khuyến nghị cho VPS < 2GB RAM)
```bash
./build-vps-safe.sh --mode safe
```
- Build từng stage riêng
- Giới hạn memory: 512MB-1GB
- An toàn nhất, tránh OOM

#### Fast Mode (Chỉ cho VPS >= 4GB RAM)
```bash
./build-vps-safe.sh --mode fast
```
- Build toàn bộ một lần
- Nhanh hơn nhưng cần nhiều RAM
- Chỉ dùng khi VPS có >= 4GB RAM

#### Minimal Mode (Tự động khi RAM < 1GB)
```bash
./build-vps-safe.sh --mode minimal
```
- Tự động kích hoạt khi RAM thấp
- Giới hạn memory: 512MB
- Build từng stage với cleanup giữa các stage

## 🔧 Cấu Hình Cho VPS Cấu Hình Thấp

### 1. Tăng Swap Space (Khuyến nghị)

```bash
# Kiểm tra swap hiện tại
free -h

# Tạo swap file 2GB (nếu chưa có)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Làm cho swap permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Giới Hạn Docker Memory

```bash
# Edit Docker daemon config
sudo nano /etc/docker/daemon.json

# Thêm:
{
  "default-ulimits": {
    "memlock": {
      "hard": -1,
      "soft": -1
    }
  },
  "storage-driver": "overlay2"
}

# Restart Docker
sudo systemctl restart docker
```

### 3. Cleanup Định Kỳ

```bash
# Tạo cron job để cleanup hàng ngày
crontab -e

# Thêm dòng này (cleanup lúc 2h sáng):
0 2 * * * docker system prune -a -f --volumes --filter "until=24h"
```

## 📊 So Sánh Build Methods

| Method | RAM Required | Disk Required | Time | Safety |
|--------|--------------|---------------|------|--------|
| **build-vps-safe.sh** | 1GB+ | 5GB+ | 10-15 phút | ⭐⭐⭐⭐⭐ |
| build-vps.sh | 2GB+ | 5GB+ | 8-12 phút | ⭐⭐⭐ |
| docker-compose build | 2GB+ | 5GB+ | 10-15 phút | ⭐⭐ |

## 🚀 Cách Sử Dụng

### Bước 1: Kiểm Tra Resources

```bash
# Check disk space
df -h

# Check memory
free -h

# Check Docker usage
docker system df
```

### Bước 2: Cleanup Trước Khi Build

```bash
# Cleanup Docker resources
docker system prune -a -f --volumes

# Hoặc dùng script tự động
./build-vps-safe.sh  # Script tự động cleanup
```

### Bước 3: Build An Toàn

```bash
# Build với safe mode (khuyến nghị)
./build-vps-safe.sh

# Hoặc build không cache (nếu disk đầy)
./build-vps-safe.sh --no-cache
```

### Bước 4: Monitor Trong Khi Build

```bash
# Mở terminal khác để monitor
watch -n 1 'free -h && df -h / && docker stats --no-stream'
```

## 🐛 Troubleshooting

### VPS Vẫn Bị Shutdown?

1. **Kiểm tra logs:**
   ```bash
   # Check system logs
   journalctl -k | grep -i oom
   dmesg | grep -i "out of memory"
   ```

2. **Tăng Swap:**
   ```bash
   # Tạo swap 4GB
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

3. **Build từng stage thủ công:**
   ```bash
   # Stage 1: Dependencies
   docker build --target deps -t schedy-deps . --memory=512m
   
   # Stage 2: Prisma
   docker build --target prisma-gen -t schedy-prisma . --memory=512m
   
   # Stage 3: Builder
   docker build --target builder -t schedy-builder . --memory=1g
   
   # Stage 4: Final
   docker build --target runner -t schedy:latest . --memory=512m
   ```

### Disk Đầy?

```bash
# Cleanup ngay lập tức
docker system prune -a -f --volumes

# Xóa old images
docker image prune -a -f

# Xóa build cache
docker builder prune -a -f

# Check lại
df -h
```

### Build Quá Chậm?

1. **Kiểm tra có đủ RAM:**
   ```bash
   free -h
   # Nếu RAM < 1GB, tăng swap
   ```

2. **Sử dụng cache:**
   ```bash
   ./build-vps-safe.sh  # Mặc định dùng cache
   ```

3. **Build vào giờ thấp điểm:**
   - Tránh build khi VPS đang xử lý traffic cao

## 📈 Best Practices

1. ✅ **Luôn dùng build-vps-safe.sh** cho VPS < 4GB RAM
2. ✅ **Tăng swap** trước khi build lần đầu
3. ✅ **Cleanup định kỳ** để tránh disk đầy
4. ✅ **Monitor resources** trong khi build
5. ✅ **Backup trước khi build** nếu có data quan trọng
6. ✅ **Build vào giờ thấp điểm** để tránh ảnh hưởng service

## 🔍 Kiểm Tra Sau Build

```bash
# Check image size
docker images schedy:latest

# Check disk space
df -h

# Check memory
free -h

# Test image
docker run -p 3001:3001 schedy:latest
```

## 📞 Support

Nếu vẫn gặp vấn đề:
1. Check logs: `journalctl -k | grep -i oom`
2. Check disk: `df -h`
3. Check memory: `free -h`
4. Xem [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**Last Updated**: December 2024  
**Version**: 1.0.0


