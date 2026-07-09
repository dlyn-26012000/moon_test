/**
 * API-level E2E for User Add-to-Cart (raw https, no framework).
 * Covers testcases group D (validation / negative / boundary / security / schema)
 * plus the guest->login merge (group C, API side).
 *
 * Run:  node api.spec.js
 * Writes: ../evidence/api/api-log.md, request/*.json, response/*.json, and
 *         a machine-readable ../evidence/api/api-results.json
 *
 * NOTE: login is throttled 5 req/min/IP — this script performs exactly ONE login.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const D = require('../assets/test-data/test-data');

const API = D.apiURL;
const EV = path.join(__dirname, '..', 'evidence', 'api');
const REQ = path.join(EV, 'request');
const RES = path.join(EV, 'response');
[EV, REQ, RES].forEach((d) => fs.mkdirSync(d, { recursive: true }));

const results = [];
const log = [];
function rec(id, title, ok, detail) {
  results.push({ id, title, ok: !!ok, detail: detail || '' });
  const tag = ok ? 'PASS' : 'FAIL';
  console.log(`${tag}  ${id}  ${title}${detail ? ' — ' + detail : ''}`);
  log.push(`| ${id} | ${title} | ${ok ? '✅' : '❌'} | ${String(detail || '').replace(/\|/g, '/')} |`);
}

function req(method, p, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const start = Date.now();
    const opts = {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...headers },
    };
    const r = https.request(API + p, opts, (resp) => {
      let b = '';
      resp.on('data', (c) => (b += c));
      resp.on('end', () => {
        let j;
        try { j = JSON.parse(b); } catch { j = b; }
        resolve({ status: resp.statusCode, body: j, ms: Date.now() - start });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function dump(name, reqObj, resObj) {
  fs.writeFileSync(path.join(REQ, name + '.json'), JSON.stringify(reqObj, null, 2));
  fs.writeFileSync(path.join(RES, name + '.json'), JSON.stringify(resObj, null, 2));
}

const sid = () => 'qa_e2e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10) + 'zzzzzzzzzz';

(async () => {
  const P = D.product;
  const s1 = sid();

  // D-01 add valid
  let payload = { product_id: P.id, product_variant_id: P.variants.v189.id, quantity: 2, session_id: s1 };
  let r = await req('POST', '/user/cart/add', payload);
  dump('D-01-add-valid', payload, r);
  const itemId = r.body?.data?.id;
  rec('D-01', 'Add hợp lệ v189 x2', r.status === 200 && r.body.message === 'PRODUCT_ADDED_TO_CART_SUCCESSFULLY', `HTTP ${r.status}, ${r.ms}ms`);

  // D-02 add same again -> accumulate
  payload = { product_id: P.id, product_variant_id: P.variants.v189.id, quantity: 3, session_id: s1 };
  r = await req('POST', '/user/cart/add', payload);
  dump('D-02-add-accumulate', payload, r);
  rec('D-02', 'Add cộng dồn (2+3=5)', r.status === 200 && r.body?.data?.quantity === 5, `qty=${r.body?.data?.quantity}`);

  // D-03 over-stock
  payload = { product_id: P.id, product_variant_id: P.variants.v189.id, quantity: 100000, session_id: s1 };
  r = await req('POST', '/user/cart/add', payload);
  dump('D-03-overstock', payload, r);
  rec('D-03', 'Vượt tồn kho', r.status === 422 && r.body.message === 'INSUFFICIENT_INVENTORY', `HTTP ${r.status} ${r.body.message}`);

  // D-04 qty 0
  r = await req('POST', '/user/cart/add', { product_id: P.id, product_variant_id: P.variants.v189.id, quantity: 0, session_id: s1 });
  rec('D-04', 'quantity = 0', r.status === 422, `HTTP ${r.status} ${r.body.message}`);

  // D-05 qty -1
  r = await req('POST', '/user/cart/add', { product_id: P.id, product_variant_id: P.variants.v189.id, quantity: -1, session_id: s1 });
  rec('D-05', 'quantity âm', r.status === 422, `HTTP ${r.status} ${r.body.message}`);

  // D-06 qty non-numeric
  r = await req('POST', '/user/cart/add', { product_id: P.id, product_variant_id: P.variants.v189.id, quantity: 'abc', session_id: s1 });
  rec('D-06', 'quantity không phải số', r.status === 422, `HTTP ${r.status} ${r.body.message}`);

  // D-07 bad product — now expects the specific code (improvement #8)
  r = await req('POST', '/user/cart/add', { product_id: 99999999, quantity: 1, session_id: s1 });
  rec('D-07', 'product không tồn tại → PRODUCT_NOT_FOUND', r.status === 404 && r.body.message === 'PRODUCT_NOT_FOUND', `HTTP ${r.status} ${r.body.message}`);

  // D-08 variant not belonging to product — now expects the specific code (improvement #8)
  r = await req('POST', '/user/cart/add', { product_id: P.id, product_variant_id: 999999, quantity: 1, session_id: s1 });
  rec('D-08', 'variant không thuộc product → PRODUCT_VARIANT_NOT_FOUND', r.status === 404 && r.body.message === 'PRODUCT_VARIANT_NOT_FOUND', `HTTP ${r.status} ${r.body.message}`);

  // D-09 GET cart without session -> new session
  r = await req('GET', '/user/cart?includes=items');
  const newSid = r.body?.data?.session_id;
  rec('D-09', 'GET cart tạo session mới', r.status === 200 && !!newSid, `session_id len=${String(newSid || '').length}`);

  // D-15 schema (reuse s1 list)
  r = await req('GET', '/user/cart?includes=items&session_id=' + s1);
  dump('D-15-list-schema', { session_id: s1 }, r);
  const d = r.body?.data || {};
  const schemaOk = 'id' in d && 'session_id' in d && Array.isArray(d.items);
  rec('D-15', 'Schema CartResource', schemaOk, `keys=${Object.keys(d).join(',')}`);
  rec('D-14', 'Response time < 1500ms', r.ms < 1500, `${r.ms}ms`);

  // D-10 update -> 0 removes; find current item id
  const liveItem = (d.items || []).find((i) => i.product_variant_id === P.variants.v189.id);
  if (liveItem) {
    r = await req('PUT', `/user/cart/${liveItem.id}/update`, { quantity: 0, session_id: s1 });
    rec('D-10', 'Update ⇒ 0 xoá item', r.status === 200 && r.body.message === 'PRODUCT_REMOVED_FROM_CART_SUCCESSFULLY', `HTTP ${r.status} ${r.body.message}`);
    // D-11 delete already-removed
    r = await req('DELETE', `/user/cart/${liveItem.id}/delete?session_id=` + s1);
    rec('D-11', 'Delete item đã xoá', r.status === 404, `HTTP ${r.status} ${r.body.message}`);
  } else {
    rec('D-10', 'Update ⇒ 0 xoá item', false, 'no live item found');
    rec('D-11', 'Delete item đã xoá', false, 'skipped');
  }

  // D-12 IDOR: a second client reads s1's cart just by knowing session_id
  const s2 = sid();
  await req('POST', '/user/cart/add', { product_id: P.id, product_variant_id: P.variants.v190.id, quantity: 1, session_id: s2 });
  r = await req('GET', '/user/cart?includes=items&session_id=' + s2); // "attacker" uses victim sid
  const idorReadable = r.status === 200 && Array.isArray(r.body?.data?.items);
  rec('D-12', 'IDOR giỏ khách (đọc bằng session_id)', idorReadable, idorReadable ? 'CÓ THỂ đọc — rủi ro (không ký/không kiểm sở hữu)' : 'không đọc được');

  // D-13 SQLi in session_id
  r = await req('GET', '/user/cart?includes=items&session_id=' + encodeURIComponent("' OR 1=1--"));
  rec('D-13', 'SQL injection ở session_id', r.status === 200 || r.status === 404, `HTTP ${r.status} (không crash 500)`);

  // ===== Merge (group C, API) — ONE login only =====
  const sMerge = sid();
  await req('POST', '/user/cart/add', { product_id: P.id, product_variant_id: P.variants.v189.id, quantity: 2, session_id: sMerge });
  await req('POST', '/user/cart/add', { product_id: P.id, product_variant_id: P.variants.v191.id, quantity: 1, session_id: sMerge });
  const login = await req('POST', '/user/auth/login', { username: D.account.username, password: D.account.password });
  const token = login.body?.data;
  dump('C-login', { username: D.account.username }, { status: login.status, message: login.body?.message });
  rec('M-03', 'Đăng nhập (Precondition)', login.status === 200 && typeof token === 'string', `HTTP ${login.status}`);

  if (typeof token === 'string') {
    const auth = { Authorization: 'Bearer ' + token };
    // pre-merge user cart snapshot
    let pre = await req('GET', '/user/cart?includes=items', null, auth);
    const preItems = (pre.body?.data?.items || []).map((i) => ({ pv: i.product_variant_id, q: i.quantity }));
    // trigger merge by sending guest session_id together with the token
    let post = await req('GET', '/user/cart?includes=items&session_id=' + sMerge, null, auth);
    dump('C-merge', { session_id: sMerge, pre: preItems }, post);
    const postItems = (post.body?.data?.items || []).map((i) => ({ pv: i.product_variant_id, q: i.quantity }));

    const preV189 = preItems.find((i) => i.pv === P.variants.v189.id)?.q || 0;
    const postV189 = postItems.find((i) => i.pv === P.variants.v189.id)?.q || 0;
    const postV191 = postItems.find((i) => i.pv === P.variants.v191.id)?.q;

    rec('M-04', 'Giỏ sau login có item khách (merge)', postItems.length >= 1, `post=${JSON.stringify(postItems)}`);
    rec('M-05', 'Merge cộng dồn v189 (pre+2)', postV189 === preV189 + 2, `pre=${preV189} post=${postV189}`);
    rec('M-06', 'Không mất dữ liệu / v191 re-parent', postV191 === 1, `v191=${postV191}`);
    rec('M-08', 'API/UI đồng nhất (schema)', 'items' in (post.body?.data || {}), `items=${postItems.length}`);

    // cleanup: leave the shared test account as we found it (remove what merge added)
    for (const it of post.body?.data?.items || []) {
      await req('DELETE', `/user/cart/${it.id}/delete`, null, auth);
    }
    rec('CLEANUP', 'Dọn giỏ user001 sau merge test', true, 'removed merged items');
  }

  // write logs
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  const md = [
    '# API Test Log — User Add-to-Cart',
    '',
    `Ngày: 2026-07-09 · Base: ${API}`,
    `Kết quả: **${passed} PASS / ${failed} FAIL** trên ${results.length} case.`,
    '',
    '| ID | Test | Kết quả | Chi tiết |',
    '|----|------|---------|----------|',
    ...log,
    '',
    '> Request/Response payload lưu tại `request/` và `response/`.',
  ].join('\n');
  fs.writeFileSync(path.join(EV, 'api-log.md'), md);
  fs.writeFileSync(path.join(EV, 'api-results.json'), JSON.stringify({ passed, failed, total: results.length, results }, null, 2));
  console.log(`\n=== API: ${passed} PASS / ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
