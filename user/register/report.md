# Báo cáo test E2E — Luồng đăng ký user (kèm xác thực email)

- **Ngày test:** 2026-07-08
- **Công cụ:** Playwright (Chromium headless)
- **Script:** [`register-flow.test.js`](register-flow.test.js) (trong cùng thư mục — hướng dẫn chạy ở đầu file)
- **Môi trường:** API `localhost:8000` (Laravel) + User app `localhost:3123` (Next.js 16 dev)
- **Phạm vi:** Trọn bộ suite chạy **2 lần bằng 2 ngôn ngữ** (desktop 1366×900, tiếng Việt và tiếng Anh) + nhóm mobile (390×844, touch, user-agent iPhone). Ảnh evidence riêng cho từng ngôn ngữ: `vi-*.png` (22 case), `en-*.png` (23 case), `mobile-*.png` (3 case) — tổng 54 ảnh.
- **Kết quả:** ✅ **48/48 case PASS**
- Dữ liệu hợp lệ dùng chung: name `Playwright Tester`, password `Secret123`; mỗi suite dùng user riêng (`pwtest_<ts>`, `pwtest_<ts>en`, `pwtest_<ts>m`). Test users tự dọn sạch sau khi chạy.

## Suite desktop — chạy giống hệt nhau cho tiếng Việt [VI] và tiếng Anh [EN]

Suite EN có thêm case **C0: chuyển ngôn ngữ qua LanguageSwitcher** (globe → English) trước khi chạy (`en-01`). Cột "Ảnh" ghi số thứ tự — tra ảnh theo `vi-<số>-*.png` / `en-<số + 1>-*.png` (suite EN lệch 1 vì có ảnh C0 đứng đầu).

### Nhóm 1 — Mở modal & hiển thị

| Case | Thao tác | Kỳ vọng | VI | EN | Ảnh (vi/en) |
|------|----------|---------|----|----|-------------|
| C1. Mở modal đăng ký | Trang chủ → account dropdown → nút Đăng ký/Register | Modal hiện | ✅ | ✅ | vi-01→03 / en-02→04 |
| C2. Label i18n | Đọc 5 label trong form | Đúng ngôn ngữ đang chọn | ✅ `Họ và tên / Tên đăng nhập / Email / Mật khẩu / Xác nhận mật khẩu` | ✅ `Full Name / Username / Email / Password / Confirm Password` | vi-03 / en-04 |

### Nhóm 2 — Bỏ trống trường

| Case | Dữ liệu nhập | Kỳ vọng | VI | EN | Ảnh (vi/en) |
|------|--------------|---------|----|----|-------------|
| C3. Form trống hoàn toàn | Cả 5 trường trống | Nút submit disabled | ✅ | ✅ | vi-04 / en-05 |
| C4. Bỏ trống từng trường | Lần lượt để trống 1 trường, 4 trường còn lại hợp lệ (5 lượt) | Submit disabled ở cả 5 lượt | ✅ 5/5 | ✅ 5/5 | vi-05 / en-06 |

### Nhóm 3 — Sai định dạng / không đạt rule (validate client, không gọi API)

| Case | Dữ liệu nhập (trường khác hợp lệ) | Thông báo VI | Thông báo EN | VI | EN | Ảnh (vi/en) |
|------|-----------------------------------|--------------|--------------|----|----|-------------|
| C5. Name quá ngắn | name = `A` (rule min 2) | "Họ và tên phải có ít nhất 2 ký tự." | "Full name must be at least 2 characters." | ✅ | ✅ | vi-06 / en-07 |
| C6. Username quá ngắn | username = `abc` (rule min 8) | "Tên đăng nhập phải có ít nhất 8 ký tự." | "Username must be at least 8 characters." | ✅ | ✅ | vi-07 / en-08 |
| C7. Email không có @ | email = `not-an-email` | "Email không hợp lệ." | "Invalid email address." | ✅ | ✅ | vi-08 / en-09 |
| C8. Email thiếu tên miền | email = `abc@xyz` | "Email không hợp lệ." | "Invalid email address." | ✅ | ✅ | vi-09 / en-10 |
| C9. Password quá ngắn | password = `abc123` (6 ký tự) | "Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số." | "Password must be at least 8 characters, with letters and numbers." | ✅ | ✅ | vi-10 / en-11 |
| C10. Password không có số | password = `abcdefgh` | (như C9) | (như C9) | ✅ | ✅ | vi-11 / en-12 |
| C11. Password không có chữ | password = `12345678` | (như C9) | (như C9) | ✅ | ✅ | vi-12 / en-13 |
| C12. Xác nhận không khớp | xác nhận = `Secret123x` | "Mật khẩu xác nhận không khớp." | "Confirm password does not match." | ✅ | ✅ | vi-13 / en-14 |
| C13. 4 trường sai cùng lúc | name `A`, username `abc`, email `sai`, password `weak` | 4 lỗi hiện đồng thời theo field | 4 lỗi hiện đồng thời | ✅ | ✅ | vi-14 / en-15 |

*Tất cả case C5–C13 đều xác nhận **0 API call** (chặn hoàn toàn phía client).*

### Nhóm 4 — Đăng ký thành công & xác thực email (OTP)

| Case | Thao tác / Dữ liệu | Kỳ vọng | VI | EN | Ảnh (vi/en) |
|------|--------------------|---------|----|----|-------------|
| C14. Đăng ký hợp lệ | 5 trường hợp lệ → submit | HTTP 200; token lưu localStorage (auto-login); modal chuyển sang bước "Xác thực email"/"Verify your email" | ✅ | ✅ | vi-15,16 / en-16,17 |
| C15. OTP trống / 3 số | Ô OTP trống rồi gõ `123` | Nút Xác nhận disabled cả 2 trạng thái | ✅ | ✅ | vi-17 / en-18 |
| C16. OTP chứa ký tự lạ | Gõ `12ab#$34` | Chỉ giữ lại số → `1234` | ✅ | ✅ | — |
| C17. OTP sai | Nhập `000000` | "Mã OTP không đúng hoặc đã hết hạn." / "OTP code is invalid or expired." | ✅ | ✅ | vi-18 / en-19 |
| C18. **OTP hết hạn sau 5 giây** | OTP được config hết hạn sau 5 giây (rút `expires_at` = now+5s), chờ 6 giây rồi nhập đúng mã đó | Bị từ chối với cùng thông báo hết hạn | ✅ (mã 283080 bị từ chối) | ✅ (mã 289072 bị từ chối) | vi-19 / en-20 |
| C19. Gửi lại OTP | Click "Gửi lại mã OTP"/"Resend OTP" | Sinh mã mới trong DB, mã cũ hết hiệu lực | ✅ 283080→825827 | ✅ 289072→753496 | vi-20 / en-21 |
| C20. OTP đúng | Nhập mã thật đọc từ bảng `otps` | Toast thành công; modal đóng; `email_verified_at` set trong DB; vẫn đăng nhập | ✅ | ✅ | vi-21,22 / en-22,23 |

*Ghi chú C18: không hạ `OTP_EXPIRE_MINUTES` của cả server vì sẽ làm case C20 (nhập OTP đúng) không kịp thao tác trong 5 giây; rút hạn của riêng OTP đó cho đi đúng đường code kiểm tra `expires_at > now()`.*

### Nhóm 5 — Trùng dữ liệu (validate phía server)

| Case | Dữ liệu nhập | Thông báo VI | Thông báo EN | VI | EN | Ảnh (vi/en) |
|------|--------------|--------------|--------------|----|----|-------------|
| C21. Username trùng | Đăng ký lại username của C14, email mới | "Tên đăng nhập đã được sử dụng." | "This username is already taken." | ✅ HTTP 422 | ✅ HTTP 422 | vi-23 / en-24 |
| C22. Email trùng | Username mới, email trùng C14 | "Email đã được sử dụng." | "This email is already registered." | ✅ HTTP 422, DB chỉ 1 tài khoản | ✅ HTTP 422, DB chỉ 1 tài khoản | vi-24 / en-25 |

## Suite mobile (390×844, touch, user-agent iPhone, tiếng Việt)

| Case | Thao tác / Dữ liệu | Kỳ vọng | Kết quả | Ảnh |
|------|--------------------|---------|---------|-----|
| M1. Mở modal trên mobile | Trang chủ mobile → account dropdown → "Đăng ký" | Modal mở, nằm gọn trong viewport, không tràn ngang | ✅ Modal 358px / viewport 390px | mobile-01, 02 |
| M2. Lỗi client-side trên mobile | 4 trường sai cùng lúc → submit | 4 lỗi hiện đúng theo field | ✅ | mobile-03 |
| M3. Trọn luồng đăng ký + OTP | Điền hợp lệ (user riêng) → submit → nhập OTP đúng từ DB | Bước verify hiện; verify xong modal đóng, DB set `email_verified_at` | ✅ | mobile-04, 05 |

## Chưa test

- Luồng social login (Google/Facebook — cần OAuth thật)
- Rate-limit 5 lần/phút của endpoint register (script đã chủ động nghỉ 20 giây giữa 2 suite để tránh chạm ngưỡng)
- Nút "Để sau" (bỏ qua xác thực) và xác thực lại ở phiên đăng nhập sau
