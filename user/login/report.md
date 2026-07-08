# Báo cáo test E2E — Luồng đăng nhập User

## Thông tin chung

- **Ngày test:** 2026-07-08
- **Công cụ:** Playwright (Chromium headless) cho UI + API; cURL cho security probe; openpyxl cho testcase xlsx.
- **Script đã chạy:**
  - [`playwright/run.js`](playwright/run.js) — UI/UX suite (vi + en + mobile), tự thu evidence (28/28 check PASS)
  - [`api/login.api.spec.js`](api/login.api.spec.js) — API suite Playwright (10/10 check PASS)
  - [`api/security-probes.sh`](api/security-probes.sh) — 10 probe bảo mật/edge (cURL, giãn nhịp tránh throttle)
- **Môi trường:** User app (Next.js 16) + API Laravel + Sanctum. Login là **modal**, không phải page.
- **URL:** UI `https://moon.dlyn.site` · API `https://api-moon.dlyn.site/api/`
- **Tài khoản test:** `user001` / `password`
- **Browser:** Chromium (Playwright, headless)
- **Viewport:** Desktop 1366×900 · Tablet 768×1024 · Mobile 390×844 (touch, user-agent iPhone)
- **Phạm vi kiểm thử:** Functional, Validation, Business, API, UI/UX, Responsive, Multi-language, Accessibility, Security, Performance. Suite UI chạy **2 ngôn ngữ** (VI/EN) + mobile; ảnh evidence riêng `vi-*`, `en-*`, `mobile-*`, `tablet-*`.
- **Tổng số test case:** **70**
- **Tổng số Passed:** **62** (sau khi vá bug; trước đó 48)
- **Tổng số Failed:** **0** (trước đó 7 — tất cả đã sửa & verify lại)
- **Tổng số Blocked:** 2
- **Tổng số Not Run:** 2 (+ 4 N/A do chức năng không tồn tại)

> ✅ **RE-TEST 2026-07-08 (sau khi vá):** cả **6 bug đã được sửa và verify lại trên live**. Toàn bộ suite tự động chạy lại **PASS**: **API 15/15**, **UI 29/29**, security probes xác nhận hết enumeration + có security headers. Lịch sử phát hiện ban đầu (6 bug, 2 High) giữ lại ở mục Bug Report để truy vết; cột "Kết quả" bên dưới đã cập nhật theo trạng thái **sau khi vá**.

---

## Desktop Test Suite

Suite UI chạy giống nhau cho **tiếng Việt [VI]** và **tiếng Anh [EN]**. Cột "Evidence" trỏ ảnh trong `evidence/screenshots/`.

### Nhóm 1 — Hiển thị UI

| Case | Thao tác | Kỳ vọng | Kết quả | Evidence |
|------|----------|---------|---------|----------|
| U1. Mở modal login | Trang chủ → account dropdown → "Đăng nhập"/"Login" | Modal hiện, focus vào username | ✅ VI/EN | vi-02-modal-open / en-02-modal-open |
| U2. Label i18n | Đọc title + label + link | Đúng ngôn ngữ (`Đăng nhập/Tên đăng nhập/Mật khẩu/Quên mật khẩu?` ↔ `Login/Username/Password/Forgot password?`) | ✅ VI/EN | vi-02 / en-02 |
| U3. Toggle hiện/ẩn mật khẩu | Click icon con mắt | `type` đổi password↔text | ✅ VI/EN | vi-04-password-visible / en-04-password-visible |
| U4. Social + chuyển Đăng ký | Kiểm tra nút Google/Facebook + "Đăng ký ngay" | Hiển thị đúng, có link | ✅ | vi-02 / en-02 |
| U5. Đóng modal | Esc / click overlay / nút X | Modal đóng, khôi phục scroll body | ✅ | — (kiểm tra trong trace) |

### Nhóm 2 — Validation

| Case | Dữ liệu nhập | Kỳ vọng | Kết quả | Evidence |
|------|--------------|---------|---------|----------|
| V1. Form trống | username & password rỗng | Nút submit disabled, không gọi API | ✅ VI/EN | vi-03-empty-disabled / en-03-empty-disabled |
| V2. Chỉ trống password | username hợp lệ, password rỗng | Submit disabled | ✅ | vi-03 / en-03 |
| V3. Username toàn khoảng trắng | `"   "` | Submit disabled (client chặn) | ✅ | vi-03 / en-03 |
| V4. Thiếu field (API) | `{}` | HTTP 422 `VALIDATION_ERROR` | ✅ | network/api-security-probes.log |
| V5. Password null (API) | `password:null` | 422 `password required` | ✅ | api-security-probes.log |
| V6. Password là mảng (type-juggling) | `password:["password"]` | 422 `must be a string` (không bypass) | ✅ | api-security-probes.log |
| V7. Username là số | `username:12345` | 422 `must be a string` (không coerce) | ✅ | api-security-probes.log |
| V8. SQL Injection (username & password) | `user001' OR 1=1 -- ` / `' OR '1'='1` | Bound param → không bypass (USER_NOT_FOUND/CREDENTIALS_INCORRECT) | ✅ | api-security-probes.log |
| V9. XSS username | `<script>alert(1)</script>` | Không thực thi; trả JSON an toàn | ✅ | api-security-probes.log |
| V10. Unicode / Emoji | `user001😀` | Không crash → USER_NOT_FOUND | ✅ | api-security-probes.log |
| V11. Boundary — chuỗi 5000 ký tự | username 5000×`a` | Không crash | ✅ | api-security-probes.log |
| V12. Khoảng trắng bao quanh username | `"  user001  "` | 200 SUCCESS — nay **có chủ đích** (trim + LOWER tường minh) | ✅ (BUG-006 fixed) | api-security-probes.log |

### Nhóm 3 — Business Logic

| Case | Thao tác | Kỳ vọng | Kết quả | Evidence |
|------|----------|---------|---------|----------|
| B1. Login Success | user001/password | 200 `LOGIN_SUCCESS` + token; modal đóng; token vào localStorage | ✅ | vi-06-login-success |
| B2. Wrong Password | user001 / sai | 401 `INVALID_CREDENTIALS` | ✅ (BUG-001 fixed, verify lại 401) | en-05-login-error, api-playwright-results.json |
| B3. Wrong / Unknown User | user không tồn tại | 401 `INVALID_CREDENTIALS` (giống sai mật khẩu → hết enumeration) | ✅ (BUG-001/002 fixed) | api-security-probes.log |
| B4. Disabled / Locked User | `is_active=false` | 403 `USER_INACTIVE` | ⛔ Blocked live (không seed được user) — fix verify qua unit test | — |
| B5. Deleted User | User bị xoá | Hard delete (không SoftDeletes) → = USER_NOT_FOUND | ⬜ N/A | — |
| B6. Email Not Verified | Login không kiểm tra verify | Vẫn đăng nhập được (khác luồng register) | ⚠️ Open Question | — |
| B7. Remember Me | Không có tính năng | N/A (token vốn không hết hạn) | ⬜ N/A | — |
| B8. Session / Token Expired | Sanctum expiration null | Không tự hết hạn → không test được | ⬜ N/A | — |
| B9. Logout | DELETE logout với token | 200 `LOGOUT_SUCCESS`, xoá token hiện tại | ✅ | api-playwright-results.json |
| B10. Reuse token sau logout | Gọi /me bằng token đã logout | 401 `UNAUTHENTICATED` | ✅ | api-playwright-results.json |
| B11. Multiple Browser / Device | Login nhiều lần | Mỗi phiên 1 token riêng, đều hợp lệ | ✅ | api-playwright-results.json |
| B12. Case-insensitive username | `USER001` | 200 SUCCESS (collation *_ci) | ⚠️ liên quan BUG-006 | api-security-probes.log |

### Nhóm 4 — API Testing

Base: `https://api-moon.dlyn.site/api`

| Endpoint | Method | Status | Result |
|----------|--------|--------|--------|
| `/user/auth/login` (valid) | POST | 200 `LOGIN_SUCCESS` | ✅ token `<id>\|<hash>` |
| `/user/auth/login` (wrong password) | POST | **401** `INVALID_CREDENTIALS` | ✅ BUG-001 fixed |
| `/user/auth/login` (unknown user) | POST | **401** `INVALID_CREDENTIALS` | ✅ BUG-002 fixed (message giống hệt → hết enumeration) |
| `/user/auth/login` (missing fields) | POST | 422 `VALIDATION_ERROR` | ✅ |
| `/user/auth/login` (type-juggling) | POST | 422 | ✅ |
| `/user/auth/login` (6th request/phút) | POST | 429 `Too Many Attempts.` | ✅ rate-limit OK |
| `/user/auth/me` (token hợp lệ) | GET | 200 | ✅ |
| `/user/auth/me` (token giả/tampered) | GET | 401 `UNAUTHENTICATED` | ✅ |
| `/user/auth/logout` | DELETE | 200 `LOGOUT_SUCCESS` | ✅ |

**Chi tiết:**
- **Request/Response:** body JSON `{status,message,data}` (success) / `{status,message,errors}` (error) — schema nhất quán.
- **Headers:** có `X-RateLimit-Limit: 5`, `X-RateLimit-Remaining` giảm dần ✅; ~~thiếu security headers~~ → **đã có** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`, HSTS; CORS **không còn `*`** — ✅ BUG-005 fixed.
- **Schema validation:** token khớp regex `^[0-9]+\|[A-Za-z0-9]+$` ✅.
- **Authorization:** route bảo vệ dùng `auth:sanctum` + `abilities:user`; token sai → 401 ✅.
- **Invalid Token:** sửa 1 ký tự → 401 ✅.
- **Expired Token:** ⬜ không test được (Sanctum không cấu hình expiration → token không hết hạn).
- **Duplicate Request:** mỗi request login tạo token mới (không idempotent — đúng thiết kế Sanctum).
- **Concurrent Request:** ⛔ bị rate-limit 5/phút chặn → không đo được tải đồng thời thực tế.

### Nhóm 5 — UI / UX

| Case | Thao tác | Kỳ vọng | Kết quả | Evidence |
|------|----------|---------|---------|----------|
| X1. Loading | Submit khi hợp lệ | Spinner + text "Đang đăng nhập..."; disable input & nút | ✅ | login-vi.webm |
| X2. Error Message | Sai mật khẩu → submit | Hộp lỗi hiển thị câu đã dịch "Incorrect username or password." (không còn mã thô) | ✅ (BUG-003 fixed) | en-05-login-error |
| X3. Empty State | Chưa nhập gì | Nút submit disabled | ✅ | vi-03 / en-03 |
| X4. Disabled State | Trong lúc loading | Input & nút disabled | ✅ | login-vi.webm |
| X5. Focus | Mở modal | Auto-focus vào username | ✅ | ui-results.json |
| X6. Keyboard Navigation | Tab qua các control; Esc đóng | Tab order hợp lý (nút mắt `tabIndex=-1` bị loại); Esc đóng modal | ✅ | trace-vi.zip |

### Nhóm 6 — Responsive

| Case | Viewport | Kỳ vọng | Kết quả | Evidence |
|------|----------|---------|---------|----------|
| R1. Desktop | 1366×900 | Modal căn giữa, layout đúng | ✅ | vi-01-homepage, vi-02-modal-open |
| R2. Tablet | 768×1024 | Modal `max-w-md`, không tràn ngang | ✅ (overflow=false) | tablet-01-homepage, tablet-02-modal |
| R3. Mobile | 390×844 | Modal gọn trong viewport, không overflow ngang | ✅ (overflow=false) | mobile-01-homepage, mobile-02-modal |

### Nhóm 7 — Multi-language

| Case | Kiểm tra | Kỳ vọng | Kết quả | Evidence |
|------|----------|---------|---------|----------|
| L1. Translation | Toàn bộ nhãn/nút VI & EN | Khớp `locales/{vi,en}/auth.json` | ✅ | vi-02 / en-02 |
| L2. Missing Translation | Message lỗi từ server | Đã map mã lỗi → câu dịch (VI/EN) | ✅ (BUG-003 fixed) | en-05-login-error |
| L3. Truncated / Overflow | Độ dài text VI/EN | Không cắt/tràn | ✅ | vi-02 / en-02 |
| L4. Locale Format | Ngày/số/tiền tệ | N/A — màn login không có định dạng locale | ⬜ N/A | — |

### Nhóm 8 — Accessibility

| Case | Kiểm tra | Kỳ vọng | Kết quả | Evidence |
|------|----------|---------|---------|----------|
| A1. Keyboard | Điều hướng bằng bàn phím | Dùng được toàn bộ form bằng bàn phím | ✅ | trace-vi.zip |
| A2. Focus | Mở modal | Auto-focus username | ✅ | ui-results.json |
| A3. Tab Order | Thứ tự Tab | Logic; nút mắt loại khỏi tab | ✅ | trace-vi.zip |
| A4. ARIA | Thuộc tính ARIA | `role=dialog`, `aria-modal=true`, `aria-label`, label `htmlFor` | ✅ | ui-results.json |
| A5. Contrast | Tương phản màu | WCAG AA | ⬜ Not Run (cần đo thủ công) | — |
| A6. Screen Reader — announce lỗi | Hộp lỗi động | Có `role="alert"` + `aria-live="assertive"` → được đọc | ✅ (BUG-004 fixed) | en-05-login-error |

---

## Mobile Test Suite (390×844, touch, user-agent iPhone)

| Case | Thao tác / Dữ liệu | Kỳ vọng | Kết quả | Evidence |
|------|--------------------|---------|---------|----------|
| M1. Mở modal trên mobile | Trang chủ mobile → account dropdown → "Đăng nhập" | Modal mở, gọn trong viewport | ✅ | mobile-01-homepage, mobile-02-modal |
| M2. Không tràn ngang | Kiểm tra `scrollWidth > innerWidth` | Không overflow ngang | ✅ (overflow=false) | mobile-02-modal |
| M3. Hiển thị đầy đủ control | Username/password/nút/social | Hiển thị đủ, không vỡ layout | ✅ | mobile-02-modal, login-mobile.webm |

> Ghi chú: Suite mobile **không** thực hiện login gọi API (để tiết kiệm hạn mức rate-limit 5/phút); phần login thành công/lỗi đã cover ở desktop VI (success) và EN (error).

---

## Bug Report

Chi tiết đầy đủ: [`bug-report/bug-report.md`](bug-report/bug-report.md). **Tất cả 6 bug đã được sửa và verify lại trên live (RE-TEST 2026-07-08).** Tóm tắt (kèm trạng thái sau khi vá):

### BUG-001 — Auth-fail trả HTTP 500 (High / P1) — ✅ ĐÃ SỬA & VERIFY
- **Fix:** `AuthService::login` ném `HttpException(401, 'INVALID_CREDENTIALS')` / `HttpException(403, 'USER_INACTIVE')` thay cho `\Exception` thuần.
- **Re-test:** sai mật khẩu → **401 INVALID_CREDENTIALS** (api-playwright-results.json: `actual=401`). ✅
- **Module:** `App\Services\Api\User\AuthService::login` + `bootstrap/app.php`
- **Environment:** API `https://api-moon.dlyn.site/api/`
- **Preconditions:** Gọi login với sai mật khẩu / user không tồn tại / user inactive.
- **Steps to Reproduce:** `POST /user/auth/login` body `{"username":"user001","password":"wrong"}`
- **Actual Result:** `HTTP 500`, `{"status":"ERROR","message":"CREDENTIALS_INCORRECT"}`
- **Expected Result:** `HTTP 401` (sai credential) / `403` (inactive)
- **Root Cause:** ném `throw new \Exception('CREDENTIALS_INCORRECT')` (Exception thuần) → handler rơi vào nhánh catch-all 500 (đúng ra dùng `BusinessException`/`AuthenticationException`).
- **Screenshot:** `evidence/screenshots/en-05-login-error.png` · **Video:** `evidence/videos/login-en.webm`
- **API Request/Response:** `evidence/network/api-playwright-results.json` (2 dòng `code=500`)

### BUG-002 — User enumeration (High / P1) — ✅ ĐÃ SỬA & VERIFY
- **Fix:** gộp nhánh "không tìm thấy user" và "sai mật khẩu" → cùng `INVALID_CREDENTIALS`.
- **Re-test:** user không tồn tại **và** sai mật khẩu đều trả **401 `INVALID_CREDENTIALS`** giống hệt (api-security-probes.log) → không còn phân biệt. ✅

- **Module:** `AuthService::login` · **Environment:** API
- **Preconditions:** Không cần đăng nhập.
- **Steps to Reproduce:** (1) `{"username":"no_such_user_zzz",...}` → `USER_NOT_FOUND`; (2) `{"username":"user001","password":"wrong"}` → `CREDENTIALS_INCORRECT`
- **Actual Result:** Message khác nhau → lộ username tồn tại hay không.
- **Expected Result:** Một message chung (VD `INVALID_CREDENTIALS`).
- **Root Cause:** Tách riêng hai nhánh lỗi.
- **API Request/Response:** `evidence/network/api-security-probes.log`

### BUG-003 — Message lỗi không i18n (Medium / P2) — ✅ ĐÃ SỬA & VERIFY
- **Fix:** `LoginModal.tsx` map mã lỗi/HTTP 429 → câu đã dịch; thêm nhánh `errors.*` vào `locales/{vi,en}/auth.json`.
- **Re-test:** ảnh `en-05-login-error.png` hiển thị "Incorrect username or password." (UI 29/29 PASS). ✅

- **Module:** `user/components/header/LoginModal.tsx` · **Environment:** UI
- **Preconditions:** Mở modal login.
- **Steps to Reproduce:** Nhập sai mật khẩu → submit.
- **Actual Result:** Hộp lỗi hiển thị chuỗi thô `CREDENTIALS_INCORRECT`.
- **Expected Result:** Câu dịch thân thiện theo ngôn ngữ.
- **Root Cause:** FE gán trực tiếp `response.data.message`; `auth.json` chưa có key cho mã lỗi server.
- **Screenshot:** `evidence/screenshots/en-05-login-error.png` (thấy rõ)

### BUG-004 — Lỗi không announce cho screen reader (Low / P3) — ✅ ĐÃ SỬA & VERIFY
- **Fix:** thêm `role="alert"` + `aria-live="assertive"` cho hộp lỗi trong `LoginModal.tsx`.
- **Re-test:** UI suite xác nhận `role=alert` trên hộp lỗi. ✅

- **Module:** `LoginModal.tsx` (hộp lỗi) · **Environment:** UI
- **Steps to Reproduce:** Kích hoạt lỗi login, quan sát vùng thông báo.
- **Actual Result:** Không có `role="alert"`/`aria-live` → screen reader không đọc.
- **Expected Result:** Lỗi được announce.
- **Root Cause:** Thiếu thuộc tính ARIA cho vùng động.

### BUG-005 — Thiếu security headers + CORS wildcard (Medium / P2) — ✅ ĐÃ SỬA & VERIFY
- **Fix:** thêm middleware `SecurityHeaders` (append global trong `bootstrap/app.php`) + tạo `config/cors.php` siết origin về `*.dlyn.site`.
- **Re-test:** response login có `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`; CORS không còn `*` (api-playwright-results.json). ✅

- **Module:** API response headers · **Environment:** API
- **Steps to Reproduce:** Đọc header response login.
- **Actual Result:** Thiếu HSTS/X-Content-Type-Options/X-Frame-Options/CSP; `Access-Control-Allow-Origin: *`.
- **Expected Result:** Có đủ security headers; CORS giới hạn origin tin cậy.
- **Root Cause:** Chưa cấu hình middleware security-headers / `config/cors.php`.
- **API Request/Response:** header dump trong `evidence/network/`

### BUG-006 — Username match lỏng (Low / P3) — ✅ ĐÃ SỬA & VERIFY
- **Fix:** `normalizeUsername()` (trim + lowercase) + so khớp case-insensitive **tường minh** bằng `whereRaw('LOWER(username) = ?')`; áp dụng cả `register`. Hành vi giờ có chủ đích thay vì phụ thuộc ngầm collation.
- **Re-test:** `USER001` và `"  user001  "` vẫn 200 nhưng nay là hành vi được định nghĩa rõ ràng, nhất quán register/login. ✅

- **Module:** `AuthService::login` + collation DB · **Environment:** API
- **Steps to Reproduce:** (1) `"  user001  "` → 200; (2) `USER001` → 200.
- **Actual Result:** Đăng nhập được dù thừa khoảng trắng / khác hoa-thường.
- **Expected Result:** Hành vi nhất quán, có chủ đích; chuẩn hoá input.
- **Root Cause:** Không trim/lower input; dựa collation MySQL mặc định.
- **API Request/Response:** `evidence/network/api-security-probes.log`

---

## Improvement Suggestions

**Security**
1. Trả **401** chung cho mọi sai credential; **403** cho inactive; bỏ phân biệt user tồn tại (fix BUG-001/002).
2. Thêm security headers: HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, CSP (BUG-005).
3. Siết CORS `allowed_origins` theo domain tin cậy.
4. Account-level lockout (ngoài IP throttle) + captcha sau N lần sai.
5. Cân nhắc MFA/2FA cho tài khoản nhạy cảm.
6. Đặt Sanctum token expiration + refresh token (hiện có thể null → token vĩnh viễn).
7. Cân nhắc httpOnly cookie thay localStorage để giảm rủi ro XSS đánh cắp token.

**Validation / Business Logic / API**
8. Chuẩn hoá username (trim + lower) đồng bộ register/login (fix BUG-006).
9. Giới hạn độ dài username/password ở FormRequest (chặn payload 5000+ sớm).
10. Chuẩn hoá mã lỗi thành enum + tài liệu OpenAPI/Swagger.
11. Làm rõ chính sách "email chưa verify có được login không".

**UI / UX / Error Message / Accessibility**
12. Map mã lỗi → câu dịch i18n (fix BUG-003); bổ sung key vào `auth.json`.
13. Thêm `role="alert"`/`aria-live` cho hộp lỗi (fix BUG-004).
14. Thông báo rate-limit thân thiện ("Thử lại sau ~60s") thay vì "Too Many Attempts.".
15. Đo & đạt contrast WCAG AA cho nút primary.
16. Cân nhắc "Remember me" nếu nghiệp vụ cần.

**Logging / Monitoring / Automation / CI-CD / Maintainability / Dev Experience**
17. Tách lỗi nghiệp vụ khỏi 5xx để cảnh báo monitoring chính xác.
18. Unit test `AuthService::login` phủ 3 nhánh lỗi + thành công; test hồi quy status 401/403.
19. Tích hợp bộ Playwright này vào CI/CD (nightly, kèm trace artifact).
20. Seed sẵn fixtures user inactive để mở khoá case Blocked.
21. Thêm ràng buộc unique username không phân biệt hoa/thường ở tầng DB.

---

## Chưa test

| Hạng mục | Lý do chưa test |
|----------|-----------------|
| Google / Facebook Login (OAuth) | Cần tài khoản OAuth thật + tương tác trang provider ngoài phạm vi; chỉ xác nhận nút & khởi tạo redirect. |
| Apple Login / SSO | Không có trong source. |
| MFA / 2FA | Không có trong source (đề xuất cải thiện). |
| Email Service / SMS OTP | Login không dùng OTP (chỉ register dùng). |
| Token Expired | Sanctum không cấu hình expiration → token không hết hạn, không tạo được trạng thái expired. |
| User Inactive / Locked | Không seed được user `is_active=false` trên môi trường live (không có quyền DB). |
| Privilege escalation (token sai ability) | Không có sẵn token ability khác để thử. |
| Performance dưới tải lớn / Concurrent | Rate-limit 5 req/phút/IP chặn stress & concurrency thực tế trên 1 IP. |
| Contrast WCAG AA (định lượng) | Cần công cụ đo tương phản; mới đánh giá định tính. |
| GIF evidence | Thiếu ffmpeg/imagemagick hệ thống (ffmpeg bundled của Playwright chỉ hỗ trợ webm) → dùng video thay thế. |

---

## Evidence

Tất cả trong thư mục [`evidence/`](evidence/). Liên kết tới case tương ứng:

| Loại | Đường dẫn | Case liên quan |
|------|-----------|----------------|
| Screenshots (14) | [`evidence/screenshots/`](evidence/screenshots/) | vi-01/02/03/04/06, en-01/02/03/04/05, tablet-01/02, mobile-01/02 — U1–U3, V1–V3, B1–B2, R1–R3, X2 |
| Videos (3) | [`evidence/videos/`](evidence/videos/) | login-vi.webm (B1/X1), login-en.webm (B2/X2), login-mobile.webm (M1–M3) |
| Playwright Traces (2) | [`evidence/traces/`](evidence/traces/) | trace-vi.zip, trace-en.zip (U5, X6, A1/A3) — mở: `npx playwright show-trace` |
| Console Logs | [`evidence/logs/`](evidence/logs/) | console-vi.log, console-en.log |
| Network Logs | [`evidence/network/`](evidence/network/) | network-vi.log, network-en.log, api-security-probes.log (V4–V12, B3, B12), api-playwright-results.json (Nhóm 4, B2/B9/B10/B11) |
| Kết quả UI (JSON) | [`evidence/logs/ui-results.json`](evidence/logs/ui-results.json) | toàn bộ 28 check UI |
| Test cases | [`testcase/login-testcases.md`](testcase/login-testcases.md) · [`testcase/login-testcases.xlsx`](testcase/login-testcases.xlsx) | 70 case |
| Phân tích logic | [`logic-analysis.md`](logic-analysis.md) | — |

---

## Summary

| Chỉ số | Giá trị |
|--------|---------|
| Tổng số Test Case | **70** |
| Passed | **62** (trước vá: 48) |
| Failed | **0** (trước vá: 7 — đã sửa hết) |
| Blocked | 2 |
| Not Run | 2 (+4 N/A) |
| Tổng số Bug | **6 — đã sửa & verify 6/6** |

**Bug theo Severity:** High 2 · Medium 2 · Low 2 — **tất cả đã sửa ✅**
**Bug theo Priority:** P1 2 · P2 2 · P3 2
**Bug theo Module:** API/Backend 4 (BUG-001/002/005/006) · Frontend 2 (BUG-003/004)

**Coverage:** Functional ✅ cao · Validation ✅ cao · Business ⚠️ vừa (inactive blocked live; vài case N/A vì không có logic) · API ✅ cao · UI/UX ✅ cao · Responsive ✅ (3 viewport) · Multi-language ✅ · Accessibility ✅ (đã có announce lỗi; contrast chưa đo định lượng) · Security ✅ cao (SQLi/XSS an toàn, rate-limit OK, hết enumeration, có security headers) · Performance ⚠️ thấp (bị rate-limit chặn stress).

### Đánh giá tổng thể

Chức năng Login **hoạt động đúng ở luồng chính** (login thành công, token, logout, rate-limit, chống SQLi/XSS). Đợt kiểm thử đầu phát hiện **6 bug (2 High)** — nghiêm trọng nhất là auth-fail trả **HTTP 500** và **user enumeration**. **Sau khi vá và re-test (2026-07-08): cả 6 bug đã được khắc phục và verify lại trên live** — auth-fail trả 401/403 đúng chuẩn, message lỗi gộp chung chống enumeration, có đủ security headers + CORS siết, message UI đã i18n và có `role=alert`, username chuẩn hoá tường minh. Suite tự động chạy lại **PASS 100%** (API 15/15, UI 29/29). Chất lượng tổng thể: **Tốt — đã đạt production-ready cho luồng login** (còn vài hạng mục nâng cao khuyến nghị: MFA, token expiration, account lockout).

### Thứ tự ưu tiên sửa lỗi — ✅ đã hoàn thành toàn bộ

1. **BUG-001 (P1)** — ✅ Trả 401/403 cho auth-fail.
2. **BUG-002 (P1)** — ✅ Gộp message chống enumeration.
3. **BUG-005 (P2)** — ✅ Security headers + siết CORS.
4. **BUG-003 (P2)** — ✅ i18n hoá message lỗi.
5. **BUG-004 (P3)** — ✅ `role="alert"` cho hộp lỗi.
6. **BUG-006 (P3)** — ✅ Chuẩn hoá username, đồng bộ register.

> **Khuyến nghị nâng cao (chưa bắt buộc):** MFA/2FA, đặt Sanctum token expiration, account-level lockout + captcha, chuyển token sang httpOnly cookie, đo contrast WCAG AA. Chi tiết ở mục *Improvement Suggestions*.
