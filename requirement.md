# Nhiệm vụ kiểm thử

Sử dụng toàn bộ quy tắc, tiêu chuẩn, cấu trúc thư mục, định dạng báo cáo và quy trình kiểm thử đã được định nghĩa trong file `test/rule.md`.

---

# Module

`user/product-detail`

---

# Mục tiêu

Thực hiện kiểm thử End-to-End cho **màn hình Product Detail của User** trong cả hai trạng thái:

- **Guest (Chưa đăng nhập)**
- **Authenticated User (Đã đăng nhập)**

---

# Phạm vi kiểm thử

Chỉ kiểm thử màn hình **Product Detail**.

Việc đăng nhập chỉ được sử dụng làm **Precondition** để kiểm thử trạng thái người dùng đã đăng nhập. **Không kiểm thử chức năng Login**.

Không kiểm thử các module khác như:

- Authentication
- Register
- Forgot Password
- Profile
- Cart *(chỉ xác minh hành vi Add to Cart từ Product Detail, không kiểm thử toàn bộ module Cart)*
- Checkout
- Wishlist *(chỉ kiểm tra thao tác phát sinh từ Product Detail)*
- CMS
- Admin
- ...

Nếu phát hiện lỗi thuộc module khác nhưng ảnh hưởng trực tiếp đến Product Detail thì ghi nhận trong báo cáo.

---

# Requirement

> Dán toàn bộ Requirement của màn hình Product Detail tại đây.

---

# Thông tin hệ thống

**Website**

https://moon.dlyn.site

### Tài khoản kiểm thử

| Username | Password |
|----------|----------|
| user001 | password |

---

# Yêu cầu thực hiện

Thực hiện đầy đủ các bước theo template:

- Phân tích Requirement.
- Phân tích luồng nghiệp vụ Product Detail.
- Sinh đầy đủ Test Case.
- Kiểm thử ở trạng thái Guest.
- Kiểm thử ở trạng thái Authenticated User.
- Thực hiện kiểm thử bằng Playwright.
- Kiểm thử Functional.
- Kiểm thử UI.
- Kiểm thử UX.
- Kiểm thử Responsive.
- Kiểm thử API (nếu Product Detail sử dụng API).
- Kiểm thử SEO cơ bản (nếu là trang public).
- Kiểm thử Performance cơ bản.
- Thực hiện Bug Hunting.
- Thu thập đầy đủ Evidence.
- Xuất toàn bộ kết quả theo đúng cấu trúc quy định trong `test/rule.md`.

---

# Nội dung kiểm thử

## 1. Guest (Chưa đăng nhập)

### Hiển thị thông tin sản phẩm

- Tên sản phẩm
- Hình ảnh
- Gallery
- Thumbnail
- Zoom (nếu có)
- Giá
- Giá khuyến mãi
- Badge
- SKU
- Danh mục
- Thương hiệu
- Tồn kho
- Mô tả
- Thông số kỹ thuật

### Điều hướng

- Truy cập trực tiếp bằng URL
- Refresh
- Browser Back
- Browser Forward
- Deep Link
- Breadcrumb

### Related Products

- Hiển thị đúng
- Điều hướng đúng

### Rating & Review

- Hiển thị đúng
- Load More / Pagination (nếu có)

### Add to Cart

Kiểm tra hành vi khi chưa đăng nhập:

- Cho phép thêm vào giỏ
- Hoặc yêu cầu đăng nhập
- Hoặc chuyển sang Login
- Hoặc hiển thị popup

### Wishlist

- Kiểm tra xử lý khi chưa đăng nhập

### Buy Now

- Kiểm tra xử lý khi chưa đăng nhập

---

## 2. Authenticated User (Đã đăng nhập)

Đăng nhập bằng:

```
Username: user001
Password: password
```

Sau khi đăng nhập, thực hiện lại toàn bộ các test ở Guest và kiểm thử thêm:

### Add to Cart

- Thành công
- Đúng biến thể
- Đúng số lượng
- Loading
- Double Click
- Disable Button
- Toast Message

### Buy Now

- Thành công
- Validate
- Loading

### Wishlist

- Add
- Remove
- Refresh vẫn giữ trạng thái
- Đồng bộ UI

### Review

- Tạo review (nếu được phép)
- Rating
- Validate
- Upload ảnh (nếu có)

### Quyền người dùng

Nếu hệ thống hỗ trợ:

- Giá thành viên
- Flash Sale
- Reward Point
- Membership
- Voucher
- Giá theo đăng nhập

---

# Kiểm thử Functional

- Product Information
- Gallery
- Variant
- Quantity
- Add to Cart
- Buy Now
- Wishlist
- Review
- Rating
- Related Products
- Breadcrumb
- URL
- Refresh
- Browser Navigation
- Error Handling

---

# Kiểm thử UI

- Layout
- Font
- Alignment
- Padding
- Margin
- Button
- Icon
- Image
- Skeleton
- Empty State
- Overflow
- Responsive Layout

---

# Kiểm thử UX

- Loading
- Skeleton
- Animation
- Hover
- Focus
- Keyboard Navigation
- Accessibility cơ bản

---

# Kiểm thử Responsive

- Desktop
- Tablet
- Mobile
- Landscape

---

# Kiểm thử API

Nếu Product Detail sử dụng API:

- Success Response
- Validation
- Unauthorized
- Forbidden
- Empty Data
- Retry
- Network Error
- Status Code
- Loading State

---

# Bug Hunting

Bao gồm:

- Functional Bug
- UI Bug
- UX Bug
- Logic Bug
- Responsive Bug
- Console Error
- Network Error
- Performance Issue
- Accessibility Issue
- Security Issue trong phạm vi Product Detail

---

# Deliverables

Xuất đầy đủ theo đúng cấu trúc trong `test/rule.md`.

```
test/
└── user/
    └── product-detail/
        ├── report.md
        ├── testcases.md
        ├── bug_report.md
        ├── improvement.md
        ├── risks.md
        ├── summary.json
        ├── script/
        │   └── product-detail.spec.js
        └── evidence/
            ├── api/
            ├── ui/
            ├── network/
            ├── console/
            ├── screenshot/
            └── video/
```

---

# Điều kiện hoàn thành

Chỉ kết thúc khi:

- Đã kiểm thử đầy đủ với **Guest User**.
- Đã kiểm thử đầy đủ với **Authenticated User**.
- Đã thực hiện toàn bộ Test Case hợp lý.
- Không còn trường hợp kiểm thử có ý nghĩa.
- Đã hoàn thành Functional, UI, UX, Responsive, API và Bug Hunting.
- Đã lưu đầy đủ Screenshot, Video, Network Log, Console Log và các Evidence.
- Đã tạo đầy đủ:
  - `report.md`
  - `testcases.md`
  - `bug_report.md`
  - `improvement.md`
  - `risks.md`
  - `summary.json`
- Đã tạo Playwright script có thể chạy lại.
- Đã lưu toàn bộ Evidence theo đúng cấu trúc quy định trong `test/rule.md`.