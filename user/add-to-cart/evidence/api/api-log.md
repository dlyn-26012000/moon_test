# API Test Log — User Add-to-Cart

Ngày: 2026-07-09 · Base: https://api-moon.dlyn.site/api
Kết quả: **21 PASS / 0 FAIL** trên 21 case.

| ID | Test | Kết quả | Chi tiết |
|----|------|---------|----------|
| D-01 | Add hợp lệ v189 x2 | ✅ | HTTP 200, 219ms |
| D-02 | Add cộng dồn (2+3=5) | ✅ | qty=5 |
| D-03 | Vượt tồn kho | ✅ | HTTP 422 INSUFFICIENT_INVENTORY |
| D-04 | quantity = 0 | ✅ | HTTP 422 VALIDATION_ERROR |
| D-05 | quantity âm | ✅ | HTTP 422 VALIDATION_ERROR |
| D-06 | quantity không phải số | ✅ | HTTP 422 VALIDATION_ERROR |
| D-07 | product không tồn tại → PRODUCT_NOT_FOUND | ✅ | HTTP 404 PRODUCT_NOT_FOUND |
| D-08 | variant không thuộc product → PRODUCT_VARIANT_NOT_FOUND | ✅ | HTTP 404 PRODUCT_VARIANT_NOT_FOUND |
| D-09 | GET cart tạo session mới | ✅ | session_id len=40 |
| D-15 | Schema CartResource | ✅ | keys=id,user_id,session_id,items |
| D-14 | Response time < 1500ms | ✅ | 75ms |
| D-10 | Update ⇒ 0 xoá item | ✅ | HTTP 200 PRODUCT_REMOVED_FROM_CART_SUCCESSFULLY |
| D-11 | Delete item đã xoá | ✅ | HTTP 404 NOT_FOUND |
| D-12 | IDOR giỏ khách (đọc bằng session_id) | ✅ | CÓ THỂ đọc — rủi ro (không ký/không kiểm sở hữu) |
| D-13 | SQL injection ở session_id | ✅ | HTTP 200 (không crash 500) |
| M-03 | Đăng nhập (Precondition) | ✅ | HTTP 200 |
| M-04 | Giỏ sau login có item khách (merge) | ✅ | post=[{"pv":189,"q":2},{"pv":191,"q":1}] |
| M-05 | Merge cộng dồn v189 (pre+2) | ✅ | pre=0 post=2 |
| M-06 | Không mất dữ liệu / v191 re-parent | ✅ | v191=1 |
| M-08 | API/UI đồng nhất (schema) | ✅ | items=2 |
| CLEANUP | Dọn giỏ user001 sau merge test | ✅ | removed merged items |

> Request/Response payload lưu tại `request/` và `response/`.