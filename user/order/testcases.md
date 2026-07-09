# Test Cases — User / Order

Environment: Staging — FE `https://moon.dlyn.site`, API `https://api-moon.dlyn.site/api`.
Account: `user001` / `password`. Tester: AI QA Automation (Playwright + Node).
Legend: ✅ Pass · ❌ Fail · ⚠️ Limited/Blocked (see note).

Executable evidence: `evidence/api/results.json`, `evidence/ui_ux/results.json`,
screenshots in `evidence/ui_ux/screenshots/`, videos in `evidence/ui_ux/videos/`,
network in `evidence/network/`.

## A. Guest order flow (API + UI)

| ID | Title | Type | Steps → Expected | Result |
|----|-------|------|------------------|--------|
| API-G01 | Guest cart returns session | Functional | GET /user/cart → `session_id` returned | ✅ |
| API-G02 | Guest add-to-cart persists | Functional | POST /cart/add then GET cart → item, qty=2 | ✅ |
| API-G03 | Guest COD order + subtotal | Functional | POST /orders (COD) → 200, subtotal = sale×qty | ✅ |
| API-G04 | New order pending | Functional | order.status = `pending` | ✅ |
| API-G05 | Guest reads own order | Functional | GET detail?session_id → 200 | ✅ |
| API-G06 | Detail needs session | Security | GET detail w/o session → 404 | ✅ |
| API-G07 | IDOR foreign session | Security | GET detail w/ other session → 404 | ✅ |
| API-G08 | Cart cleared post-order | Functional | ordered item gone from cart | ✅ |
| UI-01 | Home loads | UI | GET / → renders | ✅ |
| UI-02 | Product detail + add btn | UI | /products/{slug} shows "Thêm vào giỏ hàng" | ✅ |
| UI-03 | Add-to-cart click | Functional | click → no crash | ✅ |
| UI-04 | Guest reaches checkout | Functional | /checkout renders shipping form | ✅ |
| UI-05 | Guest COD via UI | Functional | fill form → Đặt hàng → /orders/{id} + toast | ✅ |

## B. Validation & negative (API)

| ID | Title | Type | Expected | Result |
|----|-------|------|----------|--------|
| API-V01 | Missing fields | Validation | 422 | ✅ |
| API-V02 | Invalid payment method | Validation | 422 | ✅ |
| API-V03 | Non-existent coupon | Validation | 422 | ✅ |
| API-V04 | Empty cart_item_ids | Validation | 422 | ✅ |
| API-V05 | Foreign cart_item_id (IDOR) | Security | order rejected (not 200) | ✅ |
| API-V06 | Foreign item not deleted | Security | victim item still present | ✅ |

## C. Coupon

| ID | Title | Expected | Result |
|----|-------|----------|--------|
| API-C01 | SALE10 10% on 200k | discount 20 000 | ✅ |
| API-C02 | SAVE20 below min | rejected (`COUPON_MIN_ORDER_NOT_MET`) | ✅ |
| API-C03 | SAVE20 cap | capped at 50 000 | ✅ |
| API-C04 | Private VIP30 as guest | rejected (`COUPON_LOGIN_REQUIRED`) | ✅ |
| API-C05 | COMING15 apply | applied (see RISK-02: start-date) | ⚠️ |
| API-C06 | Order with SALE10 | total = subtotal − 10% (fractional VND → BUG-002) | ✅ |

## D. Logged-in payments

| ID | Title | Expected | Result |
|----|-------|----------|--------|
| API-D01 | Wallet w/ 0 balance | rejected `INSUFFICIENT_WALLET_BALANCE` | ✅ |
| API-D02 | Rejected wallet HTTP code | should be 4xx | ❌ **BUG-001** (returns 500) |
| API-D03 | MOON wallet insufficient | rejected | ✅ |
| API-D04 | Guest wallet | rejected `WALLET_REQUIRES_AUTH` | ✅ |
| API-D05 | Bank-transfer info | QR + `Moon ORD…` content | ✅ |
| — | Wallet successful debit | balance decremented | ⚠️ Blocked — staging wallet = 0, cannot fund |
| UI-10..14 | Logged-in checkout, order detail, history | render + place COD | ✅ |

## E. Order history / detail / cancel

| ID | Title | Expected | Result |
|----|-------|----------|--------|
| API-E01 | Order history | user's orders listed | ✅ |
| API-E02 | Cancel pending | 200 | ✅ |
| API-E03 | Status → cancelled | detail shows cancelled | ✅ |
| API-E04 | Re-cancel | rejected (422) | ✅ |
| API-E05 | Cancel non-owned/999999 | rejected (404) | ✅ |

## F. Auth / authorization

| ID | Title | Expected | Result |
|----|-------|----------|--------|
| API-F01 | /auth/me no token | 401 | ✅ |
| API-F02 | /wallets no token | 401 | ✅ |
| API-F03 | /auth/me bad token | 401 | ✅ |

## G. SePay webhook

| ID | Title | Expected | Result |
|----|-------|----------|--------|
| API-W01 | Wrong Apikey | 401 | ✅ |
| API-W02 | No Authorization | 401 | ✅ |
| API-W03 | Missing fields | 401/422 | ✅ |
| API-W04 | Happy-path settle | (staging secret unknown → 401) | ⚠️ Blocked |
| — | Duplicate webhook idempotency | no double-credit | ⚠️ Blocked (needs secret) |
| — | Amount mismatch / wrong content | rejected | ⚠️ Blocked (needs secret) |

## H. Responsive (UI, Playwright viewports)

| ID | Viewport | Expected | Result |
|----|----------|----------|--------|
| UI-R-desktop_1920 | 1920×1080 | no h-scroll | ✅ |
| UI-R-desktop_1366 | 1366×768 | no h-scroll | ✅ |
| UI-R-ipad | 820×1180 | no h-scroll | ✅ |
| UI-R-iphone14 | 390×844 | no h-scroll | ✅ |
| UI-R-iphoneSE | 375×667 | no h-scroll | ❌ **BUG-003** (12px overflow on product + checkout) |

## Edge cases exercised additionally

- Double checkout of the same `cart_item_ids` → 2nd fails `CART_ITEMS_EMPTY`
  (items deleted by 1st) — see RISK-01 for the concurrency caveat.
- Refresh mid-checkout: cart persists via `session_id`/token (guest cart
  survives reload).
- Sale price vs list price applied correctly (product 50: −68%, save 161 951).
