# Fix "Failed to find Server Action" Error

## 🔴 Lỗi

```
Error: Failed to find Server Action "x". This request might be from an older or newer deployment.
```

## 🔍 Nguyên nhân

Lỗi này thường xảy ra khi:

1. **Next.js build cache bị corrupt** - Cache không đồng bộ giữa client và server
2. **Mismatch giữa build và runtime** - Code đã thay đổi nhưng container chưa rebuild
3. **Server Actions không được định nghĩa** - Có form/component đang gọi Server Action nhưng không tồn tại
4. **Hot reload issue trong production** - Development code được chạy trong production mode

## ✅ Giải pháp

### Giải pháp 1: Rebuild Docker Image (Khuyến nghị)

```bash
# Stop containers
docker-compose down

# Rebuild không dùng cache
docker-compose build --no-cache

# Start lại
docker-compose up -d
```

### Giải pháp 2: Clear Next.js Cache trong Container

```bash
# Vào container
docker exec -it schedy-app sh

# Xóa cache
rm -rf .next/cache
rm -rf .next/standalone/.next/cache

# Restart container
exit
docker-compose restart app
```

### Giải pháp 3: Kiểm tra và Fix Server Actions

Nếu bạn đang sử dụng Server Actions, đảm bảo:

1. **Server Action phải có `"use server"` directive:**
```typescript
// app/actions.ts
"use server"

export async function myAction() {
  // ...
}
```

2. **Không gọi Server Action từ client component mà không import đúng:**
```typescript
// ❌ SAI
import { myAction } from '@/app/actions'

// ✅ ĐÚNG
import { myAction } from '@/app/actions'
// Và đảm bảo file actions.ts có "use server"
```

3. **Kiểm tra xem có form nào đang dùng `action` prop không:**
```typescript
// Nếu có form như này:
<form action={myAction}>
  ...
</form>

// Phải đảm bảo myAction là Server Action hợp lệ
```

### Giải pháp 4: Fix trong Dockerfile

Thêm vào Dockerfile để clear cache khi build:

```dockerfile
# Trong builder stage, trước khi build
RUN rm -rf .next
RUN npm run build
```

### Giải pháp 5: Environment Variables

Đảm bảo `NODE_ENV=production` được set đúng:

```yaml
# docker-compose.yml
environment:
  - NODE_ENV=production
```

## 🔧 Quick Fix Script

Tạo file `fix-server-action.sh`:

```bash
#!/bin/bash
echo "🔧 Fixing Server Action Error..."

# Stop containers
echo "Stopping containers..."
docker-compose down

# Remove old build
echo "Removing old build cache..."
docker rmi schedy:latest 2>/dev/null || true

# Rebuild
echo "Rebuilding..."
docker-compose build --no-cache

# Start
echo "Starting containers..."
docker-compose up -d

echo "✅ Done! Check logs with: docker-compose logs -f app"
```

## 📝 Kiểm tra sau khi fix

1. **Check logs:**
```bash
docker-compose logs -f app
```

2. **Test application:**
```bash
curl http://localhost:8080/api/health
```

3. **Check browser console** - Không còn lỗi Server Action

## 🚨 Prevention

Để tránh lỗi này trong tương lai:

1. **Luôn rebuild sau khi thay đổi code:**
```bash
docker-compose build && docker-compose up -d
```

2. **Không dùng development mode trong production:**
```bash
# ❌ SAI
npm run dev

# ✅ ĐÚNG
npm run build && npm start
```

3. **Clear cache định kỳ:**
```bash
docker system prune -f
```

4. **Sử dụng BuildKit cache đúng cách:**
```bash
DOCKER_BUILDKIT=1 docker-compose build
```

## 🔗 Tài liệu tham khảo

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js Deployment](https://nextjs.org/docs/deployment#docker-image)



