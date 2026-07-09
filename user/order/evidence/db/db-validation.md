# Database Validation Evidence — User / Order

## ⚠️ Important environment note

The MySQL database reachable from this workstation (`moon` on `127.0.0.1`, from
`api/.env`) is a **separate instance** from the database used by the staging API
(`https://api-moon.dlyn.site`). Both were populated by the same seeder, but the
random SKUs differ, proving they are different data stores:

| Product id | Local `moon` DB (SKU) | Staging API (SKU) |
|-----------:|-----------------------|-------------------|
| 100        | `PROD-VQSHKWF3`       | `PROD-L6IMCNOK`   |
| 49         | `PROD-UXZHY4NR`       | (different slug)  |

**Consequence:** direct SQL validation of orders created on staging is not
possible from here. Per QA best practice, the staging **API is used as the
system-of-record proxy** — every order is validated by reading it back through
`GET /user/orders/{id}/detail` and `GET /user/orders` and comparing against the
values submitted and the values rendered in the UI. Direct-SQL data-prep/cleanup
(allowed by the brief) is therefore also not applicable to the staging target.

## Data-consistency checks performed (UI ↔ API ↔ persisted order)

| Check | Method | Result |
|-------|--------|--------|
| Order subtotal = Σ(sale_price × qty) | API create → detail | ✅ 74 474 × 2 = 148 948 (API-G03) |
| Order total = subtotal − coupon discount | API create with SALE10 | ✅ 268 512 − 26 851.2 = 241 660.8 (API-C06) |
| Cart item removed after checkout | API cart GET after order | ✅ (API-G08) |
| Order status persisted = `pending` | API detail | ✅ (API-G04) |
| Cancel persists `cancelled` status | API cancel → detail | ✅ (API-E03) |
| UI order-detail total = API total | UI screenshot `13-order-detail.png` vs API | ✅ 134 256 VND both |
| Wallet balance (staging user001) | API `/user/wallets` | VND = 0, MOON = 0 (see limitations) |

## Local schema reference (for structure only)

Order-flow tables confirmed present in the schema: `orders`, `order_items`,
`order_payments`, `order_status_histories`, `order_payment_images`, `carts`,
`cart_items`, `coupons`, `coupon_usages`, `inventories`, `wallets`,
`bank_transactions`, `tokens`, `prices`.
