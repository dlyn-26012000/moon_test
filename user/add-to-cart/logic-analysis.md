# Logic Analysis — User / Add to Cart

> Phân tích luồng nghiệp vụ **Add to Cart** dựa trên đọc mã nguồn (frontend `user/` + backend `api/`) và probe API thực tế trên môi trường `https://api-moon.dlyn.site`.
> Ngày phân tích: 2026-07-09 · Tester: AI QA Automation

---

## 1. Kiến trúc tổng quan

| Thành phần | Vị trí | Vai trò |
|-----------|--------|---------|
| Frontend | Next.js App Router — `user/` | UI, state cart bằng **zustand** (`store/useCart.ts`) |
| Cart service | `user/services/cart.service.ts` | Gọi API, quản lý `session_id` khách |
| Backend | Laravel — `api/` | `CartController` + `CartService` |
| Lưu trữ giỏ | **Server-side** bảng `carts` / `cart_items` | Khách: keyed bằng `session_id`; User: keyed bằng `user_id` |

**Kết luận quan trọng:** Giỏ hàng của khách **KHÔNG** lưu trong localStorage dưới dạng dữ liệu sản phẩm. localStorage chỉ lưu **một khoá `cart_session_id`** (chuỗi định danh). Toàn bộ item được lưu trên server và truy vấn lại theo `session_id`. Đây là điểm khác biệt cốt lõi so với giỏ hàng client-only.

---

## 2. Endpoint API (đã xác minh thực tế)

Prefix: `https://api-moon.dlyn.site/api/user`

| # | Method | Path | Auth | Mô tả |
|---|--------|------|------|-------|
| 1 | GET | `/cart?includes=items&session_id=<sid>` | Optional | Lấy giỏ; **tự tạo** giỏ mới nếu chưa có |
| 2 | POST | `/cart/add` | Optional | Thêm item `{product_id, product_variant_id?, quantity, session_id?}` |
| 3 | PUT | `/cart/{id}/update` | Optional | Cập nhật `{quantity, session_id?}` — `quantity=0` ⇒ xoá |
| 4 | DELETE | `/cart/{id}/delete?session_id=<sid>` | Optional | Xoá item |

**Không có route riêng cho merge và clear** — merge xảy ra ngầm bên trong `getCart()` khi request vừa có user đã đăng nhập vừa có `session_id`.

Response chuẩn: `{ status, message, data }`. `add` trả về **một** `CartItemResource`, không trả về toàn giỏ. **Không có totals/subtotal do server tính** — client tự cộng theo token tiền tệ (`CartSidebar.tsx:62`).

---

## 3. Luồng thêm vào giỏ (Frontend)

### 3.1. Ba điểm gọi `addToCart`

| Điểm gọi | File | Chặn khách chưa login? | Ghi chú |
|----------|------|------------------------|---------|
| Product **listing card** | `components/product/ProductCard.tsx:75` | ✅ CÓ chặn — `if(!user) openLoginModal()` | Sản phẩm có biến thể ⇒ điều hướng sang trang chi tiết |
| **Quick View** modal | `components/product/QuickViewModal.tsx:34` | ✅ CÓ chặn | |
| Product **detail page** | `components/product/ProductDetail.tsx:150` | ❌ **KHÔNG** chặn | Khách thêm được từ đây |

> **⚠️ Bất nhất nghiệp vụ:** Khách **không** thêm được từ card/quick-view (bị ép login) nhưng **thêm được** từ trang chi tiết. Backend cho phép khách thêm giỏ hoàn toàn (route không auth). Đây là ứng viên Bug/Improvement (xem `bug_report.md`).

### 3.2. Debounce ở trang chi tiết

`ProductDetail.tsx:44-65` dùng `debounce` + `accumulatedQty` ref: nhiều lần bấm "Thêm" trong khoảng debounce sẽ **cộng dồn** số lượng rồi gọi API **một lần**. ⇒ Bấm nhanh liên tục không tạo nhiều request nhưng vẫn cộng đúng tổng.

### 3.3. Biến thể (variant)

- Toàn bộ sản phẩm trên môi trường test đều `has_variants=true` (size + Color).
- Phải chọn đủ thuộc tính để ra `selectedVariant`; nếu chọn tổ hợp không tồn tại ⇒ `combination_unavailable`.
- Số lượng bị chặn client-side ở `totalStock`: nút `+` disabled khi `quantity >= totalStock` (`ProductDetail.tsx:399`).

---

## 4. Kiểm tra tồn kho & validation (đã probe thực tế)

| Trường hợp | Input | Kết quả API thực tế | HTTP |
|-----------|-------|---------------------|------|
| Thêm hợp lệ | v189 x2 | `PRODUCT_ADDED_TO_CART_SUCCESSFULLY` | 200 |
| Thêm lại cùng variant | v189 x3 | **Cộng dồn** ⇒ q=5 | 200 |
| Vượt tồn kho | v189 x1000 (stock 85) | `INSUFFICIENT_INVENTORY` | 422 |
| quantity = 0 | | `VALIDATION_ERROR` | 422 |
| quantity = -1 | | `VALIDATION_ERROR` | 422 |
| product không tồn tại | id 99999999 | `NOT_FOUND` | 404 |
| update ⇒ 0 | | `PRODUCT_REMOVED_FROM_CART_SUCCESSFULLY` | 200 |
| delete item đã xoá | | `NOT_FOUND` | 404 |

- Validation `AddToCartRequest`: `quantity: required|integer|min:1` — **không có max** (chỉ tồn kho chặn trên).
- Kiểm tra tồn kho dùng **tổng tích luỹ** (`giỏ hiện tại + thêm mới`) so với `available_quantity`, không phải chỉ phần thêm.
- `PRODUCT_NOT_FOUND`/`PRODUCT_VARIANT_NOT_FOUND` bị handler ghi đè thành `NOT_FOUND` chung (client mất mã cụ thể).

---

## 5. Giỏ khách → Đăng nhập (Merge) — ĐÃ XÁC MINH

`CartService::mergeCart()` (`api/app/Services/Api/User/CartService.php:62-99`):

- Kích hoạt trong `getCart()` khi có **cả** user đã đăng nhập **và** `session_id`.
- Frontend kích hoạt qua `Header.handleLoginSuccess → fetchCart()` (`Header.tsx:393`), và `fetchCart` luôn gửi `session_id` từ localStorage.
- Quy tắc: dedupe theo `(product_id, product_variant_id)`:
  - Trùng ⇒ **cộng dồn** số lượng.
  - Không trùng ⇒ chuyển item sang giỏ user.
  - Xoá giỏ khách rỗng sau khi merge.

**Probe thực tế:** guest v189 x2 + v190 x1 → login user001 → giỏ user: v189 (35+2=37), v190 x1. ✅ Merge cộng dồn + dedupe đúng.

> **⚠️ Rủi ro:** merge **không** re-validate tồn kho ⇒ giỏ sau merge có thể vượt kho (xem `risks.md`).

---

## 6. Hiển thị giỏ (CartSidebar)

- Badge số lượng trên header = `items.length` = **số dòng sản phẩm khác nhau**, KHÔNG phải tổng quantity (`Header.tsx:351`). ⇒ Thêm 5 cái cùng 1 variant ⇒ badge vẫn hiển thị "1".
- Cập nhật số lượng ở sidebar: debounce 800ms rồi gọi `PUT update` (`CartSidebar.tsx:41`). `newQty < 1` bị chặn client-side.
- Xoá item: gọi `removeItem` (`CartSidebar.tsx:255`).
- Tổng tiền: gộp theo `token.symbol`, dùng `sale_price` nếu đang sale (`CartSidebar.tsx:62-70`).

---

## 7. Câu hỏi mở / điểm cần kiểm thử sâu

1. `session_id` là chuỗi client tự cung cấp, **không ký/không kiểm sở hữu** ⇒ IDOR: đoán được `session_id` người khác là đọc/sửa được giỏ họ. (Security probe)
2. Cart routes không auth ⇒ user đã login vẫn có thể thao tác giỏ khách qua `session_id`? (Service luôn ưu tiên `user_id` nếu có token ⇒ cần verify.)
3. Merge không giới hạn tồn kho ⇒ boundary sau login.
4. Badge đếm theo dòng gây hiểu nhầm số lượng (UX).
