# Test Cases — User / Add to Cart

Module: `user/add-to-cart` · Tester: AI QA Automation · Ngày: 2026-07-09
Môi trường: UI `https://moon.dlyn.site` · API `https://api-moon.dlyn.site/api` · Tài khoản `user001 / password`

Ký hiệu: **P** = Positive, **N** = Negative, **B** = Boundary, **S** = Security.
Cột "Auto" cho biết case được tự động hoá trong `script/` (UI) hoặc `evidence/api` (API).

---

## Nhóm A — Guest (Chưa đăng nhập)

| ID | Loại | Tiêu đề | Bước | Kỳ vọng | Auto |
|----|------|---------|------|---------|------|
| G-01 | P | Truy cập danh sách sản phẩm | Mở `/products` | Danh sách render, có card sản phẩm | UI |
| G-02 | P | Truy cập trang chi tiết | Click 1 sản phẩm | Trang `/products/{slug}` hiển thị, có nút Thêm vào giỏ | UI |
| G-03 | P | Guest thêm SP (có biến thể) từ trang chi tiết | Chọn size+color, bấm Thêm vào giỏ | Toast thành công; badge giỏ tăng; item vào server theo `session_id` | UI |
| G-04 | P | Guest thêm nhiều sản phẩm | Thêm 2 variant khác nhau | Giỏ có 2 dòng | UI |
| G-05 | P | Guest thêm cùng SP nhiều lần | Thêm variant v189 hai lần | Số lượng cộng dồn, không tạo dòng trùng | UI+API |
| G-06 | P | Guest cập nhật số lượng trong CartSidebar | Tăng/giảm qty | Qty cập nhật sau debounce; tổng tiền đổi | UI |
| G-07 | P | Guest xoá sản phẩm khỏi giỏ | Bấm xoá item | Item biến mất; giỏ cập nhật | UI |
| G-08 | P | Refresh trình duyệt | Thêm SP → F5 | Giỏ vẫn còn (đọc lại theo `session_id`) | UI |
| G-09 | P | Mở tab mới | Thêm SP → mở tab mới cùng origin | Giỏ hiển thị giống nhau (chung localStorage `cart_session_id`) | UI |
| G-10 | P | Đóng/mở lại trình duyệt | Persist `cart_session_id` | Giỏ được khôi phục | UI |
| G-11 | P | Dữ liệu giỏ lưu đúng | So khớp UI vs `GET /cart` | product_id, variant, quantity khớp | UI+API |
| G-12 | N | Guest bấm Thêm ở product card | Bấm nút trên card sản phẩm có biến thể | Điều hướng sang trang chi tiết (không thêm trực tiếp) | UI |

---

## Nhóm B — Authenticated User (Đã đăng nhập)

| ID | Loại | Tiêu đề | Bước | Kỳ vọng | Auto |
|----|------|---------|------|---------|------|
| A-01 | P | User thêm SP vào giỏ | Precondition login → thêm variant | Item vào giỏ user (keyed user_id) | UI |
| A-02 | P | User thêm nhiều sản phẩm | Thêm ≥2 variant | Giỏ nhiều dòng | UI |
| A-03 | P | Thêm SP có biến thể | Chọn size+color | Variant đúng được thêm | UI |
| A-04 | B | Giới hạn số lượng theo tồn kho | Đẩy qty tới `totalStock` | Nút `+` disabled tại max; không vượt kho | UI |
| A-05 | B | Vượt tồn kho qua API | POST add qty > stock | 422 `INSUFFICIENT_INVENTORY` | API |
| A-06 | P | Kiểm tra tồn kho hiển thị | Xem nhãn "Còn N sản phẩm" | Khớp `available_quantity` | UI |
| A-07 | P | Cập nhật số lượng | Sửa qty ở sidebar | Cập nhật đúng; xuống 0 ⇒ xoá | UI+API |
| A-08 | P | Xoá sản phẩm | Xoá item | Item biến mất | UI |
| A-09 | P | Dữ liệu giỏ sau reload | Thêm → F5 | Giỏ giữ nguyên (theo user_id) | UI |
| A-10 | P | Nhiều tab khi đã login | Thêm ở tab A → mở tab B | Cùng giỏ user | UI |

---

## Nhóm C — Guest → Login (Merge)

| ID | Loại | Tiêu đề | Bước | Kỳ vọng | Auto |
|----|------|---------|------|---------|------|
| M-01 | P | Guest thêm SP trước khi login | Guest thêm 1–2 variant | Giỏ khách theo `session_id` | UI |
| M-02 | P | Kiểm tra giỏ trước login | Mở CartSidebar | Hiển thị đúng item khách | UI |
| M-03 | P | Đăng nhập tài khoản hợp lệ | Mở modal, login user001 | Login thành công (Precondition) | UI |
| M-04 | P | Kiểm tra giỏ sau login (merge) | Mở lại giỏ | Item khách được giữ/merge vào giỏ user | UI+API |
| M-05 | P | Merge cộng dồn đúng số lượng | Guest & user có cùng variant | Quantity = tổng hai bên | API |
| M-06 | P | Không mất dữ liệu / không trùng | So khớp trước–sau | Không dòng trùng ngoài mong muốn | UI+API |
| M-07 | P | Giá & tổng tiền chính xác sau merge | So khớp UI vs API | Đơn giá, tổng khớp | UI+API |
| M-08 | P | API & UI đồng nhất | So khớp `GET /cart` vs sidebar | Số dòng, qty, id khớp | UI+API |

---

## Nhóm D — API / Validation / Negative / Boundary

| ID | Loại | Tiêu đề | Input | Kỳ vọng |
|----|------|---------|-------|---------|
| D-01 | P | Add hợp lệ | v189 x2 | 200 `PRODUCT_ADDED_TO_CART_SUCCESSFULLY` |
| D-02 | P | Add cộng dồn | v189 x3 lần 2 | 200, quantity tổng |
| D-03 | B | Vượt tồn kho | v189 x1000 | 422 `INSUFFICIENT_INVENTORY` |
| D-04 | N | quantity = 0 | quantity:0 | 422 `VALIDATION_ERROR` |
| D-05 | N | quantity âm | quantity:-1 | 422 `VALIDATION_ERROR` |
| D-06 | N | quantity không phải số | quantity:"abc" | 422 `VALIDATION_ERROR` |
| D-07 | N | product không tồn tại | id 99999999 | 404 `NOT_FOUND` |
| D-08 | N | variant không thuộc product | product 100 + variant lạ | 404 `NOT_FOUND` |
| D-09 | P | GET cart tạo session mới | GET không session_id | 200, trả `session_id` mới |
| D-10 | P | Update ⇒ 0 xoá item | PUT quantity:0 | 200 `PRODUCT_REMOVED_FROM_CART_SUCCESSFULLY` |
| D-11 | N | Delete item đã xoá | DELETE lại | 404 `NOT_FOUND` |
| D-12 | S | IDOR giỏ khách | Dùng `session_id` của session khác | Truy cập được giỏ (rủi ro) — ghi nhận |
| D-13 | S | SQL injection ở session_id | `session_id="' OR 1=1--"` | Không rò rỉ/không crash |
| D-14 | P | Response time | Add/list | < 1500ms |
| D-15 | P | Schema response | CartResource | Có `id, user_id, session_id, items[]` |

---

## Nhóm E — UI / UX / Responsive

| ID | Loại | Tiêu đề | Kỳ vọng |
|----|------|---------|---------|
| E-01 | UI | Nút "Thêm vào giỏ hàng" hiển thị & bấm được | Nút primary, đủ tương phản |
| E-02 | UI | Trạng thái loading khi thêm | Spinner "Đang thêm..." |
| E-03 | UI | Toast phản hồi | Toast thành công/thất bại |
| E-04 | UI | Badge số lượng trên header | Cập nhật sau khi thêm |
| E-05 | UX | Bộ chọn số lượng (− / +) | Disable đúng ở min/max |
| E-06 | UX | Empty state giỏ | Hiển thị "Giỏ hàng của bạn đang trống" |
| E-07 | UI | CartSidebar mở/đóng | Slide-in, nút X đóng |
| E-08 | Resp | Desktop 1920/1440/1366 | Không vỡ layout, không scroll ngang |
| E-09 | Resp | Tablet iPad / iPad Air | Layout co giãn đúng |
| E-10 | Resp | Mobile iPhone14/SE/Pixel7/S23 | Nút đủ lớn, sidebar full-width, không tràn |
| E-11 | UX | i18n VI/EN | Nhãn nút & toast đổi theo ngôn ngữ |

---

**Tổng số Test Case: 56** (Guest 12 · Auth 10 · Merge 8 · API 15 · UI/UX/Responsive 11)
