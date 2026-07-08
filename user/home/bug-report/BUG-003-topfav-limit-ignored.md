# BUG-003 — `top-favorites` bỏ qua tham số `limit` (luôn dùng mặc định 10)

| | |
|---|---|
| **Severity** | 🟡 Low |
| **Priority** | Low |
| **Module** | API `GET user/products/top-favorites` · `FavoriteProductController` / `FavoriteProductService` |
| **Loại** | Logic bug (contract mismatch) |
| **Trạng thái** | ✅ Reproduced (API) |
| **Test case** | BUG-C1 / TC-V01 |

## Mô tả
Frontend Home gọi `user/products/top-favorites?limit=8`, nhưng backend **bỏ qua** query `limit`;
service luôn chạy với default `$limit = 10`.

## Root Cause
```php
// FavoriteProductController
public function topFavorites(): JsonResponse {
    $products = FavoriteProductService::getInstance()->topFavorites(); // ⬅ không truyền $limit
    ...
}
// FavoriteProductService
public function topFavorites(int $limit = 10): Collection { ... ->limit($limit)->get(); }
```
Controller không đọc `$request->query('limit')` và không truyền vào service.

## Steps to Reproduce
```
curl -s '.../user/products/top-favorites?limit=2'  # → trả 3 item (không bị cắt còn 2)
curl -s '.../user/products/top-favorites?limit=50' # → cũng 3 item
```
Hiện DB chỉ có **3 sản phẩm có favorites_count>0** nên cả `limit=2/8/50` đều trả **3** — chứng minh
`limit` không có tác dụng (nếu tôn trọng thì `limit=2` phải trả 2).

## Expected
`limit=8` → tối đa 8 item; `limit=2` → tối đa 2.

## Actual
`limit` bị bỏ qua; luôn tối đa 10 (mặc định service).

## Impact
- Hiện tại **không lộ ra ngoài** vì chỉ có 3 sản phẩm được thích.
- **Latent**: khi số sản phẩm được thích > 10, Home (muốn 8) sẽ nhận 10 → lệch layout grid (grid 4 cột thiết kế cho 8).

## Evidence
- `evidence/network/V01-limit2.json`, `V01-limit8.json`, `V01-limit50.json` — đều 3 item.

## Đề xuất fix
```php
// Controller
$limit = (int) $request->integer('limit', 10);
$limit = max(1, min($limit, 50)); // clamp
$products = FavoriteProductService::getInstance()->topFavorites($limit);
```
