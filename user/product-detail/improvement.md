# Improvement — Product Detail (User)

Ngày: 2026-07-08 · Module: `user/product-detail`

Các đề xuất cải tiến (xếp theo nhóm). Mức độ: 🔴 nên làm sớm · 🟡 nên làm · 🟢 tuỳ chọn.

> **Cập nhật 2026-07-08 — trạng thái xử lý.** Ký hiệu: ✅ Đã làm · 🔶 Làm một phần · ⏳ Hoãn (kèm lý do).
>
> | Nhóm | Mục | Trạng thái |
> |------|-----|-----------|
> | 1 | Thêm key `adding`/`to_cart` | ✅ |
> | 1 | Sửa `useTranslation` trả rỗng khi thiếu key | ⏳ Hoãn (rủi ro regression toàn app — chỉ thêm key là đủ) |
> | 2 | Phân biệt out_of_stock vs combination_unavailable | ✅ |
> | 2 | Disable option không khả dụng | ✅ |
> | 3 | Chuẩn hoá HTTP status (422/404) | ✅ |
> | 3 | Validate ở FormRequest | ✅ (`AddToCartRequest`) |
> | 3 | Trả JSON kể cả khi thiếu `Accept` | ✅ (`ForceJsonResponse`) |
> | 4 | 404 thật cho slug sai | ✅ |
> | 4 | JSON-LD structured data | ✅ |
> | 5 | UI tạo review trên trang detail | ⏳ Hoãn (phụ thuộc order-item; xem ghi chú) |
> | 5 | Load More / Pagination review | ⏳ Hoãn (🟢) |
> | 6 | Giảm request lặp | 🔶 (categories đã cache sẵn; cart cần đo per-page) |
> | 7 | Accessibility nút thuộc tính | ✅ (span→button + aria-pressed + disabled) |
> | 8 | Sanitize HTML mô tả | ⏳ Không áp dụng hiện tại (mô tả render dạng text, chưa dùng HTML) |
>
> **Ghi chú mục 5 (review UI):** Backend `CreateReviewRequest` yêu cầu `order_item_id` của một đơn **đã giao (DELIVERED)** — không thể tạo review chỉ từ `product_id`. Ngoài ra `user/services/review.service.ts` đang gửi payload `product_id` (sai so với backend). Đây là tính năng thuộc module Order/Review, cần luồng "đánh giá từ đơn hàng đã giao" → hoãn khỏi phạm vi Product Detail và ghi nhận mismatch payload để xử lý riêng.

---

## 1. i18n / Nội dung

- 🔴 **Bổ sung key dịch `adding` và `to_cart`** vào `locales/vi/common.json` và `locales/en/common.json` (liên quan BUG-005). Đồng thời sửa `useTranslation` để trả chuỗi rỗng/`null` khi thiếu key thay vì trả nguyên `path`, giúp các fallback dạng `t('x') || 'X'` hoạt động đúng và tránh lộ key trong tương lai.
- 🟡 Rà soát toàn bộ trang detail để phát hiện các key khác có nguy cơ thiếu (mô tả mặc định hard-code tiếng Việt trong `ProductDetail.tsx` khi không có `translation.description`).

## 2. UX chọn Variant

- 🔴 **Phân biệt trạng thái "Hết hàng" và "Tổ hợp không khả dụng"** (BUG-003). Khi `selectedVariant === null` vì tổ hợp không tồn tại, hiển thị thông báo riêng và không tái dùng nhãn "Hết hàng".
- 🟡 **Disable trực quan các giá trị thuộc tính không thể kết hợp** (giống Shopee/Tiki): khi người dùng chọn 1 thuộc tính, làm mờ những giá trị của nhóm khác mà không tạo thành variant hợp lệ.
- 🟢 Tự động chọn variant hợp lệ gần nhất thay vì để `null`.

## 3. API / Backend

- 🔴 **Chuẩn hoá HTTP status cho lỗi nghiệp vụ** (BUG-001, BUG-002): lỗi tồn kho → 422/409; sản phẩm không tồn tại → 404; không dùng 500 cho lỗi có thể lường trước.
- 🟡 **Validate ở tầng FormRequest**: `product_id` `exists`, `quantity` `min:1` và `<= available_quantity`, `product_variant_id` thuộc về product.
- 🟡 **Trả 401/422 JSON kể cả khi thiếu `Accept: application/json`** cho các route `/api/*` (ép nhóm route API dùng middleware trả JSON), tránh 302 redirect về trang login CMS.

## 4. SEO

- 🟡 **Trả HTTP 404 thật cho slug sai** (BUG-004) thay vì 200, tránh soft-404 khiến bot index trang rỗng.
- 🟢 Thêm structured data `Product` (JSON-LD: name, image, price, availability, aggregateRating) để tăng khả năng hiển thị rich snippet. Hiện đã có OpenGraph/Twitter card tốt.

## 5. Tính năng Review

- 🟡 **Bổ sung UI tạo đánh giá trên trang detail** (form rating + nội dung + upload ảnh). API `/user/reviews` đã tồn tại nhưng trang detail chỉ hiển thị danh sách, chưa có nút/form tạo review — thiếu so với requirement ("Tạo review nếu được phép").
- 🟢 Thêm Load More / Pagination cho danh sách review (hiện chỉ tải trang đầu, `per_page: 10`).

## 6. Performance

- 🟡 **Giảm request lặp khi điều hướng**: `GET /user/categories` và `GET /user/cart` được gọi lại mỗi lần chuyển trang. Cân nhắc cache phía client (đã có cache category theo commit gần đây — kiểm tra hiệu lực) và chỉ refetch cart khi thực sự thay đổi.
- 🟢 `RelatedProducts` gọi `getList` rồi lọc client-side 5 sản phẩm + `getDetail` cho từng "recently viewed" (tối đa 5 request song song). Cân nhắc endpoint "related theo danh mục" để giảm số request và tăng độ liên quan.

## 7. Accessibility

- 🟢 Các nút chọn thuộc tính đang là `<span onClick>` — nên chuyển thành `<button>` để hỗ trợ keyboard/screen-reader (Enter/Space, focus ring).
- 🟢 Bổ sung `aria-pressed`/`role` cho nút chọn variant và tab để trợ năng rõ ràng hơn.

## 8. Bảo mật (trong phạm vi Product Detail)

- ✅ XSS qua query string không thực thi (đã kiểm tra) — giữ nguyên.
- 🟢 Đảm bảo mọi mô tả sản phẩm render qua sanitizer khi hiển thị HTML (hiện tab mô tả in text; nếu chuyển sang render HTML cần sanitize).
