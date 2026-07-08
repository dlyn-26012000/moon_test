# Nhiệm vụ kiểm thử

Sử dụng toàn bộ quy tắc, tiêu chuẩn, cấu trúc thư mục, định dạng báo cáo và quy trình kiểm thử đã được định nghĩa trong file test/rule.md.

---

# Module

user/home

---

# Mục tiêu

Thực hiện kiểm thử End-to-End cho **màn hình Home của User**.

---

# Phạm vi kiểm thử

Chỉ kiểm thử màn hình **Home**.

Nếu cần đăng nhập để truy cập Home thì Login chỉ được xem là **Precondition**, không kiểm thử chức năng Login.

Không kiểm thử các module khác như:

- Authentication
- Register
- Forgot Password
- Profile
- Cart
- Checkout
- CMS
- Admin
- ...

Nếu phát hiện lỗi ở module ngoài phạm vi thì chỉ ghi chú nếu lỗi đó ảnh hưởng trực tiếp đến màn hình Home.

---

# Requirement

> Dán toàn bộ Requirement của màn hình Home tại đây.

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
- Phân tích luồng nghiệp vụ của Home.
- Sinh đầy đủ Test Case.
- Thực hiện kiểm thử bằng Playwright.
- Kiểm thử Functional.
- Kiểm thử UI.
- Kiểm thử UX.
- Kiểm thử Responsive.
- Kiểm thử API (nếu màn Home sử dụng API).
- Thực hiện Bug Hunting.
- Thu thập đầy đủ Evidence.
- Xuất toàn bộ kết quả theo đúng cấu trúc thư mục đã quy định trong template.

---

# Điều kiện hoàn thành

Chỉ kết thúc khi:

- Đã thực hiện toàn bộ Test Case hợp lý.
- Không còn trường hợp kiểm thử có ý nghĩa.
- Đã lưu đầy đủ Screenshot, Video, Network Log, Console Log và các Evidence khác.
- Đã tạo đầy đủ Report, Test Case, Bug Report, Improvement, Risks và các file output theo template.
