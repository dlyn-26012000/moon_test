# BUG-002 — Filter dạng mảng gây HTTP 500 + lộ thông báo lỗi nội bộ

| | |
|---|---|
| **Severity** | 🟠 Medium |
| **Priority** | Medium |
| **Module** | API `GET user/products` · `App\Http\Requests\ListRequest` |
| **Loại** | Robustness / Information disclosure |
| **Trạng thái** | ✅ Reproduced (API) |
| **Test case** | BUG-C2 / TC-V04 |

## Mô tả
Gửi filter dưới dạng **mảng** (`filters[is_sale][]=1`) tới endpoint sản phẩm khiến server trả
**HTTP 500** và **lộ nguyên văn thông báo lỗi PHP** trong response.

## Root Cause
`ListRequest::formatFilters()`:
```php
foreach ($filters as $key => $value) {
    ...
    $data[trim($name)] = trim($value);   // ⬅ trim() nổ khi $value là array
}
```
`trim()` chỉ nhận string; khi `$value` là mảng → `TypeError`. Không có try/catch → 500.

## Steps to Reproduce
```
curl -i -s -H 'accept: application/json' \
  'https://api-moon.dlyn.site/api/user/products?filters[is_sale][]=1&per_page=4'
```

## Expected
- 422 Validation error, hoặc bỏ qua filter không hợp lệ (400/200 an toàn).
- **Không** lộ chi tiết lỗi nội bộ.

## Actual
```
HTTP/1.1 500
{"status":"ERROR","message":"trim(): Argument #1 ($string) must be of type string, array given","errors":null}
```
→ hai vấn đề: (1) 500 do input người dùng kiểm soát; (2) **information disclosure** — thông điệp lỗi
PHP nội bộ bị trả ra client (gợi ý stack/khung code cho kẻ tấn công; có thể `APP_DEBUG` bật ở môi trường này).

## Evidence
- `evidence/network/V04-arrayfilter.json` — body chứa message `trim(): ...`.

## Đề xuất fix
1. Chuẩn hoá giá trị an toàn trong `formatFilters()`:
   ```php
   $value = is_array($value) ? reset($value) : $value;
   $data[trim($name)] = trim((string) $value);
   ```
   hoặc validate `filters.*` phải là scalar và trả 422.
2. Tắt lộ message lỗi nội bộ ở production (`APP_DEBUG=false`, handler trả message generic).
