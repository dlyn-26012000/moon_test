# Improvement Suggestions — User / Order

> **Legend:** ✅ implemented in this pass · ⬜ recommended (not yet done).

## API / correctness
1. ✅ **Typed business errors → correct HTTP status** (fixes BUG-001). Mapped
   `INSUFFICIENT_WALLET_BALANCE`, `WALLET_REQUIRES_AUTH`, `CART_ITEMS_EMPTY`,
   `INSUFFICIENT_INVENTORY`, `PRICE_NOT_FOUND_FOR_PRODUCT` → 422; the `*_NOT_FOUND`
   cases → 404. Messages stay UPPER_SNAKE machine-readable codes.
2. ✅ **Money precision** (fixes BUG-002/RISK-06). Added `MoneyHelper::round`
   (whole units) at discount allocation and when persisting `order.total`,
   `payment.amount`, `discount_amount`, wallet payable and bank-transfer amount.
3. ⬜ **Idempotency** (RISK-01). Accept `Idempotency-Key` on `POST /user/orders`
   and unique-constrain it; return the original order on replay. *(Needs a
   migration + design — left as a follow-up; see risks.md RISK-01.)*
4. ✅ **Fix product-list `stock`** — now sums `available_quantity` (the real
   column) so grids/lists show availability and "out of stock".
5. ✅ **Return `session_id` from cart mutation endpoints** (RISK-04) — `add`
   (and update) now echo the guest `session_id` (added `CartItem::cart()`,
   `CartItemResource.session_id`, service loads the relation) so a first `add`
   can never orphan the cart.

## Security
6. ⬜ Business errors return internal enum strings (`WALLET_REQUIRES_AUTH`) as
   codes — now with correct 4xx status (#1). Still recommended: map each code to
   a localized user-facing message on the client.
7. ⬜ Add rate-limiting to `POST /user/orders` and `/cart/add`. *(Deliberately
   deferred: the shared cache in the test env makes throttle-in-tests flaky —
   apply with a dedicated limiter + test isolation.)*

## UX
8. ✅ **iPhone SE overflow** (BUG-003) — off-canvas cart drawer clipped with
   `overflow-hidden`; no horizontal scroll at 375 px.
9. ✅ **Consistent currency formatting** (BUG-004) — single `formatMoney()` +
   `calcSavings` aligned to the backend's comma grouping.
10. ⬜ **Checkout empty state** — deep-linking `/checkout` with an empty selection
    shows only "cart_empty"; add a clear CTA back to the cart and disable the
    place-order affordance explicitly.
11. ⬜ **Order-success clarity** — after placing, the user lands on order detail
    with a "Thanh toán ngay" button; for bank transfer, surface the QR + amount
    inline immediately rather than one click deeper.
12. ⬜ **Wallet method affordance** — when balance is insufficient, disable the
    wallet option with an inline "số dư không đủ" hint instead of only blocking at
    submit (the UI already guards submit; move it earlier).

## Performance / observability
13. ✅ Fixing BUG-001 removes a class of false 500s from APM dashboards.
14. ⬜ Product images and site logo render as placeholders on staging (seed data);
    ensure real assets + `alt` text before production for LCP and accessibility.

## Accessibility
15. ⬜ Add `alt` text to product images and the logo; ensure payment-method radios
    are reachable and labelled for screen readers.

---

## Not implemented in this pass (why)

Items #3, #6, #7, #10–#12, #14, #15 are left as recommendations: #3 and #7 need a
migration / dedicated rate-limiter plus test-isolation work (risk of destabilising
the suite); #10–#12, #14, #15 are UX/asset/a11y polish that couldn't be exercised
end-to-end locally (the staging API blocks the localhost origin via CORS, so
browser-driven verification of the checkout submit path isn't possible off the
deployed site). They are scoped and ready for a follow-up branch.
