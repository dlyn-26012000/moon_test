# Test Cases — User Home

- **Ngày:** 2026-07-08 · **Module:** User Home (`/`) · **Công cụ:** Playwright 1.61.1 (Chromium) + API probes (curl)
- **UI:** `https://moon.dlyn.site/` · **API:** `https://api-moon.dlyn.site/api/`
- **Nguồn:** đọc source (`user/app/page.tsx`, `components/home/*`, `components/header/Header.tsx`, backend services) + thực thi live.
- **Ký hiệu:** ✅ Pass · ❌ Fail (bug) · ⚠️ Pass-with-warning · ⬜ Not-run
- **Tổng:** 29 test case tự động (25 ✅ · 4 ⚠️ · 0 ❌) + 8 API/validation probe. Chi tiết bug → `bug_report.md`.

> **Scope:** CHỈ màn Home của User, ở 2 trạng thái Guest & Authenticated. Login = **Precondition**
> (không kiểm thử chức năng Login). Ngoài phạm vi: Product Detail, Cart, Checkout, Profile, CMS.

---

## A. Functional — Guest (UI + dữ liệu)

| ID | Tiêu đề | Bước | Kỳ vọng | KQ | Evidence |
|----|---------|------|---------|----|----------|
| TC-F01 | Mở Home (guest) render đủ section | GET `/` | Hero, Feature, FlashSale, MostLiked, Featured, Membership hiển thị | ✅ | `screenshots/F01-guest-home-*.png` |
| TC-F03 | Hero/banner render ảnh + có link | quan sát | ảnh banner hiển thị (count=21) | ✅ | `F01-guest-home-full.png` |
| TC-F04 | FlashSale countdown hiển thị | quan sát đồng hồ | có h:m:s đếm lùi | ✅ | `F04-flashsale-area.png` |
| TC-F05_07 | Link "Xem tất cả" đúng đích | đọc href | `/products?sale=1`, `/favorites`, `/products?featured=1` | ✅ | run-results |
| TC-F08 | ProductCard → chi tiết `/products/{slug}` | đọc href card | link tới `/products/qui-eos-...` | ✅ | run-results |
| TC-F09 | **Search Home điều hướng theo keyword** | gõ `ao` + Enter | tới trang kết quả | ❌→**BUG-004** | `F09-search-result.png` |
| TC-F10 | Account menu (guest) mở modal Login | click account → Login | modal login/register mở | ✅ | `F10-login-modal.png` |
| TC-F11 | Language switcher vi↔en đổi text | đổi ngôn ngữ | text section đổi sang EN | ✅ | `F11-after-en-switch.png` |
| TC-F01.* | Section presence chi tiết (hero/feature/flashsale/mostliked/featured/membership) | quét text body | tất cả present | ✅×6 | run-results |

## B. Functional — Authenticated User

| ID | Tiêu đề | Bước | Kỳ vọng | KQ | Evidence |
|----|---------|------|---------|----|----------|
| TC-L01 | Login (Precondition) → Home logged-in | login user001 → `/` | modal đóng, header logged | ✅ | `L01-auth-home*.png` |
| TC-L01b | Account dropdown có tùy chọn logged | mở dropdown | có "Đăng xuất/Logout" | ✅ | `L01b-auth-dropdown.png` |
| TC-L03 | Toggle favorite từ Home card | click tim | `POST user/favorites/toggle` (x1) | ✅ | `L03-favorite-toggled.png` |
| TC-L04 | Guest↔Auth: dữ liệu 5 section giống, khác `is_favorited` | so sánh | nội dung section giống | ✅ | report §4 |
| TC-L05 | Logout từ Home → guest | dropdown → Logout | header về CTA Login | ⚠️ | `L05-after-logout.png` |

## C. API — Endpoints / Schema

| ID | Endpoint | Kỳ vọng | KQ | Evidence |
|----|----------|---------|----|----------|
| TC-A01 | `GET user/banners?includes=file` | 200, is_active, sort order asc, `file.url` | ✅ | `network/A01-banners.json` |
| TC-A02 | `GET user/products?filters[is_sale]=1&per_page=4` | 200, ≤4, `is_favorited` absent (guest) | ✅ | `network/A02-sale.json` |
| TC-A03 | `GET user/products?filters[is_featured]=1&per_page=4` | 200, ≤4 featured | ✅ | `network/A03-featured.json` |
| TC-A04 | `GET user/products/top-favorites?limit=8` | 200, sort desc | ⚠️ `is_favorited=true` → **BUG-001** | `network/A04-topfav.json` |
| TC-A05 | `GET user/campaigns/active` | 200 (rỗng → FlashSale dùng is_sale) | ✅ | `network/A05-campaigns.json` |
| TC-A06 | Envelope `{status,message,data}` + `Content-Type: json` + `nosniff` | đúng shape | ✅ | report §5 |

## D. Validation / Security — Query params

| ID | Tiêu đề | Dữ liệu | Kỳ vọng | KQ | Evidence |
|----|---------|---------|---------|----|----------|
| TC-V01 | `top-favorites?limit` có tôn trọng? | 2 / 8 / 50 | trả đúng limit | ❌ luôn 4 → **BUG-003** | curl log |
| TC-V02 | `products?per_page=0` | 0 | 422 (min:1) | ✅ 422 | `network/V02-perpage0.json` |
| TC-V03 | `products?per_page=abc` | chuỗi | 422, không 500 | ✅ 422 | `network/V03-perpageabc.json` |
| TC-V04 | `filters[is_sale][]=1` (mảng) | mảng | 422/an toàn | ❌ 500 + leak → **BUG-002** | `network/V04-arrayfilter.json` |
| TC-V05 | `orders[password]=asc` (cột lạ) | injection | bỏ qua, fallback id desc | ✅ 200 | curl log |
| TC-V06 | `orders[id]=;DROP TABLE` | SQLi | sanitize, không thực thi | ✅ 200 | curl log |

## E. Responsive (Guest Home)

| ID | Viewport | Kỳ vọng | KQ | Evidence |
|----|----------|---------|----|----------|
| TC-R-desktop-1920x1080 | Desktop 1920×1080 | không scroll ngang | ✅ | `responsive/desktop-1920x1080.png` |
| TC-R-desktop-1440x900 | Desktop 1440×900 | không scroll ngang | ✅ | `responsive/desktop-1440x900.png` |
| TC-R-desktop-1366x768 | Desktop 1366×768 | không scroll ngang | ✅ | `responsive/desktop-1366x768.png` |
| TC-R-tablet-ipad-768x1024 | iPad 768×1024 | không scroll ngang | ✅ | `responsive/tablet-ipad-768x1024.png` |
| TC-R-tablet-ipad-air-820x1180 | iPad Air 820×1180 | không scroll ngang | ✅ | `responsive/tablet-ipad-air-820x1180.png` |
| TC-R-mobile-iphone14-390x844 | iPhone 14 390×844 | không scroll ngang | ✅ | `responsive/mobile-iphone14-390x844.png` |
| TC-R-mobile-iphone-se-375x667 | iPhone SE 375×667 | không scroll ngang | ✅ | `responsive/mobile-iphone-se-375x667.png` |
| TC-R-mobile-pixel7-412x915 | Pixel 7 412×915 | không scroll ngang | ✅ | `responsive/mobile-pixel7-412x915.png` |
| TC-R-mobile-galaxy-s23-360x780 | Galaxy S23 360×780 | không scroll ngang | ✅ | `responsive/mobile-galaxy-s23-360x780.png` |

## F. Performance Observation

| ID | Tiêu đề | Quan sát | KQ |
|----|---------|----------|----|
| TC-P01 | Mẫu gọi API từ client | Home data SSR; client chỉ gọi `categories` **2 lần** (trùng) | ⚠️ (xem risks) |
| TC-P02 | Thời gian tải Home (guest, domcontentloaded→interactive) | ~1797ms | ✅ chấp nhận |

## G. Không thực thi / Blocked (ghi nhận trung thực)
- TC-F02 (nhịp autoplay chính xác 3s/4s/5s của Hero) — chỉ xác nhận có carousel, chưa đo nhịp từng mili-giây.
- Kiểm thử a11y/WCAG chuyên sâu — ngoài scope core (đề xuất ở `improvement.md`).
