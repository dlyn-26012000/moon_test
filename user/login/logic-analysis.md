# Login — Source Code & Logic Analysis

- **Ngày phân tích:** 2026-07-08
- **Phạm vi:** Chức năng **User Login** (không phải CMS/Admin login).
- **Backend:** Laravel + Sanctum (token-based). **Frontend:** Next.js 16 App Router (login là **modal**, không phải page riêng).
- **Môi trường live:** User app `https://moon.dlyn.site` · API `https://api-moon.dlyn.site/api/`
- **Tài khoản test:** `user001` / `password`

---

## 1. Bản đồ luồng (end-to-end)

```
LoginModal.tsx  ──(username,password)──►  AuthService.login()  ──► POST user/auth/login
        ▲                                        (axios, baseURL=NEXT_PUBLIC_API_URL)
        │ localStorage.setItem("auth_token", data)                     │
        │                                                              ▼
   onSuccess()                                       Route (throttle:5,1)
                                                        AuthController@login
                                                        LoginRequest (validate)
                                                        AuthService::login()
                                                          ├─ User where username = ?
                                                          ├─ Hash::check(password)
                                                          ├─ is_active?
                                                          └─ TokenService->generateToken()  (Sanctum plainTextToken, ability ['user'])
                                                        successResponse(token, 'LOGIN_SUCCESS')
```

### Files chính
| Lớp | File |
|-----|------|
| Route | `api/routes/user_api.php:39` — `POST user/auth/login` middleware `throttle:5,1` |
| Controller | `api/app/Http/Controllers/Api/User/AuthController.php::login` |
| FormRequest | `api/app/Http/Requests/Api/User/Auth/LoginRequest.php` |
| Service (logic) | `api/app/Services/Api/User/AuthService.php::login` |
| Token | `api/app/Services/TokenService.php::generateToken` |
| Exception → HTTP | `api/bootstrap/app.php` (render mapping) |
| Response shape | `api/app/Http/Controllers/Controller.php` (`successResponse`/`errorResponse`) |
| Model | `api/app/Models/User.php` (`is_active` boolean, `password` hashed cast) |
| Frontend UI | `user/components/header/LoginModal.tsx` |
| Frontend service | `user/services/auth.service.ts` |
| Frontend HTTP | `user/lib/axios.ts` (token + language interceptors, 401 handling) |
| Frontend state | `user/store/useAuth.ts` (Zustand: `fetchMe`, `logout`) |
| i18n | `user/locales/{vi,en}/auth.json` |

---

## 2. Business logic (backend)

`AuthService::login(username, password)`:

1. **Tìm user theo `username`** (exact match, case-sensitive tuỳ collation DB). Không có user → `throw \Exception('USER_NOT_FOUND')`.
2. **`Hash::check(password, user->password)`** sai → `throw \Exception('CREDENTIALS_INCORRECT')`.
3. **`!$user->is_active`** → `throw \Exception('USER_INACTIVE')`.
4. Thành công → `TokenService->generateToken($user, 'auth', ['user'])` → trả plainTextToken.

Controller trả `successResponse($token, 'LOGIN_SUCCESS')` → HTTP 200, body:
```json
{ "status":"SUCCESS", "message":"LOGIN_SUCCESS", "data":"13|<plainTextToken>" }
```

### ❗ Điểm quan trọng về xử lý lỗi (đã verify live)
`AuthService::login` **ném `\Exception` thuần**, KHÔNG phải `BusinessException`. Trong `bootstrap/app.php`, chuỗi `instanceof` chỉ bắt `ValidationException`, `AuthenticationException`, `AccessDeniedHttpException`, `NotFoundHttpException`, `BusinessException`, `HttpExceptionInterface`. `\Exception` thuần rơi vào nhánh cuối → **HTTP 500** với `message` = nội dung exception.

Kết quả thực tế (đã gọi live):
| Tình huống | Message | HTTP thực tế | HTTP đúng nên là |
|-----------|---------|--------------|------------------|
| Sai mật khẩu | `CREDENTIALS_INCORRECT` | **500** ❌ | 401 |
| User không tồn tại | `USER_NOT_FOUND` | **500** ❌ | 401 (và **không** tiết lộ user có tồn tại hay không) |
| User bị khoá | `USER_INACTIVE` | **500** ❌ | 403 |
| Thiếu field | `VALIDATION_ERROR` | 422 ✅ | 422 |
| Thành công | `LOGIN_SUCCESS` | 200 ✅ | 200 |

→ Xem [`bug-report/`](bug-report/) BUG-001 (500 thay vì 401/403) và BUG-002 (user enumeration).

---

## 3. Validation (LoginRequest)

```php
'username' => 'required|string',
'password' => 'required|string',
```
- Chỉ yêu cầu **required + string**. Không min/max length, không trim, không regex.
- `authorize()` trả `true` (không phân quyền tại request).
- Thiếu/không phải string → 422 `VALIDATION_ERROR` với `errors.{field}`.
- Hệ quả: username có khoảng trắng đầu/cuối **không bị trim** ở server → `" user001 "` là chuỗi khác `"user001"`.

---

## 4. Authentication / Token lifecycle (Sanctum)

- Token tạo bằng `createToken('auth', ['user'])` → **personal access token** của Sanctum, trả `plainTextToken` dạng `<id>|<hash>`.
- **Không có expiry ở tầng code** — phụ thuộc `config/sanctum.php` `expiration` (mặc định `null` = không hết hạn). → Token sống vĩnh viễn tới khi logout/xoá. (Open question: cấu hình expiration production?)
- Ability `['user']`; các route bảo vệ dùng `middleware(['auth:sanctum','abilities:user'])`.
- **Logout**: `AuthService::logout()` = `authUser()->currentAccessToken()->delete()` — xoá đúng token hiện tại (các thiết bị khác vẫn còn token của chúng → hỗ trợ multi-device).
- `me`: trả `MeResource(authUser())`.

### Frontend token handling (`lib/axios.ts`)
- Request interceptor gắn `Authorization: Bearer <auth_token>` + header `language` (đọc từ `language-storage`, default `vi`).
- Response interceptor: **401 → xoá `auth_token`** khỏi localStorage (không redirect vì login là modal).
- ⚠️ Vì auth-fail trả **500 chứ không phải 401**, interceptor này **không** dọn token trong tình huống sai credential — nhưng login chưa có token nên ít ảnh hưởng; đáng lưu ý cho token hết hạn.
- Token lưu ở **localStorage** (không phải httpOnly cookie) → XSS có thể đọc token (rủi ro cố hữu của token-in-localStorage → mục cải thiện).

---

## 5. Frontend UI/UX logic (`LoginModal.tsx`)

- Fields: `username` (text), `password` (password, có nút hiện/ẩn — `tabIndex={-1}`).
- **Client guard**: `handleSubmit` return sớm nếu `!username.trim() || !password`; nút submit `disabled` khi `loading || !username.trim() || !password`.
  - → **Không gọi API** khi username toàn khoảng trắng hoặc password rỗng.
  - → Password chỉ cần **có ký tự** (không kiểm tra khoảng trắng) để enable.
- `username.trim()` được gửi lên (đã trim ở client), nhưng password **không** trim.
- **Loading state**: hiện spinner + text `logging_in`, disable cả 2 input và nút.
- **Error**: hiển thị `err.response.data.message` (raw code từ API, VD `CREDENTIALS_INCORRECT`) — fallback `t('auth:login_failed')`. → ⚠️ Message lỗi hiển thị cho user là **mã kỹ thuật chưa dịch** (không i18n hoá) → mục cải thiện + bug UX.
- **Success**: lưu token vào `localStorage`, gọi `onSuccess()`, clear form, `onClose()`.
- Accessibility: `role="dialog"`, `aria-modal`, `aria-label`, label gắn `htmlFor`, nút có `aria-label`. Đóng bằng **Esc** và click overlay. Auto-focus username khi mở.
- Có link **Quên mật khẩu?** → `/forgot-password`; nút chuyển sang Đăng ký; **Social login** Google/Facebook (redirect OAuth).
- Body scroll bị khoá khi modal mở.

### i18n
`auth.json` (vi/en) có đủ label/nút/placeholder. **Thiếu bản dịch cho các mã lỗi server** (`CREDENTIALS_INCORRECT`, `USER_NOT_FOUND`, `USER_INACTIVE`, `Too Many Attempts.`) → user thấy mã tiếng Anh/kỹ thuật.

---

## 6. Security

| Khía cạnh | Hiện trạng |
|-----------|-----------|
| **Rate limit** | `throttle:5,1` = 5 req/phút/IP → chống brute-force cơ bản. Đã verify: request thứ 6 → **429 `Too Many Attempts.`** kèm `X-RateLimit-*`. ✅ (nhưng cùng chia sẻ với các luồng khác? Không — throttle riêng route login.) |
| **Password hashing** | `Hash::check` + cast `hashed` (bcrypt) ✅ |
| **SQL Injection** | Dùng Eloquent query builder (bound params) → an toàn về SQLi (sẽ verify bằng probe). |
| **CSRF** | API token-based (Bearer), stateless → CSRF không áp dụng cho login qua header token. |
| **CORS** | `Access-Control-Allow-Origin: *` (đã thấy ở header) → wildcard; token là Bearer nên rủi ro thấp nhưng vẫn là điểm nới lỏng. |
| **Security headers** | **Thiếu** `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` (đã thấy header response) → mục cải thiện. |
| **User enumeration** | Message phân biệt `USER_NOT_FOUND` vs `CREDENTIALS_INCORRECT` → lộ username tồn tại hay không → **BUG bảo mật**. |
| **Token storage** | localStorage (XSS-readable). |
| **HTTP status leak** | 500 cho lỗi nghiệp vụ → lộ rằng lỗi không được handle đúng + có thể log noise/false alert. |
| **MFA/2FA** | **Không có.** |
| **Remember me** | **Không có** ở cả UI lẫn API (token vốn không hết hạn nên "nhớ" mặc định). |
| **Account lockout** | **Không có** (chỉ rate-limit theo IP, không khoá theo tài khoản). |

---

## 7. Các business case KHÔNG tồn tại trong source (⇒ test là N/A hoặc negative)

Bảng `users` chỉ có: `name, username, email, is_active, password, timestamps` (+ cột thêm sau: referral, membership…). **Không có**:
- `email_verified_at` **được kiểm tra khi login** (login không kiểm tra verify email — chỉ register mới dùng OTP).
- `deleted_at` (User **không** dùng SoftDeletes) → "deleted user" = user bị xoá cứng ⇒ giống `USER_NOT_FOUND`.
- Cột `locked`, `failed_attempts`, `password_changed_at`.

→ Các case yêu cầu ("Deleted User", "Disabled User", "Locked User", "Email Not Verified", "Password Changed") sẽ được map:
- **Disabled/Inactive** ⇒ `is_active = false` ⇒ `USER_INACTIVE` (có logic).
- **Deleted** ⇒ hard delete ⇒ `USER_NOT_FOUND`.
- **Locked / Email-not-verified / Password-changed** ⇒ **không có logic** ⇒ ghi Open Question + đề xuất cải thiện.

---

## 8. Assumptions & Open Questions

1. **AS-1:** Username có **unique** (migration `username()->unique()`), email không unique.
2. **OQ-1:** Sanctum `expiration` production là gì? (code không set → token vĩnh viễn?) — rủi ro bảo mật nếu token bị lộ.
3. **OQ-2:** Có phân biệt hoa/thường username không? (tuỳ collation MySQL — mặc định `utf8mb4_*_ci` = **không** phân biệt → `USER001` login được) — verify bằng probe.
4. **OQ-3:** 500 cho auth-fail là cố ý hay bug? (Rất khả năng là bug do quên dùng `BusinessException`.)
5. **OQ-4:** Có kế hoạch MFA / remember-me / account lockout không?
6. **AS-2:** Social login (Google/Facebook) ngoài phạm vi test sâu nhưng nút hiển thị trên modal login → sẽ kiểm tra sự hiện diện & redirect khởi tạo.
7. **OQ-5:** Rate-limit theo IP dùng chung sau proxy/CDN? Nếu tất cả user ra cùng 1 IP (NAT) có thể chặn nhầm.
