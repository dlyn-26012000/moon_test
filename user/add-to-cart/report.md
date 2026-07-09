# Báo cáo Kiểm thử — User / Add to Cart

> E2E testing bằng Playwright cho luồng **Thêm vào giỏ hàng** của User (Guest, Authenticated, Guest→Login).

---

## 1. Thông tin chung

| Mục | Giá trị |
|-----|---------|
| Ngày kiểm thử | 2026-07-09 |
| Module | `user/add-to-cart` |
| Tester | AI QA Automation |
| Công cụ | Playwright 1.61.1 (chromium raw) + Node https (API) |
| Browser | Chromium (bundled Playwright) |
| Viewport | 1920×1080, 1440×900, 1366×768, 768×1024, 390×844, 375×667, 412×915, 360×780 |
| Device | Desktop, iPad, iPhone 14/SE, Pixel 7, Galaxy S23 |
| Môi trường | Staging/Production-like |
| URL | UI `https://moon.dlyn.site` · API `https://api-moon.dlyn.site/api` |
| Tài khoản | `user001 / password` (chỉ dùng làm Precondition) |
| Requirement tham chiếu | `test/requirement.md`, `test/rule.md` |
| Script Playwright | `script/run.js`, `script/api.spec.js`, `script/helpers.js` |

---

## 2. Phạm vi kiểm thử

- ✅ Add to Cart — Guest (chưa đăng nhập)
- ✅ Add to Cart — Authenticated User (đã đăng nhập)
- ✅ Guest → Login (merge giỏ)
- ✅ API giỏ hàng (add / list / update / delete / validation / boundary / security)
- ✅ UI / UX / Responsive của luồng Add-to-Cart
- ❌ Authentication (chỉ là **Precondition**, không đánh giá)
- ❌ Checkout / Payment / Order / Wishlist / CMS / Admin (ngoài phạm vi)

> Login được sử dụng **chỉ như Precondition**, không nằm trong phạm vi đánh giá.

---

## 3. Kết quả tổng quan

| Chỉ số | Số lượng |
|--------|----------|
| Test case thiết kế | 56 |
| Đã thực thi (tự động) | 48 |
| Passed | **48** |
| Failed | 0 |
| Blocked | 0 |
| Skipped / phủ gián tiếp | 8 |
| Bug | 1 (Medium) |
| Potential Risks | 3 |

Trong đó: **API suite** 21/21 PASS (`evidence/api/api-results.json`), **UI suite** 27/27 PASS (`evidence/ui_ux/ui-results.json`).

*Skipped/phủ gián tiếp:* G-10 (đóng/mở lại trình duyệt) tương đương persistence đã PASS ở G-08; A-10/A-05 phần thao tác đa tab & vượt kho được phủ ở API và cùng-context; các case UI trùng ID với API không chạy lại.

---

## 4. Chi tiết kiểm thử

### 4.1. Guest (Chưa đăng nhập) — 11/11 PASS

| ID | Kết quả | Ghi chú |
|----|---------|---------|
| G-01 Danh sách sản phẩm | ✅ | 16 product links |
| G-02 Trang chi tiết | ✅ | Nút "Thêm vào giỏ hàng" hiển thị |
| G-03 Guest thêm SP (biến thể) | ✅ | Chọn size=M, color=White → item vào server theo `session_id` |
| G-04 Thêm nhiều sản phẩm | ✅ | 2 dòng khác variant |
| G-05 Thêm cùng SP nhiều lần | ✅ | Cộng dồn qty=2, không tạo dòng trùng |
| G-06/E-07 Cart Sidebar | ✅ | Mở/đóng, hiển thị item |
| G-08 Refresh | ✅ | Giỏ giữ nguyên (đọc lại theo `session_id`) |
| G-09 Mở tab mới | ✅ | Chung `cart_session_id` |
| G-11 UI vs API | ✅ | product_id/variant/qty khớp |
| G-12 Card add bị chặn | ✅ | Guest không thêm trực tiếp từ card → **BUG-001** |

Evidence: `evidence/ui_ux/screenshots/guest-*.png`, `evidence/ui_ux/videos/`.

### 4.2. Authenticated User — 5/5 PASS

| ID | Kết quả | Ghi chú |
|----|---------|---------|
| A-01 User thêm SP | ✅ | Item vào giỏ user (keyed `user_id`) |
| A-04 Giới hạn số lượng | ✅ | Stepper `+` disabled tại `totalStock` |
| A-06 Hiển thị tồn kho | ✅ | Nhãn "Còn 85 sản phẩm" |
| A-07 Cart Sidebar (user) | ✅ | Render đúng |
| A-09 Reload persistence | ✅ | Giỏ giữ nguyên theo `user_id` |

Precondition login lấy token qua API rồi inject `auth_token` (login KHÔNG thuộc phạm vi đánh giá). Evidence: `evidence/ui_ux/screenshots/auth-*.png`.

### 4.3. Guest → Login (Merge) — verified

| ID | Kết quả | Ghi chú |
|----|---------|---------|
| M-01 Guest thêm trước login | ✅ | `[{pv:189,q:1}]` |
| M-03 Đăng nhập qua modal thật | ✅ | Token lưu localStorage `auth_token` |
| M-04 Giỏ sau login có item khách | ✅ | Merge vào giỏ user |
| M-05 Merge cộng dồn (API) | ✅ | 35+2=37 cho cùng variant |
| M-06 Không mất dữ liệu | ✅ | Item khách được giữ; variant mới re-parent |
| M-07 Giá/tổng tiền chính xác | ✅ | 147,961 VND khớp UI ↔ API |
| M-08 API/UI đồng nhất | ✅ | Số dòng & qty khớp |

Đây là luồng bắt buộc — đã xác minh cả **UI (modal login thật)** lẫn **API**. Evidence: `evidence/ui_ux/screenshots/merge-01..04-*.png` (ảnh `merge-04-merged-cart-sidebar.png` cho thấy item guest nằm trong giỏ user sau login).

---

## 5. API Verification

| Endpoint | Method | Auth | Kết quả |
|----------|--------|------|---------|
| `/user/cart` | GET | Optional | 200 — trả `session_id`, tự tạo giỏ (D-09, D-15) |
| `/user/cart/add` | POST | Optional | 200 hợp lệ / 422 validation / 422 `INSUFFICIENT_INVENTORY` / 404 `NOT_FOUND` |
| `/user/cart/{id}/update` | PUT | Optional | 200; `quantity:0` ⇒ xoá |
| `/user/cart/{id}/delete` | DELETE | Optional | 200 / 404 nếu đã xoá |

- **Status Code:** đúng như thiết kế (200/422/404). Chi tiết: `evidence/api/api-log.md`.
- **Response Time:** ~72–290ms (< 1500ms). 
- **Schema:** `CartResource = { id, user_id, session_id, items[] }` ✅.
- **Authentication/Authorization:** route không bắt buộc auth; danh tính lấy tùy chọn từ token. → xem RISK-001.
- **Đồng bộ UI↔API:** khớp ở mọi case đã kiểm (G-11, M-07, M-08).
- Request/Response mẫu: `evidence/api/request/`, `evidence/api/response/`. Network log per-flow: `evidence/api/network-*.json`.

---

## 6. Đánh giá UI

- **Layout/Alignment:** trang chi tiết, khối chọn biến thể (size/Color), stepper số lượng, nút "Thêm vào giỏ hàng" / "Mua ngay" bố cục cân đối.
- **Button:** nút primary tương phản tốt; trạng thái loading có spinner "Đang thêm...".
- **CartSidebar:** slide-in phải, có checkbox chọn item, tổng tiền theo token, nút thanh toán.
- **Toast:** phản hồi "Đã thêm vào giỏ hàng thành công".
- **Icon/Hình ảnh:** thumbnail sản phẩm hiển thị đúng.
- **Form Validation:** chọn thiếu biến thể → cảnh báo rõ.
- Đề xuất nhỏ: nút giỏ header thiếu `aria-label` (xem `improvement.md`).

## 7. Đánh giá UX

- **Luồng thao tác:** chọn biến thể → chỉnh số lượng → thêm → mở giỏ, mạch lạc.
- **Debounce thêm giỏ** (500ms) gộp nhiều lần bấm nhanh thành 1 request, cộng dồn đúng — tốt cho người thao tác nhanh.
- **Empty state:** "Giỏ hàng của bạn đang trống" rõ ràng.
- **Điểm chưa hợp lý:** (1) guest bị chặn thêm từ card/Quick View (BUG-001); (2) badge đếm theo dòng (RISK-003).

## 8. Responsive Testing

| Thiết bị | hscroll | Kết quả |
|----------|---------|---------|
| Desktop 1920 / 1366 | 0px | ✅ |
| iPad 768 | 0px | ✅ |
| iPhone 14 / SE | 0px | ✅ |
| Pixel 7 / Galaxy S23 | 0px | ✅ |

Không có scroll ngang trên mọi viewport. CartSidebar mobile hiển thị full-width đúng (`evidence/ui_ux/responsive/mobile-cart-sidebar-iphone_14.png`). Ảnh full-page: `evidence/ui_ux/responsive/detail-*.png`.

---

## 9. Danh sách Bug

| ID | Tiêu đề | Severity | Priority | Trạng thái |
|----|---------|----------|----------|-----------|
| BUG-001 | Guest add-to-cart bất nhất (card/QuickView bị chặn, detail cho phép) | Medium | Medium | Open |

Chi tiết: `bug_report.md`.

## 10. Potential Risks

| ID | Rủi ro | Mức |
|----|--------|-----|
| RISK-001 | IDOR giỏ khách qua `session_id` (không ký/không kiểm sở hữu) | High |
| RISK-002 | Merge khi login không re-validate tồn kho | Medium |
| RISK-003 | Badge đếm theo dòng thay vì tổng số lượng | Low |

Chi tiết: `risks.md`.

## 11. Improvement

Xem `improvement.md` — 10 đề xuất (UX, Performance, Security, Backend/API, Accessibility).

## 12. Evidence

- Screenshots: `evidence/ui_ux/screenshots/` (12), responsive: `evidence/ui_ux/responsive/` (9)
- Videos: `evidence/ui_ux/videos/` (4 phiên)
- Console log: `evidence/ui_ux/console.log` (không có lỗi console)
- Network log: `evidence/api/network-*.json`
- API request/response: `evidence/api/request/`, `evidence/api/response/`
- API log: `evidence/api/api-log.md` · Kết quả máy đọc: `evidence/api/api-results.json`, `evidence/ui_ux/ui-results.json`
- Bug: `evidence/bug/BUG-001/`

---

## 13. Kết luận

| Chỉ số | Giá trị |
|--------|---------|
| Test case | 56 thiết kế / 48 thực thi |
| Passed | 48 |
| Failed | 0 |
| Blocked | 0 |
| Bug — Medium | 1 |
| Potential Risks | High 1 · Medium 1 · Low 1 |

**Đánh giá: ⚠️ Có thể Release sau khi xử lý các điểm quan trọng.**

Lý do: Chức năng lõi Add-to-Cart hoạt động **đúng và ổn định** trên cả ba luồng bắt buộc (Guest, Authenticated, Guest→Login merge); validation, tồn kho, boundary và negative đều đúng kỳ vọng; không có lỗi chặn (blocker), không có lỗi console. Tuy nhiên nên xử lý **BUG-001** (bất nhất trải nghiệm guest) và **RISK-001** (IDOR giỏ khách) trước khi phát hành rộng để đảm bảo tính nhất quán và an toàn.

---

## 14. Phụ lục

- **Playwright:** 1.61.1
- **Browser:** Chromium (bundled)
- **Device profile:** xem `assets/test-data/test-data.js`
- **Scripts:** `script/run.js` (UI 3 luồng + responsive), `script/api.spec.js` (API), `script/helpers.js` (evidence)
- **Sản phẩm test:** id=100 `qui-eos-laborum-variant-tojq17`, variants 189/190/191, thuộc tính size(M/XS)+Color(White/Black/Yellow), tồn kho 85/54/99.
- **Ghi chú dọn dữ liệu:** mọi item test đã được xoá sau mỗi luồng để không làm bẩn môi trường / tài khoản `user001`.
