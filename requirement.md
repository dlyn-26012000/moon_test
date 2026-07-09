# Nhiệm vụ kiểm thử

Sử dụng toàn bộ quy tắc, tiêu chuẩn, cấu trúc thư mục, định dạng báo cáo và quy trình kiểm thử đã được định nghĩa trong file `test/rule.md`.

---

# Module

user/add-to-cart

---

# Mục tiêu

Thực hiện kiểm thử End-to-End cho **luồng Add to Cart của User**, bao gồm cả trường hợp **chưa đăng nhập (Guest)** và **đã đăng nhập (Authenticated User)**.

---

# Phạm vi kiểm thử

Chỉ kiểm thử các chức năng liên quan trực tiếp đến **Add to Cart**.

Bao gồm các luồng sau:

## Luồng 1 - Guest (Chưa đăng nhập)

- Truy cập danh sách sản phẩm.
- Truy cập trang chi tiết sản phẩm.
- Thêm sản phẩm vào giỏ hàng.
- Thêm nhiều sản phẩm.
- Thêm cùng một sản phẩm nhiều lần.
- Cập nhật số lượng trong giỏ hàng (nếu thuộc luồng Add to Cart).
- Xóa sản phẩm khỏi giỏ hàng (nếu nằm trong màn Cart).
- Refresh trình duyệt.
- Mở tab mới.
- Đóng và mở lại trình duyệt (nếu hệ thống hỗ trợ lưu Cart).
- Kiểm tra dữ liệu Cart được lưu đúng theo yêu cầu.

---

## Luồng 2 - Authenticated User (Đã đăng nhập)

Đăng nhập chỉ được xem là **Precondition**, không kiểm thử chức năng Login.

Kiểm thử:

- Thêm sản phẩm vào Cart.
- Thêm nhiều sản phẩm.
- Thêm sản phẩm có biến thể (nếu có).
- Kiểm tra giới hạn số lượng.
- Kiểm tra tồn kho.
- Kiểm tra cập nhật số lượng.
- Kiểm tra xóa sản phẩm.
- Kiểm tra dữ liệu Cart sau khi reload.
- Kiểm tra dữ liệu Cart khi đăng nhập trên nhiều tab (nếu hệ thống hỗ trợ).

---

## Luồng 3 - Guest → Login

Đây là luồng bắt buộc phải kiểm thử.

Thực hiện:

1. Chưa đăng nhập.
2. Thêm một hoặc nhiều sản phẩm vào Cart.
3. Kiểm tra Cart trước khi đăng nhập.
4. Đăng nhập bằng tài khoản hợp lệ.
5. Kiểm tra Cart sau khi đăng nhập.

Xác minh:

- Cart được giữ nguyên.
- Hoặc Cart được merge với Cart của tài khoản (theo Requirement).
- Không mất dữ liệu.
- Không tạo sản phẩm trùng ngoài mong muốn.
- Số lượng chính xác.
- Giá chính xác.
- Tổng tiền chính xác.
- API và UI đồng nhất.

---

Không kiểm thử các module khác như:

- Authentication (chỉ sử dụng làm Precondition)
- Register
- Forgot Password
- Profile
- Checkout
- Payment
- Order
- Wishlist
- CMS
- Admin
- ...

Nếu phát hiện lỗi ở module ngoài phạm vi nhưng ảnh hưởng trực tiếp đến Add to Cart thì ghi chú trong báo cáo.

---

# Requirement

> Dán toàn bộ Requirement của chức năng Add to Cart tại đây.

---

# Thông tin hệ thống

Website:

https://example.com

Tài khoản:

Email:

Password:

---

# Yêu cầu thực hiện

Thực hiện đầy đủ các bước theo template:

- Phân tích Requirement.
- Phân tích luồng nghiệp vụ Add to Cart.
- Sinh đầy đủ Test Case.
- Bao phủ đầy đủ cả ba luồng:
  - Guest.
  - Authenticated User.
  - Guest → Login.

- Thực hiện kiểm thử bằng Playwright.
- Kiểm thử Functional.
- Kiểm thử UI.
- Kiểm thử UX.
- Kiểm thử Responsive.
- Kiểm thử API (nếu Add to Cart sử dụng API).
- Kiểm thử Boundary.
- Kiểm thử Negative.
- Kiểm thử Error Handling.
- Thực hiện Bug Hunting.
- Thu thập đầy đủ Evidence.
- Xuất toàn bộ kết quả theo đúng cấu trúc thư mục đã quy định trong template.

---

# Điều kiện hoàn thành

Chỉ kết thúc khi:

- Đã kiểm thử đầy đủ cả ba luồng:
  - Guest.
  - Authenticated User.
  - Guest → Login.

- Đã thực hiện toàn bộ Test Case hợp lý.
- Đã kiểm thử các trường hợp Positive, Negative và Boundary.
- Đã xác minh dữ liệu giữa UI và API (nếu có).
- Không còn trường hợp kiểm thử có ý nghĩa.
- Đã lưu đầy đủ Screenshot, Video, Network Log, Console Log và các Evidence khác.
- Đã tạo đầy đủ Report, Test Case, Bug Report, Improvement, Risks và các file output theo template.
