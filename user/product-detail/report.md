# Báo cáo Kiểm thử — Product Detail (User)

## 1. Thông tin chung

| Mục | Giá trị |
|-----|---------|
| Ngày kiểm thử | 2026-07-08 |
| Module | `user/product-detail` |
| Tester | AI QA Automation |
| Công cụ | Playwright 1.61.1 (raw script, không dùng test runner) |
| Browser | Chromium 149.0.7827.55 (headless) |
| Viewport chính | 1366×900 |
| Devices | Desktop 1920/1440/1366, iPad Air, iPhone 14/SE, Pixel 7, Galaxy S23, Landscape |
| Môi trường | Production |
| URL | https://moon.dlyn.site/products/qui-eos-laborum-variant-tojq17 |
| API | https://api-moon.dlyn.site/api |
| Requirement tham chiếu | `test/requirement.md`, `test/rule.md` |
| Script Playwright | [script/product-detail.spec.js](script/product-detail.spec.js) |

**Sản phẩm mẫu:**
- Có variant: `qui-eos-laborum-variant-tojq17` (id 100, 3 variant, size×Color).
- Không variant: `quo-asperiores-quaerat-m0ybqx` (id 1).

**Tài khoản:** user001 / password (chỉ dùng làm Precondition cho trạng thái đăng nhập).

---

## 2. Phạm vi kiểm thử

- ✅ Product Detail (Guest)
- ✅ Product Detail (Authenticated User)
- ✅ Gallery / Zoom / Thumbnail
- ✅ Variant & Quantity
- ✅ Add to Cart, Buy Now, Wishlist (thao tác phát sinh từ Product Detail)
- ✅ Rating & Review (hiển thị + API)
- ✅ Related Products / Recently Viewed
- ✅ Điều hướng (URL, Refresh, Back/Forward, Deep link, 404)
- ✅ API, UI, UX, Responsive, SEO, Performance cơ bản, Bug Hunting
- ❌ Login/Register/Profile (ngoài phạm vi — chỉ dùng làm Precondition)
- ❌ Cart/Checkout/Wishlist page (ngoài phạm vi — chỉ xác minh hành vi phát sinh từ Product Detail)

> Header, Login Modal và trang Checkout chỉ được sử dụng như **Precondition / xác minh điều hướng**, không nằm trong phạm vi đánh giá.

---

## 3. Kết quả tổng quan

| Chỉ số | Giá trị |
|--------|---------|
| Tổng số kiểm tra (assertions) | 72 |
| ✅ Passed | 64 |
| ⚠️ Warning | 6 |
| ❌ Failed | 2 |
| Blocked | 0 |
| Skipped | 0 |
| Tổng số Bug | 5 (1 High, 3 Medium, 1 Low) |
| Tổng số Potential Risks | 5 |

> "Failed" ở đây là 2 assertion API trả HTTP 500 (BUG-001, BUG-002). "Warning" là các quan sát cần đánh giá thủ công / ngoài phạm vi (xem mục 10).

---

## 4. Chi tiết kiểm thử

### 4.1 Hiển thị thông tin sản phẩm (Guest) — PASS
Tên, SKU (theo variant), giá + giá khuyến mãi + badge `-%`, dòng "Bạn tiết kiệm", tồn kho ("Còn N sản phẩm"), đã bán, gallery + thumbnail + zoom fullscreen, tab Mô tả/Thông số kỹ thuật, trust badges, khu vực đánh giá (empty state) — tất cả hiển thị đúng.
- Evidence: `evidence/screenshot/guest-01-detail-full.png`, `guest-07-fullscreen.png`, `guest-08-tabs.png`.

### 4.2 Điều hướng (Guest) — PASS (trừ soft-404)
Truy cập trực tiếp URL, Refresh, Browser Back → Home, Forward → Detail, Related Products điều hướng đúng, sản phẩm không variant hiển thị đúng. Slug sai hiển thị giao diện not-found **nhưng trả HTTP 200** (BUG-004).
- Evidence: `guest-nav-05-404.png`, `guest-nav-06-related.png`, `guest-dsp-13-simple.png`.

### 4.3 Variant & Quantity — PASS + 1 bug UX
Chọn thuộc tính cập nhật SKU/giá/tồn kho. Nút −/+ giới hạn đúng [1..stock], disable tại biên. **Tổ hợp không có variant hiển thị "Hết hàng" gây hiểu lầm** (BUG-003).
- Evidence: `guest-var-01-variant.png`, `guest-var-02-combo.png`.

### 4.4 Add to Cart / Buy Now / Wishlist — PASS + 1 bug i18n
- Guest Add to Cart: cho phép thêm theo session guest, 1 request (debounce chống double-click hoạt động).
- **Toast lộ key thô "adding 1 to_cart..."** (BUG-005).
- Guest Wishlist: click → mở Login Modal đúng (không gọi API favorites).
- Auth Add to Cart: đúng variant + quantity (payload `quantity=3, variant=189`), có spinner + disable khi tải.
- Auth Buy Now: thêm giỏ + điều hướng `/checkout`.
- Auth Wishlist: Add → tim đỏ, giữ trạng thái sau refresh (nhờ `useSeedFavorites`), Remove hoạt động.
- Evidence: `guest-act-01-addtocart.png`, `guest-act-03-wishlist-login.png`, `auth-03-addtocart.png`, `auth-07-wishlist-add.png`, `auth-08-wishlist-refresh.png`, `auth-06-buynow-checkout.png`.

### 4.5 Functional tổng hợp — PASS
Product info, gallery, variant, quantity, add to cart, buy now, wishlist, related products, breadcrumb/URL, refresh, browser navigation, error handling (404) đều hoạt động; các sai lệch đã ghi nhận thành bug.

---

## 5. API Verification

Áp dụng (module dùng API). Header thực tế của frontend (axios) luôn gửi `Accept: application/json`.

| Endpoint | Method | Kết quả | Status | Ghi chú |
|----------|--------|---------|--------|---------|
| `/user/products/{slug}/detail` | GET | ✅ | 200 (~100–170ms) | Schema đủ id/sku/translations/price/variants/images |
| `/user/products/{slug}/detail` (slug sai) | GET | ✅ | 404 | Message chuẩn |
| `/user/products/{id}/reviews` | GET | ✅ | 200 | data + links + meta |
| `/user/products/{id}/reviews/stats` | GET | ✅ | 200 | average_rating + distribution |
| `/user/cart/add` (hợp lệ) | POST | ✅ | 200 | Trả session_id cho guest |
| `/user/cart/add` (quantity=0) | POST | ✅ | 422 | `VALIDATION_ERROR` — "quantity ≥ 1" |
| `/user/cart/add` (quantity>stock) | POST | ❌ | **500** | **BUG-001** — phải 422 |
| `/user/cart/add` (product không tồn tại) | POST | ❌ | **500** | **BUG-002** — phải 404 |
| `/user/favorites/toggle` (no token) | POST | ✅ | 401 | Đúng khi có `Accept: json` |
| `/user/favorites/toggle` (token) | POST | ✅ | 200 | Toggle đúng |
| `/user/reviews` (no token) | POST | ✅ | 401 | |
| `/user/reviews` (token) | POST | ✅ | 422 | Validation nghiệp vụ (chưa mua/nội dung) |
| Header `language=en` | GET | ✅ | 200 | Trả đúng translation EN |

- **Response Time:** GET detail ~100–170ms (rất tốt).
- **Đồng bộ UI–API:** Giá, SKU, tồn kho, tên hiển thị trên UI khớp JSON API.
- **Authorization:** Các endpoint cần đăng nhập trả 401 đúng (khi client gửi `Accept: json`); trang detail là public (200 không token).
- **Lưu ý quan trọng:** Nếu request **không** gửi `Accept: application/json`, Laravel trả **302 redirect** thay vì 401/422 JSON. Frontend hiện tại dùng axios nên không bị; nhưng đây là điểm cần lưu ý cho tích hợp bên thứ ba (xem Risks).
- Evidence: thư mục `evidence/api/`.

---

## 6. Đánh giá UI

| Tiêu chí | Đánh giá |
|----------|----------|
| Layout | 2 cột desktop (gallery trái / info phải), stack hợp lý trên mobile — tốt |
| Alignment / khoảng cách | Cân đối, dùng spacing nhất quán (Tailwind) |
| Typography | Rõ ràng, phân cấp tiêu đề/giá tốt |
| Màu sắc | Giá sale đỏ + badge %, trạng thái kho theo màu (xanh/cam/xám) trực quan |
| Icon | Có aria-label (27 nút icon) |
| Hình ảnh | 0 ảnh vỡ (naturalWidth > 0), có alt |
| Button | Trạng thái disabled/loading có style rõ (opacity + cursor + spinner) |
| Toast | Hoạt động — nhưng **lộ key i18n** (BUG-005) |
| Overflow | Không tràn ngang ở mọi viewport (overflow = 0px) |

**Console trên trang Product Detail:** 0 lỗi (đã kiểm tra riêng, xem Risks). Các lỗi 404 console trong phiên chỉ đến từ ảnh banner trang Home (ngoài phạm vi).

---

## 7. Đánh giá UX

| Tiêu chí | Đánh giá |
|----------|----------|
| Luồng thao tác | Rõ ràng: chọn variant → số lượng → thêm giỏ / mua ngay |
| Điều hướng | Back/Forward/Refresh/Related mượt |
| Loading | Nút Add to Cart có spinner + disable; debounce chống double-click |
| Empty State | Khu vực đánh giá có empty state thân thiện |
| Confirmation | Toast phản hồi sau thao tác |
| Keyboard | Tab di chuyển focus; gallery hỗ trợ ←/→/Escape |
| Điểm trừ | Toast lộ key i18n (BUG-005); tổ hợp variant không có → "Hết hàng" khó hiểu (BUG-003); thiếu UI tạo review dù API hỗ trợ |

---

## 8. Responsive Testing — PASS toàn bộ

| Thiết bị | Viewport | Overflow ngang | Kết quả |
|----------|----------|----------------|---------|
| Desktop | 1920×1080 | 0px | ✅ |
| Desktop | 1440×900 | 0px | ✅ |
| Desktop | 1366×768 | 0px | ✅ |
| iPad Air | 820×1180 | 0px | ✅ |
| iPhone 14 | 390×844 | 0px | ✅ |
| iPhone SE | 375×667 | 0px | ✅ |
| Pixel 7 | 412×915 | 0px | ✅ |
| Galaxy S23 | 360×780 | 0px | ✅ |
| Mobile Landscape | 844×390 | 0px | ✅ |

- Evidence: `evidence/responsive/*.png` (9 ảnh full-page).

---

## 9. Danh sách Bug

| ID | Tiêu đề | Severity | Priority | Trạng thái |
|----|---------|----------|----------|-----------|
| BUG-001 | cart/add 500 khi vượt tồn kho | High | High | Open |
| BUG-002 | cart/add 500 + message sai khi product không tồn tại | Medium | Medium | Open |
| BUG-003 | Tổ hợp variant không có → "Hết hàng" gây hiểu lầm | Medium | Medium | Open |
| BUG-004 | Slug sai trả HTTP 200 (soft 404) | Low | Low | Open |
| BUG-005 | Toast/nút lộ key i18n "adding"/"to_cart" | Medium | Medium | Open |

Chi tiết: [bug_report.md](bug_report.md).

---

## 10. Potential Risks

Chi tiết tại [risks.md](risks.md). Tóm tắt:
1. API trả **302 redirect** thay vì 401/422 khi thiếu `Accept: application/json` (rủi ro tích hợp bên thứ ba / cào dữ liệu).
2. Nhiều request lặp trong phiên điều hướng (categories/cart refetch mỗi lần đổi trang) — cần đo lại per-page.
3. Flicker trạng thái Wishlist trước khi `useSeedFavorites` seed xong.
4. `networkidle` không đạt được do Pusher websocket giữ kết nối — chỉ là hiện tượng đo, không phải lỗi.
5. Sản phẩm mẫu chưa có review thật → nhánh có-review/pagination review chưa được phủ đầy đủ trên UI.

---

## 11. Improvement

Chi tiết tại [improvement.md](improvement.md). Nổi bật:
- Thêm key i18n `adding`/`to_cart`.
- Phân biệt "hết hàng" và "tổ hợp không khả dụng"; disable option không hợp lệ.
- Chuẩn hoá HTTP status cho lỗi nghiệp vụ (422/404/409).
- Trả 404 thật cho slug sai.
- Bổ sung UI tạo review trên trang detail.

---

## 12. Evidence

Toàn bộ evidence lưu tại `evidence/` (đường dẫn tương đối):
- `api/` — request/response JSON (detail, reviews, stats, cart add các trường hợp, favorite, review).
- `screenshot/` — 16 ảnh thao tác Guest & Auth + ảnh bug toast.
- `responsive/` — 9 ảnh full-page theo thiết bị.
- `network/` — `network.har` (iPhone 14), `guest-trace.zip` (Playwright trace), `guest-api-hits.json`, `auth-api-hits.json`.
- `console/` — `guest-console-errors.log`, `auth-console-errors.log`.
- `ui/page-source.html` — HTML nguồn SSR (kiểm SEO).
- `results.json` — kết quả assertion chi tiết.
- `video/*.webm` — video phiên Guest & Auth.

---

## 13. Kết luận

| Chỉ số | Giá trị |
|--------|---------|
| Tổng assertion | 72 (64 Pass / 6 Warn / 2 Fail) |
| Bug High | 1 (BUG-001) |
| Bug Medium | 3 (BUG-002, BUG-003, BUG-005) |
| Bug Low | 1 (BUG-004) |
| Potential Risks | 5 |

**Đánh giá:** ⚠️ **Có thể Release sau khi sửa các lỗi quan trọng.**

**Lý do:** Luồng chính của Product Detail (hiển thị, gallery, variant, số lượng, add to cart, buy now, wishlist, điều hướng, responsive, SEO metadata) hoạt động ổn định trên cả Guest và Authenticated; hiệu năng API tốt (~100–170ms); responsive sạch trên 9 thiết bị. Tuy nhiên cần xử lý trước khi phát hành:
- **BUG-001 (High):** API trả 500 cho lỗi tồn kho — làm nhiễu giám sát lỗi và có thể gây sự cố với client không chặn số lượng ở UI.
- **BUG-005 (Medium):** Toast lộ key i18n — ảnh hưởng trực tiếp trải nghiệm người dùng cuối, dễ sửa.
- **BUG-002/003 (Medium):** Cần cải thiện tính đúng đắn của API và UX chọn variant.
- BUG-004 (Low) có thể xử lý ở đợt sau (SEO).

---

## 14. Phụ lục

- **Playwright:** 1.61.1
- **Chromium:** 149.0.7827.55 (headless)
- **Node:** v24.18.0
- **Device profiles:** xem mục 8.
- **Script:** `script/product-detail.spec.js` (chạy lại: `NODE_PATH=<playwright> node product-detail.spec.js`; hỗ trợ env `PD_BASE_URL`, `PD_API_URL`, `PD_USER`, `PD_PASS`, `PD_SLUG`, `PD_SIMPLE_SLUG`).
- **Evidence:** liệt kê tại mục 12.
