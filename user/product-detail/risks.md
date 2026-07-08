# Potential Risks — Product Detail (User)

Ngày: 2026-07-08 · Module: `user/product-detail`

Danh sách rủi ro chưa đủ bằng chứng để kết luận là Bug, kèm lý do và hướng xác minh thêm.

---

## RISK-01 — API redirect 302 khi thiếu header `Accept: application/json`

**Mô tả:** Các endpoint như `/user/cart/add` (validation), `/user/favorites/toggle`, `/user/reviews` (unauthenticated) trả **302 redirect** (Location: `.../cms/auth/login` hoặc trang chủ) khi request **không** gửi `Accept: application/json`. Khi có header này, chúng trả đúng 401/422 JSON.

**Vì sao là Risk chứ chưa phải Bug:** Frontend hiện tại dùng axios (mặc định gửi `Accept: application/json`), nên người dùng cuối không gặp. Tuy nhiên client bên thứ ba, script tích hợp, hoặc trình duyệt gọi trực tiếp có thể nhận HTML redirect thay vì lỗi JSON → xử lý sai.

**Bằng chứng:** So sánh curl có/không `Accept: json` — tái hiện 2/2. Xem `evidence/api/`.

**Hướng xử lý:** Ép nhóm route `/api/*` luôn trả JSON (middleware `Accept` hoặc `$request->expectsJson()` fallback).

---

## RISK-02 — Request API lặp lại khi điều hướng

**Mô tả:** Trong một phiên điều hướng nhiều trang, `GET /user/categories` (~13 lần) và `GET /user/cart` (~14 lần) được gọi lặp; `reviews`/`reviews/stats` ~9 lần. Con số này là **tổng tích luỹ toàn phiên** (mỗi lần đổi trang header refetch), không phải trong 1 lần tải trang.

**Vì sao là Risk:** Chưa đủ bằng chứng đây là gọi thừa trong **một** lần tải Product Detail (đo per-page cho thấy mỗi trang chỉ gọi ~1 lần mỗi endpoint). Cần đo lại riêng biệt để kết luận.

**Bằng chứng:** `evidence/network/guest-api-hits.json`, `auth-api-hits.json`.

**Hướng xử lý:** Đo số request trong đúng 1 lần tải trang detail; cân nhắc cache client cho categories/cart.

---

## RISK-03 — Flicker trạng thái Wishlist trước khi seed xong

**Mô tả:** `FavoriteButton` dùng `favoriteIds.size > 0 ? isFavorited(id) : initialFavorited`. Khi tải trang, `favoriteIds` rỗng cho tới khi `useSeedFavorites` gọi xong `GET /user/favorites`. Trong khoảng đó nút dựa vào `initialFavorited` = `product.is_favorited`, mà API detail luôn trả `is_favorited = null`. → Có thể xuất hiện flicker: nút hiện "chưa thích" trong ~vài trăm ms rồi mới chuyển "đã thích".

**Vì sao là Risk:** Trong test, trạng thái sau refresh **vẫn đúng** (đã thích), nên persistence không lỗi. Flicker là hiện tượng thị giác ngắn, chưa gây sai chức năng.

**Bằng chứng:** `evidence/screenshot/auth-08-wishlist-refresh.png`; phân tích mã `store/useFavorite.ts`, `hooks/useSeedFavorites.ts`.

**Hướng xử lý:** Cho API detail trả `is_favorited` chính xác theo token, hoặc render nút favorite sau khi seed xong.

---

## RISK-04 — `networkidle` không bao giờ đạt do Pusher websocket

**Mô tả:** Trang giữ kết nối realtime (Pusher, key `e4215cbe08dce18fc381`) nên trạng thái `networkidle` của Playwright không ổn định (đôi khi timeout 60s). DOMContentLoaded rất nhanh (~300–440ms).

**Vì sao là Risk (không phải Bug):** Đây là hành vi bình thường của kết nối realtime; chỉ ảnh hưởng cách **đo** chứ không ảnh hưởng người dùng. Script đã chuyển sang `domcontentloaded` + settle.

**Hướng xử lý:** Dùng DOMContentLoaded/LCP làm mốc đo hiệu năng thay vì networkidle.

---

## RISK-05 — Chưa phủ nhánh có review thật / pagination review

**Mô tả:** Các sản phẩm mẫu (`reviews_count = 0`) nên phần hiển thị danh sách review có nội dung, phân phối sao, bộ lọc theo sao/ảnh, lightbox ảnh, và Load More/Pagination chưa được kiểm thử trên dữ liệu thật.

**Vì sao là Risk:** Logic tồn tại trong mã (`ReviewList.tsx`) và API trả đúng cấu trúc, nhưng chưa có dữ liệu để xác minh hiển thị end-to-end.

**Hướng xử lý:** Chuẩn bị sản phẩm có review + ảnh trên môi trường staging để phủ các nhánh này; kiểm tra bộ lọc và lightbox.

---

## RISK-06 — Sale window (thời gian khuyến mãi) chưa kiểm chứng theo thời gian

**Mô tả:** Giá có `sale_start_at`/`sale_end_at`. Chưa kiểm tra hành vi khi thời điểm hiện tại **ngoài** khoảng sale (giá sale còn hiển thị hay không), do phụ thuộc thời gian server.

**Vì sao là Risk:** Cần thao tác thời gian/dữ liệu để xác minh; hiện chỉ quan sát trạng thái đang trong sale.

**Hướng xử lý:** Kiểm thử với sản phẩm có sale đã hết hạn / chưa bắt đầu.
