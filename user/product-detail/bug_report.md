# Bug Report — Product Detail (User)

- **Module:** `user/product-detail`
- **Ngày kiểm thử:** 2026-07-08
- **Tester:** AI QA Automation (Playwright 1.61.1 / Chromium 149.0.7827.55)
- **Môi trường:** Production — https://moon.dlyn.site
- **API:** https://api-moon.dlyn.site/api
- **Script:** [script/product-detail.spec.js](script/product-detail.spec.js)

> Mỗi bug dưới đây đã được tái hiện tối thiểu 2 lần.

> **Cập nhật 2026-07-08 (sau khi deploy & test lại).** Repo `api` (Laravel) và `user` (Next.js), nhánh `develop`.
>
> | Bug | Trạng thái sau retest trên production |
> |-----|----------------------------------------|
> | BUG-001 | ✅ Fixed — verified 422 trên production |
> | BUG-002 | ✅ Fixed — verified 404 trên production |
> | BUG-003 | ✅ Fixed — đã sửa cả regression lockout, **verified trên production** (commit b192443) |
> | BUG-004 | ⚠️ **Chưa khắc phục được status** — trang not-found hiển thị đúng nhưng HTTP vẫn 200 do **giới hạn của Next.js 16.2.6** (xem Resolution) |
> | BUG-005 | ✅ Fixed — verified toast "Đang thêm 1 vào giỏ hàng..." trên production |
>
> - Backend test: `CartTest` 22 passed, `ForceJsonResponseTest` 2 passed.
> - Frontend test: `tsc` sạch, `vitest` 76 passed, `eslint` sạch.
> - Kiểm chứng production (curl): over-stock→422, product không tồn tại→404, không-Accept→401/422 JSON (RISK-01 fixed).

---

## BUG-001 — `POST /user/cart/add` trả HTTP 500 khi số lượng vượt tồn kho

| Trường | Giá trị |
|--------|---------|
| **ID** | BUG-001 |
| **Tiêu đề** | Thêm giỏ với số lượng lớn hơn tồn kho gây lỗi Server Error 500 thay vì 422 |
| **Module** | user/product-detail → Add to Cart (API) |
| **Severity** | High |
| **Priority** | High |
| **Trạng thái** | ✅ Fixed |

**Preconditions:** Sản phẩm variant `qui-eos-laborum-variant-tojq17` (id 100), variant 189 tồn kho = 85.

**Steps to Reproduce (API):**
```
POST https://api-moon.dlyn.site/api/user/cart/add
Headers: Content-Type: application/json, Accept: application/json
Body: {"product_id":100,"product_variant_id":189,"quantity":999999}
```
Hoặc chỉ cần `quantity: 86` (vượt tồn kho 85) cũng tái hiện.

**Actual Result:**
- HTTP **500 Internal Server Error**
- Body: `{"status":"ERROR","message":"INSUFFICIENT_INVENTORY","errors":null}`
- Tái hiện: run1 = 500, run2 = 500 (2/2).
- Đối chiếu: `quantity: 85` (= tồn kho) → HTTP 200; `quantity: 86` → HTTP 500.

**Expected Result:**
- Lỗi nghiệp vụ "hết/không đủ tồn kho" phải trả mã **422 Unprocessable Entity** (hoặc 409 Conflict), không phải 500.

**Evidence:**
- [evidence/api/cart-add-qty-huge-response.json](evidence/api/cart-add-qty-huge-response.json)

**API liên quan:** `POST /user/cart/add`

**Console Error:** Không (lỗi phía server).

**Nguyên nhân có thể:** Backend ném exception `INSUFFICIENT_INVENTORY` nhưng không map sang HTTP status phù hợp → framework trả 500 mặc định. Kiểm tra tồn kho được thực hiện sau khi vào luồng xử lý thay vì ở tầng validation.

**Đề xuất hướng xử lý:** Ném `HttpException` với status 422/409 cho lỗi tồn kho; thêm rule validate `quantity <= available_quantity` ở FormRequest. Trên UI, nút số lượng đã chặn vượt kho (`disabled` khi `quantity >= totalStock`) nên rủi ro từ UI thấp, nhưng API vẫn cần cứng cáp trước request thủ công.

**✅ Resolution:** `CartService::validateInventory()` giờ ném `UnprocessableEntityHttpException('INSUFFICIENT_INVENTORY')` → HTTP **422** thay vì `Exception` (500). Áp dụng cho cả `addToCart` và `updateQuantity`.
- File: `api/app/Services/Api/User/CartService.php`
- Test: `api/tests/Feature/Api/User/CartTest.php::test_add_fails_when_inventory_is_insufficient` (đã cập nhật assert 422 + message `INSUFFICIENT_INVENTORY`; test cũ trước đây assert 500).

---

## BUG-002 — `POST /user/cart/add` trả HTTP 500 + thông báo sai khi `product_id` không tồn tại

| Trường | Giá trị |
|--------|---------|
| **ID** | BUG-002 |
| **Tiêu đề** | Thêm giỏ với sản phẩm không tồn tại trả 500 và message "INSUFFICIENT_INVENTORY" gây hiểu lầm |
| **Module** | user/product-detail → Add to Cart (API) |
| **Severity** | Medium |
| **Priority** | Medium |
| **Trạng thái** | ✅ Fixed |

**Preconditions:** Không cần đăng nhập.

**Steps to Reproduce (API):**
```
POST https://api-moon.dlyn.site/api/user/cart/add
Headers: Content-Type: application/json, Accept: application/json
Body: {"product_id":99999999,"quantity":1}
```

**Actual Result:**
- HTTP **500 Internal Server Error**
- Body: `{"status":"ERROR","message":"INSUFFICIENT_INVENTORY","errors":null}`
- Tái hiện: run1 = 500, run2 = 500 (2/2).

**Expected Result:**
- HTTP **404 Not Found** với message rõ ràng kiểu `PRODUCT_NOT_FOUND`. Sản phẩm không tồn tại không phải lỗi "hết tồn kho".

**Evidence:**
- [evidence/api/cart-add-qty-huge-response.json](evidence/api/cart-add-qty-huge-response.json) (cùng thông điệp lỗi)

**API liên quan:** `POST /user/cart/add`

**Nguyên nhân có thể:** Luồng xử lý truy vấn tồn kho của một `product_id` không tồn tại → trả 0 → rơi vào nhánh `INSUFFICIENT_INVENTORY` và không được bọc status code. Thiếu kiểm tra tồn tại sản phẩm trước.

**Đề xuất hướng xử lý:** Validate `product_id` `exists:products,id` ở FormRequest và trả 404 khi không tìm thấy; tách message tồn kho khỏi message không tồn tại.

**✅ Resolution:** Thêm `CartService::assertProductExists()` chạy trước khi kiểm tra tồn kho: ném `NotFoundHttpException` (→ HTTP **404**) khi `product_id` không tồn tại, và khi `product_variant_id` không thuộc sản phẩm. Message tồn kho không còn bị dùng nhầm cho sản phẩm không tồn tại.
- File: `api/app/Services/Api/User/CartService.php`; FormRequest mới `api/app/Http/Requests/Api/User/Cart/AddToCartRequest.php` (validate `product_id`/`quantity`, dùng trong `CartController::add`).
- Test: `CartTest::test_add_returns_404_when_product_does_not_exist`, `::test_add_returns_404_when_variant_does_not_exist`.

---

## BUG-003 — Tổ hợp thuộc tính không tồn tại hiển thị "Hết hàng" gây hiểu lầm

| Trường | Giá trị |
|--------|---------|
| **ID** | BUG-003 |
| **Tiêu đề** | Chọn tổ hợp size×màu không có variant → UI báo "Hết hàng" thay vì "tổ hợp không khả dụng" |
| **Module** | user/product-detail → Variant Selector |
| **Severity** | Medium |
| **Priority** | Medium |
| **Trạng thái** | ✅ Fixed |

**Preconditions:** Sản phẩm có nhiều nhóm thuộc tính nhưng không đủ variant cho mọi tổ hợp. Ví dụ id 100: size {M, XS} × Color {White, Black, Yellow} = **6 tổ hợp** nhưng chỉ có **3 variant** (`M+White`, `XS+Black`, `XS+Yellow`). 3 tổ hợp còn lại (`M+Black`, `M+Yellow`, `XS+White`) không có variant.

**Steps to Reproduce (UI):**
1. Mở `/products/qui-eos-laborum-variant-tojq17`.
2. Chọn size = `M`, sau đó chọn Color = `Black` (hoặc `Yellow`).

**Actual Result:**
- `selectedVariant` trở thành `null` (không tìm được variant khớp) → `totalStock = 0`.
- UI hiển thị "Hết hàng", nút Thêm vào giỏ / Mua ngay bị disable, giá không cập nhật rõ ràng.
- Người dùng hiểu nhầm là "sản phẩm hết hàng" trong khi thực chất tổ hợp đó **không tồn tại**.

**Expected Result:**
- Hiển thị thông báo riêng: "Tổ hợp thuộc tính này không khả dụng" / vô hiệu hoá các giá trị không thể kết hợp (disable các option dẫn tới tổ hợp không có variant).

**Evidence:**
- [evidence/screenshot/guest-var-02-combo.png](evidence/screenshot/guest-var-02-combo.png)
- Xác minh dữ liệu variant: [evidence/api/detail-response.json](evidence/api/detail-response.json)

**Nguyên nhân có thể:** `ProductDetail.tsx` `handleAttributeClick` đặt `setSelectedVariant(matchingVariant || null)`; khi `null`, logic tồn kho quy về 0 và tái sử dụng nhãn "Hết hàng" thay vì trạng thái riêng "không khả dụng".

**Đề xuất hướng xử lý:** Phân biệt 2 trạng thái `out_of_stock` và `combination_unavailable`; hoặc disable trực quan các option không tạo thành variant hợp lệ (như Shopee/Tiki).

**✅ Resolution:** Đã làm cả hai:
1. Thêm trạng thái `combinationUnavailable` — hiển thị riêng "Tổ hợp thuộc tính này không khả dụng" thay vì "Hết hàng". Toast Add/Buy Now cũng dùng message này.
2. **Làm mờ (dim)** các option không khớp lựa chọn hiện tại; **auto-adjust** khi click.
- File: `user/components/product/ProductDetail.tsx`, `user/lib/product-display.ts`, locale key `combination_unavailable`.

**⚠️ Regression phát hiện khi retest & đã sửa:** Bản deploy đầu tiên **disable cứng** mọi option không khớp → với catalog thưa (sản phẩm id 100 chỉ có 3/6 tổ hợp: M+White, XS+Black, XS+Yellow), từ trạng thái mặc định M+White thì XS/Black/Yellow đều bị disable → **người dùng bị khóa cứng ở M+White, không đổi được** (nặng hơn bug gốc).
- **Cách sửa:** (a) chỉ hard-disable giá trị **không tồn tại trong bất kỳ variant nào** (`attributeValueExists`); (b) giá trị dead-end theo lựa chọn hiện tại chỉ **làm mờ nhưng vẫn click được**; (c) `handleAttributeClick` **auto-adjust** — khi tổ hợp mới không có variant, tự nhảy sang variant đầu tiên chứa giá trị vừa chọn (giống Shopee).
- **Verified trên PRODUCTION (commit b192443, Playwright):** từ M+White, **0 option bị hard-disable**; click "Black" → tự chuyển size sang XS (XS+Black), hiển thị tồn kho thật, không còn "Hết hàng". Ảnh: `evidence/screenshot/retest-prod-bug003.png`.
- Test: `user/__tests__/product-display.test.ts` (7 test: `isAttributeValueAvailable` + `attributeValueExists`, có test chống-lockout).

---

## BUG-004 — Slug sản phẩm không tồn tại trả HTTP 200 (soft 404)

| Trường | Giá trị |
|--------|---------|
| **ID** | BUG-004 |
| **Tiêu đề** | Trang chi tiết với slug sai trả HTTP 200 thay vì 404 (ảnh hưởng SEO) |
| **Module** | user/product-detail → Routing/SEO |
| **Severity** | Low |
| **Priority** | Low |
| **Trạng thái** | ⚠️ Partial — UI đúng, status vẫn 200 (giới hạn Next.js 16.2.6) |

**Steps to Reproduce:**
```
GET https://moon.dlyn.site/products/khong-ton-tai-xyz-999
```

**Actual Result:**
- Trang hiển thị giao diện "không tìm thấy" đúng, **nhưng HTTP status = 200**.
- Tái hiện: 2/2 lần đều 200.

**Expected Result:**
- HTTP **404 Not Found** để bot tìm kiếm không index trang rỗng (tránh soft-404).

**Evidence:**
- [evidence/screenshot/guest-nav-05-404.png](evidence/screenshot/guest-nav-05-404.png)
- API tương ứng trả đúng 404: `GET /user/products/{slug}/detail` → 404.

**Nguyên nhân có thể:** `app/products/[slug]/page.tsx` gọi `notFound()` khi `serverFetch` trả null, nhưng vì có `app/products/loading.tsx`, Next.js **stream** response — header 200 đã được flush trước khi `notFound()` chạy trong page component → status bị khoá ở 200 (soft 404). (Xác nhận: đường dẫn không khớp route bất kỳ như `/this-does-not-exist-zzz` trả 404 đúng; chỉ route `[slug]` bị 200.)

**Đề xuất hướng xử lý:** Gọi `notFound()` trong `generateMetadata` (chạy **trước** khi page stream) để status 404 được set kịp thời.

**⚠️ Resolution (một phần — chưa fix được status):** Đã thử nhiều cách và **kiểm chứng bằng local production build** (Next 16.2.6, API production):
1. `notFound()` trong page → vẫn 200.
2. `notFound()` trong `generateMetadata` (đã deploy) → vẫn 200.
3. Tách `loading.tsx` sang route group để bỏ Suspense boundary của route detail → vẫn 200.
4. Thêm `generateStaticParams` (ISR fallback mode) → vẫn 200.

Ở tất cả các cách, `not-found.tsx` **render đúng** (người dùng thấy trang 404 với "Không tìm thấy trang" / "Về trang chủ"), nhưng Next.js **16.2.6 trả HTTP 200** cho `notFound()` ở route động này — đây là **giới hạn/định-nghĩa của framework** (soft-404), không phải lỗi trong code sản phẩm.

**Kết luận & khuyến nghị:** Hạ mức bug này xuống *hạn chế đã biết về SEO*. Các cách (3)(4) đã được **revert** để giữ code sạch (không đổi cấu trúc/caching mà không có lợi ích); `notFound()` trong `generateMetadata` giữ lại (vô hại, đúng ý định, sẽ tự đúng nếu nâng cấp Next). Hướng khắc phục triệt để về sau: **nâng cấp Next.js** (theo dõi issue notFound-status), hoặc dùng **middleware** kiểm tra tồn tại sản phẩm để rewrite 404 (đánh đổi thêm 1 request/lần xem — cân nhắc vì bug chỉ Low).
- File liên quan: `user/app/products/[slug]/page.tsx` (giữ `notFound()` + JSON-LD).

---

## BUG-005 — Chuỗi dịch bị thiếu: toast/nút hiển thị key thô "adding" và "to_cart"

| Trường | Giá trị |
|--------|---------|
| **ID** | BUG-005 |
| **Tiêu đề** | Toast "Thêm vào giỏ" và trạng thái loading hiển thị key i18n thô thay vì text tiếng Việt |
| **Module** | user/product-detail → Add to Cart (UI/i18n) |
| **Severity** | Medium |
| **Priority** | Medium |
| **Trạng thái** | ✅ Fixed |

**Preconditions:** Bất kỳ sản phẩm còn hàng; ngôn ngữ vi hoặc en.

**Steps to Reproduce (UI):**
1. Mở `/products/qui-eos-laborum-variant-tojq17`.
2. Click "Thêm vào giỏ hàng".
3. Quan sát toast thông báo (và text trong nút khi đang tải).

**Actual Result:**
- Toast hiển thị nguyên văn: **`adding 1 to_cart...`**
- Nút khi loading hiển thị: **`adding...`**
- Tái hiện: nội dung cố định do thiếu key, tái hiện 100%.

**Expected Result:**
- Hiển thị tiếng Việt, ví dụ: "Đang thêm 1 vào giỏ hàng...".

**Evidence:**
- [evidence/screenshot/bug-adding-toast.png](evidence/screenshot/bug-adding-toast.png)

**Nguyên nhân có thể:** Trong `ProductDetail.tsx`, code dùng `t('adding') || 'Adding'` và `t('to_cart') || 'to cart'`. Hook `useTranslation` trả về **chính chuỗi path** khi không tìm thấy key (`return ... : path`) → `t('adding')` = `'adding'` (truthy) nên nhánh fallback `|| 'Adding'` không bao giờ chạy. Hai key `adding` và `to_cart` **không tồn tại** trong `locales/vi/common.json` lẫn `locales/en/common.json`.

**Đề xuất hướng xử lý:** Bổ sung key `adding`, `to_cart` vào cả 2 file locale; hoặc để `useTranslation` trả chuỗi rỗng/`null` khi thiếu key để fallback hoạt động đúng.

**✅ Resolution:** Bổ sung key `adding`/`to_cart` (và `combination_unavailable`) vào cả `locales/vi/common.json` và `locales/en/common.json`. Toast giờ hiển thị "Đang thêm {n} vào giỏ hàng...", nút loading hiển thị "Đang thêm...".
- File: `user/locales/vi/common.json`, `user/locales/en/common.json`.
- Ghi chú: giữ nguyên hành vi trả `path` của `useTranslation` để tránh regression ở các màn khác; chỉ bổ sung key (đủ để sửa triệt để bug này).

---

## Tổng hợp

| ID | Severity | Priority | Trạng thái | Tóm tắt |
|----|----------|----------|-----------|---------|
| BUG-001 | High | High | ✅ Fixed (verified prod) | cart/add 500 khi vượt tồn kho → 422 |
| BUG-002 | Medium | Medium | ✅ Fixed (verified prod) | cart/add 500 khi product không tồn tại → 404 |
| BUG-003 | Medium | Medium | ✅ Fixed (verified prod, b192443) | Tổ hợp variant không có → message riêng + auto-adjust, không lockout |
| BUG-004 | Low | Low | ⚠️ Partial | UI 404 đúng, HTTP status vẫn 200 (giới hạn Next.js 16.2.6) |
| BUG-005 | Medium | Medium | ✅ Fixed (verified prod) | Bổ sung key i18n adding/to_cart/combination_unavailable |

## Kiểm chứng sau deploy (2026-07-08)

**Production (curl) — PASS:**
```
POST /user/cart/add {quantity:86, variant:189}      → 422 INSUFFICIENT_INVENTORY   (BUG-001)
POST /user/cart/add {product_id:99999999}            → 404 NOT_FOUND                (BUG-002)
POST /user/favorites/toggle (no Accept, no token)    → 401 UNAUTHENTICATED (JSON)   (RISK-01)
POST /user/cart/add {quantity:0} (no Accept)         → 422 VALIDATION_ERROR (JSON)  (RISK-01)
```
**Production (Playwright) — PASS:**
- BUG-005: toast "Đang thêm 1 vào giỏ hàng..." (không lộ key).
- BUG-003 (sau khi deploy lockout fix b192443): 0 option bị hard-disable; click "Black" (dead-end của M) → tự nhảy XS+Black, hiển thị tồn kho thật → **không còn lockout**.

**BUG-004:** production vẫn trả **200** cho slug sai — đúng như kết luận (giới hạn Next.js 16.2.6, chưa khắc phục được ở tầng code).

**Test:** backend `CartTest` 22 passed + `ForceJsonResponseTest` 2 passed; frontend `vitest` 76 passed, `tsc`/`eslint` sạch.

**Trạng thái repo:** `api` và `user` đều đã commit & deploy (không còn thay đổi treo). BUG-003 lockout fix = commit `b192443`.
