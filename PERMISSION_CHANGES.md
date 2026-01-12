# Cập nhật quyền hạn MANAGER - Tóm tắt thay đổi

## 📋 Tổng quan

Đã sửa đổi hệ thống phân quyền để MANAGER không còn có quyền quản lý TẤT CẢ profiles, mà chỉ có thể quản lý:

1. Profiles của chính họ
2. Profiles được ADMIN chỉ định (assigned)

---

## 🔧 Các thay đổi đã thực hiện

### 1. **Cập nhật Permissions** (`src/lib/permissions.ts`)

**Trước:**

```typescript
[Role.MANAGER]: [
    Permission.MANAGE_ALL_PROFILES,  // ❌ Đã xóa
    Permission.VIEW_ALL_PROFILES,    // ❌ Đã xóa
    ...
]
```

**Sau:**

```typescript
[Role.MANAGER]: [
    Permission.MANAGE_OWN_PROFILES,  // ✅ Chỉ profiles được assign
    Permission.VIEW_OWN_PROFILES,    // ✅ Chỉ profiles được assign
    ...
]
```

### 2. **Thêm bảng ProfileAssignment** (`prisma/schema.prisma`)

Tạo bảng mới để quản lý việc assign profiles cho managers:

```prisma
model ProfileAssignment {
  id         String   @id @default(cuid())
  managerId  String   // Manager được assign
  profileId  String   // Profile được assign
  assignedBy String?  // Admin thực hiện assign
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  manager User    @relation(...)
  profile Profile @relation(...)

  @@unique([managerId, profileId])
}
```

**Migration:** `20260112070105_add_profile_assignment`

### 3. **Cập nhật RBAC Logic** (`src/lib/rbac.ts`)

Thêm 3 hàm mới:

#### `canAccessProfile(profileId: string)`

Kiểm tra xem user có thể truy cập profile không:

- **ADMIN**: ✅ Tất cả profiles
- **MANAGER**: ✅ Profiles của họ + profiles được assign
- **EMPLOYEE**: ✅ Chỉ profiles của họ

#### `canModifyProfile(profileId: string)`

Kiểm tra xem user có thể chỉnh sửa profile không (logic giống `canAccessProfile`)

#### `getAccessibleProfileIds()`

Trả về danh sách ID của tất cả profiles mà user có thể truy cập:

- **ADMIN**: Tất cả profile IDs
- **MANAGER**: Profile IDs của họ + assigned profile IDs
- **EMPLOYEE**: Chỉ profile IDs của họ

### 4. **API mới để quản lý Assignments** (`src/app/api/admin/profile-assignments/route.ts`)

#### **GET** `/api/admin/profile-assignments`

Lấy danh sách assignments (chỉ ADMIN):

```typescript
// Lấy tất cả
GET /api/admin/profile-assignments

// Lấy theo manager
GET /api/admin/profile-assignments?managerId=xxx
```

Response:

```json
{
  "assignments": [
    {
      "id": "xxx",
      "managerId": "yyy",
      "profileId": "zzz",
      "manager": { "name": "...", "email": "..." },
      "profile": { "name": "...", "platform": "..." },
      "createdAt": "..."
    }
  ]
}
```

#### **POST** `/api/admin/profile-assignments`

Assign profile cho manager (chỉ ADMIN):

```json
{
  "managerId": "user_id_của_manager",
  "profileId": "profile_id_cần_assign"
}
```

#### **DELETE** `/api/admin/profile-assignments`

Xóa assignment (chỉ ADMIN)

---

## 📊 So sánh quyền hạn

| Quyền                        | ADMIN | MANAGER (Trước) | MANAGER (Sau) | EMPLOYEE |
| ---------------------------- | ----- | --------------- | ------------- | -------- |
| Quản lý user                 | ✅    | ❌              | ❌            | ❌       |
| Xem tất cả users             | ✅    | ✅              | ✅            | ❌       |
| Quản lý tất cả posts         | ✅    | ✅              | ✅            | ❌       |
| Quản lý tất cả profiles      | ✅    | ✅              | ❌            | ❌       |
| Quản lý profiles được assign | ✅    | -               | ✅            | -        |
| Quản lý profiles của mình    | ✅    | ✅              | ✅            | ✅       |

---

## 🎯 Cách sử dụng

### Để assign profile cho manager:

1. **Login với tài khoản ADMIN**

2. **Gọi API để assign:**

```bash
POST http://localhost:3100/api/admin/profile-assignments
Content-Type: application/json

{
  "managerId": "cmj78sr7w0000go7w4sepc732",  # ID của manager
  "profileId": "profile_xyz123"              # ID của profile cần assign
}
```

3. **Kiểm tra assignments:**

```bash
GET http://localhost:3100/api/admin/profile-assignments?managerId=cmj78sr7w0000go7w4sepc732
```

4. **Xóa assignment:**

```bash
DELETE http://localhost:3100/api/admin/profile-assignments
# Với assignment ID trong body hoặc URL
```

---

## ⚠️ Lưu ý quan trọng

1. **Database đã được reset** - Tất cả dữ liệu cũ đã bị xóa và seed lại với:
   - Admin user: `admin@schedy.local` / `Admin@123`

2. **Manager hiện tại**: Nếu có manager trong hệ thống, họ sẽ **KHÔNG** có quyền truy cập bất kỳ profile nào ngoài profiles của chính họ cho đến khi ADMIN assign.

3. **Posts của Manager**: Manager vẫn có quyền quản lý TẤT CẢ posts (không thay đổi), nhưng chỉ có thể tạo posts cho profiles mà họ có quyền truy cập.

4. **Tự động assign**: Hiện tại không có UI để assign profiles. Bạn cần:
   - Gọi API trực tiếp, hoặc
   - Tạo UI trong admin panel để quản lý assignments

---

## 🚀 Bước tiếp theo (tùy chọn)

Nếu muốn, tôi có thể tạo thêm:

1. **UI trong Admin Panel** để assign/unassign profiles cho managers
2. **Trang quản lý Profile Assignments** với bảng và form
3. **Dropdown trong Profile List** để quickly assign cho manager
4. **Notification** khi manager được assign profile mới

Bạn có muốn tôi tạo thêm UI không?
