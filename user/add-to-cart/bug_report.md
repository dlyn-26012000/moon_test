# Bug Report — User / Add to Cart

Module: `user/add-to-cart` · Ngày: 2026-07-09 · Tester: AI QA Automation

---

## BUG-001 — Guest bị chặn Add-to-Cart từ Product Card & Quick View nhưng lại được phép từ trang chi tiết

| Trường | Giá trị |
|--------|---------|
| **ID** | BUG-001 |
| **Tiêu đề** | Hành vi Add-to-Cart cho khách (guest) không nhất quán giữa các điểm gọi |
| **Module** | user/add-to-cart |
| **Severity** | Medium |
| **Priority** | Medium |
| **Trạng thái** | ✅ Fixed (2026-07-09) |

**Fix đã áp dụng:** Bỏ guard `if (!user) openLoginModal()` ở `ProductCard.tsx` và `QuickViewModal.tsx`, dùng chung `useCart().addToCart` như trang chi tiết (backend đã hỗ trợ giỏ khách). Đồng thời thay `toast.error(t('added_to_cart_error'))` bằng `t(getCartErrorKey(err))` để hiển thị thông báo cụ thể (vd. hết/thiếu tồn kho). Đã dọn import không dùng (`useAuth`, `useUIStore`) — tsc + eslint sạch.

**Preconditions**

- Chưa đăng nhập (guest).
- Backend cho phép giỏ hàng khách (route `POST /user/cart/add` không yêu cầu auth — đã xác minh: guest add trả 200).

**Steps to Reproduce**

1. Mở `https://moon.dlyn.site/products` khi chưa đăng nhập.
2. Bấm nút giỏ hàng trên một **product card** (hoặc mở **Quick View** rồi bấm "Thêm vào giỏ hàng").
3. Quan sát: hệ thống **mở modal đăng nhập / điều hướng** thay vì thêm vào giỏ.
4. Mở trang **chi tiết** cùng sản phẩm đó (`/products/{slug}`), chọn biến thể, bấm "Thêm vào giỏ hàng".
5. Quan sát: guest **thêm được** vào giỏ bình thường (item lưu server theo `session_id`).

**Actual Result**

- Từ **card**/**Quick View**: bị chặn bằng `openLoginModal()` — `ProductCard.tsx:75`, `QuickViewModal.tsx:34` có `if (!user) { openLoginModal(); return; }`.
- Từ **trang chi tiết**: `ProductDetail.tsx:150` **không** có guard `!user` ⇒ guest thêm được.

**Expected Result**

- Hành vi add-to-cart cho guest phải **nhất quán** ở mọi điểm gọi. Vì backend đã hỗ trợ giỏ khách đầy đủ và trang chi tiết đã cho phép, guest nên thêm được từ card/Quick View luôn (hoặc ngược lại, nếu chính sách là bắt buộc login thì trang chi tiết cũng phải chặn).

**Evidence**

- `evidence/bug/BUG-001/guest-card-add-gated.png`
- `evidence/ui_ux/screenshots/guest-03b-after-add.png` (guest thêm được từ trang chi tiết)
- API log: `evidence/api/api-log.md` (D-01 guest add = 200)

**API liên quan**

- `POST /api/user/cart/add` — không middleware auth (`routes/user_api.php:127-133`).

**Console Error**: Không có (console log sạch — `evidence/ui_ux/console.log`).

**Nguyên nhân có thể**

- Thiếu đồng bộ business rule giữa 3 component. Card & Quick View giả định "phải login mới mua được", còn trang chi tiết + backend thiết kế theo mô hình guest-cart.

**Đề xuất hướng xử lý**

- Chốt chính sách: **cho phép guest cart** (khuyến nghị, vì backend đã hỗ trợ). Bỏ guard `!user` ở `ProductCard.tsx` và `QuickViewModal.tsx`, dùng chung `useCart().addToCart` như trang chi tiết.
- Hoặc nếu bắt buộc login: thêm guard ở `ProductDetail.tsx` cho đồng nhất và **tắt** guest cart ở backend.

**Đã tái hiện**: 2/2 lần (script `run.js` case G-12, và probe API D-01).

---

### Re-test sau khi deploy fix (2026-07-09)

- API suite: **21/21 PASS** trên bản deploy (`evidence/api/api-log.md`).
- UI suite: **27/27 PASS**; đặc biệt **E-04 badge=3** (trước fix = 2) xác nhận badge nay đếm theo **tổng số lượng** (improvement #2).
- Guest mở QuickView → không còn xuất hiện modal đăng nhập (`evidence/bug/BUG-001/fixed-01-quickview-open.png`, `fixed-02-after-guest-add.png`).

> **Ghi chú trung thực về phạm vi kiểm chứng:** Thay đổi của BUG-001 (bỏ guard `!user`) chỉ **thay đổi hành vi quan sát được đối với sản phẩm KHÔNG có biến thể** — vì với sản phẩm có biến thể, ProductCard luôn điều hướng sang trang chi tiết *trước* guard, còn QuickView chỉ hiển thị nút Add-to-Cart khi `!has_variants` (QuickViewModal.tsx:93). Môi trường test hiện **chỉ có sản phẩm có biến thể**, nên không thể diễn lại đầy đủ luồng guest-add-từ-card/QuickView bằng dữ liệu thật. Fix đã được xác minh ở mức mã nguồn (bỏ guard, dùng chung `addToCart`) + `tsc`/`eslint` sạch + toàn bộ 48 case tự động PASS trên bản deploy (không hồi quy). Khi catalog có sản phẩm không biến thể, luồng này sẽ hoạt động cho guest.

---

> Không phát hiện bug chặn (blocker) nào khác trong phạm vi Add-to-Cart. Các quan sát chưa đủ mức "bug" được ghi ở `risks.md`; đề xuất cải tiến ở `improvement.md`.
