# Nhiệm vụ kiểm thử

Sử dụng toàn bộ quy tắc, tiêu chuẩn, cấu trúc thư mục, định dạng báo cáo và quy trình kiểm thử đã được định nghĩa trong file **test/rule.md**.

---

# Module

user/home

---

# Mục tiêu

Thực hiện kiểm thử End-to-End cho **màn hình Home của User** ở **hai trạng thái**:

* Người dùng **chưa đăng nhập** (Guest).
* Người dùng **đã đăng nhập** (Authenticated User).

Đảm bảo cả hai trạng thái đều được kiểm thử đầy đủ và độc lập.

---

# Phạm vi kiểm thử

Chỉ kiểm thử **màn hình Home của User**.

Bao gồm nhưng không giới hạn:

* Giao diện Home.
* Dữ liệu hiển thị.
* Banner.
* Slider.
* Danh sách sản phẩm (nếu có).
* Danh mục.
* Search trên Home (nếu có).
* Navigation từ Home.
* Button.
* Link.
* Loading.
* Empty State.
* Error State.
* API được Home sử dụng.
* Responsive.
* UI.
* UX.
* Performance Observation.
* Bug Hunting.

### Trạng thái cần kiểm thử

#### 1. Guest (Chưa đăng nhập)

Kiểm thử toàn bộ hành vi của Home khi người dùng chưa đăng nhập.

Bao gồm:

* Nội dung hiển thị.
* Các button.
* Điều hướng.
* Quyền truy cập.
* API.
* UI.
* UX.
* Responsive.

#### 2. Authenticated User (Đã đăng nhập)

Sử dụng tài khoản được cung cấp để đăng nhập và kiểm thử lại toàn bộ màn hình Home.

So sánh sự khác biệt giữa Guest và Authenticated User.

Kiểm tra:

* Dữ liệu hiển thị.
* Thông tin người dùng.
* Các tính năng chỉ dành cho người đã đăng nhập.
* API.
* UI.
* UX.
* Responsive.

### Ngoài phạm vi

Không kiểm thử các module khác như:

* Authentication
* Register
* Forgot Password
* Profile
* Product Detail
* Cart
* Checkout
* CMS
* Admin

Nếu cần đăng nhập để vào trạng thái Authenticated thì Login chỉ được xem là **Precondition**, không kiểm thử chức năng Login.

Nếu phát hiện lỗi ở module ngoài phạm vi nhưng ảnh hưởng trực tiếp đến Home thì ghi nhận trong phần **Potential Risks** hoặc **Bug** nếu có thể tái hiện.

---

# Requirement

> Dán toàn bộ Requirement của màn hình Home tại đây.

Nếu Requirement chưa đầy đủ, hãy phân tích giao diện và hành vi hiện có của hệ thống để suy luận các trường hợp kiểm thử hợp lý, đồng thời ghi rõ các giả định trong báo cáo.

---

# Thông tin hệ thống

**Website**

https://moon.dlyn.site

**Tài khoản kiểm thử**

Email / Username:

user001

Password:

password

---

# Yêu cầu thực hiện

Thực hiện đầy đủ các bước theo template trong **test/rule.md**.

Bao gồm:

* Phân tích Requirement.
* Phân tích luồng nghiệp vụ của Home.
* Sinh đầy đủ Test Case.
* Kiểm thử trạng thái Guest.
* Kiểm thử trạng thái Authenticated User.
* So sánh sự khác biệt giữa hai trạng thái.
* Thực hiện kiểm thử bằng Playwright.
* Kiểm thử Functional.
* Kiểm thử API (nếu Home sử dụng API).
* Kiểm thử UI.
* Kiểm thử UX.
* Kiểm thử Responsive trên Desktop, Tablet và Mobile.
* Quan sát Performance.
* Thực hiện Bug Hunting.
* Thu thập đầy đủ Evidence.
* Xuất toàn bộ kết quả theo đúng cấu trúc thư mục đã quy định trong **test/rule.md**.

---

# Điều kiện hoàn thành

Chỉ kết thúc khi:

* Đã kiểm thử đầy đủ Home ở cả hai trạng thái Guest và Authenticated User.
* Đã thực hiện toàn bộ Test Case hợp lý.
* Không còn trường hợp kiểm thử có ý nghĩa.
* Đã lưu đầy đủ Screenshot, Video, Network Log, Console Log, HAR (nếu có) và các Evidence khác.
* Đã tạo đầy đủ:

  * `report.md`
  * `testcases.md`
  * `bug_report.md`
  * `improvement.md`
  * `risks.md`
  * `summary.json`
* Toàn bộ kết quả được lưu đúng cấu trúc thư mục theo quy định trong **test/rule.md**.
