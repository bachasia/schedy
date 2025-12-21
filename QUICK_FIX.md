# 🔧 Quick Fix Guide

## Lỗi khi chạy `./deploy.sh up`

### 1. Kiểm tra Logs

```bash
# Xem logs của app container
docker-compose logs app

# Hoặc
docker logs schedy-app

# Xem tất cả logs
docker-compose logs
```

### 2. Kiểm tra Container Status

```bash
# Xem trạng thái containers
docker-compose ps

# Hoặc
docker ps -a
```

### 3. Các Lỗi Thường Gặp

#### Lỗi: Image không tồn tại

```bash
# Build image trước
./build-vps-safe.sh

# Hoặc build với docker-compose
DOCKER_BUILDKIT=1 docker-compose build
```

#### Lỗi: Environment variables chưa set

```bash
# Kiểm tra file .env.production
cat .env.production

# Đảm bảo file tồn tại
ls -la .env.production

# Nếu chưa có, copy từ template
cp env.production.example .env.production
nano .env.production
```

#### Lỗi: Port đã được sử dụng

```bash
# Kiểm tra port 3001
netstat -tuln | grep 3001
# hoặc
ss -tuln | grep 3001

# Nếu port đã được dùng, stop service khác hoặc đổi port trong docker-compose.yml
```

#### Lỗi: Container crash ngay sau khi start

```bash
# Xem logs chi tiết
docker-compose logs app --tail=100

# Check exit code
docker inspect schedy-app | grep -A 10 "State"

# Restart container
docker-compose restart app
```

### 4. Debug Step-by-Step

```bash
# Bước 1: Stop tất cả containers
docker-compose down

# Bước 2: Kiểm tra image có tồn tại không
docker images | grep schedy

# Bước 3: Nếu chưa có image, build lại
./build-vps-safe.sh

# Bước 4: Kiểm tra .env.production
cat .env.production | grep -v "^#" | grep -v "^$"

# Bước 5: Start từng service một
docker-compose up -d redis
sleep 5
docker-compose up -d app
sleep 5
docker-compose up -d nginx

# Bước 6: Kiểm tra logs
docker-compose logs app
```

### 5. Clean Start (Nếu vẫn lỗi)

```bash
# Stop và xóa tất cả
docker-compose down -v

# Xóa image cũ (nếu cần)
docker rmi schedy:latest

# Build lại
./build-vps-safe.sh

# Start lại
./deploy.sh up
```

### 6. Kiểm tra Docker Compose Config

```bash
# Validate docker-compose.yml
docker-compose config

# Test config
docker-compose config --quiet
```

---

**Chạy lệnh này để xem lỗi chi tiết:**
```bash
docker-compose logs app --tail=50
```


