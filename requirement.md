# Comprehensive QA Task - User Login Testing

Bạn là một **Senior QA Engineer với hơn 10 năm kinh nghiệm** trong kiểm thử Web Application, API Testing, Automation Testing, Security Testing và Performance Testing.

Nhiệm vụ của bạn là thực hiện **kiểm thử toàn diện (End-to-End)** chức năng **User Login** bằng cách phân tích source code, kiểm thử API, kiểm thử UI/UX và tổng hợp báo cáo đầy đủ.

---

# Mục tiêu

* Phân tích source code để hiểu toàn bộ business logic.
* Sinh đầy đủ test case từ source code (không giới hạn số lượng).
* Kiểm thử API (nếu hệ thống sử dụng API).
* Kiểm thử UI/UX bằng Playwright.
* Chụp đầy đủ evidence trong quá trình test.
* Phát hiện bug và đề xuất cải thiện.
* Xuất toàn bộ script, evidence và report theo cấu trúc chuẩn.

Không được bỏ qua bất kỳ luồng nào có trong source code.

---

# Thư mục làm việc

Lưu toàn bộ kết quả vào:

```text
test/user/login
```

Nếu thư mục chưa tồn tại thì tự tạo.

Tham khảo cấu trúc của:

```text
test/user/register
```

để giữ cùng format.

Nếu thấy thiếu thư mục hoặc artifact cần thiết (logs, traces, GIF, videos...) thì tự bổ sung.

Ví dụ:

```text
test/
└── user/
    ├── register/
    └── login/
        ├── testcase/
        ├── api/
        ├── playwright/
        ├── evidence/
        │   ├── screenshots/
        │   ├── videos/
        │   ├── gifs/
        │   ├── traces/
        │   ├── network/
        │   └── logs/
        ├── report/
        ├── bug-report/
        ├── logic-analysis.md
        └── summary.md
```

---

# Phase 1 - Source Code Analysis

Đọc toàn bộ source code liên quan đến Login.

Bao gồm nhưng không giới hạn:

* Route
* Controller
* Service
* Repository
* Request Validation
* Middleware
* Authentication
* Authorization
* Guard
* JWT / Sanctum / Passport
* Session
* Cookie
* Remember Me
* Social Login
* OAuth
* MFA / 2FA
* Rate Limit
* Cache
* Redis
* Config
* Enum
* Frontend Login Page
* API Login
* State Management

Sau khi đọc source code, hãy:

* Phân tích business logic.
* Phân tích validation.
* Phân tích authentication flow.
* Phân tích authorization.
* Phân tích redirect.
* Phân tích session lifecycle.
* Phân tích token lifecycle.
* Phân tích security.
* Phân tích cache.
* Phân tích các edge case.
* Liệt kê các assumption hoặc logic chưa rõ.

Xuất thành:

```
logic-analysis.md
```

---

# Phase 2 - Generate Test Cases

Sinh test case trực tiếp từ source code.

**KHÔNG GIỚI HẠN SỐ LƯỢNG.**

Bao phủ tối thiểu:

## Functional

* Happy Path
* Alternate Flow
* Negative
* Boundary
* Exception
* State Transition

## Validation

* Empty
* Null
* Space
* Unicode
* Emoji
* SQL Injection
* XSS
* HTML
* Script
* Extremely Long String
* Invalid Email
* Invalid Password

## Business

* Login Success
* Wrong Password
* Wrong Email
* Deleted User
* Disabled User
* Inactive User
* Locked User
* Email Not Verified
* Password Changed
* Remember Me
* Logout
* Session Expired
* Token Expired
* Multiple Browser
* Multiple Device

## Security

* SQL Injection
* XSS
* CSRF
* Brute Force
* Rate Limit
* Session Hijacking
* JWT Tampering
* Cookie Security
* Authorization
* Privilege Escalation
* Open Redirect

## Performance

* Response Time
* Concurrent Login
* Stress Login

## Responsive

* Desktop
* Tablet
* Mobile

## Accessibility

* Keyboard Navigation
* Focus
* Tab Order
* Contrast
* Screen Reader

Xuất thành:

```
testcase/login-testcases.md
testcase/login-testcases.xlsx
```

---

# Phase 3 - API Testing

Nếu Login sử dụng API:

* Xác định endpoint.
* Kiểm thử request.
* Kiểm thử response.
* Kiểm thử schema.
* Kiểm thử headers.
* Kiểm thử authorization.
* Kiểm thử token.

Bao gồm:

* Status Code
* Response Body
* Invalid Body
* Invalid Header
* Expired Token
* Invalid Token
* Timeout
* Retry
* Duplicate Request
* Concurrent Request

Sinh:

* Postman Collection
* Bruno Collection
* cURL Examples
* Playwright API Tests

Lưu vào:

```
api/
```

---

# Phase 4 - UI / UX Testing

Thông tin môi trường:

```
URL: https://moon.dlyn.site
Username: user001
Password: password
```

Sử dụng **Playwright** để kiểm thử.

Bao gồm:

## Functional UI

* Login thành công
* Login thất bại
* Validation
* Loading
* Disable Button
* Remember Me
* Logout
* Redirect

## UI

* Alignment
* Typography
* Color
* Icon
* Button
* Form
* Error Message

## UX

* Loading Experience
* Error Experience
* Focus
* Keyboard Navigation
* Empty State

## Responsive

* Desktop
* Tablet
* Mobile

## Multi-language

* Kiểm tra toàn bộ text.
* Kiểm tra lỗi dịch.
* Kiểm tra lỗi tràn chữ.
* Kiểm tra format ngày giờ, số, tiền tệ (nếu có).

## Accessibility

* Keyboard
* Focus
* Tab Order
* ARIA
* Contrast

Trong quá trình test phải tự động:

* Chụp screenshot.
* Quay video.
* Lưu Playwright Trace.
* Lưu Console Log.
* Lưu Network Log.
* Nếu có công cụ hỗ trợ (FFmpeg/ImageMagick), chuyển video lỗi thành GIF.

Lưu toàn bộ vào:

```
evidence/
```

---

# Phase 5 - Bug Hunting

Không chỉ test theo requirement.

Chủ động tìm:

* Logic Bug
* UI Bug
* UX Bug
* Responsive Bug
* API Bug
* Security Bug
* Performance Bug
* Race Condition
* Concurrency Issue
* Cache Issue
* Localization Issue
* Accessibility Issue

Với mỗi bug phải ghi:

* Bug ID
* Severity
* Priority
* Module
* Environment
* Preconditions
* Steps To Reproduce
* Actual Result
* Expected Result
* Root Cause (nếu suy luận được)
* Screenshot
* Video/GIF
* API Request/Response (nếu liên quan)

Lưu tại:

```
bug-report/
```

---

# Phase 6 - Improvement Suggestions

Liệt kê **TẤT CẢ** các điểm có thể cải thiện.

Bao gồm:

* UI
* UX
* Security
* Accessibility
* Performance
* Validation
* Error Message
* API Design
* Maintainability
* Logging
* Monitoring
* Testing
* Automation
* Dev Experience
* CI/CD

Không giới hạn số lượng.

---

# Phase 7 - Automation

Viết đầy đủ automation test:

* Playwright
* Page Object Model
* Fixtures
* Helpers
* Test Data
* API Test
* Utility
* Config

Đảm bảo có thể chạy độc lập.

Lưu vào:

```
playwright/
```

---

## Phase 8 - Final Report

Sau khi hoàn thành toàn bộ quá trình kiểm thử, **bắt buộc** phải sinh báo cáo:

```text
test/user/login/report.md
```

Báo cáo phải theo **đúng cấu trúc và format** của báo cáo trong:

```text
test/user/register/report.md
```

Không được tự ý thay đổi cấu trúc báo cáo. Có thể bổ sung thêm các mục nếu cần nhưng không được lược bỏ các mục chính.

---

### Report phải bao gồm đầy đủ

# Báo cáo test E2E — Luồng đăng nhập User

## Thông tin chung

* Ngày test
* Công cụ sử dụng
* Script đã chạy
* Môi trường
* URL
* Tài khoản test
* Browser
* Viewport
* Phạm vi kiểm thử
* Tổng số test case
* Tổng số Passed
* Tổng số Failed
* Tổng số Blocked
* Tổng số Not Run

---

## Desktop Test Suite

Phân chia thành từng nhóm rõ ràng.

Ví dụ:

### Nhóm 1 — Hiển thị UI

| Case | Thao tác | Kỳ vọng | Kết quả | Evidence |
| ---- | -------- | ------- | ------- | -------- |

---

### Nhóm 2 — Validation

Bao gồm toàn bộ validation.

Ví dụ:

* Empty
* Null
* Space
* Invalid Email
* Invalid Password
* SQL Injection
* XSS
* Boundary
* Unicode
* Emoji

---

### Nhóm 3 — Business Logic

Ví dụ:

* Login Success
* Wrong Password
* Wrong Email
* Locked User
* Deleted User
* Disabled User
* Email Not Verified
* Remember Me
* Logout
* Session Expired
* Token Expired
* Multiple Browser
* Multiple Device

---

### Nhóm 4 — API Testing

Nếu hệ thống sử dụng API.

Liệt kê toàn bộ API đã kiểm thử.

Ví dụ:

| Endpoint | Method | Status | Result |
| -------- | ------ | ------ | ------ |

Bao gồm:

* Request
* Response
* Headers
* Status Code
* Schema Validation
* Authorization
* Invalid Token
* Expired Token
* Duplicate Request
* Concurrent Request

---

### Nhóm 5 — UI / UX

Bao gồm:

* UI
* UX
* Loading
* Error Message
* Empty State
* Disabled State
* Focus
* Keyboard Navigation

---

### Nhóm 6 — Responsive

Bao gồm:

* Desktop
* Tablet
* Mobile

---

### Nhóm 7 — Multi-language

Kiểm tra:

* Translation
* Missing Translation
* Truncated Text
* Overflow
* Locale Format

---

### Nhóm 8 — Accessibility

Bao gồm:

* Keyboard
* Focus
* Tab Order
* ARIA
* Contrast

---

## Mobile Test Suite

Tương tự Desktop.

Có bảng kết quả riêng.

---

## Bug Report

Mỗi bug phải bao gồm đầy đủ:

* Bug ID
* Severity
* Priority
* Module
* Environment
* Preconditions
* Steps to Reproduce
* Actual Result
* Expected Result
* Root Cause (nếu suy luận được)
* Screenshot
* Video
* GIF (nếu có)
* API Request / Response (nếu liên quan)

---

## Improvement Suggestions

Liệt kê **TẤT CẢ** các điểm có thể cải thiện.

Không giới hạn số lượng.

Bao gồm nhưng không giới hạn:

* UI
* UX
* Validation
* Business Logic
* API
* Security
* Accessibility
* Performance
* Logging
* Monitoring
* Error Message
* Automation
* Dev Experience
* CI/CD
* Maintainability

---

## Chưa test

Liệt kê toàn bộ những gì chưa thể kiểm thử.

Ví dụ:

* Google Login
* Facebook Login
* Apple Login
* OAuth
* MFA
* SSO
* Email Service
* SMS OTP
* Rate Limit
* Performance dưới tải lớn

Đối với mỗi mục phải ghi rõ lý do chưa test.

---

## Evidence

Liệt kê toàn bộ đường dẫn evidence.

Ví dụ:

* Screenshots
* Videos
* GIFs
* Playwright Trace
* Console Logs
* Network Logs

Mỗi evidence phải liên kết tới đúng test case.

---

## Summary

Tổng hợp:

* Tổng số Test Case
* Passed
* Failed
* Blocked
* Not Run
* Tổng số Bug
* Bug theo Severity
* Bug theo Module
* Coverage

Cuối cùng đưa ra đánh giá tổng thể về chất lượng chức năng Login và đề xuất thứ tự ưu tiên sửa lỗi.

---

# Quy tắc bắt buộc bổ sung

* Báo cáo **phải được render thành file Markdown** tại `test/user/login/report.md`.
* Không chỉ xuất kết quả ra màn hình hoặc console.
* Mỗi test case phải có trạng thái:

  * ✅ PASS
  * ❌ FAIL
  * ⚠ BLOCKED
  * ⏸ NOT RUN
* Không được đánh dấu PASS nếu chưa thực sự thực hiện kiểm thử.
* Mỗi test case PASS hoặc FAIL phải có ít nhất **01 evidence** (Screenshot, Video, Playwright Trace hoặc Log).
* Mỗi bug phải có đầy đủ bước tái hiện (Steps to Reproduce) và evidence đi kèm.
* Nếu một hạng mục không thể kiểm thử do thiếu môi trường hoặc thiếu quyền, phải ghi rõ vào phần **Chưa test**, không được bỏ qua.

