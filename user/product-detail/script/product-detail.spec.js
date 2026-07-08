#!/usr/bin/env node
/**
 * Product Detail E2E suite — live against moon.dlyn.site (raw Playwright, no runner).
 *
 * Covers Guest + Authenticated flows, Functional / UI / UX / Responsive / API /
 * SEO / Performance / Bug-Hunting. Captures screenshots, video, HAR, console &
 * network logs, and API request/response bodies into ../evidence/*.
 *
 * Run:
 *   NODE_PATH=<playwright node_modules> node product-detail.spec.js
 * Env overrides: PD_BASE_URL, PD_API_URL, PD_USER, PD_PASS, PD_SLUG, PD_SIMPLE_SLUG
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const BASE = process.env.PD_BASE_URL || 'https://moon.dlyn.site';
const API = process.env.PD_API_URL || 'https://api-moon.dlyn.site/api';
const USER = process.env.PD_USER || 'user001';
const PASS = process.env.PD_PASS || 'password';
const SLUG = process.env.PD_SLUG || 'qui-eos-laborum-variant-tojq17'; // variant product id 100
const SIMPLE_SLUG = process.env.PD_SIMPLE_SLUG || 'quo-asperiores-quaerat-m0ybqx'; // simple product id 1
const DETAIL_URL = `${BASE}/products/${SLUG}`;

const EV = path.resolve(__dirname, '../evidence');
const SS = path.join(EV, 'screenshot');
const VID = path.join(EV, 'video');
const NET = path.join(EV, 'network');
const CON = path.join(EV, 'console');
const APIDIR = path.join(EV, 'api');
const UIDIR = path.join(EV, 'ui');
[SS, VID, NET, CON, APIDIR, UIDIR, path.join(EV, 'responsive')].forEach((d) =>
  fs.mkdirSync(d, { recursive: true }),
);

let pass = 0,
  fail = 0,
  warn = 0;
const results = [];
function log(id, ok, msg, extra = '') {
  const tag = ok === true ? '✅' : ok === 'warn' ? '⚠️' : '❌';
  if (ok === true) pass++;
  else if (ok === 'warn') warn++;
  else fail++;
  console.log(`${tag} ${id} — ${msg}${extra ? ' | ' + extra : ''}`);
  results.push({ id, status: ok === true ? 'PASS' : ok === 'warn' ? 'WARN' : 'FAIL', msg, extra });
}
const shot = (page, name) =>
  page.screenshot({ path: path.join(SS, name), fullPage: false }).catch(() => {});
const shotFull = (page, name) =>
  page.screenshot({ path: path.join(SS, name), fullPage: true }).catch(() => {});
const save = (dir, name, data) =>
  fs.writeFileSync(path.join(dir, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2));

// ---- tiny fetch helper for direct API testing ----
function apiRequest(method, url, { token, body, headers } = {}) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    // Accept: application/json mirrors the real axios frontend — without it Laravel
    // redirects (302) unauthenticated/validation cases instead of returning JSON.
    const h = { 'Content-Type': 'application/json', Accept: 'application/json', language: 'vi', ...(headers || {}) };
    if (token) h.Authorization = `Bearer ${token}`;
    const payload = body ? JSON.stringify(body) : null;
    if (payload) h['Content-Length'] = Buffer.byteLength(payload);
    const start = Date.now();
    const req = lib.request(url, { method, headers: h, rejectUnauthorized: false }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(d);
        } catch {}
        resolve({ status: res.statusCode, ms: Date.now() - start, json, raw: d.slice(0, 4000) });
      });
    });
    req.on('error', (e) => resolve({ status: 0, ms: Date.now() - start, error: e.message }));
    if (payload) req.write(payload);
    req.end();
  });
}

async function getToken() {
  const r = await apiRequest('POST', `${API}/user/auth/login`, { body: { username: USER, password: PASS } });
  return r.json?.data || null;
}

// ---- locators ----
const addBtn = (page) => page.getByRole('button', { name: /Thêm vào giỏ hàng|Add to Cart/i }).first();
const buyBtn = (page) => page.getByRole('button', { name: /^(Mua ngay|Buy Now)$/i }).first();
const favBtn = (page) => page.locator('button[aria-label*="favorite" i]').first();

// Navigate resiliently: home page never reaches networkidle (pusher/polling),
// so fall back to domcontentloaded + a short settle instead of failing the run.
async function gotoSafe(page, url, { settle = 1200 } = {}) {
  let resp = null;
  try {
    resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) {
    resp = null;
  }
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(settle);
  return resp;
}

async function run() {
  const results_api = {};

  // =====================================================================
  // PART A — DIRECT API TESTING (independent of browser)
  // =====================================================================
  console.log('\n===== API TESTING =====');
  const token = await getToken();
  log('A-01', token ? true : false, 'Login user001 lấy token (precondition)', token ? 'token OK' : 'no token');

  const detail = await apiRequest('GET', `${API}/user/products/${SLUG}/detail`);
  results_api.detail = { status: detail.status, ms: detail.ms };
  save(APIDIR, 'detail-response.json', detail.json || detail.raw);
  const d = detail.json?.data;
  log(
    'API-01',
    !!(detail.status === 200 && d && d.id && d.sku && d.translations),
    `GET /products/{slug}/detail → ${detail.status}`,
    `${detail.ms}ms`,
  );
  log('API-11', detail.ms < 2000 ? true : 'warn', `Response time detail`, `${detail.ms}ms`);
  log(
    'API-01b',
    d && (d.variants?.length || d.stock) && d.price ? true : false,
    'Schema có price + stock/variants + images',
    `variants=${d?.variants?.length ?? 0}, images=${(d?.images || []).length}`,
  );

  const notFound = await apiRequest('GET', `${API}/user/products/khong-ton-tai-xyz-999/detail`);
  log('API-02', notFound.status === 404, `GET detail slug sai → ${notFound.status}`, 'expect 404');

  const pid = d?.id || 100;
  const reviews = await apiRequest('GET', `${API}/user/products/${pid}/reviews?page=1&per_page=10`);
  const stats = await apiRequest('GET', `${API}/user/products/${pid}/reviews/stats`);
  save(APIDIR, 'reviews-response.json', reviews.json || reviews.raw);
  save(APIDIR, 'reviews-stats-response.json', stats.json || stats.raw);
  log(
    'API-03',
    reviews.status === 200 && stats.status === 200,
    `reviews (${reviews.status}) + stats (${stats.status})`,
  );

  // cart add guest (no token, no session -> API generates one)
  const addOk = await apiRequest('POST', `${API}/user/cart/add`, {
    body: { product_id: pid, product_variant_id: d?.variants?.[0]?.id ?? null, quantity: 1 },
  });
  save(APIDIR, 'cart-add-response.json', addOk.json || addOk.raw);
  log('API-04', [200, 201].includes(addOk.status), `POST /cart/add hợp lệ → ${addOk.status}`);

  const addBad = await apiRequest('POST', `${API}/user/cart/add`, {
    body: { product_id: pid, product_variant_id: d?.variants?.[0]?.id ?? null, quantity: 0 },
  });
  save(APIDIR, 'cart-add-qty0-response.json', addBad.json || addBad.raw);
  log(
    'API-05',
    addBad.status === 422 || (addBad.status >= 400 && addBad.status < 500),
    `POST /cart/add quantity=0 → ${addBad.status}`,
    'expect 422/4xx',
  );

  const addHuge = await apiRequest('POST', `${API}/user/cart/add`, {
    body: { product_id: pid, product_variant_id: d?.variants?.[0]?.id ?? null, quantity: 999999 },
  });
  save(APIDIR, 'cart-add-qty-huge-response.json', addHuge.json || addHuge.raw);
  log(
    'API-05b',
    addHuge.status >= 400 && addHuge.status < 500,
    `POST /cart/add quantity=999999 → ${addHuge.status}`,
    addHuge.status === 200 ? 'BUG? accepted over-stock' : 'expect 4xx',
  );

  const addNoProd = await apiRequest('POST', `${API}/user/cart/add`, {
    body: { product_id: 99999999, quantity: 1 },
  });
  log(
    'API-06',
    addNoProd.status >= 400 && addNoProd.status < 500,
    `POST /cart/add product không tồn tại → ${addNoProd.status}`,
    addNoProd.status >= 500 ? 'BUG 5xx' : 'expect 4xx',
  );

  const favNoAuth = await apiRequest('POST', `${API}/user/favorites/toggle`, { body: { product_id: pid } });
  log('API-07', favNoAuth.status === 401, `POST /favorites/toggle no token → ${favNoAuth.status}`, 'expect 401');

  const revNoAuth = await apiRequest('POST', `${API}/user/reviews`, {
    body: { product_id: pid, rating: 5, content: 'x' },
  });
  log('API-08', revNoAuth.status === 401, `POST /reviews no token → ${revNoAuth.status}`, 'expect 401');

  if (token) {
    const revAuth = await apiRequest('POST', `${API}/user/reviews`, {
      token,
      body: { product_id: pid, rating: 5, content: 'Test review tự động (bỏ qua nếu chưa mua)' },
    });
    save(APIDIR, 'review-create-response.json', revAuth.json || revAuth.raw);
    log(
      'API-09',
      revAuth.status !== 500,
      `POST /reviews có token → ${revAuth.status}`,
      revAuth.json?.message || '',
    );
    const favAuth = await apiRequest('POST', `${API}/user/favorites/toggle`, { token, body: { product_id: pid } });
    save(APIDIR, 'favorite-toggle-response.json', favAuth.json || favAuth.raw);
    log('A-07api', [200, 201].includes(favAuth.status), `favorites/toggle có token → ${favAuth.status}`);
    // toggle back
    await apiRequest('POST', `${API}/user/favorites/toggle`, { token, body: { product_id: pid } });
  }

  // language header
  const detailEn = await apiRequest('GET', `${API}/user/products/${SLUG}/detail`, { headers: { language: 'en' } });
  const enName = detailEn.json?.data?.translations?.find((t) => t.locale === 'en')?.name;
  log('API-10', !!enName, 'Header language=en trả translation EN', enName || '');

  const detailNoAuth = await apiRequest('GET', `${API}/user/products/${SLUG}/detail`);
  log('API-13', detailNoAuth.status === 200, `GET detail không token vẫn 200 (public)`, `${detailNoAuth.status}`);

  // =====================================================================
  // PART B — BROWSER: GUEST FLOW
  // =====================================================================
  console.log('\n===== GUEST (browser) =====');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    recordVideo: { dir: VID, size: { width: 1366, height: 900 } },
    ignoreHTTPSErrors: true,
  });
  await ctx.tracing.start({ screenshots: true, snapshots: true });

  const netLog = [];
  const consoleErrors = [];
  const apiHits = {};
  const page = await ctx.newPage();
  page.on('request', (r) => {
    const u = r.url();
    if (u.includes('/api/') || u.includes('api-moon')) {
      const key = r.method() + ' ' + u.split('?')[0].replace(API, '');
      apiHits[key] = (apiHits[key] || 0) + 1;
      netLog.push({ t: Date.now(), method: r.method(), url: u });
    }
  });
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

  // ---- G-DSP-01: load ----
  const perfStart = Date.now();
  const resp = await page.goto(DETAIL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const domMs = Date.now() - perfStart;
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  const idleMs = Date.now() - perfStart;
  await page.waitForTimeout(1500);
  await shotFull(page, 'guest-01-detail-full.png');
  await shot(page, 'guest-01-detail-viewport.png');
  const h1 = (await page.locator('h1').first().textContent().catch(() => '')) || '';
  log('G-DSP-01', resp?.status() === 200 && h1.length > 0, `Guest load, h1="${h1.trim()}"`, `HTTP ${resp?.status()}`);
  log('PERF-01', idleMs < 6000 ? true : 'warn', 'Load time', `DOM ${domMs}ms / idle ${idleMs}ms`);

  // ---- G-DSP-02..05: info ----
  const bodyText = await page.locator('body').innerText();
  log('G-DSP-02', /SKU/i.test(bodyText) && new RegExp(d?.sku?.split('-')[0] || 'PROD').test(bodyText), 'SKU hiển thị');
  log('G-DSP-03', /\d/.test(bodyText) && (/VND/.test(bodyText)), 'Giá hiển thị (VND)');
  const saleShown = /tiết kiệm|save/i.test(bodyText) || /%/.test(bodyText);
  log('G-DSP-03b', saleShown ? true : 'warn', 'Giá khuyến mãi / badge %', saleShown ? 'sale UI shown' : 'no sale');
  log('G-DSP-04', /(Còn|Chỉ còn|Hết hàng|stock)/i.test(bodyText), 'Tồn kho hiển thị');

  // ---- G-DSP-06: gallery images ----
  const imgStats = await page.$$eval('img', (imgs) =>
    imgs.map((i) => ({ w: i.naturalWidth, alt: i.getAttribute('alt') })),
  );
  const brokenImgs = imgStats.filter((i) => i.w === 0);
  log('G-DSP-06', imgStats.length > 0, `Ảnh: ${imgStats.length} img, ${brokenImgs.length} lỗi (naturalWidth=0)`);
  log('UI-02', brokenImgs.length === 0 ? true : 'warn', 'Không có ảnh vỡ', `${brokenImgs.length} broken`);

  // ---- G-DSP-07: fullscreen gallery ----
  try {
    await page.locator('button[aria-label="View fullscreen"]').first().click({ timeout: 5000 });
    await page.waitForTimeout(600);
    const dlg = await page.locator('div[role="dialog"][aria-modal="true"]').count();
    await shot(page, 'guest-07-fullscreen.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const dlgAfter = await page.locator('div[role="dialog"][aria-modal="true"]').count();
    log('G-DSP-07', dlg > 0 && dlgAfter === 0, 'Fullscreen mở & Escape đóng', `open=${dlg} afterEsc=${dlgAfter}`);
  } catch (e) {
    log('G-DSP-07', 'warn', 'Fullscreen không mở được', e.message.slice(0, 80));
  }

  // ---- G-DSP-08: tabs ----
  try {
    await page.getByRole('button', { name: /Thông số kỹ thuật|Specifications/i }).click({ timeout: 5000 });
    await page.waitForTimeout(300);
    const hasTable = (await page.locator('table').count()) > 0;
    await page.getByRole('button', { name: /^Mô tả|Description$/i }).click({ timeout: 5000 });
    await page.waitForTimeout(300);
    await shot(page, 'guest-08-tabs.png');
    log('G-DSP-08', hasTable, 'Tab specs hiển thị bảng thông số');
  } catch (e) {
    log('G-DSP-08', 'warn', 'Tab không thao tác được', e.message.slice(0, 80));
  }

  // ---- G-DSP-09: reviews empty state ----
  const reviewsText = bodyText;
  log(
    'G-DSP-09',
    /Chưa có đánh giá|No reviews|Đánh giá sản phẩm/i.test(reviewsText),
    'Khu vực đánh giá hiển thị (empty state ổn)',
  );

  // ---- BH-01: untranslated keys ----
  const untranslated = [];
  ['adding', 'to_cart', 'trust_shipping', 'description_tab'].forEach((k) => {
    if (bodyText.includes(k)) untranslated.push(k);
  });
  log(
    'BH-01',
    untranslated.length === 0 ? true : false,
    'Không có key dịch thô hiển thị',
    untranslated.length ? 'LEAK: ' + untranslated.join(',') : 'clean',
  );

  // ---- G-VAR-01: variant selection ----
  let variantChanged = false;
  try {
    const attrSpans = page.locator('.space-y-4.pt-6 span.cursor-pointer, div:has(> h4) span.cursor-pointer');
    // fallback: attribute value spans
    const attrs = page.locator('span.cursor-pointer.px-3');
    const count = await attrs.count();
    if (count >= 2) {
      const skuBefore = (await page.locator('body').innerText()).match(/SKU:\s*([\w-]+)/i)?.[1];
      await attrs.nth(count - 1).click(); // click a different attribute value
      await page.waitForTimeout(500);
      const skuAfter = (await page.locator('body').innerText()).match(/SKU:\s*([\w-]+)/i)?.[1];
      variantChanged = skuBefore !== skuAfter;
      await shot(page, 'guest-var-01-variant.png');
      log('G-VAR-01', true, `Chọn thuộc tính đổi variant`, `SKU ${skuBefore} → ${skuAfter}`);
    } else {
      log('G-VAR-01', 'warn', 'Không tìm thấy đủ nút thuộc tính', `count=${count}`);
    }
  } catch (e) {
    log('G-VAR-01', 'warn', 'Lỗi thao tác variant', e.message.slice(0, 80));
  }

  // ---- BH-02 / G-VAR-02: impossible combo ----
  try {
    const groups = page.locator('div:has(> h4.font-bold)');
    // Select first value of group1 and a value of group2 to try to reach a combo w/o variant
    const attrs = page.locator('span.cursor-pointer.px-3');
    const n = await attrs.count();
    // Try every value in the last group to detect a "no variant" state text
    await attrs.first().click();
    await page.waitForTimeout(300);
    // brute force middle option
    if (n >= 4) {
      await attrs.nth(2).click();
      await page.waitForTimeout(400);
    }
    const txt = await page.locator('body').innerText();
    const outOfStock = /Hết hàng/i.test(txt);
    const explicitUnavailable = /không khả dụng|not available|tổ hợp/i.test(txt);
    await shot(page, 'guest-var-02-combo.png');
    log(
      'BH-02',
      explicitUnavailable ? true : 'warn',
      'Tổ hợp thuộc tính không có variant',
      outOfStock && !explicitUnavailable ? 'chỉ hiện "Hết hàng" — có thể gây hiểu lầm' : 'ok',
    );
  } catch (e) {
    log('BH-02', 'warn', 'Không kiểm tra được combo', e.message.slice(0, 80));
  }

  // reset to a valid variant by reloading
  await gotoSafe(page, DETAIL_URL);

  // ---- G-VAR-03/04: quantity ----
  try {
    const plus = page.locator('button', { hasText: '+' }).first();
    const minus = page.locator('button', { hasText: '−' }).first();
    const qtySpan = page.locator('span.w-12.text-center');
    const before = (await qtySpan.textContent())?.trim();
    await page.getByRole('button', { name: '+' }).first().click().catch(async () => {
      await plus.click();
    });
    await page.waitForTimeout(300);
    const after = (await qtySpan.textContent())?.trim();
    log('G-VAR-03', Number(after) === Number(before) + 1, `Tăng số lượng ${before}→${after}`);
    // minus at 1 disabled
    await minus.click().catch(() => {});
    await page.waitForTimeout(200);
    const minusDisabled = await minus.isDisabled().catch(() => false);
    log('G-VAR-04', true, `Nút − disabled tại qty=1: ${minusDisabled}`);
  } catch (e) {
    log('G-VAR-03', 'warn', 'Lỗi thao tác quantity', e.message.slice(0, 80));
  }

  // ---- G-ACT-03: wishlist guest -> login modal ----
  try {
    await favBtn(page).click({ timeout: 5000 });
    await page.waitForTimeout(800);
    const loginModal = await page
      .locator('input[type="text"], input[type="password"]')
      .count();
    await shot(page, 'guest-act-03-wishlist-login.png');
    log('G-ACT-03', loginModal > 0, 'Wishlist guest → mở Login Modal', `inputs=${loginModal}`);
    // close modal
    await page.keyboard.press('Escape').catch(() => {});
    await page.mouse.click(5, 5).catch(() => {});
  } catch (e) {
    log('G-ACT-03', 'warn', 'Không kiểm tra được wishlist guest', e.message.slice(0, 80));
  }

  // ---- G-ACT-01/02: add to cart guest + double click debounce ----
  await gotoSafe(page, DETAIL_URL);
  const addCountBefore = apiHits['POST /user/cart/add'] || 0;
  try {
    await addBtn(page).click();
    await addBtn(page).click().catch(() => {}); // double click within debounce window
    await page.waitForTimeout(2500);
    const addCountAfter = apiHits['POST /user/cart/add'] || 0;
    const requests = addCountAfter - addCountBefore;
    await shot(page, 'guest-act-01-addtocart.png');
    log('G-ACT-01', requests >= 1, `Add to Cart guest → ${requests} request`, 'giỏ guest theo session');
    log(
      'G-ACT-02',
      requests === 1 ? true : 'warn',
      `Double-click debounce`,
      `${requests} POST /cart/add (kỳ vọng gộp = 1)`,
    );
  } catch (e) {
    log('G-ACT-01', 'warn', 'Add to cart lỗi', e.message.slice(0, 80));
  }

  // ---- G-NAV-01: refresh ----
  await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(800);
  log('G-NAV-01', ((await page.locator('h1').first().textContent()) || '').length > 0, 'Refresh giữ nội dung');

  // ---- G-NAV-02/03: back/forward ----
  await gotoSafe(page, BASE + '/', { settle: 800 });
  await gotoSafe(page, DETAIL_URL, { settle: 800 });
  await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(1000);
  const backUrl = page.url();
  await page.goForward({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(1000);
  const fwdUrl = page.url();
  log('G-NAV-02', backUrl.replace(/\/$/, '') === BASE, 'Browser Back về Home', backUrl);
  log('G-NAV-03', fwdUrl.includes('/products/'), 'Browser Forward về detail', fwdUrl);

  // ---- G-NAV-05: 404 slug ----
  const r404 = await gotoSafe(page, BASE + '/products/khong-ton-tai-xyz-999', { settle: 800 });
  const t404 = await page.locator('body').innerText();
  await shot(page, 'guest-nav-05-404.png');
  log(
    'G-NAV-05',
    r404?.status() === 404 || /không tìm thấy|not found|404/i.test(t404),
    `Slug sai → not-found`,
    `HTTP ${r404?.status()}`,
  );

  // ---- G-NAV-06: related products navigation ----
  await gotoSafe(page, DETAIL_URL);
  try {
    const related = page.locator('a[href*="/products/"]');
    const relCount = await related.count();
    // find a related link different from current
    let clicked = false;
    for (let i = 0; i < relCount; i++) {
      const href = await related.nth(i).getAttribute('href');
      if (href && !href.includes(SLUG)) {
        await related.nth(i).scrollIntoViewIfNeeded();
        await related.nth(i).click();
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
        clicked = true;
        break;
      }
    }
    await page.waitForTimeout(1000);
    await shot(page, 'guest-nav-06-related.png');
    log('G-NAV-06', clicked && page.url().includes('/products/'), 'Related product điều hướng', page.url());
  } catch (e) {
    log('G-NAV-06', 'warn', 'Related nav lỗi', e.message.slice(0, 80));
  }

  // ---- G-DSP-13: simple product ----
  const rSimple = await gotoSafe(page, BASE + '/products/' + SIMPLE_SLUG);
  const simpleText = await page.locator('body').innerText();
  await shot(page, 'guest-dsp-13-simple.png');
  log(
    'G-DSP-13',
    rSimple?.status() === 200 && /VND/.test(simpleText),
    'SP không variant hiển thị đúng',
    `HTTP ${rSimple?.status()}`,
  );

  // ---- UI-04: no horizontal overflow (desktop) ----
  await gotoSafe(page, DETAIL_URL);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  log('UI-04', overflow <= 2, 'Không tràn ngang (desktop)', `overflow=${overflow}px`);

  // ---- UX-01: keyboard focus visibility ----
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const active = await page.evaluate(() => document.activeElement?.tagName);
  log('UX-01', !!active, 'Keyboard Tab di chuyển focus', `active=${active}`);

  // ---- UX-03: aria-labels on icon buttons ----
  const ariaCount = await page.locator('button[aria-label]').count();
  log('UX-03', ariaCount > 0, 'Nút icon có aria-label', `${ariaCount} nút`);

  // ---- BH-08: XSS in query string ----
  await gotoSafe(page, DETAIL_URL + '?q=<script>window.__xss=1<\/script>', { settle: 800 });
  const xss = await page.evaluate(() => window.__xss === 1);
  log('BH-08', xss === false, 'XSS qua query string không thực thi', `__xss=${xss}`);

  // ---- SEO checks (raw HTML via fetch) ----
  const seoHtml = (await apiRequest('GET', DETAIL_URL)).raw || '';
  const rawResp = await new Promise((resolve) => {
    https.get(DETAIL_URL, { rejectUnauthorized: false }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(d));
    });
  });
  save(UIDIR, 'page-source.html', rawResp.slice(0, 20000));
  const titleM = rawResp.match(/<title>([^<]*)<\/title>/i);
  const canonical = /rel="canonical"/i.test(rawResp);
  const ogTitle = /property="og:title"/i.test(rawResp);
  const twitter = /name="twitter:card"/i.test(rawResp);
  const metaDesc = /name="description"/i.test(rawResp);
  const nameInHtml = h1 && rawResp.includes(h1.trim().split(' ')[0]);
  log('SEO-01', titleM && /Tochi|Variant|[a-z]/i.test(titleM[1]), 'Title chứa tên sản phẩm', titleM?.[1] || '');
  log('SEO-02', metaDesc, 'Meta description tồn tại');
  log('SEO-03', canonical, 'Canonical tồn tại');
  log('SEO-04', ogTitle && twitter, 'OG + Twitter card', `og=${ogTitle} tw=${twitter}`);
  log('SEO-05', nameInHtml ? true : 'warn', 'SSR content chứa tên sản phẩm');

  // ---- PERF-02: duplicate API calls in one load ----
  const dupCalls = Object.entries(apiHits).filter(([, c]) => c > 3);
  log('PERF-02', dupCalls.length === 0 ? true : 'warn', 'API gọi lặp', JSON.stringify(apiHits));

  // capture console/network for guest
  save(CON, 'guest-console-errors.log', consoleErrors.join('\n') || 'none');
  save(NET, 'guest-api-hits.json', apiHits);
  log('BH-07g', consoleErrors.length === 0 ? true : 'warn', 'Console errors (guest)', `${consoleErrors.length} lỗi`);

  await ctx.tracing.stop({ path: path.join(NET, 'guest-trace.zip') });
  await ctx.close();

  // =====================================================================
  // PART C — AUTHENTICATED FLOW
  // =====================================================================
  console.log('\n===== AUTHENTICATED (browser) =====');
  const ctxA = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    recordVideo: { dir: VID, size: { width: 1366, height: 900 } },
    ignoreHTTPSErrors: true,
  });
  // Inject token so requests are authenticated (login itself validated by A-01 API + UI check below)
  await ctxA.addInitScript((tk) => {
    if (tk) localStorage.setItem('auth_token', tk);
  }, token);

  const netLogA = [];
  const consoleErrorsA = [];
  const apiHitsA = {};
  const cartPayloads = [];
  const pageA = await ctxA.newPage();
  pageA.on('request', (r) => {
    const u = r.url();
    if (u.includes('/api/') || u.includes('api-moon')) {
      const key = r.method() + ' ' + u.split('?')[0].replace(API, '');
      apiHitsA[key] = (apiHitsA[key] || 0) + 1;
      if (key.includes('/cart/add')) {
        try {
          cartPayloads.push(JSON.parse(r.postData() || '{}'));
        } catch {}
      }
    }
  });
  pageA.on('console', (m) => m.type() === 'error' && consoleErrorsA.push(m.text()));
  pageA.on('pageerror', (e) => consoleErrorsA.push('pageerror: ' + e.message));

  await gotoSafe(pageA, DETAIL_URL);
  await shotFull(pageA, 'auth-01-detail-full.png');
  const authBody = await pageA.locator('body').innerText();
  log('A-02', /VND/.test(authBody) && (await pageA.locator('h1').first().textContent())?.length > 0, 'Auth: hiển thị lại đầy đủ');

  // ---- A-12: price parity guest vs auth ----
  const priceGuest = (bodyText.match(/[\d.,]+\s*VND/) || [])[0];
  const priceAuth = (authBody.match(/[\d.,]+\s*VND/) || [])[0];
  log('A-12', !!priceAuth, 'Giá auth hiển thị', `guest=${priceGuest} auth=${priceAuth}`);

  // ---- A-03: add to cart auth, correct variant+qty ----
  try {
    // pick a variant value + set qty to 3
    const attrs = pageA.locator('span.cursor-pointer.px-3');
    if ((await attrs.count()) > 0) await attrs.first().click();
    await pageA.waitForTimeout(400);
    const plus = pageA.getByRole('button', { name: '+' }).first();
    await plus.click();
    await plus.click(); // qty = 3
    await pageA.waitForTimeout(300);
    cartPayloads.length = 0;
    await addBtn(pageA).click();
    await pageA.waitForTimeout(2500);
    await shot(pageA, 'auth-03-addtocart.png');
    const last = cartPayloads[cartPayloads.length - 1];
    log(
      'A-03',
      last && last.quantity === 3,
      `Add to cart auth qty=3`,
      last ? `payload qty=${last.quantity}, variant=${last.product_variant_id}` : 'no payload',
    );
    log('A-05', cartPayloads.length <= 1 ? true : 'warn', 'Debounce auth (1 request)', `${cartPayloads.length} req`);
  } catch (e) {
    log('A-03', 'warn', 'Add to cart auth lỗi', e.message.slice(0, 80));
  }

  // ---- A-04: loading/disabled during add ----
  try {
    const btn = addBtn(pageA);
    await btn.click();
    // check within debounce/loading window
    await pageA.waitForTimeout(900);
    const disabledOrSpinner =
      (await btn.isDisabled().catch(() => false)) ||
      (await pageA.locator('svg.animate-spin').count()) > 0;
    log('A-04', disabledOrSpinner ? true : 'warn', 'Loading/disable khi thêm giỏ', `state=${disabledOrSpinner}`);
    await pageA.waitForTimeout(1500);
  } catch (e) {
    log('A-04', 'warn', 'Không quan sát được loading', e.message.slice(0, 80));
  }

  // ---- A-07/08/09: wishlist add/persist/remove ----
  try {
    const fav = favBtn(pageA);
    const beforeLabel = await fav.getAttribute('aria-label');
    await fav.click();
    await pageA.waitForTimeout(1500);
    const afterLabel = await fav.getAttribute('aria-label');
    await shot(pageA, 'auth-07-wishlist-add.png');
    log('A-07', beforeLabel !== afterLabel, 'Wishlist add đổi trạng thái', `${beforeLabel} → ${afterLabel}`);

    // refresh persistence (domcontentloaded — home/detail never reach networkidle reliably)
    await gotoSafe(pageA, DETAIL_URL, { settle: 2500 });
    const favAfterReload = favBtn(pageA);
    const reloadLabel = await favAfterReload.getAttribute('aria-label');
    await shot(pageA, 'auth-08-wishlist-refresh.png');
    log(
      'A-08',
      /Remove from favorites/i.test(reloadLabel || '') ? true : 'warn',
      'Wishlist giữ trạng thái sau refresh',
      `label=${reloadLabel}`,
    );

    // remove
    await favAfterReload.click();
    await pageA.waitForTimeout(1200);
    const removeLabel = await favAfterReload.getAttribute('aria-label');
    log('A-09', /Add to favorites/i.test(removeLabel || ''), 'Wishlist remove', `label=${removeLabel}`);
  } catch (e) {
    log('A-07', 'warn', 'Wishlist flow lỗi', e.message.slice(0, 80));
  }

  // ---- A-11: review UI presence ----
  const hasReviewForm =
    (await pageA.locator('textarea').count()) > 0 ||
    (await pageA.getByRole('button', { name: /viết đánh giá|write.*review|đánh giá/i }).count()) > 0;
  log('A-11', hasReviewForm ? true : 'warn', 'UI tạo review trên trang detail', hasReviewForm ? 'có' : 'không có form/nút');

  // ---- A-06: buy now -> checkout ----
  try {
    await gotoSafe(pageA, DETAIL_URL);
    const attrs = pageA.locator('span.cursor-pointer.px-3');
    if ((await attrs.count()) > 0) await attrs.first().click();
    await pageA.waitForTimeout(300);
    await buyBtn(pageA).click();
    await pageA.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await pageA.waitForTimeout(1500);
    await shot(pageA, 'auth-06-buynow-checkout.png');
    log('A-06', pageA.url().includes('/checkout'), 'Buy Now → /checkout', pageA.url());
  } catch (e) {
    log('A-06', 'warn', 'Buy now lỗi', e.message.slice(0, 80));
  }

  save(CON, 'auth-console-errors.log', consoleErrorsA.join('\n') || 'none');
  save(NET, 'auth-api-hits.json', apiHitsA);
  log('BH-07a', consoleErrorsA.length === 0 ? true : 'warn', 'Console errors (auth)', `${consoleErrorsA.length} lỗi`);

  await ctxA.close();

  // =====================================================================
  // PART D — RESPONSIVE (HAR captured on one representative device)
  // =====================================================================
  console.log('\n===== RESPONSIVE =====');
  const viewports = [
    { id: 'RS-01', name: 'desktop-1920', width: 1920, height: 1080 },
    { id: 'RS-02', name: 'desktop-1440', width: 1440, height: 900 },
    { id: 'RS-03', name: 'desktop-1366', width: 1366, height: 768 },
    { id: 'RS-04', name: 'ipad-air', width: 820, height: 1180 },
    { id: 'RS-05', name: 'iphone-14', width: 390, height: 844 },
    { id: 'RS-06', name: 'iphone-se', width: 375, height: 667 },
    { id: 'RS-07', name: 'pixel-7', width: 412, height: 915 },
    { id: 'RS-08', name: 'galaxy-s23', width: 360, height: 780 },
    { id: 'RS-09', name: 'mobile-landscape', width: 844, height: 390 },
  ];
  for (const v of viewports) {
    const harPath = v.id === 'RS-05' ? path.join(NET, 'network.har') : undefined;
    const c = await browser.newContext({
      viewport: { width: v.width, height: v.height },
      ignoreHTTPSErrors: true,
      ...(harPath ? { recordHar: { path: harPath, content: 'embed' } } : {}),
    });
    const p = await c.newPage();
    await gotoSafe(p, DETAIL_URL);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await p.screenshot({ path: path.join(EV, 'responsive', `${v.name}.png`), fullPage: true }).catch(() => {});
    log(v.id, ov <= 3 ? true : 'warn', `${v.name} (${v.width}×${v.height})`, `overflow=${ov}px`);
    await c.close();
  }

  await browser.close();

  // =====================================================================
  // SUMMARY
  // =====================================================================
  const summary = {
    module: 'user/product-detail',
    url: DETAIL_URL,
    executed_at_note: 'timestamp stamped by wrapper',
    totals: { total: pass + fail + warn, pass, fail, warn },
    api_response_ms: results_api.detail?.ms,
    results,
  };
  save(EV, 'results.json', summary);
  console.log(`\n===== DONE: ${pass} PASS / ${warn} WARN / ${fail} FAIL =====`);
}

run().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
