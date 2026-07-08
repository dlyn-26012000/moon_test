# BUG-001 — Guest/User thấy mọi sản phẩm "Được yêu thích nhất" đã được tim sẵn

| | |
|---|---|
| **Severity** | 🟠 Medium |
| **Priority** | High (user-facing, gây hiểu nhầm) |
| **Module** | Home › MostLikedProductsSection · API `GET user/products/top-favorites` |
| **Loại** | Logic / UX bug |
| **Trạng thái** | ✅ Reproduced (API + UI) |
| **Test case** | BUG-C7 / TC-L02 |

## Mô tả
Ở section **"SẢN PHẨM ĐƯỢC YÊU THÍCH NHẤT"** (Most Liked) trên Home, **tất cả** sản phẩm hiển thị
với **trái tim đỏ (đã yêu thích)** — kể cả khi người dùng **chưa đăng nhập (guest)** hoặc chưa từng
thích sản phẩm đó.

Đối chiếu: cùng trang, section **"KHUYẾN MÃI SỐC"** (FlashSale) và **"Sản phẩm nổi bật"** (Featured)
hiển thị trái tim **rỗng/xám** đúng cho guest.

## Root Cause
`App\Http\Resources\Api\User\Product\FavoriteProductResource` (dòng 27):
```php
'is_favorited' => (bool) ($this->is_favorited ?? true),   // ⬅ default TRUE
```
`FavoriteProductService::topFavorites()` **không** gọi `attachFavoriteStatus()`, nên thuộc tính
`is_favorited` **không bao giờ được set** → toán tử `?? true` khiến giá trị mặc định luôn là `true`
cho **mọi** request (guest lẫn user).

So sánh: `ProductResource` xử lý đúng —
```php
'is_favorited' => $this->when($this->resource->getAttribute('is_favorited') !== null, fn () => (bool) $this->is_favorited),
```
(chỉ trả khi đã set) → đó là lý do FlashSale/Featured đúng.

## Steps to Reproduce
1. Mở trình duyệt ẩn danh (guest), truy cập `https://moon.dlyn.site/`.
2. Cuộn tới section "Sản phẩm được yêu thích nhất".
3. Quan sát icon trái tim trên mỗi card.

**API:**
```
curl -s -H 'accept: application/json' 'https://api-moon.dlyn.site/api/user/products/top-favorites?limit=8'
# → mỗi item: "is_favorited": true   (không gửi token)
```

## Expected
- Guest: `is_favorited=false` (hoặc bỏ field) → tim rỗng.
- User đã đăng nhập: `is_favorited` phản ánh đúng trạng thái thực của user đó.

## Actual
`is_favorited=true` cho tất cả sản phẩm, không phụ thuộc auth.

## Evidence
- `evidence/screenshots/BUG-C7-mostliked-guest.png` — 3 card đều tim đỏ (guest).
- `evidence/screenshots/F01-guest-home-viewport.png` — FlashSale cùng trang tim xám (đối chứng).
- `evidence/network/A04-topfav.json` — `is_favorited:true`, không token.

## Đề xuất fix
Đổi default thành `false`:
```php
'is_favorited' => (bool) ($this->is_favorited ?? false),
```
và/hoặc gọi `attachFavoriteStatus()` trong `topFavorites()` để set đúng trạng thái theo user khi có auth.

## Ảnh hưởng lan rộng
`FavoriteProductResource` còn dùng ở `FavoriteProductController::index` (`GET user/favorites`) —
ở đó item vốn là sản phẩm đã thích nên `true` "tình cờ đúng", nhưng logic vẫn sai về bản chất.
