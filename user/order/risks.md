# Potential Risks — User / Order

Items with insufficient evidence to file as confirmed bugs, or that could not be
fully exercised on the staging target.

## RISK-01 — Order creation has no idempotency key (double-submit / retry)

`POST /user/orders` carries no idempotency token. Double-submit is *mostly*
prevented because the first request deletes the selected `cart_items` inside its
transaction, so a later request finds them gone (`CART_ITEMS_EMPTY`) — verified
sequentially. **However**, two requests fired near-simultaneously (fast double
click, client retry on a slow network, "Đặt hàng" pressed twice before the first
response) can both read the cart items *before* the first transaction commits,
and both reserve inventory / create an order. The UI disables the button while
`isSubmitting`, which mitigates but does not eliminate the race (network retry
bypasses the button state). **Recommendation:** accept a client-supplied
`Idempotency-Key` and unique-constrain it, or add a short dedupe window per
(user/session, cart signature). Load-test with concurrent identical submits.

## RISK-02 — Not-started coupon may be applyable

On the local seed, `COMING15` has `starts_at = 2026-07-12` (future) yet it is
returned by `/user/coupons/available` **and** `apply` succeeded on staging
(API-C05) at `order_total = 200000`. This is either (a) staging seeded the coupon
with a past start date, or (b) the not-started guard is bypassed. Could not be
distinguished without staging DB access. **Recommendation:** confirm
`CouponService::available()` and `apply()` both reject `starts_at > now` /
`ends_at < now`, and add a regression test with a fixed future start date.

## RISK-03 — Coverage gaps blocked by staging environment

Not exercisable against staging (documented, not defects):
- **Wallet successful debit + balance decrement** — staging `user001` wallet is
  0 in both VND and MOON, and the deposit path needs the SePay webhook secret
  (environment-specific, not exposed). Only the *insufficient-balance* guard was
  verified.
- **Webhook happy path, idempotency (duplicate `sepay_id`), amount mismatch,
  wrong content, deposit-before-order ordering** — all require the staging
  `SEPAY_WEBHOOK_API_KEY`. Only auth rejection (401) and payload validation were
  verified. The *code* implements idempotency (`bank_transactions.sepay_id`
  unique + already-settled no-op) and amount checks; this should be validated in
  an environment where the secret is known (or via the local API + local DB).

## RISK-04 — Guest-cart orphan on first action

The FE captures `cart_session_id` only from `GET /user/cart`. If `POST /cart/add`
is the very first cart call (before any `fetchCart`), it sends `session_id=null`;
the backend then creates a cart with a fresh random session that the client never
learns, so the next `fetchCart` (also null) creates *another* cart and the item
appears lost. In practice `fetchCart` runs on mount so the window is small, but a
deep link straight into "add to cart" could hit it. **Recommendation:** have
`add`/`update`/`delete` responses also return `session_id`, or create the guest
session on first load deterministically.

## RISK-05 — Local DB ≠ staging DB (test-data governance)

The DB reachable here is a separate instance from staging's, so SQL-based
data-prep/cleanup requested in the brief cannot touch the staging target. All
test orders created during this run persist in staging `user001`'s history and
were not cleanable via SQL. **Recommendation:** provide DB access to the actual
staging datastore (or a seed/reset endpoint) if SQL-level validation and cleanup
are required.

## RISK-06 — Fractional VND × bank transfer reconciliation

Follows from BUG-002: a `bank_transfer` order whose total is fractional (e.g.
241 660.8) can never satisfy the webhook's exact `expectedAmount == transferAmount`
check, because a real bank transfer is an integer amount — such an order could
sit forever `PENDING`. High-impact if coupons are used with bank transfer;
verify once BUG-002 is fixed.
