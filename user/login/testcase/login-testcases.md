# Login — Test Cases

- **Ngày:** 2026-07-08 · **Chức năng:** User Login · **Nguồn:** sinh trực tiếp từ source code (xem [`../logic-analysis.md`](../logic-analysis.md)).
- **Ký hiệu kết quả:** ✅ Pass · ❌ Fail (đã tìm ra bug) · ⚠️ Pass-with-warning · ⬜ Not-run/Blocked · 🧪 = có evidence live.
- **Endpoint:** `POST https://api-moon.dlyn.site/api/user/auth/login` · **UI:** `https://moon.dlyn.site` (login modal).
- **Trạng thái tổng hợp** xem [`../report/final-report.md`](../report/final-report.md). Bug chi tiết xem [`../bug-report/`](../bug-report/).

> Quy ước "HTTP đúng": theo REST chuẩn (401 cho sai credential, 403 cho khoá).
>
> ✅ **CẬP NHẬT SAU RE-TEST (2026-07-08):** cả 6 bug đã được vá & verify lại. Các case đánh ❌ bên dưới **phản ánh lần chạy ĐẦU (trước vá)** để truy vết; trạng thái **sau vá** là **PASS** — xem file [`login-testcases.xlsx`](login-testcases.xlsx) (đã cập nhật) và [`../report.md`](../report.md). Cụ thể: B2/B3 → 401 `INVALID_CREDENTIALS`; S6 hết enumeration; S10/S11 có security headers + CORS siết; S15 → 401/403; A7 có `role=alert`; L4 message đã dịch; V7/V12(BUG-006) chuẩn hoá tường minh.

---

## A. Functional (backend + UI)

| ID | Tiêu đề | Tiền điều kiện | Bước | Dữ liệu | Kỳ vọng | Kết quả |
|----|---------|----------------|------|---------|---------|---------|
| TC-F01 | Login thành công (happy path) | user001 active | POST login | user001/password | 200 `LOGIN_SUCCESS`, trả token `<id>\|<hash>` | ✅ 🧪 |
| TC-F02 | Token dùng được cho route bảo vệ | có token TC-F01 | GET `user/auth/me` kèm Bearer | token hợp lệ | 200, trả profile | ✅ 🧪 |
| TC-F03 | Logout xoá token hiện tại | đã login | DELETE `user/auth/logout` | Bearer token | 200 `LOGOUT_SUCCESS`; token cũ không còn dùng được | 🧪 |
| TC-F04 | Multi-device: login 2 lần tạo 2 token | user001 | login 2 lần | như F01 | 2 token khác nhau, cả hai đều hợp lệ | 🧪 |
| TC-F05 | Logout thiết bị A không huỷ token B | 2 token | logout token A | — | token B vẫn dùng được | 🧪 |
| TC-F06 | State transition: guest → logged-in → guest | — | login → logout | — | trạng thái auth chuyển đúng | ✅ |
| TC-F07 | UI: mở modal login từ account dropdown | trang chủ | click account → Đăng nhập | — | modal hiện, focus vào username | 🧪 |
| TC-F08 | UI: login thành công đóng modal, cập nhật header | modal mở | nhập đúng → submit | user001/password | modal đóng, token vào localStorage, header đổi sang logged-in | 🧪 |
| TC-F09 | UI: nút submit disabled khi thiếu input | modal mở | để trống username hoặc password | — | nút submit `disabled`, không gọi API | 🧪 |
| TC-F10 | UI: toggle hiện/ẩn mật khẩu | modal mở | click icon con mắt | "password" | input `type` đổi text↔password | 🧪 |
| TC-F11 | UI: link "Quên mật khẩu?" điều hướng | modal mở | click link | — | tới `/forgot-password` | 🧪 |
| TC-F12 | UI: chuyển sang modal Đăng ký | modal mở | click "Đăng ký ngay" | — | chuyển sang register modal | 🧪 |
| TC-F13 | UI: đóng modal bằng Esc / overlay / nút X | modal mở | Esc / click nền / X | — | modal đóng, khôi phục scroll body | 🧪 |

## B. Validation (server + client)

| ID | Tiêu đề | Dữ liệu | Kỳ vọng | Kết quả |
|----|---------|---------|---------|---------|
| TC-V01 | Thiếu cả 2 field | `{}` | 422 `VALIDATION_ERROR`, errors.username + errors.password | ✅ 🧪 |
| TC-V02 | Thiếu username | `{password:"password"}` | 422, errors.username required | ✅ 🧪 |
| TC-V03 | Thiếu password | `{username:"user001"}` | 422, errors.password required | ✅ 🧪 |
| TC-V04 | Username rỗng "" | `{username:"",password:"x"}` | 422 required | 🧪 |
| TC-V05 | Password rỗng "" | `{username:"user001",password:""}` | 422 required | 🧪 |
| TC-V06 | Username toàn khoảng trắng (client) | UI nhập "   " | nút submit disabled, không gọi API | 🧪 |
| TC-V07 | Khoảng trắng đầu/cuối username (API) | `"  user001  "` | **Thực tế: 200 LOGIN_SUCCESS** — match username bỏ qua khoảng trắng bao quanh (DB comparison). Ghi nhận BUG-006 (loose match) | ⚠️→BUG-006 🧪 |
| TC-V08 | Username là số (type) | `{username:12345}` | **Thực tế: 422 `username must be a string`** (KHÔNG coerce) | ✅ 🧪 |
| TC-V09 | Password là mảng (type-juggling) | `{password:["password"]}` | 422 `password must be string` (không crash/bypass) | 🧪 |
| TC-V10 | Password null | `{password:null}` | 422 required | 🧪 |
| TC-V11 | Unicode/emoji trong username | `"user001😀"` | USER_NOT_FOUND (không match), không crash | 🧪 |
| TC-V12 | Chuỗi cực dài (5000 ký tự) | username 5000 'a' | không crash; USER_NOT_FOUND (500) | 🧪 |
| TC-V13 | HTML/script trong username | `"<script>alert(1)</script>"` | lưu/echo an toàn, không thực thi; USER_NOT_FOUND | 🧪 |

## C. Business

| ID | Tiêu đề | Điều kiện | Kỳ vọng | Kết quả |
|----|---------|-----------|---------|---------|
| TC-B01 | Đúng user + đúng pass | active | 200 token | ✅ 🧪 |
| TC-B02 | Đúng user + sai pass | — | (đúng: 401) hiện: 500 `CREDENTIALS_INCORRECT` | ❌→BUG-001 🧪 |
| TC-B03 | User không tồn tại | — | (đúng: 401 generic) hiện: 500 `USER_NOT_FOUND` (lộ enum) | ❌→BUG-001/002 🧪 |
| TC-B04 | User inactive (is_active=false) | user bị khoá | (đúng: 403) hiện: 500 `USER_INACTIVE` | ❌→BUG-001 · ⬜ cần seed user inactive |
| TC-B05 | User bị xoá cứng | không dùng SoftDeletes | = USER_NOT_FOUND | ⬜ (N/A DB) |
| TC-B06 | Email chưa verify vẫn login được | login không check verify | login vẫn thành công (khác register) | ⚠️ (Open Question) |
| TC-B07 | Remember me | không có tính năng | N/A — token vốn không hết hạn | ⬜ N/A |
| TC-B08 | Session/token expired | Sanctum expiration null | token không tự hết hạn → không thể test expiry | ⬜ N/A (OQ-1) |
| TC-B09 | Login đồng thời nhiều browser | — | mỗi phiên token riêng, đều hợp lệ | 🧪 |
| TC-B10 | Case-insensitive username (USER001) | collation *_ci | có thể login được với hoa/thường | 🧪 (OQ-2) |
| TC-B11 | Logout rồi dùng lại token cũ | — | token đã xoá → 401 UNAUTHENTICATED | 🧪 |

## D. Security

| ID | Tiêu đề | Vector | Kỳ vọng | Kết quả |
|----|---------|--------|---------|---------|
| TC-S01 | SQL Injection ở username | `user001' OR 1=1 -- ` | Eloquent bound param → coi như username thường → USER_NOT_FOUND, KHÔNG bypass | 🧪 |
| TC-S02 | SQL Injection ở password | `' OR '1'='1` | Hash::check fail → không bypass | 🧪 |
| TC-S03 | XSS reflected qua message | `<script>` | API trả JSON, frontend render text (React escape) → không thực thi | 🧪 |
| TC-S04 | Brute-force / Rate limit | >5 req/phút | request thứ 6 → 429 `Too Many Attempts.` | ✅ 🧪 |
| TC-S05 | Rate-limit header lộ đúng | — | `X-RateLimit-Limit:5`, `Remaining` giảm dần | ✅ 🧪 |
| TC-S06 | User enumeration | so message not-found vs wrong-pass | message KHÁC nhau → lộ tồn tại user | ❌→BUG-002 🧪 |
| TC-S07 | JWT/Token tampering | sửa 1 ký tự token gọi /me | 401 UNAUTHENTICATED | 🧪 |
| TC-S08 | Dùng token không có ability 'user' | token ability khác | 403 FORBIDDEN ở route abilities:user | ⬜ |
| TC-S09 | CSRF | login qua Bearer stateless | không áp dụng cookie-CSRF | ⚠️ N/A |
| TC-S10 | Security headers | đọc response header | thiếu HSTS/XCTO/XFO/CSP | ❌→BUG-005 (improvement) 🧪 |
| TC-S11 | CORS wildcard | `Access-Control-Allow-Origin: *` | nới lỏng (bearer nên rủi ro thấp) | ⚠️ 🧪 |
| TC-S12 | Open redirect sau login | không có param redirect | N/A (không có redirect param) | ⬜ N/A |
| TC-S13 | Privilege escalation | user token gọi route admin | 403/401 | ⬜ |
| TC-S14 | Token lộ qua localStorage (XSS) | — | token đọc được nếu có XSS | ⚠️ (thiết kế) |
| TC-S15 | HTTP status cho lỗi nghiệp vụ | auth-fail | 500 → lộ mã lỗi + gây log false-positive | ❌→BUG-001 🧪 |

## E. Performance

| ID | Tiêu đề | Kỳ vọng | Kết quả |
|----|---------|---------|---------|
| TC-P01 | Thời gian phản hồi login hợp lệ | < 1s | 🧪 (~0.5s đo được) |
| TC-P02 | Concurrent login (nhiều request song song) | không lỗi race; nhưng bị rate-limit 5/phút chặn | ⚠️ 🧪 (throttle giới hạn đo tải) |
| TC-P03 | Stress login | rate-limit ngăn stress thực tế trên 1 IP | ⬜ (bị chặn bởi throttle) |

## F. Responsive (UI)

| ID | Tiêu đề | Viewport | Kỳ vọng | Kết quả |
|----|---------|----------|---------|---------|
| TC-R01 | Desktop | 1366×900 | modal căn giữa, layout đúng | 🧪 |
| TC-R02 | Tablet | 768×1024 | modal `max-w-md` responsive, không tràn | 🧪 |
| TC-R03 | Mobile | 390×844 | modal vừa màn hình, padding p-4, không overflow ngang | 🧪 |

## G. Accessibility (UI)

| ID | Tiêu đề | Kỳ vọng | Kết quả |
|----|---------|---------|---------|
| TC-A01 | Keyboard navigation | Tab đi qua username→password→(bỏ qua eye tabIndex=-1)→forgot→submit→social | 🧪 |
| TC-A02 | Focus quản lý | auto-focus username khi mở modal | 🧪 |
| TC-A03 | Tab order hợp lý | thứ tự logic, nút mắt bị loại khỏi tab | 🧪 |
| TC-A04 | ARIA | `role=dialog`, `aria-modal`, `aria-label`, label htmlFor | 🧪 |
| TC-A05 | Đóng bằng bàn phím (Esc) | Esc đóng modal | 🧪 |
| TC-A06 | Contrast | text/nút đạt WCAG AA (kiểm tra thủ công) | ⚠️ (primary trên trắng cần đo) |
| TC-A07 | Screen reader | error có được announce? (không có `aria-live` trên box lỗi) | ❌→BUG-004 (improvement) |

## H. Multi-language (UI)

| ID | Tiêu đề | Kỳ vọng | Kết quả |
|----|---------|---------|---------|
| TC-L01 | Nhãn/nút VI đúng | toàn bộ text khớp `vi/auth.json` | 🧪 |
| TC-L02 | Nhãn/nút EN đúng | khớp `en/auth.json` | 🧪 |
| TC-L03 | Header `language` gửi lên API | đúng ngôn ngữ đang chọn | 🧪 |
| TC-L04 | Message lỗi server chưa i18n | hiện mã kỹ thuật `CREDENTIALS_INCORRECT` thay vì câu dịch | ❌→BUG-003 🧪 |
| TC-L05 | Tràn chữ / cắt chữ | không tràn ở VI/EN | 🧪 |

---

### Tổng số case: **62** (F:13, V:13, C:11, S:15, P:3, R:3, A:7, H:5 — trừ trùng nhóm).
Xem ma trận coverage & kết quả cuối trong [`../report/final-report.md`](../report/final-report.md).
