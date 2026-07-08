# GIFs — không tạo được trong môi trường này

Yêu cầu chuyển video lỗi → GIF cần **ffmpeg** hoặc **ImageMagick** đầy đủ.

- Máy chạy test **không có** `ffmpeg`/`convert`/`magick` hệ thống.
- ffmpeg **bundled theo Playwright** (`~/.cache/ms-playwright/ffmpeg-1011`) là bản build rút gọn **chỉ hỗ trợ muxer webm** cho việc quay video — không xuất được GIF (`Error initializing the muxer ... Invalid argument`).

➡️ **Bằng chứng chuyển động dùng video thay thế:** xem [`../videos/`](../videos/)
(`login-vi.webm` — đăng nhập thành công, `login-en.webm` — lỗi sai mật khẩu, `login-mobile.webm`).

Để sinh GIF khi có ffmpeg đầy đủ:
```bash
ffmpeg -i ../videos/login-en.webm -vf "fps=6,scale=640:-1:flags=lanczos" login-en-error.gif
```
