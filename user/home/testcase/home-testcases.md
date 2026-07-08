# Home (User) — Test Cases (Core Suite)

- **Ngày:** 2026-07-08 · **Chức năng:** User Home Screen · **Nguồn:** sinh trực tiếp từ source code (xem [`../logic-analysis.md`](../logic-analysis.md)).
- **Ký hiệu:** ✅ Pass · ❌ Fail (bug) · ⚠️ Pass-with-warning · ⬜ Not-run/Blocked · 🧪 = có evidence live.
- **UI:** `https://moon.dlyn.site/` · **API base:** `https://api-moon.dlyn.site/api/`.
- **Trạng thái:** *Phase 1–2 (chưa chạy live).*

> **Scope (đã trim theo yêu cầu):** tập trung **Functional/UI · API + Validation · Security · Bug candidates**.
> **Đã chủ động loại khỏi core** (ghi vào mục "Chưa test" của report, KHÔNG đánh Pass): Performance/stress, Responsive đa viewport, Accessibility/WCAG. Có thể bổ sung sau nếu cần.

---

## A. Functional — Guest (UI + data)  ·  11 case

| ID | Tiêu đề | Tiền điều kiện | Bước | Kỳ vọng | Kết quả |
|----|---------|----------------|------|---------|---------|
| TC-F01 | Mở Home (guest) render đủ section | chưa login | GET `/` | Hero, Feature, FlashSale, MostLiked, Featured, Membership hiển thị (trừ section ẩn khi rỗng) | ⬜ |
| TC-F02 | Hero — 3 carousel autoplay & loop (main 3s / side 4s / side 5s) | có banner đủ type | quan sát | mỗi khối tự chuyển đúng nhịp, loop | ⬜ |
| TC-F03 | Hero — click banner điều hướng `banner.link` | banner có link | click ảnh | tới đúng URL | ⬜ |
| TC-F04 | FlashSale — countdown chạy lùi mỗi giây | — | quan sát đồng hồ | h:m:s giảm dần, không nhảy layout | ⬜ |
| TC-F05 | FlashSale — render ≤4 card + "Xem tất cả" → `/products?sale=1` | có sản phẩm sale | xem grid, click link | ≤4 card; điều hướng đúng | ⬜ |
| TC-F06 | MostLiked — render card + "Xem tất cả" → `/favorites` | có sản phẩm favorite | xem section | card + link đúng | ⬜ |
| TC-F07 | Featured — render ≤4 + "Xem tất cả" → `/products?featured=1` | có sản phẩm featured | click link | điều hướng đúng | ⬜ |
| TC-F08 | ProductCard — click → chi tiết `/products/{slug}` | có card | click card | tới trang chi tiết | ⬜ |
| TC-F09 | Header — search điều hướng theo keyword | — | nhập từ khoá + Enter | tới trang kết quả với keyword | ⬜ |
| TC-F10 | Header — CTA Đăng nhập/Đăng ký mở modal | guest | click account | modal login/register mở | ⬜ |
| TC-F11 | Language switcher vi↔en đổi text Home | — | đổi ngôn ngữ | các `t()` (Feature, tiêu đề section) đổi | ⬜ |

## B. Functional — Logged User  ·  5 case

| ID | Tiêu đề | Tiền điều kiện | Bước | Kỳ vọng | Kết quả |
|----|---------|----------------|------|---------|---------|
| TC-L01 | Login rồi vào Home — Header đổi sang logged | user001 | login → `/` | avatar + dropdown thay CTA login | ⬜ |
| TC-L02 | Nút tim ProductCard phản ánh `is_favorited` | có favorite trước | xem card đã like | tim active | ⬜ |
| TC-L03 | Toggle favorite từ Home card | logged | click tim | `POST favorites/toggle` 200, tim đổi, count cập nhật | ⬜ |
| TC-L04 | Guest→logged: dữ liệu 5 section giống, chỉ `is_favorited` khác | — | so sánh trước/sau | nội dung section giống nhau | ⬜ |
| TC-L05 | Logout từ Home → trạng thái guest | logged | dropdown → Logout | header về CTA login, token xoá | ⬜ |

## C. API — Endpoints / Schema  ·  6 case

| ID | Endpoint | Kỳ vọng | Kết quả |
|----|----------|---------|---------|
| TC-A01 | `GET user/banners?includes=file` | 200, `data[]` có `id,type,link,file.url`; chỉ `is_active`; sort `order` asc | ⬜ |
| TC-A02 | `GET user/products?filters[is_sale]=1&per_page=4` | 200, ≤4, mỗi item `is_public`, có `prices`,`thumbnail` | ⬜ |
| TC-A03 | `GET user/products?filters[is_featured]=1&per_page=4` | 200, ≤4 featured | ⬜ |
| TC-A04 | `GET user/products/top-favorites?limit=8` | 200, sort favorites desc, mỗi item `favorites_count>0` | ⬜ |
| TC-A05 | `GET user/campaigns/active` | 200, campaign active + `products` public + `ends_at`,`bannerFile` | ⬜ |
| TC-A06 | Envelope nhất quán `{success,code,data}` + `Content-Type: application/json` | đúng shape & content-type | ⬜ |

## D. Validation — Query params  ·  6 case

| ID | Tiêu đề | Dữ liệu | Kỳ vọng | Kết quả |
|----|---------|---------|---------|---------|
| TC-V01 | `top-favorites?limit=8` có tôn trọng? | `limit=8` | **Nghi ngờ:** trả tối đa 10 (bỏ qua limit) → **BUG-C1** | ⬜ |
| TC-V02 | `products?per_page=0` | 0 | 422 (min:1) hoặc default an toàn | ⬜ |
| TC-V03 | `products?per_page=abc` | chuỗi | cast→0 → 422, không crash | ⬜ |
| TC-V04 | `filters[is_sale][]=1` (mảng) | mảng | **Nghi ngờ:** `trim(array)` → TypeError 500 → **BUG-C2** | ⬜ |
| TC-V05 | `orders[password]=asc` (cột lạ) | injection | bị bỏ qua, fallback `id desc`, không lỗi | ⬜ |
| TC-V06 | `orders[id]=;DROP TABLE` | SQLi | direction sanitize→desc, không thực thi | ⬜ |

## E. Security  ·  7 case

| ID | Tiêu đề | Kỳ vọng | Kết quả |
|----|---------|---------|---------|
| TC-S01 | 5 endpoint Home truy cập được khi guest (public) | 200 không cần token | ⬜ |
| TC-S02 | Không lộ dữ liệu user khác qua Home (no IDOR) | mọi field public/aggregate | ⬜ |
| TC-S03 | Cache ISR không rò rỉ `is_favorited` giữa user | không token → cache chung không chứa dữ liệu riêng → **BUG-C5?** | ⬜ |
| TC-S04 | top-favorites không lộ email/PII người like | chỉ product + count | ⬜ |
| TC-S05 | XSS qua `banner.link`/tên sản phẩm | React escape; link được kiểm | ⬜ |
| TC-S06 | Security headers (X-Content-Type-Options, CSP...) | ghi nhận hiện trạng | ⬜ |
| TC-S07 | Method sai (POST vào GET endpoint) | 405 Method Not Allowed | ⬜ |

## F. Empty / Error states (core)  ·  4 case

| ID | Tiêu đề | Kỳ vọng | Kết quả |
|----|---------|---------|---------|
| TC-E01 | Không banner nào | Hero hiện EmptyBanner/placeholder, không lỗi | ⬜ |
| TC-E02 | Không sản phẩm sale & không campaign | FlashSale hiện text `no_flash_sale` | ⬜ |
| TC-E03 | Không featured / không favorite | Featured & MostLiked ẩn hoàn toàn, không lỗi | ⬜ |
| TC-E04 | API trả 500/null cho 1 section | section rơi về empty, phần còn lại vẫn render (graceful) | ⬜ |

## G. Bug Candidates — xác minh tập trung  ·  6 case

| ID | Ứng viên | Nguồn (code) | Cách xác minh | Kết quả |
|----|----------|--------------|---------------|---------|
| BUG-C1 | `top-favorites?limit=8` bị bỏ qua (luôn default 10) | `FavoriteProductController::topFavorites()` gọi service không truyền `$limit` | gọi API với `limit=8` và `limit=2`, đếm số item trả về | ⬜ |
| BUG-C2 | `filters[is_x][]` mảng → `trim(array)` 500 | `ListRequest::formatFilters()` | gọi `products?filters[is_sale][]=1`, kỳ vọng KHÔNG 500 | ⬜ |
| BUG-C3 | `banner.link` null → `<Link href={null}>` lỗi | `HeroSection.tsx` | seed/kiểm banner link rỗng, xem console/render | ⬜ |
| BUG-C4 | Campaign `ends_at` quá khứ vẫn active → countdown 00:00:00 | `CampaignService::active()` + `useCountdown` | kiểm scope `active()` + hiển thị khi hết hạn | ⬜ |
| BUG-C5 | ISR cache dùng chung có thể lộ trạng thái tuỳ user | `serverFetch` revalidate=300, language=vi cố định | so sánh SSR guest vs logged (kỳ vọng SSR không chứa is_favorited) | ⬜ |
| BUG-C6 | SSR luôn `language=vi` bất kể lựa chọn user | `server-fetch.ts` | tải Home với locale `en`, xem HTML lần đầu | ⬜ |

---

### Tổng hợp
- **Tổng:** 11 (A) + 5 (B) + 6 (C) + 6 (D) + 7 (E) + 4 (F) + 6 (G) = **45 test case** (core).
- **Deferred (không đánh Pass, ghi "Chưa test"):** Performance/stress, Responsive đa viewport, Accessibility/WCAG.
- **Ưu tiên xác minh:** BUG-C1 (limit), BUG-C2 (array filter 500), BUG-C3 (banner.link null), BUG-C5 (cache leakage).
