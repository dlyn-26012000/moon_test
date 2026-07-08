# Improvement — User Home

Đề xuất cải tiến theo nhóm. Trạng thái: ✅ Đã xử lý trong lần này · 📝 Khuyến nghị (config/ops/thiết kế, chưa đổi code).

## UI

- ✅ **Trạng thái tim đúng ngữ cảnh** — đã fix BUG-001: `FavoriteProductResource` default `is_favorited=false`, `topFavorites()`/`list()` gọi `attachFavoriteStatus()` → guest thấy tim rỗng, user đăng nhập thấy đúng.
- 📝 **Empty state có thông báo** — MostLiked/Featured hiện `return null` khi rỗng. Đây là hành vi ẩn section chủ đích (chuẩn e-commerce, tránh block trống trên homepage). Giữ nguyên; nếu muốn phân biệt "lỗi tải" vs "không có dữ liệu" thì bổ sung UI riêng cho nhánh `hasError`.
- 📝 **Skeleton nhất quán** — chuẩn hoá skeleton giữa các section khi fallback client-fetch.

## UX

- ✅ **Search hoạt động** — đã fix BUG-004: ô tìm kiếm Header nay là `<form>` có state + `router.push('/products?keyword=...')`, submit bằng Enter hoặc nút kính lúp.
- 📝 **Phản hồi lỗi API** — `serverFetch` nuốt lỗi → section rỗng im lặng. Cân nhắc thông báo nhẹ ở nhánh lỗi (thay đổi lớn hơn, cần thống nhất UX).
- 📝 **Countdown khi campaign hết hạn** — đảm bảo hết giờ thì không hiển thị sản phẩm campaign đã hết hạn (kiểm tra scope `active()`).

## Performance

- ✅ **Khử gọi trùng `user/categories`** — `CategoryNav` render 2 lần (desktop + mobile) gây 2 request. Đã thêm cache TTL 60s trong `CategoryService.getList()` → chia sẻ 1 request.
- 📝 **Tối ưu ISR** — `serverFetch` dùng `revalidate=300` (trễ tối đa 5 phút). Cân nhắc on-demand revalidation cho banner/campaign khi cần cập nhật gấp (quyết định sản phẩm/ops).
- 📝 **Ảnh** — xác nhận `next/image` chỉ `priority` cho banner đầu; phần còn lại lazy-load.

## Security

- ✅ **Không còn 500 + info-disclosure từ filter mảng** — đã fix BUG-002: `ListRequest::formatFilters()`/`formatIncludes()` xử lý an toàn input mảng/non-scalar (`reset()` + cast string, bỏ qua non-scalar).
- ✅ **Validate & clamp tham số** — `top-favorites` clamp `limit` về 1..50 (BUG-003); `per_page` vốn đã 422 khi ≤0.
- 📝 **`APP_DEBUG=false` ở production** — sau fix BUG-002 endpoint không còn lộ lỗi, nhưng nên tắt debug ở production như biện pháp phòng thủ theo chiều sâu (deploy config, ngoài phạm vi sửa code).

## Accessibility

- ✅ **Search a11y** — input có `aria-label`, nút submit `aria-label`, `type="search"`, `enterKeyHint="search"`, hỗ trợ submit bằng bàn phím.
- ✅ **Alt cho ảnh** — kiểm tra `HeroSection` (banner) và `ProductCard` đều đã có `alt` mô tả (không cần đổi).
- 📝 **Focus ring & thứ tự tab** — rà soát focus rõ ràng trên Header và trong modal.
- 📝 **Kiểm thử WCAG chuyên sâu** — chạy axe-core cho tương phản màu, landmark, heading order (việc kiểm thử, không phải code app).
