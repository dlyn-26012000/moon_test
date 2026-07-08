# Báo cáo Kiểm thử — User Home

## 1. Thông tin chung

| Mục | Giá trị |
|-----|---------|
| Ngày kiểm thử | 2026-07-08 |
| Module | **User › Home** (`/`) |
| Tester | AI QA Automation |
| Công cụ | Playwright **1.61.1** (raw, không dùng @playwright/test) + curl (API probes) |
| Browser | Chromium (bundled 1228) |
| Viewport chính | 1366×768 (+ 9 viewport responsive) |
| Device | Desktop / Tablet / Mobile (mô phỏng) |
| Môi trường | **Production** |
| URL | UI `https://moon.dlyn.site/` · API `https://api-moon.dlyn.site/api/` |
| Requirement tham chiếu | `test/requirement.md`, `test/rule.md`, `logic-analysis.md` |
| Script Playwright | `script/home.spec.js`, `script/fixtures.js`, `script/utils.js`, `script/probe.js` |

---

## 2. Phạm vi kiểm thử

- ✅ **User Home** (Guest) — UI, dữ liệu, section, navigation, search, language, API, responsive.
- ✅ **User Home** (Authenticated) — login precondition, header logged, favorite toggle, logout, so sánh Guest↔Auth.
- ❌ Product Detail · ❌ Cart · ❌ Checkout · ❌ Profile · ❌ Register/Forgot Password · ❌ CMS/Admin.

> **Login** chỉ được dùng như **Precondition** để vào trạng thái Authenticated — **không** đánh giá chức năng Login.
> Tài khoản: `user001 / password`.

---

## 3. Kết quả tổng quan

| Chỉ số | Số lượng |
|--------|----------|
| Tổng Test Case (tự động) | 29 |
| ✅ Passed | 25 |
| ⚠️ Pass-with-warning | 3 |
| ❌ Failed (bug) | 1 (TC-F09 → BUG-004) |
| ⬜ Blocked/Not-run | 0 (2 mục ghi ở "Không thực thi") |
| API/Validation probe bổ sung | 8 |
| **Tổng Bug** | **4** (1 High · 2 Medium · 1 Low) |
| **Potential Risks** | **5** (xem `risks.md`) |

---

## 4. Chi tiết kiểm thử (theo nhóm)

### 4.1 Hiển thị giao diện (Guest)
Home render đầy đủ 6 khối: **Hero** (banner, 21 ảnh), **Feature** (USP icon), **FlashSale** (có countdown),
**MostLiked**, **Featured**, **MembershipBanner**. Dữ liệu đến từ SSR (`serverFetch`, ISR 300s) nên
render tức thì, không thấy skeleton loading khi có dữ liệu. Evidence: `evidence/ui_ux/screenshots/F01-*`.

### 4.2 Functional — Guest
- Link "Xem tất cả" đúng đích: `/products?sale=1`, `/favorites`, `/products?featured=1`.
- ProductCard trỏ đúng `/products/{slug}`.
- Account menu (guest) mở modal Login/Register.
- Language switch vi→en đổi nội dung section.
- ❌ **Search Header không hoạt động** — gõ + Enter không điều hướng (BUG-004).

### 4.3 Functional — Authenticated
- Login (precondition) thành công → modal đóng, header chuyển trạng thái logged (dropdown có "Đăng xuất").
- Toggle favorite từ card Home gọi `POST user/favorites/toggle` (200).
- Logout: đã thao tác được; assertion trở-về-guest chỉ ⚠️ do thời điểm re-render (không phải lỗi chức năng — xem risks).

### 4.4 So sánh Guest ↔ Authenticated
| Khía cạnh | Guest | Authenticated |
|-----------|-------|---------------|
| Dữ liệu 5 endpoint Home | Giống hệt (đều public) | Giống hệt |
| `is_favorited` trên ProductCard | FlashSale/Featured: tim rỗng (đúng) | phản ánh theo user |
| MostLiked `is_favorited` | **tim đỏ sai** (BUG-001) | vẫn đỏ (che lấp lỗi) |
| Header | CTA Đăng nhập/Đăng ký | Avatar + dropdown, NotificationBell, Cart, Wishlist, Wallet |

**Kết luận bảo mật Home:** không lộ dữ liệu riêng tư theo user; khác biệt chỉ ở `is_favorited` + widget Header. Mọi endpoint Home là public read-only → không IDOR.

### 4.5 Responsive
9/9 viewport (Desktop 1920/1440/1366, iPad, iPad Air, iPhone 14/SE, Pixel 7, Galaxy S23): **không có scroll ngang**, layout co giãn đúng. Evidence: `evidence/ui_ux/responsive/*.png`.

### 4.6 Performance
Home tải ~1.8s (domcontentloaded→interactive). Dữ liệu chủ yếu SSR nên client nhẹ. Quan sát: endpoint `user/categories` bị gọi **2 lần** từ client (trùng lặp — risk perf nhỏ).

---

## 5. API Verification

Home dùng API (SSR). Bắt buộc có phần này.

| Endpoint | Method | Status | Auth | Ghi chú |
|----------|--------|--------|------|---------|
| `user/banners?includes=file` | GET | 200 | public | is_active, sort `order` asc, có `file.url`; header `Content-Type: application/json`, `X-Content-Type-Options: nosniff` |
| `user/products?filters[is_sale]=1&per_page=4` | GET | 200 | public | ≤4, `is_favorited` **absent** cho guest (đúng) |
| `user/products?filters[is_featured]=1&per_page=4` | GET | 200 | public | ≤4 featured |
| `user/products/top-favorites?limit=N` | GET | 200 | public | ❗ `is_favorited=true` mọi item (**BUG-001**); `limit` bị bỏ qua (**BUG-003**) |
| `user/campaigns/active` | GET | 200 | public | rỗng → FlashSale fallback is_sale |
| `user/categories` | GET | 200 | public | gọi 2 lần (perf) |

**Validation / Security probe (live 2026-07-08):**
| Input | Kết quả | Đánh giá |
|-------|---------|----------|
| `per_page=0` | 422 | ✅ đúng |
| `per_page=abc` | 422 | ✅ không crash |
| `filters[is_sale][]=1` (mảng) | **500 + leak `trim()` error** | ❌ **BUG-002** |
| `orders[id]=;DROP TABLE` | 200 (sanitize) | ✅ không SQLi |
| `orders[password]=asc` | 200 (whitelist) | ✅ bỏ qua cột lạ |

**Đồng bộ UI↔API:** dữ liệu section khớp response; ngoại lệ là `is_favorited` (API sai → UI hiển thị sai).

---

## 6. Đánh giá UI

- **Layout/Alignment:** cân đối, grid sản phẩm đều, không vỡ ở mọi viewport.
- **Typography/Màu/Icon/Ảnh:** nhất quán theme primary; banner `next/image` sắc nét.
- **Loading:** có skeleton (chủ yếu khi seed rỗng do SSR).
- **Toast/Modal:** modal Login/Register mở mượt; toast (sonner) sẵn sàng.
- **Vấn đề UI:** trái tim MostLiked hiển thị "đã thích" sai (BUG-001) gây hiểu nhầm trực quan.

---

## 7. Đánh giá UX

- **Luồng/Điều hướng:** rõ ràng; link "Xem tất cả" và ProductCard đúng đích.
- **Empty State:** MostLiked & Featured **ẩn hoàn toàn** khi rỗng (không thông báo) → có thể gây "trang trống" khó hiểu (risk).
- **Search:** ô tìm kiếm nổi bật nhưng **không hoạt động** (BUG-004) — trải nghiệm gây thất vọng lớn.
- **Error State:** lỗi API bị `serverFetch` nuốt → section rỗng thay vì báo lỗi (graceful, nhưng thiếu phản hồi).

---

## 8. Responsive Testing

| Nhóm | Thiết bị | Kết quả |
|------|----------|---------|
| Desktop | 1920×1080, 1440×900, 1366×768 | ✅ không scroll ngang |
| Tablet | iPad 768×1024, iPad Air 820×1180 | ✅ không scroll ngang |
| Mobile | iPhone 14, iPhone SE, Pixel 7, Galaxy S23 | ✅ không scroll ngang |

Screenshot: `evidence/ui_ux/responsive/`.

---

## 9. Danh sách Bug (tóm tắt — chi tiết ở `bug_report.md`)

| ID | Tiêu đề | Severity | Priority | Trạng thái |
|----|---------|----------|----------|------------|
| BUG-004 | Ô tìm kiếm Home không hoạt động | 🔴 High | High | ✅ Reproduced |
| BUG-001 | Guest thấy mọi sản phẩm "Yêu thích nhất" đã tim sẵn | 🟠 Medium | High | ✅ Reproduced |
| BUG-002 | Filter mảng → 500 + lộ lỗi nội bộ | 🟠 Medium | Medium | ✅ Reproduced |
| BUG-003 | `top-favorites` bỏ qua `limit` | 🟡 Low | Low | ✅ Reproduced |

---

## 10. Potential Risks (chi tiết ở `risks.md`)

1. 404 tài nguyên xuất hiện gián đoạn (1 lần, chưa tái hiện) — có thể asset lazy lỗi.
2. `user/categories` gọi 2 lần từ client — lãng phí request.
3. SSR luôn `language=vi` → nhấp nháy i18n & SEO luôn `vi`.
4. ISR `revalidate=300` → dữ liệu Home trễ tối đa 5 phút.
5. MostLiked/Featured ẩn hoàn toàn khi rỗng (không thông báo).

---

## 11. Improvement
Xem `improvement.md` (UI, UX, Performance, Security, Accessibility).

---

## 12. Evidence

| Loại | Đường dẫn |
|------|-----------|
| Screenshots (chức năng) | `evidence/ui_ux/screenshots/` |
| Screenshots (responsive ×9) | `evidence/ui_ux/responsive/` |
| Video (guest + auth) | `evidence/ui_ux/videos/*.webm` |
| Console log | `evidence/ui_ux/console.log` |
| Network HAR (đầy đủ) | `evidence/api/network.har` |
| API request/response snapshot | `evidence/api/request/`, `evidence/api/response/` |
| API log | `evidence/api/api-log.md` |
| Playwright trace | `evidence/traces/guest-trace.zip` |
| Kết quả máy đọc | `assets/test-data/run-results.json` |
| API/network probe (suite trước) | `evidence/network/*.json` |

---

## 13. Kết luận

- **Test Case:** 29 (auto) + 8 probe · **Passed:** 25 · **Warning:** 3 · **Failed:** 1.
- **Bug theo Severity:** 1 High · 2 Medium · 1 Low.
- **Potential Risks:** 5.

**Đánh giá Release: ⚠️ Có thể Release sau khi sửa các lỗi quan trọng.**

Lý do: Home render ổn định, responsive tốt, API bảo mật cơ bản đạt (chống SQLi, validation 422). Tuy
nhiên **BUG-004 (search chết)** làm hỏng một chức năng cốt lõi hiển thị nổi bật, và **BUG-002**
lộ lỗi nội bộ (information disclosure) — cả hai nên sửa trước khi phát hành. BUG-001 gây hiểu nhầm UX
đáng kể. Sau khi khắc phục BUG-004 + BUG-002 (bắt buộc) và BUG-001 (khuyến nghị), Home đủ điều kiện release.

---

## 14. Phụ lục

- **Playwright:** 1.61.1 · **Chromium:** bundled build 1228 · **Node:** v24.15.0
- **Device profiles:** xem `script/fixtures.js` (VIEWPORTS).
- **Scripts:** `script/home.spec.js`, `script/fixtures.js`, `script/utils.js`, `script/probe.js`.
- **Chạy lại:** `cd test/user/home && node script/home.spec.js`
- **File Evidence:** liệt kê ở §12.
