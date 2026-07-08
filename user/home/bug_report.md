# Bug Report — User Home

- **Module:** User › Home (`/`)
- **Ngày:** 2026-07-08 · **Tester:** AI QA Automation (Playwright 1.61.1 / Chromium)
- **Môi trường:** Production — UI `https://moon.dlyn.site/` · API `https://api-moon.dlyn.site/api/`
- **Tổng số Bug:** 4 (1 High · 3 Medium · — ) · **Potential Risks:** xem `risks.md`
- Tất cả bug đã được **tái hiện ≥ 2 lần** (UI live + API trực tiếp / đọc source).

| ID | Tiêu đề | Severity | Priority | Trạng thái |
|----|---------|----------|----------|------------|
| BUG-004 | Ô tìm kiếm trên Home không hoạt động (không có handler) | 🔴 High | High | 🟢 **FIXED** (đã sửa code + build clean) |
| BUG-001 | Guest thấy mọi sản phẩm "Yêu thích nhất" đã được tim sẵn | 🟠 Medium | High | 🟢 **FIXED** (đã sửa + regression test) |
| BUG-002 | Filter dạng mảng gây HTTP 500 + lộ lỗi nội bộ | 🟠 Medium | Medium | 🟢 **FIXED** (đã sửa + regression test) |
| BUG-003 | `top-favorites` bỏ qua tham số `limit` | 🟡 Low | Low | 🟢 **FIXED** (đã sửa + regression test) |

> **Cập nhật 2026-07-08:** Toàn bộ 4 bug đã được sửa. Backend: `php artisan test` 19/19 pass
> (gồm 5 regression test mới). Frontend: `tsc --noEmit` 0 lỗi, eslint sạch.
> Chi tiết fix xem mục "🟢 Fix đã áp dụng" trong mỗi bug bên dưới.
> ⚠️ Fix nằm ở source local — cần **deploy** để phản ánh trên `moon.dlyn.site`.

---

## BUG-004 — Ô tìm kiếm trên Home không hoạt động

| | |
|---|---|
| **Severity** | 🔴 High |
| **Priority** | High (chức năng cốt lõi, hiển thị nổi bật giữa Header) |
| **Module** | Home › Header search input |
| **Loại** | Functional bug (dead control) |
| **Trạng thái** | ✅ Reproduced (UI live + đọc source) |
| **Test case** | TC-F09 |

### Mô tả
Ô "Tìm kiếm" nằm giữa Header (hiển thị ở mọi trang, gồm Home) **không phản hồi** với bất kỳ thao
tác nào: gõ từ khoá rồi nhấn **Enter** không điều hướng, không gọi API, không hiện gợi ý. URL vẫn
giữ nguyên `https://moon.dlyn.site/`.

### Root Cause
`user/components/header/Header.tsx` (dòng 423–427):
```tsx
<input
  type="text"
  placeholder={t('search')}
  className="w-full h-11 ... outline-none ..."
/>
```
`<input>` **không có** `value`, `onChange`, `onKeyDown`, `onSubmit`, không nằm trong `<form>`, và
không có nút submit đi kèm. Đây là một control **thuần trang trí** — chưa được nối logic tìm kiếm.
(Trang `/products` có hỗ trợ query keyword, nhưng Header không bao giờ đẩy người dùng tới đó.)

### Steps to Reproduce
1. Mở `https://moon.dlyn.site/` (guest hoặc đã đăng nhập).
2. Click ô "Tìm kiếm" ở Header, gõ `ao`.
3. Nhấn **Enter**.

### Expected
Điều hướng tới trang kết quả, ví dụ `/products?keyword=ao` (hoặc mở gợi ý tìm kiếm).

### Actual
Không có gì xảy ra; URL vẫn là `/`. Người dùng không thể tìm kiếm từ Header.

### Evidence
- `evidence/ui_ux/screenshots/F09-search-result.png` — sau khi gõ + Enter, vẫn ở Home.
- Source: `user/components/header/Header.tsx:423-427` (input không có handler).
- `assets/test-data/run-results.json` → `TC-F09` (URL sau thao tác = `https://moon.dlyn.site/`).

### Đề xuất fix
Nối input vào state + điều hướng, ví dụ:
```tsx
const [kw, setKw] = useState('');
<form onSubmit={(e) => { e.preventDefault(); if (kw.trim()) router.push(`/products?keyword=${encodeURIComponent(kw.trim())}`); }}>
  <input value={kw} onChange={(e) => setKw(e.target.value)} ... />
</form>
```
Kèm nút submit/aria-label để hỗ trợ bàn phím & accessibility.

### 🟢 Fix đã áp dụng
`user/components/header/Header.tsx` — ô search nay là `<form role="search" onSubmit={handleSearch}>`
với state `searchKeyword`, `router.push('/products?keyword=...')`, `type="search"`, `aria-label`,
`enterKeyHint="search"`, và nút kính lúp là `type="submit"`. Đích `/products?keyword=` khớp với
`app/products/page.tsx` (đọc `keyword` → `filters[keyword]`). Verify: `tsc --noEmit` 0 lỗi.

---

## BUG-001 — Guest/User thấy mọi sản phẩm "Được yêu thích nhất" đã được tim sẵn

| | |
|---|---|
| **Severity** | 🟠 Medium |
| **Priority** | High (user-facing, gây hiểu nhầm trạng thái yêu thích) |
| **Module** | Home › MostLikedProductsSection · API `GET user/products/top-favorites` |
| **Loại** | Logic / UX bug |
| **Trạng thái** | ✅ Reproduced (API guest, không token) |
| **Test case** | TC-L02 / BUG-C7 |

### Mô tả
Section **"Sản phẩm được yêu thích nhất"** hiển thị **tất cả** card với trái tim đỏ (đã yêu thích),
kể cả khi **chưa đăng nhập**. Section FlashSale & Featured cùng trang hiển thị tim rỗng đúng cho guest.

### Root Cause
`App\Http\Resources\Api\User\Product\FavoriteProductResource`:
```php
'is_favorited' => (bool) ($this->is_favorited ?? true),   // ⬅ default TRUE
```
`FavoriteProductService::topFavorites()` không gọi `attachFavoriteStatus()`, nên `is_favorited`
không bao giờ được set → `?? true` khiến giá trị luôn là `true` cho mọi request (kể cả guest).
So sánh: `ProductResource` chỉ trả field khi đã set → FlashSale/Featured đúng.

### Steps to Reproduce (API, không gửi token)
```
curl -s 'https://api-moon.dlyn.site/api/user/products/top-favorites?limit=8'
# → mỗi item: "is_favorited": true
# đối chứng: user/products?filters[is_sale]=1 → is_favorited absent/null (đúng)
```
Xác minh live 2026-07-08: `top-favorites` trả `is_favorited=[true,true,true,true]` (guest);
`products?filters[is_sale]=1` trả `is_favorited=[,,,]` (đúng).

### Expected
Guest: `is_favorited=false` (hoặc bỏ field). User đăng nhập: phản ánh đúng trạng thái thực.

### Actual
`is_favorited=true` cho tất cả, không phụ thuộc auth.

### Evidence
- `evidence/api/response/top-favorites.json` (nếu chụp được) & log `curl` trong `report.md §5`.
- `evidence/bug/BUG-001-topfav-favorited/`.

### Đề xuất fix
`'is_favorited' => (bool) ($this->is_favorited ?? false)` và/hoặc gọi `attachFavoriteStatus()` trong `topFavorites()`.

### 🟢 Fix đã áp dụng
1. `FavoriteProductResource.php:27` — đổi `?? true` → `?? false`.
2. `FavoriteProductService.php` — thêm `attachFavoriteStatus()` (chỉ set khi có auth) và gọi trong cả
   `topFavorites()` lẫn `list()` → guest: tim rỗng; user đăng nhập: đúng trạng thái thực.
- **Regression test:** `test_top_favorites_is_favorited_false_for_guest`,
  `test_top_favorites_is_favorited_true_for_favoriter` (FavoriteProductTest) — pass.

---

## BUG-002 — Filter dạng mảng gây HTTP 500 + lộ thông báo lỗi nội bộ

| | |
|---|---|
| **Severity** | 🟠 Medium |
| **Priority** | Medium |
| **Module** | API `GET user/products` · `App\Http\Requests\ListRequest::formatFilters()` |
| **Loại** | Robustness / Information disclosure |
| **Trạng thái** | ✅ Reproduced (API) |
| **Test case** | TC-V04 |

### Mô tả
Gửi filter dạng mảng `filters[is_sale][]=1` khiến server trả **HTTP 500** và **lộ nguyên văn lỗi PHP**.

### Root Cause
```php
$data[trim($name)] = trim($value);   // trim() nổ TypeError khi $value là array
```

### Steps to Reproduce
```
curl -g -i 'https://api-moon.dlyn.site/api/user/products?filters[is_sale][]=1&per_page=4'
```

### Actual (live 2026-07-08)
```
HTTP/1.1 500
{"status":"ERROR","message":"trim(): Argument #1 ($string) must be of type string, array given","errors":null}
```
Hai vấn đề: (1) 500 do input người dùng kiểm soát; (2) **information disclosure** — message lỗi PHP nội bộ trả về client (dấu hiệu `APP_DEBUG` bật ở production).

### Expected
422 (validation) hoặc bỏ qua filter không hợp lệ; **không** lộ chi tiết lỗi.

### Evidence
- `evidence/network/V04-arrayfilter.json` (từ suite trước) + xác minh lại 2026-07-08.

### Đề xuất fix
1. `$value = is_array($value) ? reset($value) : $value; $data[trim($name)] = trim((string) $value);`
2. `APP_DEBUG=false` ở production; handler trả message generic.

### 🟢 Fix đã áp dụng
`ListRequest::formatFilters()` — nếu `$value` là mảng → `reset()`; nếu không phải scalar → bỏ qua;
cast `trim((string) $value)`. `formatIncludes()` cũng được gia cố cho input mảng. Endpoint nay trả
**200** thay vì 500, không lộ lỗi. (Khuyến nghị `APP_DEBUG=false` vẫn nên áp dụng ở tầng deploy —
xem `improvement.md`.)
- **Regression test:** `ProductTest::test_array_filter_does_not_cause_server_error` — pass.

---

## BUG-003 — `top-favorites` bỏ qua tham số `limit`

| | |
|---|---|
| **Severity** | 🟡 Low |
| **Priority** | Low |
| **Module** | API `GET user/products/top-favorites` · `FavoriteProductController` |
| **Loại** | Logic bug (contract mismatch) |
| **Trạng thái** | ✅ Reproduced (API) |
| **Test case** | TC-V01 |

### Mô tả
Home gọi `top-favorites?limit=8` nhưng backend bỏ qua `limit`; service luôn dùng default `$limit=10`.

### Root Cause
```php
$products = FavoriteProductService::getInstance()->topFavorites(); // không truyền $limit
```

### Steps to Reproduce (live 2026-07-08)
```
limit=2  → count=4
limit=8  → count=4
limit=50 → count=4
```
`limit=2` đáng lẽ trả 2 nhưng vẫn trả 4 (toàn bộ sản phẩm có favorite) → `limit` không có tác dụng.

### Impact
Hiện DB có 4 sản phẩm được thích (< 10) nên chưa lộ; **latent** — khi > 10 sản phẩm được thích, Home (muốn 8) sẽ nhận 10 → lệch grid.

### Đề xuất fix
```php
$limit = max(1, min((int) $request->integer('limit', 10), 50));
$products = FavoriteProductService::getInstance()->topFavorites($limit);
```

### 🟢 Fix đã áp dụng
`FavoriteProductController::topFavorites(Request $request)` — đọc `limit`, clamp `max(1, min(limit, 50))`,
truyền vào service. `limit=2` nay trả tối đa 2.
- **Regression test:** `FavoriteProductTest::test_top_favorites_respects_limit_param` — pass.

---

## Ghi chú Security (không phải bug — đối chứng đã pass)
- `orders[id]=;DROP TABLE` và `orders[password]=asc` → **HTTP 200**, được whitelist/sanitize, không SQLi.
- `per_page=0` và `per_page=abc` → **HTTP 422** (không crash).
- Header có `X-Content-Type-Options: nosniff`.
- Ngoại lệ duy nhất về security: **info-disclosure** trong BUG-002.
