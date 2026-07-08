# Potential Risks — User Home

Các rủi ro **chưa đủ bằng chứng để kết luận là Bug** (hoặc là quan sát cần theo dõi). Mỗi mục nêu lý do.

## RISK-01 — 404 tài nguyên xuất hiện gián đoạn
- **Quan sát:** trong lần chạy guest đầu tiên, console ghi **2 lỗi 404** ("Failed to load resource: 404").
  Lần probe lặp lại **không tái hiện** (0 lỗi 404 khi load sạch).
- **Lý do chưa kết luận bug:** không tái hiện ổn định; có thể là asset lazy-load, avatar/ảnh CMS thiếu,
  hoặc phát sinh từ thao tác search/đổi ngôn ngữ trong phiên đầu.
- **Bằng chứng:** `evidence/ui_ux/console.log`.
- **Đề xuất:** theo dõi network trong nhiều phiên; nếu tái hiện → nâng thành bug với URL cụ thể.

## RISK-02 — Gọi trùng `user/categories` (perf)
- **Quan sát:** endpoint `user/categories` được client gọi **2 lần** khi load Home.
- **Lý do:** chưa gây lỗi chức năng, chỉ lãng phí request → xếp risk perf.
- **Bằng chứng:** `assets/test-data/run-results.json` (TC-P01), `evidence/api/api-log.md`.

## RISK-03 — SSR luôn `language=vi`
- **Quan sát (source):** `serverFetch` cố định `language='vi'` ở SSR (không đọc cookie/locale).
- **Rủi ro:** user chọn `en` vẫn nhận HTML `vi` lần render đầu → nhấp nháy/hydration i18n; SEO metadata luôn `vi`.
- **Bằng chứng:** `logic-analysis.md §1`; live: language switch client hoạt động nhưng first-paint là vi.

## RISK-04 — ISR `revalidate=300` gây dữ liệu cũ
- **Quan sát (source):** toàn bộ dữ liệu SSR Home cache 5 phút.
- **Rủi ro nghiệp vụ:** bật/tắt banner, campaign, sản phẩm không phản ánh tức thì (trễ tới 5 phút).
- **Bằng chứng:** `logic-analysis.md §5`.

## RISK-05 — MostLiked/Featured ẩn hoàn toàn khi rỗng
- **Quan sát (source + UI):** khi không có dữ liệu, 2 section `return null` (biến mất, không thông báo).
- **Rủi ro UX:** nếu DB thiếu dữ liệu, Home trông trống trải, khó hiểu với người dùng/QA.
- **Bằng chứng:** `logic-analysis.md §4`.

## RISK-06 — Logout re-render timing
- **Quan sát:** thao tác Logout thực hiện được nhưng assertion "về guest" chỉ ⚠️ do CTA Login xuất hiện
  sau một nhịp re-render (selector chạy sớm). **Không phải lỗi chức năng logout.**
- **Đề xuất:** trong retest, chờ điều hướng `router.push('/')` hoàn tất trước khi assert.
- **Bằng chứng:** `evidence/ui_ux/screenshots/L05-after-logout.png`.
