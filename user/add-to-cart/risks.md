# Potential Risks — User / Add to Cart

Module: `user/add-to-cart` · Ngày: 2026-07-09 · Tester: AI QA Automation

Các mục dưới đây là **rủi ro** — có dấu hiệu rõ nhưng cần thêm bối cảnh nghiệp vụ/quyết định thiết kế trước khi kết luận là Bug.

---

## RISK-001 — IDOR giỏ hàng khách qua `session_id` (High)

**Mô tả:** `session_id` là chuỗi do client tự sinh/tự cung cấp, **không được ký (sign) và không kiểm tra quyền sở hữu** ở server. Bất kỳ ai biết/đoán được `session_id` của một guest khác đều có thể **đọc và sửa** giỏ hàng đó.

**Bằng chứng:** Case D-12 (`evidence/api/api-log.md`) — client thứ hai `GET /user/cart?session_id=<sid nạn nhân>` trả về 200 kèm toàn bộ items. `CartService::getCart()` (`api/.../CartService.php:48-55`) chỉ match theo `session_id` thô.

**Vì sao chưa kết luận Bug:** `session_id` mặc định là chuỗi ngẫu nhiên 40 ký tự (khó đoán), và dữ liệu giỏ hàng ít nhạy cảm. Mức độ khai thác thực tế phụ thuộc việc `session_id` có bị lộ qua log/URL/referrer hay không.

**Đề xuất:** Ký `session_id` (HMAC) hoặc gắn vào cookie `HttpOnly` thay vì tham số truy vấn; không log `session_id`.

---

## RISK-002 — Merge giỏ khi đăng nhập không re-validate tồn kho (Medium)

**Mô tả:** `CartService::mergeCart()` **cộng dồn** số lượng guest + user cho cùng variant **mà không** kiểm tra lại tồn kho. Add/Update có validate tồn kho, nhưng merge thì không ⇒ sau khi login, giỏ có thể chứa số lượng **vượt `available_quantity`**.

**Bằng chứng:** Đọc mã `api/.../CartService.php:62-99` (không gọi `validateInventory`). Probe merge cộng dồn thành công 35+2=37 (M-05) không có bước chặn kho.

**Vì sao chưa kết luận Bug:** Chưa dựng được kịch bản guest_qty + user_qty > stock trên tài khoản test (kho các variant khá lớn: 85/54/99). Về logic thì lỗ hổng rõ ràng; hệ quả thực tế sẽ lộ ở bước checkout.

**Đề xuất:** Trong `mergeCart`, sau khi cộng dồn hãy `min(tổng, available_quantity)` hoặc chạy `validateInventory` và cắt/cảnh báo.

---

## RISK-003 — Badge giỏ đếm theo số dòng, không theo tổng số lượng (Low)

**Mô tả:** Badge trên header dùng `items.length` (số dòng sản phẩm khác nhau), không phải tổng quantity (`Header.tsx:351`). Thêm 5 sản phẩm cùng một variant ⇒ badge vẫn hiển thị **"1"**.

**Bằng chứng:** Case G-05 (qty=2 cùng variant) badge=1 dòng; logic đọc từ mã nguồn.

**Vì sao chưa kết luận Bug:** Có thể là chủ đích thiết kế (đếm SKU). Tuy nhiên đa số e-commerce đếm tổng số lượng ⇒ dễ gây hiểu nhầm.

**Đề xuất:** Cân nhắc `items.reduce((a,i)=>a+i.quantity,0)` cho badge, hoặc làm rõ ý nghĩa.

---

## Quan sát khác (chưa xếp hạng rủi ro)

- **Mã lỗi bị che:** `PRODUCT_NOT_FOUND` / `PRODUCT_VARIANT_NOT_FOUND` bị handler ghi đè thành `NOT_FOUND` chung (`bootstrap/app.php:68`) ⇒ client mất thông tin phân biệt. Ảnh hưởng debug/telemetry hơn là chức năng.
- **Không có totals từ server:** toàn bộ tính tổng tiền do client thực hiện theo token (`CartSidebar.tsx:62`). Rủi ro sai lệch nếu nhiều token/tỷ giá — cần theo dõi ở Checkout (ngoài phạm vi).
