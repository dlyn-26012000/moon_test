# Test Report — User / Order (End-to-End)

## 1. Thông tin chung

| | |
|---|---|
| Ngày kiểm thử | 2026-07-09 |
| Module | user/order (luồng đặt hàng của User) |
| Tester | AI QA Automation |
| Công cụ | Playwright 1.55.1 + Node custom harness |
| Browser | Chromium (playwright build v1193, 140.0.7339.186), headless |
| Viewport | 1920×1080, 1366×768, 820×1180 (iPad), 390×844 (iPhone 14), 375×667 (iPhone SE) |
| Môi trường | Staging |
| URL FE | https://moon.dlyn.site |
| URL API | https://api-moon.dlyn.site/api |
| Tài khoản | user001 / password |
| Requirement | Không có tài liệu viết sẵn — nghiệp vụ được suy ra từ source code (xem `logic-analysis.md`) |
| Script | `script/api.spec.js`, `script/ui.spec.js`, `script/config.js`, `script/helpers.js` |

## 2. Phạm vi kiểm thử

- ✅ Home, Product detail, Add to cart, Cart (session), Checkout, Coupon, Payment (COD / Bank transfer / Wallet), Order success, Order detail, Order history, Cancel
- ✅ Guest (chưa đăng nhập) và Logged-in (đã đăng nhập)
- ✅ API testing, Security (IDOR/authz), Validation/Negative, Responsive
- ✅ SePay webhook (auth + validation)
- ⚠️ Payment settlement qua webhook, wallet debit thành công — **bị chặn bởi môi trường** (xem §5, `risks.md`)
- ❌ CMS/Admin, quản lý sản phẩm/người dùng, báo cáo (ngoài phạm vi)

> Login/Product/Cart chỉ được dùng làm **Precondition** cho luồng đặt hàng.

## 3. Kết quả tổng quan

| Chỉ số | Giá trị |
|---|---|
| Tổng Test Case | 52 |
| Passed | 50 |
| Failed | 2 (= 2 bug được khẳng định) |
| Blocked/Limited | 6 (giới hạn môi trường) |
| Bugs | 4 (1 Medium, 1 Low-Med, 2 Low) |
| Potential Risks | 6 |

Suite API: 36/37 pass. Suite UI: 14/15 pass. Bằng chứng: `evidence/api/results.json`,
`evidence/ui_ux/results.json`, `evidence/api/api-log.json` (65 API calls).

## 4. Chi tiết kiểm thử

- **Hiển thị / UI:** Home, Product detail (giá, badge giảm giá −68%, tồn kho,
  nút Thêm vào giỏ / Mua ngay), Checkout, Order detail, Order history — render
  đúng trên desktop + tablet + mobile. Bằng chứng: `evidence/ui_ux/screenshots/`,
  `evidence/ui_ux/responsive/`, video `evidence/ui_ux/videos/`.
- **Functional (Guest):** cart theo `session_id`, tạo đơn COD, subtotal =
  sale_price × qty, cart được xóa sau khi đặt, đọc được đơn của chính mình. ✅
- **Functional (Logged-in):** checkout render payment methods, đặt COD →
  redirect `/orders/{id}`, order history liệt kê đơn, cancel đơn pending. ✅
- **Validation/Negative:** thiếu field → 422, sai payment method → 422, coupon
  không tồn tại → 422, cart rỗng → 422. ✅
- **Security:** đọc/hủy đơn của session khác → 404; dùng `cart_item_id` của cart
  khác → đơn bị từ chối và item nạn nhân không bị xóa (chặn IDOR). ✅ Endpoint
  cần auth (`/auth/me`, `/wallets`) → 401 khi thiếu/hỏng token. ✅
- **Coupon:** %, min-order, cap, private/guest — đúng nghiệp vụ. ✅
- **Webhook:** sai key / thiếu Authorization → 401; thiếu field → 422. ✅

## 5. API Verification

Base: `https://api-moon.dlyn.site/api`. Log đầy đủ: `evidence/api/api-log.json`.

| Endpoint | Method | Auth | Kết quả chính |
|---|---|---|---|
| `/user/cart`, `/user/cart/add` | GET/POST | guest+user | session-scoped, item persist ✅ |
| `/user/orders` | POST | guest+user | tạo đơn; subtotal/total đúng ✅ |
| `/user/orders` | GET | user | order history ✅ |
| `/user/orders/{id}/detail` | GET | scoped | 200 owner / 404 foreign ✅ |
| `/user/orders/{id}/bank-transfer` | GET | scoped | QR + `Moon ORD…` ✅ |
| `/user/orders/{id}/cancel` | POST | scoped | pending→cancelled; re-cancel 422 ✅ |
| `/user/coupons/apply` | POST | opt | %/min/cap/private đúng ✅ |
| `/user/tokens`, `/common/payment-methods` | GET | — | wallet chỉ hiện khi auth ✅ |
| `/client/sepay/hook` | POST | Apikey | 401 sai key, 422 thiếu field ✅ |

- **Status code:** phần lớn đúng. **Sai:** lỗi nghiệp vụ (`INSUFFICIENT_WALLET_BALANCE`,
  `WALLET_REQUIRES_AUTH`, `CART_ITEMS_EMPTY`) trả **500** thay vì 4xx → **BUG-001**.
- **Response time:** tất cả < ~1.5s trong log; không có endpoint chậm bất thường.
- **Đồng bộ UI↔API:** total hiển thị trên order-detail (134 256 VND) khớp API.

### Giới hạn môi trường (quan trọng)

1. **DB staging ≠ DB local.** MySQL truy cập được từ máy này là instance riêng
   (khác SKU) so với DB của API staging → không thể validate/cleanup bằng SQL
   trực tiếp; đã dùng **API làm nguồn xác thực** (chi tiết: `evidence/db/db-validation.md`).
2. **Ví staging = 0** (cả VND và MOON) và **không thể nạp** (deposit cần secret
   webhook) → **không kiểm thử được nhánh wallet debit thành công**.
3. **`SEPAY_WEBHOOK_API_KEY` của staging không lộ** → chỉ test được webhook ở
   mức auth/validation; **nhánh settle thành công + idempotency + amount-mismatch
   bị chặn** (code có implement — cần môi trường có secret để verify).

## 6. Đánh giá UI

- Layout/typography/spacing tốt trên desktop & tablet; sản phẩm, giá, badge giảm
  giá, tồn kho hiển thị rõ. Toast "Đặt hàng thành công!" hoạt động.
- **Vấn đề:** (a) tràn ngang 12px ở 375px — **BUG-003**; (b) dấu phân cách hàng
  nghìn không nhất quán (`74,474` vs `161.951`) — **BUG-004**; (c) logo và ảnh
  sản phẩm là placeholder trên staging (seed data — cần asset thật trước prod).

## 7. Đánh giá UX

- Luồng mua mạch lạc: detail → giỏ → checkout → order detail có timeline trạng
  thái + nút "Thanh toán ngay"/"Hủy đơn hàng". Điều hướng hợp lý.
- Đề xuất: disable/annotate phương thức ví khi số dư không đủ ngay từ đầu; hiển
  thị QR chuyển khoản ngay trên trang thành công; empty-state checkout rõ ràng
  hơn (xem `improvement.md`).

## 8. Responsive Testing

| Viewport | Kết quả |
|---|---|
| 1920×1080, 1366×768 | ✅ không tràn ngang |
| iPad 820×1180 | ✅ |
| iPhone 14 390×844 | ✅ |
| iPhone SE 375×667 | ❌ tràn ngang 12px (product + checkout) — BUG-003 |

Ảnh: `evidence/ui_ux/responsive/`.

## 9. Danh sách Bug

| ID | Tiêu đề | Severity | Priority | Trạng thái |
|---|---|---|---|---|
| BUG-001 | Lỗi nghiệp vụ trả HTTP 500 thay vì 4xx | Medium | High | Open |
| BUG-002 | Số tiền VND bị lẻ thập phân (discount/total) | Low-Med | Medium | Open |
| BUG-003 | Tràn ngang 12px trên iPhone SE (375px) | Low | Medium | Open |
| BUG-004 | Dấu phân cách hàng nghìn không nhất quán | Low | Low | Open |

Chi tiết: `bug_report.md`.

## 10. Potential Risks

RISK-01 idempotency/double-submit · RISK-02 coupon chưa tới hạn vẫn apply ·
RISK-03 coverage gap (wallet/webhook do môi trường) · RISK-04 orphan guest cart ·
RISK-05 DB local≠staging · RISK-06 chuyển khoản với tổng tiền lẻ không đối soát
được. Chi tiết: `risks.md`.

## 11. Improvement

Xem `improvement.md` (typed errors→4xx, làm tròn tiền, idempotency-key, fix
`stock` list, fix overflow iPhone SE, format tiền thống nhất, a11y…).

## 12. Evidence

- API log: `evidence/api/api-log.json` (65 calls) · Results: `evidence/api/results.json`
- UI results: `evidence/ui_ux/results.json`
- Screenshots: `evidence/ui_ux/screenshots/` (12) · Responsive: `evidence/ui_ux/responsive/` (15)
- Videos: `evidence/ui_ux/videos/` (7 `.webm`)
- Network: `evidence/network/guest-order-flow.har` (HAR) + per-context `*.network.json`
- Console: `evidence/console/*.console.json`
- DB note: `evidence/db/db-validation.md`

## 13. Kết luận

| | |
|---|---|
| Test Case | 52 (Passed 50 / Failed 2 / Blocked 6) |
| Bug theo Severity | Medium 1, Low-Med 1, Low 2 |
| Potential Risks | 6 |

**Đánh giá: ⚠️ Có thể Release sau khi sửa các lỗi quan trọng.**

Luồng đặt hàng cốt lõi (guest + đã đăng nhập; tạo đơn COD và chuyển khoản;
coupon; hủy đơn; lịch sử/chi tiết đơn) hoạt động đúng và **an toàn** trước các
kịch bản IDOR/phân quyền đã kiểm thử. Trước khi lên production nên:

1. **Sửa BUG-001** (chuẩn hóa HTTP status cho lỗi nghiệp vụ) — ảnh hưởng hợp đồng
   API và khả năng hiển thị lỗi cho người dùng.
2. **Sửa BUG-002** (làm tròn VND) — nếu không, đơn chuyển khoản có tổng tiền lẻ
   sẽ **không bao giờ đối soát được** qua webhook (RISK-06).
3. **Hoàn tất kiểm thử wallet + webhook settlement** trong môi trường nạp được ví
   và biết secret webhook (hiện đang bị chặn).

BUG-003/004 (responsive + format) nên xử lý nhưng không chặn release.

## 14. Phụ lục

- Playwright 1.55.1 · Chromium build v1193 (140.0.7339.186)
- Devices: desktop 1920/1366, iPad, iPhone 14, iPhone SE
- Scripts: `script/config.js`, `script/helpers.js`, `script/api.spec.js`, `script/ui.spec.js`
- Cách chạy lại: `node script/api.spec.js` và `node script/ui.spec.js` (từ thư mục `test/user/order`)
