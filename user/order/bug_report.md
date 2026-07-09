# Bug Report — User / Order

Each bug was reproduced at least twice. Evidence paths are relative to this
directory.

---

## BUG-001 — Business/domain errors return HTTP 500 instead of 4xx

- **Module:** user/order (API)
- **Severity:** Medium
- **Priority:** High
- **Status:** ✅ Fixed (verified by tests)

> **Resolution:** `OrderService` now throws typed HTTP exceptions instead of
> plain `\Exception`: `CART_ITEMS_EMPTY`, `WALLET_REQUIRES_AUTH`,
> `INSUFFICIENT_WALLET_BALANCE`, `INSUFFICIENT_INVENTORY`,
> `PRICE_NOT_FOUND_FOR_PRODUCT` → `UnprocessableEntityHttpException` (422);
> `BANK_TRANSFER_PAYMENT_NOT_FOUND`, `PAYMENT_NOT_FOUND`, `ADDRESS_NOT_FOUND` →
> `NotFoundHttpException` (404). `DEFAULT_TOKEN_NOT_CONFIGURED` stays 500 (genuine
> server misconfig). Tests updated: `OrderTest::test_create_fails_when_wallet_balance_insufficient`
> (500→422), `test_bank_transfer_returns_404_when_no_bank_transfer_payment` (500→404).

**Preconditions:** any client calling `POST /user/orders`.

**Steps to reproduce:**
1. Log in as `user001` (wallet VND balance = 0).
2. Add a VND product to cart.
3. `POST /user/orders` with `payment_methods:[{token_id:1, method:"wallet"}]`.

**Actual result:** `HTTP 500` with body `{"message":"INSUFFICIENT_WALLET_BALANCE"}`.
Same 500 for `WALLET_REQUIRES_AUTH` (guest wallet, API-D04) and
`CART_ITEMS_EMPTY` (API-V05).

**Expected result:** a client/business error should be `422` (or `409`), not
`500`. `500` denotes a server fault.

**Evidence:** `evidence/api/results.json` (API-D01/D02/D03/D04, API-V05),
`evidence/api/api-log.json`.

**Probable cause:** `OrderService::create()` throws plain `\Exception(...)` for
these domain conditions; the global handler maps uncaught `Exception` to 500.
Coupon errors, by contrast, use `BusinessException` and correctly return 400.

**Suggested fix:** throw a typed exception (e.g. `BusinessException` /
`UnprocessableEntityHttpException`) for `INSUFFICIENT_WALLET_BALANCE`,
`WALLET_REQUIRES_AUTH`, `CART_ITEMS_EMPTY`, `INSUFFICIENT_INVENTORY`,
`PRICE_NOT_FOUND_FOR_PRODUCT`, so the API returns 4xx and the UI can show a
specific, recoverable message. Also removes false 500s from monitoring.

---

## BUG-002 — Fractional VND amounts in discount / total

- **Module:** user/order (pricing)
- **Severity:** Low–Medium
- **Priority:** Medium
- **Status:** ✅ Fixed (verified by tests)

> **Resolution:** added `App\Helpers\MoneyHelper::round()` (whole-unit settlement)
> and applied it in `OrderService::create()` (subtotal, total, per-payment amount
> & discount, wallet payable, bank-transfer amount) and `CouponService`
> (`apply()` + `allocatePaymentDiscounts()`). Order money is now integer VND.
> Regression test added: `OrderServiceTest::test_create_rounds_fractional_coupon_discount_to_whole_units`
> (268 512 × 10% → discount 26 851, total 241 661). Note: per-payment rounding of a
> capped percentage discount may drift ≤1 unit/payment vs the exact cap — an
> acceptable trade for never emitting a fractional VND.

**Steps to reproduce:**
1. Add product priced 134 256 VND ×2 (subtotal 268 512).
2. Apply coupon `SALE10` (10%).

**Actual result:** `discount_amount = 26851.2`, `total = 241660.8`. The order is
persisted and displayed with a fractional VND value.

**Expected result:** VND is a zero-decimal currency; amounts should be integers
(e.g. round to `26 851` / `241 661`). A customer cannot bank-transfer `0.8` VND,
so a `bank_transfer` payment of a fractional total can never be matched exactly
by the SePay amount check (`expectedAmount != transferAmount`).

**Evidence:** `evidence/api/results.json` (API-C06).

**Suggested fix:** round monetary results to the token's precision (0 dp for VND)
at discount allocation and when writing `order.total` / `payment.amount`.

---

## BUG-003 — Horizontal overflow (12 px) on iPhone SE (375 px)

- **Module:** user/order (responsive UI)
- **Severity:** Low
- **Priority:** Medium
- **Status:** ✅ Fixed (verified on local build @ 375px)

> **Resolution:** the off-canvas cart drawer (`CartSidebar`, panel uses
> `translate-x-full` when closed) was not clipped by its `fixed inset-0` wrapper,
> so it added phantom horizontal scroll. Added `overflow-hidden` to that wrapper.
> Verified: `scrollWidth == innerWidth (375)` on product + checkout, no h-scroll.

**Preconditions:** viewport width 375 px (iPhone SE / older Androids).

**Steps to reproduce:** open `/products/{slug}` or `/checkout` at 375×667.

**Actual result:** `document.scrollWidth = 387 > innerWidth 375` → page scrolls
horizontally 12 px. Offending node: a `div.flex.items-center.gap-2` (width 184 px)
whose right edge reaches 387 px. Larger viewports (390 px iPhone 14, iPad,
desktop) are clean.

**Expected result:** no horizontal scroll at 375 px.

**Evidence:** `evidence/ui_ux/results.json` (UI-R-iphoneSE),
`evidence/ui_ux/responsive/iphoneSE-product.png`,
`evidence/ui_ux/responsive/iphoneSE-checkout.png`.

**Suggested fix:** constrain the offending row with `min-w-0` / `flex-wrap` /
`max-w-full`, or reduce fixed paddings at the `sm` breakpoint.

---

## BUG-004 — Inconsistent thousand separators in price display

- **Module:** user/order (product detail UI)
- **Severity:** Low (cosmetic)
- **Priority:** Low
- **Status:** ✅ Fixed (verified on local build)

> **Resolution:** root cause was backend `NumberHelper::format` (comma) vs
> frontend `calcSavings` (`Intl 'vi-VN'`, dot) on the same screen. Aligned the
> frontend to the backend's comma grouping: new shared `formatMoney()` in
> `lib/utils.ts` (en-US) routes `formatCurrency` + checkout totals, and
> `calcSavings` switched to en-US. Verified: `74,474` / `236,425` / `161,951` all
> comma-grouped. (Backend `NumberHelper` left untouched — it is comma-committed
> across CMS/wallet and its own tests.)

**Steps to reproduce:** open a product on sale (e.g. `qui-saepe-debitis-ypiod8`).

**Actual result:** the same screen mixes separators: sale price `74,474 VND`
and original `236,425 VND` use a comma, while the savings line reads
`Bạn tiết kiệm 161.951 VND` with a dot.

**Expected result:** one consistent locale-correct separator across the page
(Vietnamese convention is `161.951` / `74.474`).

**Evidence:** `evidence/ui_ux/screenshots/02-product-detail.png`.

**Suggested fix:** route every money render through one `formatCurrency()` helper
bound to the active locale instead of mixing `toLocaleString`/manual formatting.

---

## Minor observation — ✅ Fixed

- **Product LIST `stock` was always 0.** `ProductResource` computed
  `inventories->sum('stock')`, but the `inventories` table has no `stock` column
  (only `available_quantity` / `reserved_quantity`), so every product in list/grid
  reported `stock: 0`. **Fixed:** now sums `available_quantity`, so listings show
  real availability / out-of-stock state.

---

## Fixes summary

| ID | Status | Where |
|----|--------|-------|
| BUG-001 | ✅ Fixed | `OrderService` (typed 422/404 exceptions) |
| BUG-002 | ✅ Fixed | `MoneyHelper` + `OrderService` + `CouponService` (whole-unit money) |
| BUG-003 | ✅ Fixed | `components/header/CartSidebar.tsx` (`overflow-hidden`) |
| BUG-004 | ✅ Fixed | `lib/utils.ts` `formatMoney` + `lib/product-display.ts` `calcSavings` (comma) |
| stock=0 | ✅ Fixed | `ProductResource` (`available_quantity`) |
| Improvement #5 | ✅ Done | cart mutations return `session_id` (`CartItemResource` + `CartService` + `CartItem::cart()`) |

Backend verified: all order/cart/coupon/product suites green — `160 passed`
(`OrderServiceTest`, `CouponServiceTest`, `CartServiceTest`, `OrderTest`,
`CartTest`, `CouponTest`, `ProductTest`). Frontend verified on a local build
against the staging API: no h-scroll @375px, consistent comma money grouping.
