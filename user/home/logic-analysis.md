# Home (User) — Logic Analysis

- **Ngày:** 2026-07-08 · **Màn hình:** Trang chủ User (`/`) · **Nguồn:** đọc trực tiếp source code.
- **UI:** `https://moon.dlyn.site/` · **API base:** `https://api-moon.dlyn.site/api/`
- **Frontend:** `user/app/page.tsx` (Server Component) + `user/components/home/*` (Client Components).
- **Backend:** `api/routes/user_api.php` → `App\Http\Controllers\Api\User\*` → `App\Services\Api\User\*`.

---

## 1. Kiến trúc & luồng dữ liệu

`HomePage` là **React Server Component** (App Router). Nó gọi song song **5 endpoint** qua
`serverFetch` (`Promise.all`) rồi truyền dữ liệu xuống 6 section (client components) làm
`initialProducts`/`initialBanners`. Mỗi section vẫn có **fallback fetch phía client** khi seed rỗng.

| # | Section | Endpoint SSR | Fallback client-fetch | Nguồn |
|---|---------|--------------|-----------------------|-------|
| 1 | `HeroSection` | `GET user/banners?includes=file` | `BannerService.getList` | Banner (type 1/2/3) |
| 2 | `FeatureSection` | — (tĩnh) | — | 4 icon USP, i18n |
| 3 | `FlashSaleSection` | `GET user/campaigns/active` **(ưu tiên)** hoặc `user/products?filters[is_sale]=1&per_page=4` | `ProductService.getList` | Campaign / sản phẩm sale |
| 4 | `MostLikedProductsSection` | `GET user/products/top-favorites?limit=8` | `FavoriteService.getTopFavorites(8)` | Sản phẩm nhiều favorite |
| 5 | `FeaturedProductsSection` | `GET user/products?filters[is_featured]=1&per_page=4` | `ProductService.getList` | Sản phẩm nổi bật |
| 6 | `MembershipBanner` | — (tĩnh) | — | CTA link hạng thành viên |

Bao quanh (layout `user/app/layout.tsx`): `Header` (search, category nav, cart, notification bell,
language switcher, auth dropdown/login-register modal, wishlist, wallet), `Footer`, `MobileBottomNav`,
`Toaster` (sonner). SEO metadata sinh từ `getSeoSettings()` (`user/seo-settings`).

### `serverFetch` (`user/lib/server-fetch.ts`)
- `fetch(API_URL + path, { headers:{language}, next:{ revalidate } })`.
- **`revalidate = 300`** → ISR cache 5 phút cho toàn bộ dữ liệu SSR của Home.
- **`language = 'vi'` cố định** ở SSR (không đọc cookie/locale người dùng) → lần render server luôn là `vi`; client mới đổi ngôn ngữ.
- Trả về **`json.data`** (envelope) hoặc **`null`** khi bất kỳ lỗi nào (network, `!res.ok`, JSON hỏng). ⇒ *Home không bao giờ ném lỗi cấp trang*: lỗi API → section rỗng/placeholder (graceful degradation).

---

## 2. Business logic backend

### 2.1 Banner — `BannerService::list`
```php
Banner::with($includes)->where('is_active', true)->orderBy('order','asc')->get();
```
- Chỉ banner `is_active = true`, sắp theo `order` tăng dần.
- `HeroSection` chia theo `banner.type`: **1 = main**, **2 = side-top**, **3 = side-bottom**.
- Mỗi banner render `<Link href={banner.link}>` bao ảnh `banner.file.url`.

### 2.2 Products — `ProductService::list` (dùng cho is_sale & is_featured)
- Base: `where('is_public', true)` + `withCount favorites` + review/sales aggregates.
- `->filters($filters)` + `->includes($includes)` (scope trên Model `Product`).
- **`ListRequest::formatFilters()` bỏ tiền tố `is_`**: `filters[is_sale]` → key `sale`; `filters[is_featured]` → `featured`. (Cần scope `filters` hiểu `sale`/`featured`.)
- `applyOrders` chỉ nhận whitelist: `id, created_at, sold_count, average_rating, reviews_count, favorites_count`; mặc định `id desc`. → chống SQL injection qua `orders[...]`.
- `is_pagination=false` (mặc định) → trả `Collection` (không phân trang). Home dùng `per_page=4`.
- `attachFavoriteStatus`: chỉ set `is_favorited` khi **có auth** (guest luôn `is_favorited` không có).

### 2.3 Top favorites — `FavoriteProductService::topFavorites`
```php
Product::where('is_public',true)->withCount('favoritedByUsers as favorites_count')
  ->having('favorites_count','>',0)->orderByDesc('favorites_count')->limit($limit)->get();
```
- **PUBLIC** (không auth).
- Chỉ sản phẩm có **≥ 1 favorite** (`having > 0`).
- ⚠️ **Controller gọi `topFavorites()` KHÔNG truyền tham số** ⇒ luôn dùng default **`$limit = 10`**, **bỏ qua `?limit=8`** từ Home. (Ứng viên bug — xem §6.)

### 2.4 Campaigns — `CampaignService::active`
```php
Campaign::active()->with(['bannerFile','products'=>fn($q)=>$q->where('is_public',true)...])
  ->orderBy('order')->get();
```
- Scope `active()` (cần kiểm tra: theo `is_active` + khoảng `starts_at`/`ends_at`).
- Chỉ nạp `products` `is_public = true`.
- `FlashSaleSection` **ưu tiên campaign đầu tiên** (`campaigns[0]`); nếu không có → dùng sản phẩm `is_sale`.
- Countdown: nếu có `campaign.ends_at` → đếm tới thời điểm đó; nếu không → **đếm tới nửa đêm** (`getSecondsUntilMidnight`).

---

## 3. Guest flow vs Logged-user flow

| Khía cạnh | Guest | Logged user |
|-----------|-------|-------------|
| Dữ liệu Home (5 endpoint) | **Giống hệt** — tất cả public, không cần token | Giống, cộng `is_favorited` được set trên product khi có auth (chỉ ảnh hưởng nút tim) |
| Header | Nút Đăng nhập / Đăng ký, ngôn ngữ | Avatar, dropdown (Profile, Orders, đổi mật khẩu, Logout), NotificationBell, Cart badge, Wishlist, Wallet |
| Cart | `useCart` store (local) | đồng bộ server |
| Favorite (nút tim ProductCard) | click → yêu cầu đăng nhập / toggle local | `POST user/favorites/toggle` (auth:sanctum) |

**Kết luận bảo mật:** Home không lộ dữ liệu riêng tư theo user; khác biệt guest/logged chỉ ở `is_favorited` và các widget Header. Không có IDOR ở tầng Home vì mọi endpoint đều public read-only.

---

## 4. Trạng thái UI (loading / empty / error)

| Section | Loading | Empty | Error |
|---------|---------|-------|-------|
| Hero | `Skeleton` pulse (3 ô) | `EmptyBanner` "—" / placeholder `side_top`/`side_bottom` | catch → `setBanners([])` = như empty |
| FlashSale | 4 `SkeletonProductCard` | text `no_flash_sale` | catch → `[]` = empty text |
| MostLiked | 8 `SkeletonProductCard` | **return null** (ẩn cả section) | `hasError` → **return null** |
| Featured | 4 `SkeletonProductCard` | **return null** (ẩn cả section) | catch → `[]` → null |

> Vì SSR đã seed dữ liệu, loading skeleton chủ yếu xuất hiện khi seed rỗng (fallback client-fetch). Nếu SSR trả null (API lỗi/timeout), section rơi vào empty/null.

---

## 5. Caching / Performance / Security

- **ISR 300s** cho mọi dữ liệu SSR (`serverFetch`). ⇒ dữ liệu Home có thể trễ tối đa 5 phút; bật/tắt banner, campaign không phản ánh tức thì. **Không phụ thuộc token** ⇒ cache dùng chung mọi khách (an toàn vì đều public).
- `Promise.all` 5 request song song → 1 chậm/timeout kéo TTFB (nhưng lỗi 1 endpoint không làm hỏng trang do `serverFetch` nuốt lỗi).
- Ảnh dùng `next/image` (`fill`, `priority` cho banner đầu) → cần `next.config` cho phép remote host.
- Security: endpoint read-only public; `orders`/`filters` whitelist ở service; XSS phụ thuộc React auto-escape (text) + validate `banner.link`/`file.url` (giá trị do CMS nhập).

---

## 6. Ứng viên BUG / Rủi ro (để Phase 5 xác minh)

1. **`top-favorites?limit=8` bị bỏ qua** — service luôn dùng default 10 (controller không truyền `$limit`). Home mong 8. → số card có thể là 10 thay vì 8. *(High-confidence, đọc từ code.)*
2. **`HeroSection` `<Link href={banner.link}>`** — nếu `banner.link` null/empty (CMS bỏ trống) có thể lỗi runtime / link rỗng.
3. **`ListRequest::formatFilters()` `trim($value)`** — nếu `filters[x]` là mảng (`filters[is_sale][]=1`) thì `trim(array)` ném TypeError → 500. Home gửi scalar nên bình thường; là edge case tấn công.
4. **SSR luôn `language=vi`** — user chọn `en` vẫn nhận HTML `vi` lần đầu → nhấp nháy/hydration i18n; SEO luôn `vi`.
5. **Campaign hết hạn nhưng scope vẫn active?** — nếu `ends_at` quá khứ, countdown về `00:00:00` nhưng vẫn hiển thị sản phẩm campaign. Cần kiểm scope `active()`.
6. **`revalidate=300`** — nội dung cũ tới 5 phút; rủi ro nghiệp vụ khi tắt sản phẩm/campaign gấp.
7. **Empty vs null section** — MostLiked & Featured **ẩn hoàn toàn** khi rỗng (không thông báo), có thể gây "trang trống" khó hiểu nếu DB thiếu dữ liệu.

---

## 7. Giả định (cần xác nhận khi test live)

- `api-moon.dlyn.site` = backend của `moon.dlyn.site` (theo suite login).
- Có sẵn ≥1 banner active mỗi type, ≥1 campaign active, sản phẩm `is_sale`/`is_featured`/có favorite để thấy UI đầy đủ; nếu không, nhiều section sẽ ẩn/empty (ghi vào "Chưa test").
- Tài khoản test đăng nhập: dùng `user001/password` như suite login (cần xác nhận còn hiệu lực).
- Scope `Product::filters()` map đúng `sale`/`featured` sang cột `is_sale`/`is_featured`.

## 8. Danh sách endpoint kiểm thử (Phase 3)

| Method | URL | Auth | Ghi chú |
|--------|-----|------|---------|
| GET | `user/banners?includes=file` | public | is_active, order asc |
| GET | `user/products?includes=...&filters[is_sale]=1&per_page=4` | public | is_public, filter sale |
| GET | `user/products?includes=...&filters[is_featured]=1&per_page=4` | public | filter featured |
| GET | `user/products/top-favorites?limit=8` | public | limit bị bỏ qua? |
| GET | `user/campaigns/active` | public | campaign + products public |
| GET | `user/seo-settings` | public | metadata layout |
| GET | `user/categories` | public | CategoryNav header |
