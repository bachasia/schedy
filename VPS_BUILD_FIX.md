# 🔧 Hướng Dẫn Build Cho VPS 2GB RAM - Fix Build Bị Treo

## ⚠️ Vấn Đề: Build Bị Treo

Build Docker bị treo khi đang build trên VPS 2GB RAM do:
- Next.js build process sử dụng quá nhiều memory
- Webpack parallel processing tốn memory
- Không có cleanup giữa các build stage

## ✅ Giải Pháp Đã Áp Dụng

### 1. Giảm Memory Limit
- **NODE_OPTIONS**: Giảm từ 512MB → **384MB**
- **WEBPACK_MEMORY_LIMIT**: Giới hạn 256MB
- **Webpack parallelism**: Tắt (set = 1)

### 2. Tối Ưu Webpack Config
- Tắt parallel processing (`parallelism: 1`)
- Giảm cache memory (`maxMemoryGenerations: 1`)
- Tối ưu optimization settings

### 3. Cleanup Giữa Các Stage
- Tự động cleanup sau mỗi stage
- Giải phóng memory ngay sau builder stage

### 4. Environment Variables
- `CI=true`: Tắt một số tính năng tốn memory
- `WEBPACK_MEMORY_LIMIT=256`: Giới hạn webpack memory
- `NEXT_PRIVATE_SKIP_TURBO=1`: Tắt Turbo mode

## 🚀 Cách Build

### Cách 1: Dùng Script An Toàn (Khuyến Nghị)

```bash
# Build với minimal mode
./build-vps-safe.sh --mode minimal
```

### Cách 2: Build Thủ Công Từng Stage

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Stage 1: Dependencies
docker build --target deps -t schedy-deps .

# Stage 2: Prisma
docker build --target prisma-gen -t schedy-prisma .

# Cleanup trước builder
docker system prune -f

# Stage 3: Builder (quan trọng nhất)
docker build \
  --target builder \
  --tag schedy-builder:latest \
  --build-arg NODE_OPTIONS="--max-old-space-size=384" \
  --progress=plain \
  .

# Cleanup sau builder
docker system prune -f

# Stage 4: Final
docker build --target runner -t schedy:latest .

# Cleanup intermediate images
docker rmi schedy-deps schedy-prisma schedy-builder || true
```

### Cách 3: Dùng Docker Compose

```bash
export DOCKER_BUILDKIT=1
docker-compose build
```

## 📋 Checklist Trước Khi Build

### ✅ Bắt Buộc: Tăng Swap Space

```bash
# Kiểm tra swap hiện tại
free -h

# Tạo swap 2-4GB (quan trọng!)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Làm permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Kiểm tra lại
free -h
```

### ✅ Cleanup Trước Khi Build

```bash
# Dọn dẹp Docker resources
docker system prune -a -f --volumes

# Kiểm tra disk space (cần ít nhất 5GB)
df -h

# Kiểm tra memory
free -h
```

### ✅ Monitor Trong Khi Build

Mở terminal khác để monitor:

```bash
# Monitor memory và disk
watch -n 2 'free -h && echo "---" && df -h / && echo "---" && docker stats --no-stream'
```

## 🐛 Nếu Vẫn Bị Treo

### 1. Kiểm Tra Logs

```bash
# Check system logs
journalctl -k | grep -i oom
dmesg | grep -i "out of memory"

# Check Docker logs
docker system events
```

### 2. Tăng Swap Lên 4GB

```bash
sudo swapoff /swapfile
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 3. Giảm NODE_OPTIONS Xuống 256MB

Chỉnh sửa `Dockerfile` dòng 52:
```dockerfile
ARG NODE_OPTIONS="--max-old-space-size=256"
```

Và build lại:
```bash
docker build --build-arg NODE_OPTIONS="--max-old-space-size=256" -t schedy:latest .
```

### 4. Build Trên Máy Khác Rồi Push Lên

Nếu VPS quá yếu, có thể build trên máy local rồi push lên registry:

```bash
# Build trên local
docker build -t schedy:latest .

# Tag cho registry
docker tag schedy:latest your-registry/schedy:latest

# Push lên registry
docker push your-registry/schedy:latest

# Pull trên VPS
docker pull your-registry/schedy:latest
```

## 📊 So Sánh Memory Usage

| Config | Memory Usage | Build Time | An Toàn |
|--------|--------------|------------|---------|
| Default (1024MB) | ~1.5-2GB | Nhanh | ❌ Treo |
| 512MB | ~800MB-1GB | Trung bình | ⚠️ Có thể treo |
| **384MB (hiện tại)** | **~600-800MB** | **Chậm hơn** | **✅ An toàn** |
| 256MB | ~400-600MB | Rất chậm | ✅✅ Rất an toàn |

## 💡 Tips

1. **Build vào giờ thấp điểm** để tránh ảnh hưởng service
2. **Tắt các service không cần thiết** trước khi build
3. **Monitor memory** trong suốt quá trình build
4. **Backup trước khi build** nếu có data quan trọng
5. **Sử dụng swap** - rất quan trọng cho VPS 2GB RAM

## 🔍 Kiểm Tra Sau Build

```bash
# Check image size
docker images schedy:latest

# Check disk space
df -h

# Check memory
free -h

# Test image
docker run -p 3100:3100 schedy:latest
```

---

**Last Updated**: January 2025  
**Version**: 2.0.0 - Optimized for VPS 2GB RAM

