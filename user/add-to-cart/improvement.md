# Improvement Suggestions — User / Add to Cart

Module: `user/add-to-cart` · Ngày: 2026-07-09 · Tester: AI QA Automation

> Trạng thái: **✅ Đã triển khai** 6/10 (#1, #2, #3, #8, #9, #10). **⏳ Deferred** 3 mục kiến trúc (#5, #6, #7) + 1 UX nhỏ (#4) — lý do bên dưới. Toàn bộ đã verify: frontend `tsc` + `eslint` sạch; backend `php -l` sạch + **1710/1710** unit/feature test PASS.

---

## UX

1. ✅ **Đồng nhất luồng guest add-to-cart** (BUG-001): đã bỏ guard `!user` ở `ProductCard.tsx` + `QuickViewModal.tsx`; guest thêm giỏ được ở mọi điểm gọi.
2. ✅ **Badge số lượng theo tổng quantity** (RISK-003): `Header.tsx` — `cartCount = items.reduce((s,i)=>s+i.quantity,0)`.
3. ✅ **Phản hồi rõ khi vượt tồn kho:** thêm `lib/cart-error.ts` map `INSUFFICIENT_INVENTORY` → key `insufficient_inventory` ("Số lượng vượt quá tồn kho hiện có"); áp dụng ở ProductCard/QuickView/ProductDetail.
4. ⏳ **Cuộn/nhấn mạnh khối chọn biến thể** khi chưa chọn: giữ nguyên toast cảnh báo hiện có (đủ dùng); đề xuất scroll-to là nice-to-have, chưa làm để tránh phình phạm vi.

## Performance

5. ⏳ **Gộp request sau `add` / `add` trả toàn giỏ:** **Deferred** — thay đổi contract API `POST /cart/add` (đang trả 1 `CartItemResource`) có phạm vi ảnh hưởng rộng (mọi consumer). Là tối ưu, không phải lỗi; nên làm trong ticket riêng có regression đầy đủ.

## Security

6. ⏳ **Bảo vệ `session_id`** (RISK-001): **Deferred** — cần thiết kế lại luồng guest cart (ký HMAC hoặc cookie `HttpOnly`) đồng bộ cả FE lẫn BE + hạ tầng cookie/CORS. Rủi ro hồi quy cao cho một bản vá gộp; tách ticket security riêng. (Đề xuất kèm: rate-limit `POST /cart/add`.)

## Backend / API

7. ⏳ **Trả totals & line price từ server:** **Deferred** — cần tính tổng đa-token/tỷ giá phía server; FE hiện đã tính đúng. Đưa vào ticket cùng Checkout để nhất quán một nguồn sự thật.
8. ✅ **Giữ mã lỗi cụ thể:** `bootstrap/app.php` — chỉ giữ message khi khớp UPPER_SNAKE_CASE (regex `^[A-Z][A-Z0-9_]+$`); message khung (câu có dấu cách) vẫn về `NOT_FOUND`/`FORBIDDEN` (không rò rỉ). ⇒ `PRODUCT_NOT_FOUND`, `PRODUCT_VARIANT_NOT_FOUND`, `CART_ITEM_ACCESS_DENIED` nay tới được client.
9. ✅ **Re-validate tồn kho khi merge** (RISK-002): `CartService::mergeCart` cap `min(tổng, availableInventory)`; tách helper `availableInventory()`. Thêm 2 unit test capping.
10. ✅ **Accessibility:** `aria-label` cho nút giỏ header (`Header.tsx`), nút −/+ số lượng (ProductDetail + CartSidebar), nút xoá item; thêm `aria-live` cho số lượng. Locale keys mới: `decrease_quantity`, `increase_quantity`, `remove`.

---

## Tệp đã thay đổi

**Frontend (`user/`):** `components/product/ProductCard.tsx`, `components/product/QuickViewModal.tsx`, `components/product/ProductDetail.tsx`, `components/header/Header.tsx`, `components/header/CartSidebar.tsx`, `lib/cart-error.ts` (mới), `locales/vi/common.json`, `locales/en/common.json`.

**Backend (`api/`):** `app/Services/Api/User/CartService.php`, `bootstrap/app.php`, `tests/Unit/Services/Api/User/CartServiceTest.php` (cập nhật 2 test + thêm 2 test capping).
