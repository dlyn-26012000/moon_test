# Test Cases — Product Detail (User)

- **Module:** `user/product-detail`
- **URL mẫu (variant):** https://moon.dlyn.site/products/qui-eos-laborum-variant-tojq17
- **URL mẫu (không variant):** https://moon.dlyn.site/products/quo-asperiores-quaerat-m0ybqx
- **Tài khoản:** user001 / password
- **Script:** [script/product-detail.spec.js](script/product-detail.spec.js)

Ký hiệu nhóm: `G` = Guest, `A` = Authenticated, `API`, `UI`, `UX`, `RS` = Responsive, `SEO`, `PERF`, `BH` = Bug Hunting.

---

## 1. Guest — Hiển thị thông tin sản phẩm

| ID | Tên Test Case | Precondition | Steps | Expected Result |
|----|---------------|--------------|-------|-----------------|
| G-DSP-01 | Truy cập trực tiếp URL sản phẩm variant | Chưa đăng nhập | Mở `/products/qui-eos-laborum-variant-tojq17` | HTTP 200, trang render, `h1` = "qui eos laborum (Variant)" |
| G-DSP-02 | Hiển thị SKU | Đang ở trang detail | Quan sát khối thông tin | SKU hiển thị đúng SKU của variant đang chọn (`PROD-L6IMCNOK-3-10`) |
| G-DSP-03 | Hiển thị giá & giá khuyến mãi | Sản phẩm đang sale | Quan sát khối giá | Giá sale màu đỏ, giá gốc gạch ngang, badge `-%` đúng công thức, dòng "Bạn tiết kiệm" |
| G-DSP-04 | Hiển thị tồn kho | Đang ở trang detail | Quan sát dòng tồn kho | "Còn {n} sản phẩm" / "Chỉ còn {n}" / "Hết hàng" khớp API |
| G-DSP-05 | Hiển thị số lượng đã bán | Đang ở trang detail | Quan sát dòng "Đã bán" | Hiển thị đúng `sold_count` từ API |
| G-DSP-06 | Ảnh chính + thumbnail | Đang ở trang detail | Quan sát gallery | Ảnh chính load (naturalWidth > 0), thumbnail grid hiển thị |
| G-DSP-07 | Zoom / Fullscreen gallery | Đang ở trang detail | Click ảnh chính → mở fullscreen → nhấn Escape | Dialog fullscreen mở với ảnh contain, Escape đóng được |
| G-DSP-08 | Tab Mô tả / Thông số kỹ thuật | Đang ở trang detail | Click tab "Thông số kỹ thuật" rồi "Mô tả" | Nội dung đổi đúng; bảng specs có SKU + các nhóm thuộc tính |
| G-DSP-09 | Đánh giá — empty state | Sản phẩm chưa có review | Cuộn xuống mục "Đánh giá sản phẩm" | Hiển thị "Chưa có đánh giá nào cho sản phẩm này." — không vỡ layout |
| G-DSP-10 | Trust badges | Đang ở trang detail | Quan sát khối cam kết | 5 mục (giao hàng, đổi trả, chính hãng, thanh toán, hỗ trợ) hiển thị |
| G-DSP-11 | Breadcrumb | Đang ở trang detail | Tìm breadcrumb đầu trang | Breadcrumb Trang chủ › Danh mục › Tên SP (theo yêu cầu chung) |
| G-DSP-12 | Danh mục & thương hiệu | Đang ở trang detail | Tìm thông tin danh mục/thương hiệu | Hiển thị danh mục, thương hiệu của sản phẩm (theo yêu cầu chung) |
| G-DSP-13 | Sản phẩm không variant hiển thị đúng | Chưa đăng nhập | Mở `/products/quo-asperiores-quaerat-m0ybqx` | Không có nhóm thuộc tính, giá + kho hiển thị từ `product.stock` |
| G-DSP-14 | Badge giảm giá đúng công thức | Sản phẩm sale | So sánh badge với `(price - sale_price)/price` | % làm tròn đúng |

## 2. Guest — Điều hướng

| ID | Tên Test Case | Precondition | Steps | Expected Result |
|----|---------------|--------------|-------|-----------------|
| G-NAV-01 | Refresh trang | Đang ở trang detail | F5 / reload | Trang render lại đúng, không lỗi |
| G-NAV-02 | Browser Back | Vào detail từ Home | Nhấn Back | Quay về Home đúng |
| G-NAV-03 | Browser Forward | Sau G-NAV-02 | Nhấn Forward | Trở lại trang detail, nội dung nguyên vẹn |
| G-NAV-04 | Deep link bằng slug EN | Chưa đăng nhập | Mở `/products/{slug-en}` | Trang render được sản phẩm tương ứng (không 404) |
| G-NAV-05 | Slug không tồn tại | Chưa đăng nhập | Mở `/products/khong-ton-tai-xyz` | Trang 404/not-found thân thiện, không crash |
| G-NAV-06 | Related products điều hướng | Đang ở trang detail | Click 1 sản phẩm trong "Sản phẩm liên quan" | Chuyển sang đúng trang detail của sản phẩm đó |
| G-NAV-07 | Recently viewed | Đã xem ≥ 2 sản phẩm | Quan sát mục "Đã xem gần đây" | Hiển thị sản phẩm đã xem trước đó (không gồm SP hiện tại) |

## 3. Guest — Variant & Số lượng

| ID | Tên Test Case | Precondition | Steps | Expected Result |
|----|---------------|--------------|-------|-----------------|
| G-VAR-01 | Chọn thuộc tính đổi variant | SP variant | Click size/color khác | SKU, giá, tồn kho cập nhật theo variant khớp |
| G-VAR-02 | Tổ hợp thuộc tính không có variant | SP variant (6 tổ hợp / 3 variant) | Chọn tổ hợp không tồn tại | Có thông báo rõ ràng tổ hợp không khả dụng (không chỉ im lặng "Hết hàng") |
| G-VAR-03 | Tăng/giảm số lượng trong giới hạn | Còn hàng | Click +/− | Số lượng thay đổi trong [1..stock] |
| G-VAR-04 | Nút − disabled tại 1, + disabled tại max | Còn hàng | Đưa quantity về 1 / lên max | Nút tương ứng disabled, không giảm dưới 1 / vượt kho |

## 4. Guest — Hành động

| ID | Tên Test Case | Precondition | Steps | Expected Result |
|----|---------------|--------------|-------|-----------------|
| G-ACT-01 | Add to Cart (guest) | Chưa đăng nhập, còn hàng | Click "Thêm vào giỏ hàng" | Cho phép thêm (giỏ guest theo session), toast thành công, POST `/user/cart/add` 200, badge giỏ tăng |
| G-ACT-02 | Double click Add to Cart | Chưa đăng nhập | Click nhanh 2 lần | Debounce gộp thành 1 request với quantity cộng dồn (2), không gọi API 2 lần |
| G-ACT-03 | Wishlist (guest) | Chưa đăng nhập | Click nút tim | Mở Login Modal, không gọi API favorites |
| G-ACT-04 | Buy Now (guest) | Chưa đăng nhập, còn hàng | Click "Mua ngay" | Thêm vào giỏ + chuyển `/checkout`; hành vi guest tại checkout hợp lý (yêu cầu đăng nhập hoặc guest checkout) |

## 5. Authenticated User

| ID | Tên Test Case | Precondition | Steps | Expected Result |
|----|---------------|--------------|-------|-----------------|
| A-01 | Đăng nhập user001 | Modal login mở | Nhập user001/password, submit | Đăng nhập thành công, modal đóng, header đổi trạng thái |
| A-02 | Hiển thị lại toàn bộ thông tin sau đăng nhập | Đã đăng nhập | Mở lại trang detail | Toàn bộ khối hiển thị như guest, không lỗi |
| A-03 | Add to Cart đúng variant + số lượng | Đã đăng nhập | Chọn variant 2, quantity 3, click Add | POST `/user/cart/add` payload đúng `product_variant_id`, `quantity=3`, toast thành công |
| A-04 | Loading & disable khi đang thêm giỏ | Đã đăng nhập | Click Add, quan sát nút | Nút hiện spinner + disabled trong lúc gọi API |
| A-05 | Double click Add to Cart (auth) | Đã đăng nhập | Click nhanh 2 lần | Gộp 1 request, quantity cộng dồn |
| A-06 | Buy Now (auth) | Đã đăng nhập | Click "Mua ngay" | Thêm giỏ + điều hướng `/checkout` thành công |
| A-07 | Wishlist Add | Đã đăng nhập | Click tim | POST `/user/favorites/toggle` 200, tim chuyển đỏ (fill) |
| A-08 | Wishlist giữ trạng thái sau refresh | Sau A-07 | Reload trang | Tim vẫn đỏ (`is_favorited` từ API) |
| A-09 | Wishlist Remove | Sau A-08 | Click tim lần nữa | Toggle bỏ yêu thích, tim về trạng thái thường |
| A-10 | Wishlist đồng bộ UI | Đã yêu thích | Kiểm tra trang `/favorites` | Sản phẩm xuất hiện/biến mất tương ứng |
| A-11 | Tạo review từ trang detail | Đã đăng nhập | Tìm form/nút viết đánh giá | Theo requirement chung: có cách tạo review; ghi nhận nếu không có UI |
| A-12 | Giá theo đăng nhập / membership | Đã đăng nhập | So sánh giá guest vs auth | Giá nhất quán (hoặc đúng giá thành viên nếu hệ thống hỗ trợ) |

## 6. API

| ID | Tên Test Case | Steps | Expected Result |
|----|---------------|-------|-----------------|
| API-01 | GET `/user/products/{slug}/detail` | Gọi với slug hợp lệ, header `language: vi` | 200, schema đủ: id, sku, translations, price, stock/variants, images |
| API-02 | GET detail slug sai | Gọi với slug không tồn tại | 404, message chuẩn, không lộ stack trace |
| API-03 | GET `/user/products/{id}/reviews` + `/stats` | Gọi 2 endpoint | 200, cấu trúc data/meta + distribution |
| API-04 | POST `/user/cart/add` hợp lệ (guest session) | product_id + quantity=1 | 200/201, trả session_id |
| API-05 | POST `/user/cart/add` quantity không hợp lệ | quantity = 0, -1, 999999 | 422 validation, message rõ ràng |
| API-06 | POST `/user/cart/add` product không tồn tại | product_id = 999999 | 4xx, không 500 |
| API-07 | POST `/user/favorites/toggle` không token | Gọi không Authorization | 401 |
| API-08 | POST `/user/reviews` không token | Gọi không Authorization | 401 |
| API-09 | POST `/user/reviews` có token (chưa mua) | Token user001, product 100 | 4xx hợp lý (chưa mua không được review) hoặc 201 theo rule hệ thống |
| API-10 | Header `language` en/vi | GET detail 2 lần đổi header | Translation trả về khớp locale |
| API-11 | Response time | Đo GET detail | < 2000ms (quan sát), ghi nhận thực tế |
| API-12 | Đồng bộ UI–API | So sánh giá/kho/SKU UI với JSON | Khớp 100% |
| API-13 | GET detail variant thiếu Authorization vẫn xem được | Gọi không token | 200 (trang public) |

## 7. UI

| ID | Tên Test Case | Steps | Expected Result |
|----|---------------|-------|-----------------|
| UI-01 | Layout 2 cột desktop | Quan sát ≥1024px | Gallery trái, info phải, cân đối |
| UI-02 | Ảnh không vỡ | Kiểm tra tất cả `img` | naturalWidth > 0, có alt |
| UI-03 | Loading state khi mạng chậm | Chặn/delay API detail (client-side fetch) | Skeleton/text "Đang tải sản phẩm..." hiển thị |
| UI-04 | Không tràn ngang | Đo `scrollWidth` vs `clientWidth` | Không có horizontal scroll |
| UI-05 | Toast hiển thị | Add to cart | Toast xuất hiện, tự ẩn, nội dung đã dịch |
| UI-06 | Nút disabled đúng style | Quantity tại biên | Opacity giảm + cursor not-allowed |
| UI-07 | Tab active state | Click tab | Border + màu primary ở tab đang chọn |

## 8. UX

| ID | Tên Test Case | Steps | Expected Result |
|----|---------------|-------|-----------------|
| UX-01 | Keyboard navigation | Tab qua các control chính | Focus ring nhìn thấy được, thứ tự hợp lý |
| UX-02 | Gallery keyboard | Mở fullscreen, nhấn ←/→/Escape | Chuyển ảnh và đóng được bằng phím |
| UX-03 | aria-label cho nút icon | Kiểm tra nút tim, gallery, fullscreen | Có aria-label mô tả |
| UX-04 | Hành vi chọn variant rõ ràng | Chọn các tổ hợp | Trạng thái selected rõ, phản hồi tức thì |
| UX-05 | Thông báo lỗi rõ ràng | Thao tác gây lỗi (hết hàng...) | Message tiếng Việt dễ hiểu |

## 9. Responsive

| ID | Viewport | Expected Result |
|----|----------|-----------------|
| RS-01 | Desktop 1920×1080 | Layout 2 cột, không tràn |
| RS-02 | Desktop 1440×900 | Layout 2 cột, không tràn |
| RS-03 | Desktop 1366×768 | Layout 2 cột, không tràn |
| RS-04 | iPad Air 820×1180 | Layout hợp lý, không tràn ngang |
| RS-05 | iPhone 14 390×844 | Gallery stack trên info, nút đủ lớn (≥40px), không tràn |
| RS-06 | iPhone SE 375×667 | Không vỡ layout, không tràn ngang |
| RS-07 | Pixel 7 412×915 | Không vỡ layout |
| RS-08 | Galaxy S23 360×780 | Không vỡ layout |
| RS-09 | Mobile landscape 844×390 | Không vỡ layout, thao tác được |

## 10. SEO

| ID | Tên Test Case | Expected Result |
|----|---------------|-----------------|
| SEO-01 | `<title>` | Chứa tên sản phẩm |
| SEO-02 | meta description | Có, từ mô tả sản phẩm (~160 ký tự) |
| SEO-03 | canonical | Trỏ về đúng URL sản phẩm |
| SEO-04 | Open Graph + Twitter card | og:title/og:url/og:image, twitter:card đầy đủ |
| SEO-05 | SSR content | Tên + giá có trong HTML nguồn (không cần JS) |

## 11. Performance

| ID | Tên Test Case | Expected Result |
|----|---------------|-----------------|
| PERF-01 | Thời gian load trang | DOMContentLoaded < 3s, networkidle < 6s (tham chiếu) |
| PERF-02 | API gọi trùng lặp | Không endpoint nào bị gọi lặp không cần thiết trong 1 lần load |
| PERF-03 | Recently viewed gọi N API detail | Ghi nhận số lượng request phát sinh từ localStorage recently-viewed |

## 12. Bug Hunting (thăm dò)

| ID | Kịch bản | Mục đích |
|----|----------|----------|
| BH-01 | Toast/nút dùng key dịch thiếu (`adding`, `to_cart`) | Phát hiện chuỗi chưa dịch hiển thị cho người dùng |
| BH-02 | Chọn tổ hợp thuộc tính không có variant | Trạng thái "Hết hàng" gây hiểu lầm |
| BH-03 | Click +/− và Add to Cart cực nhanh nhiều lần | Race condition / cộng dồn sai |
| BH-04 | Mở 2 tab, thêm giỏ ở cả 2 | Đồng bộ giỏ giữa tab |
| BH-05 | Sale window (`sale_start_at`/`sale_end_at`) | Giá sale hiển thị ngoài thời gian sale |
| BH-06 | "Sản phẩm liên quan" có thật sự liên quan | Logic lấy 10 SP mới nhất thay vì cùng danh mục |
| BH-07 | Console error / pageerror toàn phiên | Lỗi JS ngầm |
| BH-08 | XSS cơ bản qua query string | Payload `?q=<script>` không thực thi |
| BH-09 | Ảnh review lightbox với URL hỏng | Xử lý ảnh lỗi |
| BH-10 | Slug EN trên site VI (`/products/{slug-en}`) | Trùng khớp ngôn ngữ/slug |
