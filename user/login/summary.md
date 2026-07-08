# User Login — QA Summary

Kiểm thử E2E chức năng **User Login** (phân tích source → API → UI/UX → bug hunting → automation → báo cáo).

- **Ngày:** 2026-07-08 · **Môi trường:** UI `https://moon.dlyn.site` · API `https://api-moon.dlyn.site/api/` · Tài khoản `user001 / password`
- **Kết quả tự động sau vá & re-test (live):** API **15/15** PASS · UI **29/29** PASS · security probe xác nhận hết enumeration + có security headers.
- **Test cases:** **70** (62 pass · 0 fail · 2 blocked · 2 not-run · 4 N/A) — sau khi vá.
- **Bug:** phát hiện **6** (High 2, Medium 2, Low 2) → **đã sửa & verify 6/6 ✅**.

## Bug (đã sửa toàn bộ)
1. **BUG-001 (High) ✅:** auth-fail trả 500 → nay **401/403** (`HttpException`).
2. **BUG-002 (High) ✅:** enumeration → gộp cùng **`INVALID_CREDENTIALS`**.
3. **BUG-003 (Medium) ✅:** UI hiện mã thô → **map câu dịch** (VI/EN).
4. **BUG-005 (Medium) ✅:** thêm **security headers** + siết CORS về `*.dlyn.site`.
5. **BUG-004 (Low) ✅:** thêm `role="alert"`/`aria-live` cho hộp lỗi.
6. **BUG-006 (Low) ✅:** chuẩn hoá username (trim + LOWER) tường minh, đồng bộ register.

> Chi tiết fix + bằng chứng re-test: [`report.md`](report.md). Source đã sửa: `api/app/Services/Api/User/AuthService.php`, `api/app/Http/Middleware/SecurityHeaders.php`, `api/config/cors.php`, `api/bootstrap/app.php`, `user/components/header/LoginModal.tsx`, `user/locales/{vi,en}/auth.json`.

## Cấu trúc thư mục
```
login/
├── logic-analysis.md        # Phase 1 — phân tích source & logic
├── summary.md               # (file này)
├── testcase/                # Phase 2 — login-testcases.md + .xlsx (+ build_xlsx.py)
├── api/                     # Phase 3 — Postman, Bruno, cURL, Playwright API test, security probes
├── playwright/              # Phase 7 — POM + fixtures + helpers + config + runner (chạy độc lập)
├── evidence/                # Phase 4 — screenshots / videos / traces / network / logs / gifs
├── bug-report/              # Phase 5 — bug-report.md
└── report.md                # Phase 8 — báo cáo cuối (format giống register/report.md)
```

## Cách chạy lại
```bash
# API (spaced để tránh throttle 5/phút)
cd api && node login.api.spec.js          # cần playwright
bash security-probes.sh                    # probe bảo mật (chạy nền ~3.5 phút)
bash curl-examples.sh                       # ví dụ cURL

# UI/UX (vi + en + mobile), tự thu evidence
cd ../playwright && PW=../../../../node_modules/playwright node run.js

# Test cases xlsx
cd ../testcase && python3 build_xlsx.py
```

👉 Chi tiết đầy đủ: [`report.md`](report.md)

## Giới hạn môi trường (đã ghi nhận, không chặn phần còn lại)
- **GIF:** không tạo được — thiếu ffmpeg/imagemagick hệ thống (ffmpeg bundled của Playwright chỉ hỗ trợ webm). Dùng **video** thay thế.
- **User inactive / privilege / stress:** blocked do không seed được user inactive, không có token ability khác, và rate-limit 5/phút chặn stress trên 1 IP.
