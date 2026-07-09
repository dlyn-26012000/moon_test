# Nhiệm vụ kiểm thử

Sử dụng toàn bộ quy tắc, tiêu chuẩn, cấu trúc thư mục, định dạng báo cáo và quy trình kiểm thử đã được định nghĩa trong file `test/rule.md`.

---

# Module

user/order

---

# Mục tiêu

Thực hiện kiểm thử End-to-End toàn bộ luồng **Đặt hàng của User**, từ lúc truy cập website đến khi tạo đơn hàng thành công và hoàn tất các trạng thái liên quan.

---

# Phạm vi kiểm thử

Chỉ kiểm thử toàn bộ luồng đặt hàng của User, bao gồm (nếu có):

- Home
- Product List
- Product Detail
- Search
- Category
- Add to Cart
- Cart
- Coupon
- Checkout
- Shipping
- Payment
- Order Success
- Order Detail
- Order History
- Các popup, modal hoặc trang phát sinh trong quá trình đặt hàng.

Không kiểm thử các module không liên quan trực tiếp đến luồng đặt hàng như:

- CMS
- Admin
- Quản lý người dùng
- Quản lý sản phẩm
- Báo cáo
- ...

Nếu phát hiện lỗi ngoài phạm vi nhưng ảnh hưởng trực tiếp đến khả năng đặt hàng thì vẫn phải ghi nhận trong Bug Report.

---

# Requirement

> Dán toàn bộ Requirement của luồng đặt hàng tại đây.

Nếu Requirement thiếu, hãy tự phân tích nghiệp vụ từ hệ thống hiện có và ghi rõ các giả định trong report.

---

# Thông tin hệ thống

Frontend

https://moon.dlyn.site

Backend API

https://api-moon.dlyn.site

Tài khoản

Email: user001

Password: password

---

# Quyền thực hiện

Được phép sử dụng toàn bộ quyền cần thiết để phục vụ kiểm thử, bao gồm nhưng không giới hạn:

- Thực thi SQL trực tiếp lên Database để chuẩn bị hoặc làm sạch dữ liệu.
- Thêm/Sửa/Xóa dữ liệu phục vụ kiểm thử.
- Reset dữ liệu nếu cần.
- Fake hoặc gọi trực tiếp Webhook thanh toán.
- Fake callback từ cổng thanh toán.
- Gọi API nội bộ.
- Seed dữ liệu.
- Thay đổi trạng thái Order, Payment hoặc Shipment để kiểm thử các nhánh nghiệp vụ.
- Tạo dữ liệu test nếu hệ thống chưa có.

Ưu tiên sử dụng API hoặc SQL thay vì thao tác UI khi mục đích chỉ là chuẩn bị dữ liệu.

---

# Kịch bản cần kiểm thử

Thực hiện đầy đủ kiểm thử cho cả hai trường hợp:

## 1. Người dùng chưa đăng nhập

Kiểm tra toàn bộ luồng như:

- Truy cập Home.
- Xem danh sách sản phẩm.
- Xem chi tiết sản phẩm.
- Add to Cart.
- Thay đổi số lượng.
- Xóa sản phẩm.
- Tiến hành Checkout.
- Kiểm tra hệ thống yêu cầu Login ở thời điểm nào.
- Sau khi Login có quay lại đúng luồng hay không.
- Dữ liệu Cart có được giữ nguyên hay không.
- Có mất Coupon hoặc thông tin đã nhập hay không.

---

## 2. Người dùng đã đăng nhập

Kiểm thử toàn bộ các luồng:

- Add to Cart.
- Mua nhiều sản phẩm.
- Mua nhiều biến thể.
- Coupon.
- Shipping.
- Địa chỉ.
- Payment.
- QR Payment (nếu có).
- Chuyển khoản.
- Fake webhook.
- Thành công.
- Thất bại.
- Timeout.
- Refresh trang.
- Quay lại trình duyệt.
- Double click.
- Submit nhiều lần.
- Network chậm.
- Mất mạng.
- Retry.
- Thanh toán sau.
- Đơn đã thanh toán.
- Đơn hết hạn.
- Hủy đơn.
- Kiểm tra Order History.
- Kiểm tra Order Detail.

---

# Yêu cầu thực hiện

Thực hiện đầy đủ theo quy trình trong `test/rule.md`, bao gồm:

- Phân tích Requirement.
- Phân tích Business Flow.
- Sinh đầy đủ Test Case.
- Thực hiện kiểm thử End-to-End bằng Playwright.
- Functional Testing.
- UI Testing.
- UX Testing.
- Responsive Testing.
- API Testing.
- Database Validation.
- Security Testing cơ bản.
- Boundary Testing.
- Negative Testing.
- Error Handling.
- Bug Hunting.
- Regression nếu cần.
- Thu thập đầy đủ Evidence.

Nếu API được gọi trong quá trình đặt hàng thì phải kiểm tra:

- Request.
- Response.
- Status Code.
- Validation.
- Authentication.
- Authorization.
- Idempotency.
- Duplicate Request.
- Data consistency giữa UI, API và Database.

Nếu có webhook thanh toán thì phải kiểm thử đầy đủ:

- Webhook thành công.
- Webhook gửi nhiều lần.
- Webhook sai chữ ký.
- Webhook sai dữ liệu.
- Webhook đến trước.
- Webhook đến sau.
- Retry webhook.
- Idempotency.

Nếu cần thay đổi dữ liệu để hoàn thành kiểm thử thì được phép sử dụng SQL hoặc API thay vì thao tác UI.

---

# Deliverables

Xuất đầy đủ theo đúng cấu trúc trong `test/rule.md`, bao gồm:

- report.md
- testcases.md
- bug_report.md
- improvement.md
- risks.md
- summary.json
- script/
- evidence/
    - ui/
    - api/
    - db/
    - network/
    - console/
    - video/
    - screenshot/

---

# Điều kiện hoàn thành

Chỉ kết thúc khi:

- Đã bao phủ toàn bộ luồng đặt hàng.
- Đã kiểm thử cả khi chưa đăng nhập và đã đăng nhập.
- Đã kiểm thử toàn bộ phương thức thanh toán.
- Đã kiểm thử toàn bộ nhánh thành công, thất bại và ngoại lệ.
- Đã xác nhận dữ liệu giữa UI, API và Database luôn đồng nhất.
- Không còn Test Case hợp lý nào chưa được thực hiện.
- Đã lưu đầy đủ Screenshot, Video, Network Log, Console Log, API Log, Database Evidence và các bằng chứng khác.
- Đã tạo đầy đủ toàn bộ tài liệu theo template.