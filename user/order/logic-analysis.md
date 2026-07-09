# Business Flow Analysis — User / Order

Source of truth: backend controllers/services under `api/app/...` and the
Next.js user app under `user/...`. This is the analysis that drove the test
cases; it also records the assumptions made where no written requirement exists.

## 1. Actors & entry points

- **Guest** — identified by a `cart_session_id` (40-char random string) held in
  `localStorage` and echoed to the API as `session_id`. A guest **can** browse,
  add to cart, checkout with **COD** or **bank transfer**, and view/track/cancel
  their own orders (scoped by `session_id`).
- **Logged-in user** — Sanctum bearer token in `localStorage.auth_token`. Adds
  **wallet** payment and server-side address book; orders scoped by `user_id`.

## 2. Happy-path flow

```
Home ─▶ Product list ─▶ Product detail ─▶ Add to cart ─▶ Cart sidebar
      ─▶ /checkout ─▶ (shipping form + payment method per token) ─▶ POST /user/orders
      ─▶ /orders/{id}  (order detail: timeline, payment status, pay-now / cancel)
      ─▶ /orders       (order history)
```

## 3. Key backend rules (from `OrderService::create`)

1. **Cart ownership is re-resolved server-side.** The caller's own cart is looked
   up by `user_id` (auth) or `session_id` (guest); only `cart_item_ids` that
   belong to that cart are honoured. Foreign ids are silently dropped → empty
   selection → `CART_ITEMS_EMPTY`. This blocks the IDOR of ordering/deleting
   another cart's items. ✅ Verified (API-V05/V06).
2. **Multi-token orders → one `order_payment` per token.** `payment_methods` is a
   `token_id → method` map. Each token's line becomes a payment row. The system
   subtotal is computed in the default token (VND, `rate = 1`); other tokens are
   converted with `token.rate`.
3. **Inventory is reserved under a row lock** (`available → reserved`) at order
   time; `cancelOrder` reverses it. Prevents overselling the last unit.
4. **Coupon** is applied to the system subtotal, then the discount is *allocated
   across payments* (percentage: pro-rata with a global cap; fixed: only the
   payment whose `token_id` matches the coupon's token). Wallet is charged the
   **discounted** amount.
5. **Wallet** payments require auth and sufficient balance (locked row); on
   success the payment is `SUCCESS(2)` and completed immediately. COD /
   bank-transfer stay `PENDING(1)`.
6. Cart items are deleted after a successful order; order status history is
   recorded (`null → pending`).

## 4. Payment methods (per token, from `/user/tokens`)

| Token | COD | Bank transfer | Wallet |
|-------|:---:|:-------------:|:------:|
| VND (id 1, rate 1) | ✅ | ✅ | ✅ (auth) |
| MOON (id 2, rate 0.001) | — | — | ✅ (auth) |

⇒ A MOON-priced product is **wallet-only** and therefore un-orderable by guests,
and by any user with a 0 MOON balance.

## 5. Bank transfer + SePay webhook

- `GET /user/orders/{id}/bank-transfer` returns bank account, amount, a QR image,
  and a transfer `content` = `"<APP_NAME> <payment.code>"` (staging APP_NAME =
  `Moon`, code = `ORD` + 16 alphanumerics).
- SePay calls `POST /client/sepay/hook` with `Authorization: Apikey <secret>`.
  The handler **fails closed** (401 if secret unset/wrong, constant-time compare),
  records the `bank_transactions` row first (idempotent on `sepay_id`), then
  matches the payment by extracting the code from `content`, checks the exact
  expected amount, and flips the payment to `SUCCESS`. Duplicate `sepay_id` →
  no-op; already-settled payment → no-op.

## 6. Cancel

Only a `PENDING` order can be cancelled (`user` or matching `session_id`);
transitions to `CANCELLED`, records history, restores reserved inventory.

## 7. Assumptions (no written requirement supplied)

- COD & bank transfer are valid for guests; wallet is intentionally auth-only.
- Free shipping is intended (backend always charges `shipping_fee = 0`; UI shows
  a struck-through 50 000 as a "benefit").
- VND is expected to behave as a whole-number currency (this drives BUG-002).
- Not-started/expired coupons must be rejected at apply time (drives RISK about
  `COMING15`).
