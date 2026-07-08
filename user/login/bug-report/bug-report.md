# Login — Bug Report

- **Ngày:** 2026-07-08 · **Môi trường:** UI `https://moon.dlyn.site` · API `https://api-moon.dlyn.site/api/`
- **Tài khoản:** user001 / password · **Bằng chứng API:** [`../evidence/network/api-security-probes.log`](../evidence/network/api-security-probes.log), [`../evidence/network/api-playwright-results.json`](../evidence/network/api-playwright-results.json)

| ID | Severity | Priority | Module | Tiêu đề |
|----|----------|----------|--------|---------|
| BUG-001 | **High** | P1 | API / Exception handling | Lỗi đăng nhập nghiệp vụ trả **HTTP 500** thay vì 401/403 |
| BUG-002 | **High** | P1 | API / Security | **User enumeration** — message phân biệt user tồn tại hay không |
| BUG-003 | Medium | P2 | Frontend / i18n | Message lỗi hiển thị **mã kỹ thuật thô** cho người dùng |
| BUG-004 | Low | P3 | Frontend / A11y | Hộp lỗi **không được screen reader thông báo** (thiếu `aria-live`/`role=alert`) |
| BUG-005 | Medium | P2 | API / Security hardening | Thiếu **security headers** + `Access-Control-Allow-Origin: *` |
| BUG-006 | Low | P3 | API / Auth matching | Username match **bỏ qua khoảng trắng bao quanh & hoa-thường** |

---

## BUG-001 — Auth failure trả HTTP 500 (High, P1)

- **Module:** `App\Services\Api\User\AuthService::login` + `bootstrap/app.php`
- **Preconditions:** Gọi API login với sai mật khẩu / user không tồn tại / user inactive.
- **Steps To Reproduce:**
  1. `POST https://api-moon.dlyn.site/api/user/auth/login` body `{"username":"user001","password":"wrong"}`
- **Actual Result:** `HTTP 500 Internal Server Error`, body `{"status":"ERROR","message":"CREDENTIALS_INCORRECT","errors":null}` (đã verify live — xem `api-playwright-results.json` → `code=500`).
- **Expected Result:** `HTTP 401 Unauthorized` (sai credential) hoặc `403` (user inactive). Lỗi nghiệp vụ **không được** trả 5xx.
- **Root Cause:** `AuthService::login` ném `throw new \Exception('CREDENTIALS_INCORRECT')` — **Exception thuần**. Trong `bootstrap/app.php`, chuỗi `instanceof` chỉ map `BusinessException` → 400 và `AuthenticationException` → 401; `\Exception` thuần rơi vào nhánh cuối → **500**. (So sánh: `ReviewService`/`CouponService` dùng đúng `BusinessException`.)
- **Impact:** (1) Sai chuẩn REST — client không phân biệt được lỗi người dùng vs lỗi hệ thống; (2) mọi lần nhập sai mật khẩu tạo **500 trong log/monitoring** → nhiễu cảnh báo, che lấp sự cố thật; (3) frontend interceptor `401 → xoá token` không kích hoạt đúng lúc.
- **Fix đề xuất:** Dùng `AuthenticationException` (hoặc `BusinessException` với status phù hợp) cho 3 lỗi login; thêm nhánh map trong handler nếu cần 401/403.
- **Evidence:** `api-playwright-results.json` (2 dòng `code=500`), `api-security-probes.log`.

## BUG-002 — User enumeration qua message (High, P1)

- **Module:** `AuthService::login`
- **Steps To Reproduce:**
  1. `{"username":"no_such_user_zzz","password":"password"}` → `USER_NOT_FOUND`
  2. `{"username":"user001","password":"wrong"}` → `CREDENTIALS_INCORRECT`
- **Actual Result:** Hai message **khác nhau** → kẻ tấn công biết username nào **tồn tại**.
- **Expected Result:** Cùng một message chung chung (VD `INVALID_CREDENTIALS`) cho cả hai trường hợp.
- **Root Cause:** Logic tách riêng `USER_NOT_FOUND` và `CREDENTIALS_INCORRECT`.
- **Impact:** Hỗ trợ tấn công dò tài khoản → khuếch đại brute-force/credential-stuffing (dù có rate-limit 5/phút vẫn dò được diện rộng qua nhiều IP).
- **Fix đề xuất:** Gộp thành một lỗi 401 chung, không tiết lộ user có tồn tại.
- **Evidence:** `api-security-probes.log` (probe "SQLi in username" → USER_NOT_FOUND, "SQLi in password" → CREDENTIALS_INCORRECT trên cùng user001).

## BUG-003 — Message lỗi không được i18n hoá (Medium, P2)

- **Module:** `user/components/header/LoginModal.tsx` (`setError(err.response.data.message)`)
- **Steps To Reproduce:** Mở modal login trên UI → nhập sai mật khẩu → submit.
- **Actual Result:** Hộp lỗi hiển thị chuỗi thô từ server: `CREDENTIALS_INCORRECT` (hoặc `Too Many Attempts.`) — không dịch, khó hiểu với người dùng cuối.
- **Expected Result:** Câu thông báo thân thiện theo ngôn ngữ, VD "Tên đăng nhập hoặc mật khẩu không đúng."
- **Root Cause:** Frontend gán trực tiếp `response.data.message` (mã code) vào state error thay vì map qua từ điển i18n; `auth.json` chưa có key cho các mã lỗi server.
- **Impact:** UX kém, lộ chi tiết kỹ thuật nội bộ ra UI.
- **Fix đề xuất:** Map mã lỗi → key i18n; bổ sung key trong `locales/{vi,en}/auth.json`; fallback `login_failed`.
- **Evidence:** screenshot `../evidence/screenshots/en-05-login-error.png`.

## BUG-004 — Hộp lỗi không announce cho screen reader (Low, P3)

- **Module:** `LoginModal.tsx` — `<div className="...bg-red-50...">{error}</div>`
- **Actual Result:** Box lỗi không có `role="alert"` / `aria-live="assertive"` → trình đọc màn hình **không tự đọc** khi lỗi xuất hiện.
- **Expected Result:** Lỗi được announce ngay khi hiện.
- **Root Cause:** Thiếu thuộc tính ARIA cho vùng thông báo động.
- **Impact:** Người dùng khiếm thị không biết đăng nhập thất bại.
- **Fix đề xuất:** Thêm `role="alert"` (hoặc `aria-live="assertive"`) vào container lỗi.

## BUG-005 — Thiếu security headers + CORS wildcard (Medium, P2)

- **Module:** API response headers (web server / Laravel).
- **Actual Result (đo live):** Response login **thiếu** `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`; có `Access-Control-Allow-Origin: *`.
- **Expected Result:** Có HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`/CSP; CORS giới hạn theo origin tin cậy.
- **Impact:** Tăng bề mặt tấn công (MIME sniffing, clickjacking, downgrade). Token là Bearer nên CORS `*` rủi ro thấp hơn nhưng vẫn nên siết.
- **Fix đề xuất:** Thêm middleware security-headers; cấu hình `config/cors.php` `allowed_origins` cụ thể.
- **Evidence:** header dump trong `../evidence/network/` và log phân tích.

## BUG-006 — Username match lỏng (khoảng trắng + hoa/thường) (Low, P3)

- **Module:** `AuthService::login` (`where('username', $username)`) + collation DB.
- **Steps To Reproduce (đã verify live):**
  1. `{"username":"  user001  ","password":"password"}` → **200 LOGIN_SUCCESS**
  2. `{"username":"USER001","password":"password"}` → **200 LOGIN_SUCCESS**
- **Actual Result:** Đăng nhập thành công dù username có khoảng trắng bao quanh hoặc khác hoa/thường.
- **Expected Result:** Hành vi cần **nhất quán & có chủ đích** — nếu username là case-insensitive thì phải chuẩn hoá cả khi tạo user; nếu không thì phải khớp chính xác. Hiện phụ thuộc ngầm vào collation MySQL (`*_ci`, PAD SPACE) → dễ gây nhầm/nhân bản tài khoản.
- **Root Cause:** Không chuẩn hoá (trim/lower) input; dựa vào so sánh mặc định của MySQL.
- **Impact:** Nhập nhằng danh tính; rủi ro trùng/nhầm tài khoản; khó dự đoán.
- **Fix đề xuất:** Quyết định chính sách rõ ràng và chuẩn hoá username (trim + lower) đồng nhất ở cả register lẫn login; thêm ràng buộc unique không phân biệt hoa/thường.
- **Evidence:** `api-security-probes.log` (probe "Username case-sensitivity" → 200, "Leading/trailing spaces" → 200).
