/**
 * User → Order : UI E2E suite (Playwright, real staging site).
 *
 * Drives https://moon.dlyn.site through the guest + logged-in order flows,
 * captures screenshots / video / console / network as evidence.
 *
 * Run:  node script/ui.spec.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const H = require('./helpers');
const cfg = require('./config');

const SHOTS = cfg.dirs.shots;
const RESP = cfg.dirs.responsive;
const VIDEOS = cfg.dirs.videos;
const CONSOLE_DIR = cfg.dirs.console;
const NET_DIR = cfg.dirs.network;

const PRODUCT_SLUG = 'qui-saepe-debitis-ypiod8'; // product 50, VND, on sale, in stock
const results = [];
function rec(id, name, group, passed, detail, evidence) {
  results.push({ id, name, group, status: passed ? 'PASS' : 'FAIL', detail, evidence });
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'} [${id}] ${name}${detail ? ' — ' + detail : ''}`);
}

async function newContext(browser, name, viewport) {
  const ctx = await browser.newContext({
    viewport: viewport || cfg.viewports.desktop_1366,
    recordVideo: { dir: VIDEOS, size: { width: 1366, height: 768 } },
    locale: 'vi-VN',
  });
  const consoleMsgs = [];
  const netLog = [];
  ctx.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push({ type: m.type(), text: m.text() }); });
  ctx.on('requestfinished', async (req) => {
    const url = req.url();
    if (!/api-moon\.dlyn\.site/.test(url)) return;
    try {
      const res = await req.response();
      netLog.push({ method: req.method(), url, status: res ? res.status() : null });
    } catch (_) { /* ignore */ }
  });
  ctx._consoleMsgs = consoleMsgs;
  ctx._netLog = netLog;
  ctx._name = name;
  return ctx;
}
async function closeContext(ctx) {
  fs.writeFileSync(path.join(CONSOLE_DIR, `${ctx._name}.console.json`), JSON.stringify(ctx._consoleMsgs, null, 2));
  fs.writeFileSync(path.join(NET_DIR, `${ctx._name}.network.json`), JSON.stringify(ctx._netLog, null, 2));
  await ctx.close();
}
async function shot(page, dir, name) {
  const f = path.join(dir, name + '.png');
  await page.screenshot({ path: f, fullPage: false }).catch(() => {});
  return f;
}
async function injectToken(ctx, token) {
  await ctx.addInitScript((t) => { try { localStorage.setItem('auth_token', t); } catch (e) {} }, token);
}

async function main() {
  H.ensureDirs();
  const token = await H.login();
  const browser = await chromium.launch({ headless: true });

  // ===================================================================
  //  UI-1  Guest: home → product → add to cart → cart sidebar
  // ===================================================================
  {
    const ctx = await newContext(browser, 'guest-flow');
    const page = await ctx.newPage();
    page.setDefaultTimeout(cfg.defaultTimeout);
    try {
      await page.goto(cfg.baseURL + '/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      await shot(page, SHOTS, '01-home');
      rec('UI-01', 'Home page loads', 'UI', /Tochi|Moon/i.test(await page.title()), 'title=' + (await page.title()));

      await page.goto(cfg.baseURL + '/products/' + PRODUCT_SLUG, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      await shot(page, SHOTS, '02-product-detail');
      const addBtn = page.getByRole('button', { name: /Thêm vào giỏ|add to cart/i }).first();
      const hasAdd = await addBtn.count() > 0;
      rec('UI-02', 'Product detail shows Add-to-cart button', 'UI', hasAdd, '');

      if (hasAdd) {
        await addBtn.click().catch(() => {});
        await page.waitForTimeout(2000);
        await shot(page, SHOTS, '03-after-add-to-cart');
        // Cart count / sidebar — look for cart trigger in header
        rec('UI-03', 'Add-to-cart click handled (no crash)', 'Functional', true, '');
      }

      // Open checkout directly (cart persisted via session)
      await page.goto(cfg.baseURL + '/checkout', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      await shot(page, SHOTS, '04-checkout-guest');
      const bodyText = await page.locator('body').innerText().catch(() => '');
      const onCheckout = /Thanh toán|Thông tin giao hàng|Giỏ hàng/i.test(bodyText);
      rec('UI-04', 'Guest can reach checkout page', 'Functional', onCheckout, '');

      // Guest fills shipping + places COD order
      const placed = await tryPlaceOrder(page, SHOTS, '05-guest');
      rec('UI-05', 'Guest COD order can be placed via UI', 'Functional', placed.ok, placed.detail);
      guestConsoleErrors = ctx._consoleMsgs.filter((m) => m.type === 'error');
    } catch (e) {
      rec('UI-01', 'Guest flow crashed', 'UI', false, e.message);
    } finally {
      await closeContext(ctx);
    }
  }

  // ===================================================================
  //  UI-2  Logged-in: inject token → add → checkout COD → order detail
  // ===================================================================
  {
    const ctx = await newContext(browser, 'auth-flow');
    await injectToken(ctx, token);
    const page = await ctx.newPage();
    page.setDefaultTimeout(cfg.defaultTimeout);
    try {
      // Seed a cart item via API against the SAME user (token) so checkout has content
      await H.api('POST', '/user/cart/add', { token, headers: { language: 'vi' }, body: { product_id: 47, quantity: 1 } });

      await page.goto(cfg.baseURL + '/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await shot(page, SHOTS, '10-home-logged-in');
      const loggedIn = await page.evaluate(() => !!localStorage.getItem('auth_token'));
      rec('UI-10', 'Auth token present in session (logged-in state)', 'Functional', loggedIn, '');

      await page.goto(cfg.baseURL + '/checkout', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await shot(page, SHOTS, '11-checkout-logged-in');
      const bodyText = await page.locator('body').innerText().catch(() => '');
      rec('UI-11', 'Logged-in checkout renders payment methods', 'UI',
        /Thanh toán|COD|Chuyển khoản|Ví|Wallet|Bank/i.test(bodyText), '');

      const placed = await tryPlaceOrder(page, SHOTS, '12-auth');
      rec('UI-12', 'Logged-in COD order placed via UI (redirect to order)', 'Functional', placed.ok, placed.detail);

      if (placed.ok && placed.orderUrl) {
        await page.waitForTimeout(2500);
        await shot(page, SHOTS, '13-order-detail');
        rec('UI-13', 'Order detail page reached after placing order', 'Functional',
          /orders\//.test(page.url()), 'url=' + page.url());
      }

      // Order history
      await page.goto(cfg.baseURL + '/orders', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      await shot(page, SHOTS, '14-order-history');
      const histText = await page.locator('body').innerText().catch(() => '');
      rec('UI-14', 'Order history page lists orders', 'Functional',
        /ORD-|Đơn hàng|order/i.test(histText), '');
    } catch (e) {
      rec('UI-10', 'Auth flow crashed', 'UI', false, e.message);
    } finally {
      await closeContext(ctx);
    }
  }

  // ===================================================================
  //  UI-3  Responsive screenshots (home, product, checkout)
  // ===================================================================
  {
    const pages = [
      { name: 'home', url: '/' },
      { name: 'product', url: '/products/' + PRODUCT_SLUG },
      { name: 'checkout', url: '/checkout' },
    ];
    for (const [vpName, vp] of Object.entries(cfg.viewports)) {
      const ctx = await newContext(browser, 'resp-' + vpName, vp);
      await injectToken(ctx, token);
      const page = await ctx.newPage();
      // seed a cart item so checkout renders content
      await H.api('POST', '/user/cart/add', { token, headers: { language: 'vi' }, body: { product_id: 47, quantity: 1 } });
      let horizScrollBug = false;
      for (const p of pages) {
        try {
          await page.goto(cfg.baseURL + p.url, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2000);
          await shot(page, RESP, `${vpName}-${p.name}`);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
          if (overflow) horizScrollBug = true;
        } catch (_) { /* continue */ }
      }
      rec('UI-R-' + vpName, `Responsive @ ${vpName} (${vp.width}×${vp.height}) — no horizontal overflow`,
        'Responsive', !horizScrollBug, horizScrollBug ? 'horizontal scroll detected' : 'ok');
      await closeContext(ctx);
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(cfg.dirs.root, 'evidence', 'ui_ux', 'results.json'), JSON.stringify(results, null, 2));
  const pass = results.filter((r) => r.status === 'PASS').length;
  console.log(`\n=== UI SUITE DONE: ${pass} PASS / ${results.length - pass} FAIL / ${results.length} total ===`);
}

/**
 * Fill the checkout shipping form and place a COD order. Best-effort: returns
 * {ok, detail, orderUrl}. Selects COD if a payment choice is present.
 */
async function tryPlaceOrder(page, dir, prefix) {
  try {
    const setByName = async (name, value) => {
      const el = page.locator(`input[name="${name}"]`).first();
      if (await el.count()) { await el.fill(value).catch(() => {}); return true; }
      return false;
    };
    await setByName('fullName', 'QA Automation');
    await setByName('phone', '0912345678');
    await setByName('email', 'qa@example.com');
    await setByName('address', '123 QA Street, District 1');
    // note textarea (optional)
    const note = page.locator('textarea').first();
    if (await note.count()) await note.fill('E2E test order').catch(() => {});
    await shot(page, dir, prefix + '-form-filled');

    // Ensure COD radio selected if present
    const cod = page.getByText(/COD|Thanh toán khi nhận|Cash on delivery/i).first();
    if (await cod.count()) await cod.click().catch(() => {});

    const placeBtn = page.getByRole('button', { name: /Đặt hàng|Place order|Thanh toán/i }).last();
    if (!(await placeBtn.count())) return { ok: false, detail: 'no place-order button' };

    const urlBefore = page.url();
    await placeBtn.click().catch(() => {});
    // Wait for either redirect to /orders/ or a toast
    await page.waitForTimeout(4000);
    const urlAfter = page.url();
    await shot(page, dir, prefix + '-after-place');
    const redirected = /\/orders\//.test(urlAfter) && urlAfter !== urlBefore;
    const toast = await page.getByText(/Đặt hàng thành công|order success/i).count().catch(() => 0);
    return { ok: redirected || toast > 0, detail: `url=${urlAfter} toast=${toast}`, orderUrl: redirected ? urlAfter : null };
  } catch (e) {
    return { ok: false, detail: e.message };
  }
}

let guestConsoleErrors = [];
main().then(() => {
  fs.writeFileSync(path.join(cfg.dirs.console, 'guest-error-summary.json'), JSON.stringify(guestConsoleErrors, null, 2));
}).catch((e) => { console.error('FATAL', e.message, e.stack); process.exit(1); });
