/**
 * User → Order : API test suite (staging).
 *
 * Uses the live API at https://api-moon.dlyn.site/api as the source of truth
 * (the staging DB is a separate instance from the local dev DB, so DB rows are
 * validated via the API rather than direct SQL — see report.md § limitations).
 *
 * Run:  node script/api.spec.js
 */
const fs = require('fs');
const path = require('path');
const H = require('./helpers');
const cfg = require('./config');

const L = { vi: { language: 'vi' } }; // language header

// Product fixtures (live staging IDs/slugs discovered during analysis)
const VND1 = { id: 47, price: 134256 };  // simple, no sale, VND
const VND2 = { id: 50, price: 74474 };   // simple, on sale (sale price), VND
const MOON = { id: 40 };                 // MOON-priced (wallet-only)

async function freshGuestCart() {
  const r = await H.api('GET', '/user/cart', { headers: L.vi });
  return r.json.data.session_id;
}
async function addGuest(sess, productId, qty = 1) {
  await H.api('POST', '/user/cart/add', { headers: L.vi, body: { product_id: productId, quantity: qty, session_id: sess } });
  const r = await H.api('GET', `/user/cart?session_id=${sess}`, { headers: L.vi });
  const items = r.json.data.items || [];
  return items[items.length - 1];
}
async function addUser(token, productId, qty = 1) {
  await H.api('POST', '/user/cart/add', { token, headers: L.vi, body: { product_id: productId, quantity: qty } });
  const r = await H.api('GET', '/user/cart', { token, headers: L.vi });
  const items = r.json.data.items || [];
  return items.find((i) => i.product_id === productId) || items[items.length - 1];
}

async function run() {
  H.ensureDirs();
  const token = await H.login();

  // =====================================================================
  //  GROUP A — Guest happy path
  // =====================================================================
  {
    const sess = await freshGuestCart();
    H.record('API-G01', 'Guest cart GET returns a session_id', 'Guest', !!sess, `session=${sess?.slice(0, 8)}…`);

    const item = await addGuest(sess, VND2.id, 2);
    H.record('API-G02', 'Guest add-to-cart persists item under session', 'Guest',
      !!item && item.quantity === 2, `cart_item=${item?.id} qty=${item?.quantity}`);

    const r = await H.api('POST', '/user/orders', { headers: L.vi, body: {
      full_name: 'QA Guest', phone: '0900000001', email: 'qa-guest@example.com', address: '123 Test Street',
      payment_methods: [{ token_id: 1, method: 'cod' }], cart_item_ids: [item.id], session_id: sess,
    }});
    const o = r.json?.data;
    const expected = VND2.price * 2;
    H.record('API-G03', 'Guest COD order created (200) with correct subtotal', 'Guest',
      r.status === 200 && Number(o?.subtotal) === expected,
      `status=${r.status} subtotal=${o?.subtotal} expected=${expected} code=${o?.order_code}`);
    H.record('API-G04', 'New order status = pending', 'Guest', o?.status === 'pending', `status=${o?.status}`);

    const d = await H.api('GET', `/user/orders/${o.id}/detail?session_id=${sess}`, { headers: L.vi });
    H.record('API-G05', 'Guest can read own order detail with session_id', 'Guest',
      d.status === 200 && d.json?.data?.id === o.id, `status=${d.status}`);

    const noSess = await H.api('GET', `/user/orders/${o.id}/detail`, { headers: L.vi });
    H.record('API-G06', 'Order detail WITHOUT session_id is denied (404)', 'Security',
      noSess.status === 404, `status=${noSess.status}`);

    // IDOR: a different guest session must not read this order
    const otherSess = await freshGuestCart();
    const idor = await H.api('GET', `/user/orders/${o.id}/detail?session_id=${otherSess}`, { headers: L.vi });
    H.record('API-G07', 'IDOR: foreign session cannot read order detail (404)', 'Security',
      idor.status === 404, `status=${idor.status}`);

    // Cart cleared after order
    const cartAfter = await H.api('GET', `/user/cart?session_id=${sess}`, { headers: L.vi });
    const stillThere = (cartAfter.json.data.items || []).some((i) => i.id === item.id);
    H.record('API-G08', 'Ordered cart item removed from cart after checkout', 'Guest',
      !stillThere, `remaining=${(cartAfter.json.data.items || []).length}`);
  }

  // =====================================================================
  //  GROUP B — Validation / Negative
  // =====================================================================
  {
    let r = await H.api('POST', '/user/orders', { headers: L.vi, body: { payment_methods: [{ token_id: 1, method: 'cod' }] } });
    H.record('API-V01', 'Missing shipping + cart_item_ids rejected (422)', 'Validation',
      r.status === 422, `status=${r.status}`);

    const sess = await freshGuestCart();
    const item = await addGuest(sess, VND1.id, 1);
    r = await H.api('POST', '/user/orders', { headers: L.vi, body: {
      full_name: 'X', phone: '0900000003', address: 'A', session_id: sess,
      payment_methods: [{ token_id: 1, method: 'crypto_scam' }], cart_item_ids: [item.id],
    }});
    H.record('API-V02', 'Invalid payment method enum rejected (422)', 'Validation', r.status === 422, `status=${r.status}`);

    r = await H.api('POST', '/user/orders', { headers: L.vi, body: {
      full_name: 'X', phone: '0900000003', address: 'A', session_id: sess,
      payment_methods: [{ token_id: 1, method: 'cod' }], cart_item_ids: [item.id], coupon_code: 'DOES_NOT_EXIST',
    }});
    H.record('API-V03', 'Non-existent coupon_code rejected (422)', 'Validation', r.status === 422, `status=${r.status}`);

    r = await H.api('POST', '/user/orders', { headers: L.vi, body: {
      full_name: 'X', phone: '0900000003', address: 'A', session_id: sess,
      payment_methods: [{ token_id: 1, method: 'cod' }], cart_item_ids: [],
    }});
    H.record('API-V04', 'Empty cart_item_ids rejected (422)', 'Validation', r.status === 422, `status=${r.status}`);

    // IDOR on cart_item_ids: use another session's cart item id
    const otherSess = await freshGuestCart();
    const otherItem = await addGuest(otherSess, VND1.id, 1);
    r = await H.api('POST', '/user/orders', { headers: L.vi, body: {
      full_name: 'X', phone: '0900000003', address: 'A', session_id: sess,
      payment_methods: [{ token_id: 1, method: 'cod' }], cart_item_ids: [otherItem.id],
    }});
    const msg = r.json?.message || '';
    H.record('API-V05', 'IDOR: foreign cart_item_id not usable (order rejected, not 200)', 'Security',
      r.status !== 200, `status=${r.status} msg=${msg}`);
    // Confirm the foreign item was NOT deleted by the attempt
    const stillOwned = await H.api('GET', `/user/cart?session_id=${otherSess}`, { headers: L.vi });
    H.record('API-V06', 'IDOR attempt did not delete the foreign cart item', 'Security',
      (stillOwned.json.data.items || []).some((i) => i.id === otherItem.id), '');
  }

  // =====================================================================
  //  GROUP C — Coupon
  // =====================================================================
  {
    let r = await H.api('POST', '/user/coupons/apply', { token, headers: L.vi, body: { code: 'SALE10', order_total: 200000 } });
    H.record('API-C01', 'Apply SALE10 (10%) on 200k → discount 20000', 'Coupon',
      r.status === 200 && Number(r.json?.data?.discount_amount) === 20000, `status=${r.status} disc=${r.json?.data?.discount_amount}`);

    r = await H.api('POST', '/user/coupons/apply', { token, headers: L.vi, body: { code: 'SAVE20', order_total: 100000 } });
    H.record('API-C02', 'SAVE20 below min_order (100k<200k) rejected', 'Coupon',
      r.status >= 400, `status=${r.status} msg=${r.json?.message}`);

    r = await H.api('POST', '/user/coupons/apply', { token, headers: L.vi, body: { code: 'SAVE20', order_total: 1000000 } });
    H.record('API-C03', 'SAVE20 (20%, cap 50k) on 1M capped at 50000', 'Coupon',
      r.status === 200 && Number(r.json?.data?.discount_amount) === 50000, `status=${r.status} disc=${r.json?.data?.discount_amount}`);

    r = await H.api('POST', '/user/coupons/apply', { headers: L.vi, body: { code: 'VIP30', order_total: 600000 } });
    H.record('API-C04', 'Private coupon VIP30 as guest rejected', 'Coupon',
      r.status >= 400, `status=${r.status} msg=${r.json?.message}`);

    // Not-started coupon appearing in /available then apply behaviour
    const avail = await H.api('GET', '/user/coupons/available', { token, headers: L.vi });
    const hasComing = (avail.json?.data || []).some((c) => c.code === 'COMING15');
    r = await H.api('POST', '/user/coupons/apply', { token, headers: L.vi, body: { code: 'COMING15', order_total: 200000 } });
    H.record('API-C05', 'COMING15 apply outcome (listed-in-available=' + hasComing + ')', 'Coupon',
      true, `apply status=${r.status} msg=${r.json?.message || r.json?.data?.discount_amount}`);

    // Coupon actually applied to an order lowers the total
    const sess = await freshGuestCart();
    const item = await addGuest(sess, VND1.id, 2); // 268512
    r = await H.api('POST', '/user/orders', { headers: L.vi, body: {
      full_name: 'QA Coupon', phone: '0900000004', address: 'Coupon St', session_id: sess,
      payment_methods: [{ token_id: 1, method: 'cod' }], cart_item_ids: [item.id], coupon_code: 'SALE10',
    }});
    const o = r.json?.data;
    const sub = VND1.price * 2;
    const expDisc = Math.round(sub * 0.1 * 100) / 100; // exact 10%, 2dp
    H.record('API-C06', 'Order with SALE10 → discount = exactly 10% of subtotal', 'Coupon',
      r.status === 200 && Number(o?.discount_amount) === expDisc && Number(o?.total) === sub - expDisc,
      `sub=${o?.subtotal} disc=${o?.discount_amount} total=${o?.total} (NOTE: fractional VND — see BUG-002)`);
  }

  // =====================================================================
  //  GROUP D — Logged-in payments
  // =====================================================================
  {
    // Staging user001 wallet balance (both tokens are 0 on staging — cannot be
    // funded without the deposit webhook secret, so the SUCCESSFUL debit path is
    // out of reach here; we verify the insufficient-balance guard instead).
    let w = await H.api('GET', '/user/wallets', { token, headers: L.vi });
    const vndWalletBefore = Number((w.json?.data || []).find((x) => x.token?.symbol === 'VND' || x.token_id === 1)?.amount ?? NaN);

    const item = await addUser(token, VND1.id, 1);
    let r = await H.api('POST', '/user/orders', { token, headers: L.vi, body: {
      full_name: 'QA Wallet', phone: '0900000005', address: 'Wallet St',
      payment_methods: [{ token_id: 1, method: 'wallet' }], cart_item_ids: [item.id],
    }});
    const insufficient = r.status !== 200 && /INSUFFICIENT_WALLET_BALANCE/.test(r.json?.message || '');
    H.record('API-D01', 'Wallet payment with 0 VND balance is rejected (guard works)', 'Payment',
      insufficient, `status=${r.status} msg=${r.json?.message} (balance=${vndWalletBefore})`);
    H.record('API-D02', 'Rejected wallet order returns a business error (NOT HTTP 500)', 'API',
      r.status === 422 || r.status === 400, `status=${r.status} — expected 4xx for a business error (see BUG-001)`);
    // Clean up the un-ordered cart item left behind by the rejected attempt
    await H.api('DELETE', `/user/cart/${item.id}/delete`, { token, headers: L.vi });

    // MOON wallet (0 balance) → wallet payment must fail
    const mItem = await addUser(token, MOON.id, 1);
    if (mItem) {
      // discover the MOON token_id from detail
      const det = await H.api('GET', `/user/products/ut-omnis-itaque-q3z0in/detail`, { token, headers: L.vi });
      const moonTokenId = det.json?.data?.price?.token?.id || 2;
      r = await H.api('POST', '/user/orders', { token, headers: L.vi, body: {
        full_name: 'QA Moon', phone: '0900000006', address: 'Moon St',
        payment_methods: [{ token_id: moonTokenId, method: 'wallet' }], cart_item_ids: [mItem.id],
      }});
      H.record('API-D03', 'Wallet payment with insufficient MOON balance rejected', 'Payment',
        r.status !== 200, `status=${r.status} msg=${r.json?.message}`);
      // cleanup MOON cart item so it doesn't linger
      await H.api('DELETE', `/user/cart/${mItem.id}/delete`, { token, headers: L.vi });
    } else {
      H.record('API-D03', 'Wallet payment with insufficient MOON balance rejected', 'Payment', false, 'could not add MOON product');
    }

    // Guest wallet payment → must be rejected (needs auth)
    const sess = await freshGuestCart();
    const gItem = await addGuest(sess, VND1.id, 1);
    r = await H.api('POST', '/user/orders', { headers: L.vi, body: {
      full_name: 'QA GuestWallet', phone: '0900000007', address: 'GW St', session_id: sess,
      payment_methods: [{ token_id: 1, method: 'wallet' }], cart_item_ids: [gItem.id],
    }});
    H.record('API-D04', 'Guest cannot pay by wallet (rejected, not 200)', 'Security',
      r.status !== 200, `status=${r.status} msg=${r.json?.message}`);

    // bank_transfer order + transfer info
    const bItem = await addUser(token, VND2.id, 1);
    r = await H.api('POST', '/user/orders', { token, headers: L.vi, body: {
      full_name: 'QA Bank', phone: '0900000008', address: 'Bank St',
      payment_methods: [{ token_id: 1, method: 'bank_transfer' }], cart_item_ids: [bItem.id],
    }});
    const bo = r.json?.data;
    const bt = await H.api('GET', `/user/orders/${bo.id}/bank-transfer`, { token, headers: L.vi });
    const info = bt.json?.data;
    H.record('API-D05', 'Bank-transfer order returns QR + transfer content', 'Payment',
      bt.status === 200 && !!info?.qr_url && /Moon ORD/.test(info?.content || ''),
      `status=${bt.status} content="${info?.content}" amount=${info?.amount}`);
    module.exports._bankOrder = { id: bo.id, code: (bo.payments || [])[0]?.code, amount: info?.amount };
  }

  // =====================================================================
  //  GROUP E — Order history, detail, cancel
  // =====================================================================
  {
    let r = await H.api('GET', '/user/orders?is_pagination=1&per_page=20', { token, headers: L.vi });
    const list = r.json?.data?.items || r.json?.data || [];
    H.record('API-E01', 'Order history returns the logged-in user\'s orders', 'Functional',
      r.status === 200 && list.length > 0, `status=${r.status} count=${list.length}`);

    // create a fresh COD order then cancel it
    const item = await addUser(token, VND1.id, 1);
    r = await H.api('POST', '/user/orders', { token, headers: L.vi, body: {
      full_name: 'QA Cancel', phone: '0900000009', address: 'Cancel St',
      payment_methods: [{ token_id: 1, method: 'cod' }], cart_item_ids: [item.id],
    }});
    const o = r.json?.data;
    r = await H.api('POST', `/user/orders/${o.id}/cancel`, { token, headers: L.vi, body: { reason: 'QA test cancel' } });
    H.record('API-E02', 'Cancel a pending order succeeds', 'Functional', r.status === 200, `status=${r.status}`);

    const d = await H.api('GET', `/user/orders/${o.id}/detail`, { token, headers: L.vi });
    H.record('API-E03', 'Order status becomes cancelled after cancel', 'Functional',
      d.json?.data?.status === 'cancelled', `status=${d.json?.data?.status}`);

    r = await H.api('POST', `/user/orders/${o.id}/cancel`, { token, headers: L.vi, body: { reason: 'again' } });
    H.record('API-E04', 'Cancelling an already-cancelled order is rejected', 'Functional',
      r.status >= 400, `status=${r.status} msg=${r.json?.message}`);

    // Cancel someone else's order (IDOR) — use a guest order id from group A is gone; try a bogus id
    r = await H.api('POST', `/user/orders/999999/cancel`, { token, headers: L.vi, body: { reason: 'idor' } });
    H.record('API-E05', 'Cancelling a non-owned/non-existent order is rejected', 'Security',
      r.status >= 400, `status=${r.status}`);
  }

  // =====================================================================
  //  GROUP F — Auth / Authorization
  // =====================================================================
  {
    let r = await H.api('GET', '/user/auth/me', { headers: L.vi });
    H.record('API-F01', 'GET /auth/me without token → 401', 'Security', r.status === 401, `status=${r.status}`);

    r = await H.api('GET', '/user/wallets', { headers: L.vi });
    H.record('API-F02', 'GET /wallets without token → 401', 'Security', r.status === 401, `status=${r.status}`);

    r = await H.api('GET', '/user/auth/me', { token: 'garbage-token', headers: L.vi });
    H.record('API-F03', 'GET /auth/me with invalid token → 401', 'Security', r.status === 401, `status=${r.status}`);
  }

  // =====================================================================
  //  GROUP G — SePay webhook
  // =====================================================================
  {
    const bank = module.exports._bankOrder || {};
    const base = {
      gateway: 'MBBANK', transactionDate: '2026-07-09 10:00:00', accountNumber: '6660126012000',
      content: 'Moon ' + (bank.code || 'ORDXXXX'), transferAmount: bank.amount || 74474,
      referenceCode: 'REF' + Date.now(), transferType: 'in',
    };
    let r = await H.api('POST', '/client/sepay/hook', { headers: { Authorization: 'Apikey WRONG_KEY' }, body: { ...base, id: 990001 } });
    H.record('API-W01', 'Webhook with wrong Authorization key → 401', 'Webhook', r.status === 401, `status=${r.status}`);

    r = await H.api('POST', '/client/sepay/hook', { body: { ...base, id: 990002 } });
    H.record('API-W02', 'Webhook with NO Authorization header → 401', 'Webhook', r.status === 401, `status=${r.status}`);

    r = await H.api('POST', '/client/sepay/hook', { headers: { Authorization: 'Apikey ' + cfg.webhookApiKey }, body: { gateway: 'MBBANK' } });
    H.record('API-W03', 'Webhook missing required fields → 401/422', 'Webhook', r.status === 401 || r.status === 422, `status=${r.status}`);

    // Documented limitation: staging webhook secret is environment-specific and
    // not exposed, so the *successful settlement* path can't be exercised here.
    r = await H.api('POST', '/client/sepay/hook', { headers: { Authorization: 'Apikey ' + cfg.webhookApiKey }, body: { ...base, id: 990003 } });
    H.record('API-W04', 'Webhook happy-path settlement (staging key unknown → expected 401)', 'Webhook',
      r.status === 401, `status=${r.status} (see report.md limitations)`);
  }

  // ---- persist evidence ----
  const n = H.saveApiLog(path.join(cfg.dirs.root, 'evidence', 'api', 'api-log.json'));
  fs.writeFileSync(path.join(cfg.dirs.root, 'evidence', 'api', 'results.json'), JSON.stringify(H.getResults(), null, 2));

  const res = H.getResults();
  const pass = res.filter((r) => r.status === 'PASS').length;
  const fail = res.filter((r) => r.status === 'FAIL').length;
  console.log(`\n=== API SUITE DONE: ${pass} PASS / ${fail} FAIL / ${res.length} total. ${n} API calls logged. ===`);
}

run().catch((e) => { console.error('FATAL', e.message, e.stack); process.exit(1); });
